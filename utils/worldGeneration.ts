import { Hex, TerrainType, AxialCoords } from '../types';
import { TERRAIN_DEFINITIONS, axialDirections } from '../constants';
import { axialToString, stringToAxial, getHexesInRange, hexDistance } from './hexUtils';
import { Noise } from './noise';

export const generateMap = (width: number, height: number, seed?: string): Map<string, Hex> => {
    const hexes = new Map<string, Hex>();

    // Simple string to number hash function for seeding
    const stringToSeed = (s: string): number => {
      let hash = 0;
      if (s.length === 0) return Math.random();
      for (let i = 0; i < s.length; i++) {
        const char = s.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    };

    // Determine the base seed. Use the provided string or generate a random number.
    const baseSeed = seed ? stringToSeed(seed) : Math.random();
    
    // Create noise instances with derived seeds to ensure different patterns for each layer
    const elevationNoise = new Noise(baseSeed);
    const moistureNoise = new Noise(baseSeed + 1);
    const biomeNoise = new Noise(baseSeed + 2);

    const ELEVATION_SCALE = 10;
    const MOISTURE_SCALE = 7;
    const BIOME_SCALE = 4;

    // Step 1: Initial terrain generation based on noise
    for (let q = 0; q < width; q++) {
        for (let r = 0; r < height; r++) {
            const nx = (q / width) * 2 - 1;
            const ny = (r / height) * 2 - 1;

            let e =
                1.00 * elevationNoise.perlin2(nx * ELEVATION_SCALE, ny * ELEVATION_SCALE) +
                0.50 * elevationNoise.perlin2(nx * ELEVATION_SCALE * 2, ny * ELEVATION_SCALE * 2) +
                0.25 * elevationNoise.perlin2(nx * ELEVATION_SCALE * 4, ny * ELEVATION_SCALE * 4);
            e /= (1.00 + 0.50 + 0.25);
            e = (1 + e) / 2; // Normalize to 0-1

            // Sharper falloff for smaller sea edges
            const distFromCenter = Math.sqrt(nx * nx + ny * ny);
            let shapedE = e - Math.pow(distFromCenter, 4);

            let m = (1 + moistureNoise.perlin2(nx * MOISTURE_SCALE, ny * MOISTURE_SCALE)) / 2;
            let b = (1 + biomeNoise.perlin2(nx * BIOME_SCALE, ny * BIOME_SCALE)) / 2;

            let terrainType: TerrainType;
            if (shapedE < 0.18) { // Adjusted threshold for new exponent
                terrainType = TerrainType.Sea;
            } else if (shapedE < 0.3) {
                terrainType = (m > 0.6) ? TerrainType.Swamp : TerrainType.Plains;
            } else if (shapedE < 0.7) {
                if (b < 0.45) {
                    if (m < 0.3) terrainType = TerrainType.Desert;
                    else terrainType = TerrainType.Steppe;
                } else {
                    if (m < 0.25) terrainType = TerrainType.Plains;
                    else terrainType = TerrainType.Forest;
                }
            } else if (shapedE < 0.85) {
                terrainType = TerrainType.Hills;
            } else {
                terrainType = TerrainType.Mountains;
            }
            
            const hex: Hex = { q, r, terrain: terrainType, currentFood: 0, currentWood: 0, currentStone: 0, currentHides: 0, currentObsidian: 0 };
            hexes.set(axialToString({ q, r }), hex);
        }
    }
    
    // Step 2: Separate ocean from inland seas (lakes)
    const oceanTiles = new Set<string>();
    // FIX: Add AxialCoords type to fix compile errors
    const queue: AxialCoords[] = [];
    let oceanSeed: AxialCoords | null = null;
    // Find a seed on the map edge
    for (let q = 0; q < width; q++) {
        if (hexes.get(axialToString({ q, r: 0 }))?.terrain === TerrainType.Sea) { oceanSeed = { q, r: 0 }; break; }
        if (hexes.get(axialToString({ q, r: height - 1 }))?.terrain === TerrainType.Sea) { oceanSeed = { q, r: height - 1 }; break; }
    }
    if (!oceanSeed) {
        for (let r = 0; r < height; r++) {
            if (hexes.get(axialToString({ q: 0, r }))?.terrain === TerrainType.Sea) { oceanSeed = { q: 0, r }; break; }
            if (hexes.get(axialToString({ q: width - 1, r }))?.terrain === TerrainType.Sea) { oceanSeed = { q: width - 1, r }; break; }
        }
    }
    
    // Flood fill from the edge to identify all ocean tiles
    if (oceanSeed) {
        queue.push(oceanSeed);
        oceanTiles.add(axialToString(oceanSeed));
        while (queue.length > 0) {
            const current = queue.shift()!;
            for (const dir of axialDirections) {
                const neighborCoords = { q: current.q + dir.q, r: current.r + dir.r };
                const neighborKey = axialToString(neighborCoords);
                const neighborHex = hexes.get(neighborKey);
                if (neighborHex && neighborHex.terrain === TerrainType.Sea && !oceanTiles.has(neighborKey)) {
                    oceanTiles.add(neighborKey);
                    queue.push(neighborCoords);
                }
            }
        }
    }
    
    // Any sea tile not connected to the edge is a lake
    for (const hex of hexes.values()) {
        if (hex.terrain === TerrainType.Sea && !oceanTiles.has(axialToString(hex))) {
            hex.terrain = TerrainType.Lake;
        }
    }

    const landTiles = Array.from(hexes.values()).filter(h => h.terrain !== TerrainType.Sea && h.terrain !== TerrainType.Lake);

    // Step 3: Place Mountain Ranges and connecting Hills
    const mountainTiles = new Set<string>();
    let mountainRanges = 0;
    let attempts = 0;
    const potentialRangeStarts = [...landTiles].sort((a,b) => b.q - a.q); // Sort to get some spatial separation

    while (mountainRanges < 2 && attempts < 200 && potentialRangeStarts.length > 0) {
        attempts++;
        const randIndex = Math.floor(Math.random() * potentialRangeStarts.length);
        const startHex = potentialRangeStarts.splice(randIndex, 1)[0];
        
        const direction = axialDirections[Math.floor(Math.random() * 6)];
        const rangeLength = 3;
        const currentRange: Hex[] = [];
        let isValidRange = true;

        for (let i = 0; i < rangeLength; i++) {
            const pos = { q: startHex.q + direction.q * i, r: startHex.r + direction.r * i };
            const key = axialToString(pos);
            const hex = hexes.get(key);

            if (!hex || hex.terrain === TerrainType.Sea || hex.terrain === TerrainType.Lake || mountainTiles.has(key)) {
                isValidRange = false;
                break;
            }
            currentRange.push(hex);
        }

        if (isValidRange) {
            currentRange.forEach(hex => {
                hex.terrain = TerrainType.Mountains;
                mountainTiles.add(axialToString(hex));
            });
            mountainRanges++;
        }
    }
    
    // Place connecting hills
    for (const mountainKey of mountainTiles) {
        const mountainCoords = stringToAxial(mountainKey);
        for (const dir of axialDirections) {
            const neighborCoords = { q: mountainCoords.q + dir.q, r: mountainCoords.r + dir.r };
            const neighborKey = axialToString(neighborCoords);
            const neighborHex = hexes.get(neighborKey);
            
            if (neighborHex && (neighborHex.terrain === TerrainType.Plains || neighborHex.terrain === TerrainType.Forest || neighborHex.terrain === TerrainType.Steppe || neighborHex.terrain === TerrainType.Desert)) {
                if (Math.random() < 0.7) { // High probability to become a hill
                    neighborHex.terrain = TerrainType.Hills;
                }
            }
        }
    }

    // Step 4: Place Volcanic Tiles
    let volcanicCount = Array.from(hexes.values()).filter(h => h.terrain === TerrainType.Volcanic).length;
    attempts = 0;
    const mountainAndHillTiles = Array.from(hexes.values()).filter(h => h.terrain === TerrainType.Mountains || h.terrain === TerrainType.Hills);
    const potentialVolcanoes = [...mountainAndHillTiles];
    
    while (volcanicCount < 2 && attempts < 100 && potentialVolcanoes.length > 0) {
        attempts++;
        const randIndex = Math.floor(Math.random() * potentialVolcanoes.length);
        const candidate = potentialVolcanoes.splice(randIndex, 1)[0];
        
        if (candidate.terrain !== TerrainType.Volcanic) {
            candidate.terrain = TerrainType.Volcanic;
            volcanicCount++;
        }
    }

    // Step 5: Place Swamps next to Lakes
    const lakeTiles = Array.from(hexes.values()).filter(h => h.terrain === TerrainType.Lake);
    for (const lake of lakeTiles) {
        for (const dir of axialDirections) {
            const neighborCoords = { q: lake.q + dir.q, r: lake.r + dir.r };
            const neighborHex = hexes.get(axialToString(neighborCoords));
            
            if (neighborHex && (neighborHex.terrain === TerrainType.Plains || neighborHex.terrain === TerrainType.Forest || neighborHex.terrain === TerrainType.Steppe)) {
                if (Math.random() < 0.6) { // High probability to become a swamp
                    neighborHex.terrain = TerrainType.Swamp;
                }
            }
        }
    }

    // Final Step: Initialize resources for all hexes based on their final terrain type
    for (const hex of hexes.values()) {
        const terrainDef = TERRAIN_DEFINITIONS[hex.terrain];
        hex.currentFood = terrainDef.maxFood;
        hex.currentWood = terrainDef.maxWood;
        hex.currentStone = terrainDef.maxStone;
        hex.currentHides = terrainDef.maxHides;
        hex.currentObsidian = terrainDef.maxObsidian;
    }
    
    return hexes;
};