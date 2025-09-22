import { GameState, CampBuildingType, TerrainType, City, Army, BuildQueueItem, UnitType, BuildingType, Unit, Gender, UnitDefinition, ResourceCost, Player, Hex, AxialCoords, ArmyDeploymentInfo, SicknessRiskDetails } from '../types';
import { UNIT_DEFINITIONS, STARVATION_DAMAGE, CAMP_BUILDING_DEFINITIONS, GATHERING_YIELD_PER_POINT, TERRAIN_DEFINITIONS, BASE_CITY_FOOD_STORAGE, BUILDING_DEFINITIONS, CAMP_XP_PER_TURN, CAMP_XP_PER_UNIT_PROD_COST, CAMP_XP_PER_BUILDING_PROD_COST, CAMP_XP_PER_NEW_MEMBER, INITIAL_XP_TO_NEXT_LEVEL, XP_LEVEL_MULTIPLIER, DISEASE_RISK_BASE, DISEASE_STAGNATION_INCREASE_PER_TURN, DISEASE_DAMAGE, CITY_HP, INITIAL_CITY_POPULATION, axialDirections, BUY_INFLUENCE_TILE_COST, CAMP_DEFENSE_BONUS, DISEASE_OVERCROWDING_THRESHOLD, DISEASE_OVERCROWDING_RISK_PER_UNIT, SHAMAN_RISK_REDUCTION_FLAT, MAX_SHAMAN_FLAT_REDUCTION } from '../constants';
import { TECH_TREE } from '../techtree';
import { CULTURAL_ASPECTS } from '../culture';
import { axialToString, getHexesInRange, hexDistance, stringToAxial } from './hexUtils';
import { deepCloneGameState } from './gameStateUtils';
import { Noise } from './noise';
import { generateId } from './gameStateUtils';

const generateMap = (width: number, height: number): Map<string, Hex> => {
    const hexes = new Map<string, Hex>();
    const elevationNoise = new Noise(Math.random());
    const moistureNoise = new Noise(Math.random());
    const biomeNoise = new Noise(Math.random());

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

export function initializeGameState(width: number, height: number): GameState {
    const hexes = generateMap(width, height);
        
    const findValidPlacement = (startPos: AxialCoords, maxRadius: number): AxialCoords => {
        const isHabitable = (hex: Hex | undefined) => hex && TERRAIN_DEFINITIONS[hex.terrain].movementCost < 99 && !hex.cityId;
        
        if (isHabitable(hexes.get(axialToString(startPos)))) return startPos;

        for (let r = 1; r <= maxRadius; r++) {
            const ring = getHexesInRange(startPos, r).filter(h => hexDistance(startPos, h) === r);
            for (const hexCoords of ring) {
                const hex = hexes.get(axialToString(hexCoords));
                if (isHabitable(hex)) return hexCoords;
            }
        }
        // Fallback: Find any passable land tile
            for (const hex of hexes.values()) {
            if (isHabitable(hex)) return { q: hex.q, r: hex.r };
        }
        return startPos; 
    };

    const players: Player[] = [
        { id: 1, name: 'Player 1', color: '#3b82f6', gold: 50, researchPoints: 0, culturePoints: 0, unlockedTechs: [], currentResearchId: 'fire_mastery', researchProgress: 0, culture: { nomadism: 0, genderRoles: 0, militarism: 0, unlockedAspects: [] }, actionsThisTurn: { attacks: 0 } },
        { id: 2, name: 'AI Opponent', color: '#ef4444', gold: 50, researchPoints: 0, culturePoints: 0, unlockedTechs: [], currentResearchId: 'fire_mastery', researchProgress: 0, culture: { nomadism: 0, genderRoles: 0, militarism: 0, unlockedAspects: [] }, actionsThisTurn: { attacks: 0 } },
    ];
    
    const units = new Map<string, Unit>();
    const cities = new Map<string, City>();

    const calculateInitialCityCapacity = (garrisonUnits: Unit[]): number => {
        return garrisonUnits.reduce((sum, unit) => sum + UNIT_DEFINITIONS[unit.type].carryCapacity, 0);
    };

    // Player 1 setup
    const p1DesiredPos = { q: Math.floor(width * 0.2), r: Math.floor(height * 0.5) };
    const p1CityPos = findValidPlacement(p1DesiredPos, 15);
    const p1CityKey = axialToString(p1CityPos);
    const p1CityId = generateId();
    let p1StartGarrisonUnits: Unit[] = [];

    for (let i = 0; i < 5; i++) {
        const manDef = UNIT_DEFINITIONS[UnitType.Tribesman];
        const manId = generateId();
        const manUnit = { id: manId, type: UnitType.Tribesman, ownerId: 1, hp: manDef.maxHp, foodStored: 0, gender: Gender.Male };
        units.set(manId, manUnit);
        p1StartGarrisonUnits.push(manUnit);

        const womanDef = UNIT_DEFINITIONS[UnitType.Tribeswoman];
        const womanId = generateId();
        const womanUnit = { id: womanId, type: UnitType.Tribeswoman, ownerId: 1, hp: womanDef.maxHp, foodStored: 0, gender: Gender.Female };
        units.set(womanId, womanUnit);
        p1StartGarrisonUnits.push(womanUnit);
    }
    const p1City: City = { id: p1CityId, name: 'Capital 1', ownerId: 1, position: p1CityPos, hp: CITY_HP, maxHp: CITY_HP, population: p1StartGarrisonUnits.length, food: 50, foodStorageCapacity: BASE_CITY_FOOD_STORAGE, level: 1, buildings: [], buildQueue: [], garrison: p1StartGarrisonUnits.map(u=>u.id), controlledTiles: [p1CityKey], pendingInfluenceExpansions: 0, nextPopulationMilestone: INITIAL_CITY_POPULATION * 2, productionFocus: 100, resourceFocus: { wood: false, stone: false, hides: false, obsidian: false }, isConnectedToNetwork: true, localResources: { wood: 0, stone: 0, hides: 0, obsidian: 0 }, storageCapacity: calculateInitialCityCapacity(p1StartGarrisonUnits) };
    cities.set(p1CityId, p1City);
    hexes.get(p1CityKey)!.cityId = p1CityId;

    // Player 2 (AI) setup
    const p2DesiredPos = { q: Math.floor(width * 0.8), r: Math.floor(height * 0.5) };
    const p2CityPos = findValidPlacement(p2DesiredPos, 15);
    const p2CityKey = axialToString(p2CityPos);
    const p2CityId = generateId();
    let p2StartGarrisonUnits: Unit[] = [];

    for (let i = 0; i < 5; i++) {
        const manDef = UNIT_DEFINITIONS[UnitType.Tribesman];
        const manId = generateId();
        const manUnit = { id: manId, type: UnitType.Tribesman, ownerId: 2, hp: manDef.maxHp, foodStored: 0, gender: Gender.Male };
        units.set(manId, manUnit);
        p2StartGarrisonUnits.push(manUnit);

        const womanDef = UNIT_DEFINITIONS[UnitType.Tribeswoman];
        const womanId = generateId();
        const womanUnit = { id: womanId, type: UnitType.Tribeswoman, ownerId: 2, hp: womanDef.maxHp, foodStored: 0, gender: Gender.Female };
        units.set(womanId, womanUnit);
        p2StartGarrisonUnits.push(womanUnit);
    }
    const p2City: City = { id: p2CityId, name: 'Capital 2', ownerId: 2, position: p2CityPos, hp: CITY_HP, maxHp: CITY_HP, population: p2StartGarrisonUnits.length, food: 50, foodStorageCapacity: BASE_CITY_FOOD_STORAGE, level: 1, buildings: [], buildQueue: [], garrison: p2StartGarrisonUnits.map(u => u.id), controlledTiles: [p2CityKey], pendingInfluenceExpansions: 0, nextPopulationMilestone: INITIAL_CITY_POPULATION * 2, productionFocus: 100, resourceFocus: { wood: false, stone: false, hides: false, obsidian: false }, isConnectedToNetwork: true, localResources: { wood: 0, stone: 0, hides: 0, obsidian: 0 }, storageCapacity: calculateInitialCityCapacity(p2StartGarrisonUnits) };
    cities.set(p2CityId, p2City);
    hexes.get(p2CityKey)!.cityId = p2CityId;

    return {
        hexes, units, cities, players,
        armies: new Map(),
        currentPlayerId: 1,
        turn: 1,
        mapWidth: width,
        mapHeight: height,
    };
}

// Internal helper to calculate sickness risk without applying effects
const getSicknessRisk = (container: Army | City, units: Unit[], hex: Hex): { risk: number, details: SicknessRiskDetails } => {
    const details: SicknessRiskDetails = {
        baseTerrain: 0,
        stagnation: 0,
        overcrowding: 0,
        healersTentReduction: 0,
        shamanFlatReduction: 0,
    };

    const terrainDef = TERRAIN_DEFINITIONS[hex.terrain];
    details.baseTerrain = DISEASE_RISK_BASE[terrainDef.diseaseRisk];
    
    const unitCount = units.length;
    
    if ('unitIds' in container) { // It's an Army
        const stagnationTurns = hex.armyPresenceTurns || 0;
        details.stagnation = stagnationTurns * DISEASE_STAGNATION_INCREASE_PER_TURN;

        let housingCapacity = 0;
        if (container.tentLevel && container.tentLevel > 0) {
            const tentDef = CAMP_BUILDING_DEFINITIONS[CampBuildingType.Tent];
            if (tentDef.housingCapacity) {
                housingCapacity = tentDef.housingCapacity * Math.pow(2, container.tentLevel - 1);
            }
        }
        
        if (unitCount > housingCapacity) {
            if (unitCount > DISEASE_OVERCROWDING_THRESHOLD) {
                details.overcrowding = (unitCount - DISEASE_OVERCROWDING_THRESHOLD) * DISEASE_OVERCROWDING_RISK_PER_UNIT;
            }
        }
    } else { // It's a City
         if (unitCount > DISEASE_OVERCROWDING_THRESHOLD) {
            details.overcrowding = (unitCount - DISEASE_OVERCROWDING_THRESHOLD) * DISEASE_OVERCROWDING_RISK_PER_UNIT;
        }
    }

    let subtotalRisk = details.baseTerrain + details.stagnation + details.overcrowding;

    const isCamp = 'isCamped' in container && container.isCamped;
    if (isCamp && container.buildings?.includes(CampBuildingType.HealersTent)) {
        const reductionMultiplier = CAMP_BUILDING_DEFINITIONS[CampBuildingType.HealersTent].diseaseRiskReduction!;
        details.healersTentReduction = subtotalRisk * reductionMultiplier;
        subtotalRisk -= details.healersTentReduction;
    }

    const numShamans = units.filter(u => u.type === UnitType.Shaman).length;
    const shamanReduction = Math.min(numShamans * SHAMAN_RISK_REDUCTION_FLAT, MAX_SHAMAN_FLAT_REDUCTION);
    details.shamanFlatReduction = shamanReduction;
    subtotalRisk -= shamanReduction;

    const finalRisk = Math.max(0, subtotalRisk);
    return { risk: finalRisk, details };
};


export function processHexClick(
    gs: GameState, 
    payload: { 
        coords: AxialCoords; 
        selectedArmyId: string | null;
        reachableHexes: Set<string>;
        attackableHexes: Set<string>;
        expandableHexes: Set<string>;
        pathCosts: Map<string, number>;
        selectedHex: AxialCoords | null;
    }
): GameState {
    const newGs = deepCloneGameState(gs);
    const { coords, selectedArmyId, reachableHexes, attackableHexes, expandableHexes, pathCosts, selectedHex } = payload;
    
    const clickedHexKey = axialToString(coords);
    const clickedHex = newGs.hexes.get(clickedHexKey);
    if (!clickedHex) return newGs;

    // Territory Expansion Logic
    if (expandableHexes.has(clickedHexKey) && selectedHex) {
        const selectedHexKey = axialToString(selectedHex);
        const cityId = newGs.hexes.get(selectedHexKey)?.cityId;
        const city = cityId ? newGs.cities.get(cityId) : null;
        if (city && city.ownerId === newGs.currentPlayerId && city.pendingInfluenceExpansions > 0) {
            city.controlledTiles = [...city.controlledTiles, clickedHexKey];
            city.pendingInfluenceExpansions -= 1;
            return newGs;
        }
    }

    const selectedArmy = selectedArmyId ? newGs.armies.get(selectedArmyId) : null;
    if (selectedArmy && selectedArmy.ownerId === newGs.currentPlayerId) {
        // ATTACK
        if (attackableHexes.has(clickedHexKey)) {
            const attackerArmy = selectedArmy;
            const defenderHex = newGs.hexes.get(clickedHexKey)!;
            const defenderArmyId = defenderHex.armyId;
            
            const playerToUpdate = newGs.players.find(p => p.id === attackerArmy.ownerId)!;
            playerToUpdate.culture.militarism = Math.min(100, playerToUpdate.culture.militarism + 2);
            playerToUpdate.actionsThisTurn.attacks += 1;

            if (defenderArmyId) {
                const defenderArmy = newGs.armies.get(defenderArmyId)!;
                const attackerUnit = newGs.units.get(attackerArmy.unitIds[0]);
                const defenderUnit = newGs.units.get(defenderArmy.unitIds[0]);
                
                if (attackerUnit && defenderUnit) {
                    const attackerUnitDef = UNIT_DEFINITIONS[attackerUnit.type];
                    const defenderUnitDef = UNIT_DEFINITIONS[defenderUnit.type];
                    
                    const terrainBonus = TERRAIN_DEFINITIONS[defenderHex.terrain].defenseBonus;
                    let campBonus = 0;
                    if (defenderArmy.isCamped) {
                        campBonus = CAMP_DEFENSE_BONUS;
                        if (defenderArmy.buildings?.includes(CampBuildingType.Palisade)) {
                            campBonus += CAMP_BUILDING_DEFINITIONS[CampBuildingType.Palisade].defenseBonus!;
                        }
                    }

                    const damageToDefender = Math.max(0, attackerUnitDef.attack - (defenderUnitDef.defense + terrainBonus + campBonus));
                    defenderUnit.hp -= damageToDefender;

                    const damageToAttacker = Math.max(0, defenderUnitDef.attack - attackerUnitDef.defense);
                    attackerUnit.hp -= damageToAttacker;
                    
                    if (defenderUnit.hp <= 0) {
                        defenderArmy.unitIds.shift();
                        newGs.units.delete(defenderUnit.id);
                    }
                    if (attackerUnit.hp <= 0) {
                        attackerArmy.unitIds.shift();
                        newGs.units.delete(attackerUnit.id);
                    }
                }
                
                if (defenderArmy.unitIds.length === 0) {
                    newGs.armies.delete(defenderArmy.id);
                    defenderHex.armyId = undefined;
                }
            }
            
            attackerArmy.movementPoints = 0;
            if (attackerArmy.unitIds.length === 0) {
                newGs.armies.delete(attackerArmy.id);
                const startHex = newGs.hexes.get(axialToString(attackerArmy.position))!;
                startHex.armyId = undefined;
            }
            
            return newGs;
        } 
        // MOVE / MERGE / GARRISON
        else if (reachableHexes.has(clickedHexKey)) {
            const destinationHex = newGs.hexes.get(clickedHexKey)!;
            const destinationArmyId = destinationHex.armyId;
            const destinationCityId = destinationHex.cityId;

            // 1. MERGE LOGIC
            if (destinationArmyId) {
                const destinationArmy = newGs.armies.get(destinationArmyId);
                if (destinationArmy && destinationArmy.ownerId === selectedArmy.ownerId) {
                    const movingArmy = selectedArmy;
                    destinationArmy.unitIds.push(...movingArmy.unitIds);

                    if (destinationArmy.isCamped) {
                        destinationArmy.xp = (destinationArmy.xp ?? 0) + (movingArmy.unitIds.length * CAMP_XP_PER_NEW_MEMBER);
                    }

                    const allUnitsInMergedArmy = destinationArmy.unitIds.map(id => newGs.units.get(id)!);
                    destinationArmy.maxMovementPoints = Math.min(...allUnitsInMergedArmy.map(u => UNIT_DEFINITIONS[u.type].movement));
                    destinationArmy.movementPoints = 0;

                    newGs.armies.delete(movingArmy.id);
                    const movingArmyStartHex = newGs.hexes.get(axialToString(movingArmy.position))!;
                    movingArmyStartHex.armyId = undefined;
                    movingArmyStartHex.armyPresenceTurns = 0; // Reset timer on departure hex

                    return newGs;
                }
            }

            // 2. GARRISON LOGIC
            if (destinationCityId) {
                const destinationCity = newGs.cities.get(destinationCityId);
                if (destinationCity && destinationCity.ownerId === selectedArmy.ownerId) {
                    const armyToMerge = selectedArmy;
                    
                    for(const unitId of armyToMerge.unitIds) {
                        const unit = newGs.units.get(unitId)!;
                        destinationCity.food += unit.foodStored;
                        unit.foodStored = 0;
                    }
                    
                    destinationCity.garrison.push(...armyToMerge.unitIds);
                    newGs.armies.delete(selectedArmy.id);
                    const armyHex = newGs.hexes.get(axialToString(armyToMerge.position))!;
                    armyHex.armyId = undefined;
                    armyHex.armyPresenceTurns = 0; // Reset timer on departure hex

                    return newGs;
                }
            }

            // 3. REGULAR MOVE
            const startHex = newGs.hexes.get(axialToString(selectedArmy.position))!;
            startHex.armyId = undefined;
            startHex.armyPresenceTurns = 0; // Reset timer on departure hex
            
            destinationHex.armyId = selectedArmy.id;
            
            const moveCost = pathCosts.get(clickedHexKey);
            let newMovementPoints;
            if (moveCost !== undefined && selectedArmy.movementPoints >= moveCost) {
                newMovementPoints = selectedArmy.movementPoints - moveCost;
            } else if (selectedArmy.movementPoints > 0 && hexDistance(selectedArmy.position, coords) === 1) {
                newMovementPoints = 0;
            } else {
                newMovementPoints = 0;
            }
            
            selectedArmy.position = coords;
            selectedArmy.movementPoints = newMovementPoints;

            // Update sickness risk on move
            const armyUnits = selectedArmy.unitIds.map(id => newGs.units.get(id)!);
            const { risk, details } = getSicknessRisk(selectedArmy, armyUnits, destinationHex);
            selectedArmy.sicknessRisk = risk;
            selectedArmy.sicknessRiskDetails = details;
            
            return newGs;
        }
    }
    return newGs; // Return original state if no action was taken
}

export function processFinalizeCampSetup(gs: GameState, payload: { armyId: string; selectedTileKeys: string[] }): GameState {
    const newGs = deepCloneGameState(gs);
    const { armyId, selectedTileKeys } = payload;
    const army = newGs.armies.get(armyId);
    if (!army) return newGs;

    army.isCamped = true;
    army.movementPoints = 0;
    army.controlledTiles = selectedTileKeys;
    army.isConnectedToNetwork = false;

    if (army.level === undefined) {
        army.level = 1;
        army.population = army.unitIds.length;
        army.buildings = [];
        army.tentLevel = 0;
        army.buildQueue = [];
        army.xp = 0;
        army.xpToNextLevel = INITIAL_XP_TO_NEXT_LEVEL;
        army.productionFocus = 100;
        army.resourceFocus = { wood: false, stone: false, hides: false, obsidian: false };
        army.localResources = { wood: 0, stone: 0, hides: 0, obsidian: 0 };
        army.storageCapacity = 0;
        army.food = 0;
        army.foodStorageCapacity = 0;
    }
    return newGs;
}

export function processBreakCamp(gs: GameState, payload: { armyId: string }): GameState {
    const newGs = deepCloneGameState(gs);
    const { armyId } = payload;
    const army = newGs.armies.get(armyId);
    if (!army) return newGs;

    army.isCamped = false;
    army.controlledTiles = [];
    army.movementPoints = 0;
    army.food = 0;
    return newGs;
}

export function processDeployArmy(gs: GameState, payload: { deploymentInfo: ArmyDeploymentInfo; targetPosition: AxialCoords }): GameState {
    const newGs = deepCloneGameState(gs);
    const { deploymentInfo, targetPosition } = payload;
    const { sourceId, sourceType, unitsToMove } = deploymentInfo;

    const unitIdsToDeploy: string[] = [];
    const availableUnitIds = sourceType === 'city' 
        ? [...(newGs.cities.get(sourceId)?.garrison ?? [])] 
        : [...(newGs.armies.get(sourceId)?.unitIds ?? [])];

    for (const { unitType, count } of unitsToMove) {
        let foundCount = 0;
        for (const unitId of availableUnitIds) {
            if (foundCount >= count) break;
            const unit = newGs.units.get(unitId);
            if (unit && unit.type === unitType) {
                unitIdsToDeploy.push(unitId);
                foundCount++;
            }
        }
    }

    if (unitIdsToDeploy.length === 0) return newGs;

    const deployedSet = new Set(unitIdsToDeploy);
    if (sourceType === 'city') {
        const city = newGs.cities.get(sourceId)!;
        city.garrison = city.garrison.filter(id => !deployedSet.has(id));
    } else {
        const sourceArmy = newGs.armies.get(sourceId)!;
        sourceArmy.unitIds = sourceArmy.unitIds.filter(id => !deployedSet.has(id));
        if (sourceArmy.unitIds.length === 0) {
            const sourceHex = newGs.hexes.get(axialToString(sourceArmy.position))!;
            sourceHex.armyId = undefined;
            newGs.armies.delete(sourceId);
        }
    }

    const unitsInArmy = unitIdsToDeploy.map(id => newGs.units.get(id)!);
    const slowestUnitSpeed = Math.min(...unitsInArmy.map(u => UNIT_DEFINITIONS[u.type].movement));
    const storageCap = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].carryCapacity, 0);
    const newArmyId = generateId();
    const newArmy: Army = { 
        id: newArmyId, 
        ownerId: unitsInArmy[0].ownerId, 
        position: targetPosition, 
        unitIds: unitIdsToDeploy, 
        movementPoints: 0, 
        maxMovementPoints: slowestUnitSpeed,
        name: "Army",
        foundingTurn: newGs.turn,
        localResources: {},
        storageCapacity: storageCap,
        sicknessRisk: 0,
    };
    newGs.armies.set(newArmyId, newArmy);
    
    const targetHex = newGs.hexes.get(axialToString(targetPosition))!;
    targetHex.armyId = newArmyId;
    
    return newGs;
}

export function processProduceUnit(gs: GameState, payload: { unitType: UnitType, cityId: string }): GameState {
    const newGs = deepCloneGameState(gs);
    const { unitType, cityId } = payload;
    const city = newGs.cities.get(cityId)!;
    const player = newGs.players.find(p => p.id === city.ownerId)!;
    const unitDef = UNIT_DEFINITIONS[unitType];
    const cost = unitDef.cost;

    const isAdvancedMale = unitDef.gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman].includes(unitType);
    let sacrificeUnitId: string | undefined = undefined;

    if (isAdvancedMale) {
        const garrisonUnits = city.garrison.map(id => newGs.units.get(id)!);
        const sacrificeUnit = garrisonUnits.find(u => u.type === UnitType.Tribesman);
        if (sacrificeUnit) {
            sacrificeUnitId = sacrificeUnit.id;
        } else {
            return newGs; // Should not happen if button is disabled.
        }
    }
    
    player.gold -= (cost.gold ?? 0);
    city.localResources.wood = (city.localResources.wood ?? 0) - (cost.wood ?? 0);
    city.localResources.stone = (city.localResources.stone ?? 0) - (cost.stone ?? 0);
    city.localResources.hides = (city.localResources.hides ?? 0) - (cost.hides ?? 0);
    city.localResources.obsidian = (city.localResources.obsidian ?? 0) - (cost.obsidian ?? 0);

    if (sacrificeUnitId) {
        city.garrison = city.garrison.filter(id => id !== sacrificeUnitId);
        newGs.units.delete(sacrificeUnitId);
    }

    city.buildQueue.push({ id: generateId(), type: 'unit', itemType: unitType, productionCost: unitDef.productionCost, progress: 0 });
    return newGs;
}

export function processProduceInCamp(gs: GameState, payload: { armyId: string, itemType: UnitType | CampBuildingType, type: 'unit' | 'building' }): GameState {
    const newGs = deepCloneGameState(gs);
    const { armyId, itemType, type } = payload;
    const army = newGs.armies.get(armyId)!;
    const player = newGs.players.find(p => p.id === army.ownerId)!;

    let def: UnitDefinition | (typeof CAMP_BUILDING_DEFINITIONS)[CampBuildingType];
    let cost: ResourceCost;
    let productionCost: number;

    if (itemType === CampBuildingType.Tent) {
        const baseDef = CAMP_BUILDING_DEFINITIONS[CampBuildingType.Tent];
        const queuedTentUpgrades = army.buildQueue?.filter(item => item.itemType === CampBuildingType.Tent).length ?? 0;
        const currentTentLevel = (army.tentLevel ?? 0) + queuedTentUpgrades;
        const costMultiplier = Math.pow(2, currentTentLevel);

        cost = Object.entries(baseDef.cost).reduce((acc, [key, value]) => {
            acc[key as keyof ResourceCost] = value * costMultiplier;
            return acc;
        }, {} as ResourceCost);
        
        productionCost = baseDef.productionCost * costMultiplier;
        def = { ...baseDef, cost, productionCost };
    } else {
        def = type === 'unit' 
            ? UNIT_DEFINITIONS[itemType as UnitType] 
            : CAMP_BUILDING_DEFINITIONS[itemType as CampBuildingType];
        cost = def.cost;
        productionCost = def.productionCost;
    }

    const isAdvancedMale = type === 'unit' && (def as UnitDefinition).gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman].includes(itemType as UnitType);
    let sacrificeUnitId: string | undefined = undefined;

    if (isAdvancedMale) {
        const unitsInArmy = army.unitIds.map(id => newGs.units.get(id)!);
        const sacrificeUnit = unitsInArmy.find(u => u.type === UnitType.Tribesman);
        if (sacrificeUnit) {
            sacrificeUnitId = sacrificeUnit.id;
        } else {
            return newGs;
        }
    }

    player.gold -= (cost.gold ?? 0);
    army.localResources.wood = (army.localResources.wood ?? 0) - (cost.wood ?? 0);
    army.localResources.stone = (army.localResources.stone ?? 0) - (cost.stone ?? 0);
    army.localResources.hides = (army.localResources.hides ?? 0) - (cost.hides ?? 0);
    army.localResources.obsidian = (army.localResources.obsidian ?? 0) - (cost.obsidian ?? 0);

    if (sacrificeUnitId) {
        army.unitIds = army.unitIds.filter(id => id !== sacrificeUnitId);
        newGs.units.delete(sacrificeUnitId);
    }

    army.buildQueue = [...(army.buildQueue ?? [])];
    army.buildQueue.push({ id: generateId(), type, itemType, productionCost, progress: 0 });
    return newGs;
}

export function processCancelProduction(gs: GameState, payload: { containerId: string, containerType: 'city' | 'army', queueItemId: string }): GameState {
    const newGs = deepCloneGameState(gs);
    const { containerId, containerType, queueItemId } = payload;
    const player = newGs.players.find(p => p.id === newGs.currentPlayerId)!;

    const container = containerType === 'city' ? newGs.cities.get(containerId) : newGs.armies.get(containerId);
    if (!container || !container.buildQueue) return newGs;

    const itemIndex = container.buildQueue.findIndex(item => item.id === queueItemId);
    if (itemIndex === -1) return newGs;

    const item = container.buildQueue[itemIndex];
    const def = item.type === 'unit' 
        ? UNIT_DEFINITIONS[item.itemType as UnitType]
        : containerType === 'city' 
            ? BUILDING_DEFINITIONS[item.itemType as BuildingType] 
            : CAMP_BUILDING_DEFINITIONS[item.itemType as CampBuildingType];
    
    const cost = def.cost;
    player.gold += cost.gold ?? 0;
    container.localResources.wood = (container.localResources.wood ?? 0) + (cost.wood ?? 0);
    container.localResources.stone = (container.localResources.stone ?? 0) + (cost.stone ?? 0);
    container.localResources.hides = (container.localResources.hides ?? 0) + (cost.hides ?? 0);
    container.localResources.obsidian = (container.localResources.obsidian ?? 0) + (cost.obsidian ?? 0);

    const isAdvancedMale = item.type === 'unit' && (def as UnitDefinition).gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman].includes(item.itemType as UnitType);
    if (isAdvancedMale) {
        const tribesmanDef = UNIT_DEFINITIONS[UnitType.Tribesman];
        const newUnitId = generateId();
        const newUnit: Unit = { id: newUnitId, type: UnitType.Tribesman, ownerId: player.id, hp: tribesmanDef.maxHp, foodStored: 0, gender: Gender.Male };
        newGs.units.set(newUnitId, newUnit);
        if (containerType === 'city') {
            (container as City).garrison.push(newUnitId);
        } else {
            (container as Army).unitIds.push(newUnitId);
        }
    }

    container.buildQueue.splice(itemIndex, 1);
    return newGs;
}

export function processBuyInfluenceTile(gs: GameState, payload: { cityId: string }): GameState {
    const newGs = deepCloneGameState(gs);
    const { cityId } = payload;
    const city = newGs.cities.get(cityId)!;
    const player = newGs.players.find(p => p.id === city.ownerId)!;
    
    player.gold -= BUY_INFLUENCE_TILE_COST;
    city.pendingInfluenceExpansions += 1;
    return newGs;
}

export function processSetResearch(gs: GameState, payload: { techId: string }): GameState {
    const newGs = deepCloneGameState(gs);
    const { techId } = payload;
    const player = newGs.players.find(p => p.id === newGs.currentPlayerId)!;
    const tech = TECH_TREE[techId];
    const prereqsMet = tech.prerequisites.every(p => player.unlockedTechs.includes(p));

    if (player.currentResearchId !== techId && !player.unlockedTechs.includes(techId) && prereqsMet) {
        player.currentResearchId = techId;
    }
    return newGs;
}

export function processRenameArmy(gs: GameState, payload: { armyId: string, newName: string }): GameState {
    const newGs = deepCloneGameState(gs);
    const { armyId, newName } = payload;
    const army = newGs.armies.get(armyId);
    if (army) {
        army.name = newName;
    }
    return newGs;
}

export function processUpdateCityFocus(gs: GameState, payload: { cityId: string; focus: { productionFocus: number; resourceFocus: City['resourceFocus']} }): GameState {
    const newGs = deepCloneGameState(gs);
    const { cityId, focus } = payload;
    const city = newGs.cities.get(cityId);
    if (city) {
        city.productionFocus = focus.productionFocus;
        city.resourceFocus = focus.resourceFocus;
    }
    return newGs;
}

export function processUpdateCampFocus(gs: GameState, payload: { armyId: string; focus: { productionFocus: number; resourceFocus: Army['resourceFocus']} }): GameState {
    const newGs = deepCloneGameState(gs);
    const { armyId, focus } = payload;
    const army = newGs.armies.get(armyId);
    if (army) {
        army.productionFocus = focus.productionFocus;
        army.resourceFocus = focus.resourceFocus;
    }
    return newGs;
}

export function processDropResource(gs: GameState, payload: { containerId: string, containerType: 'city' | 'army', resource: keyof ResourceCost, amount: number }): GameState {
    const newGs = deepCloneGameState(gs);
    const { containerId, containerType, resource, amount } = payload;
    const container = containerType === 'city' ? newGs.cities.get(containerId) : newGs.armies.get(containerId);
    if (container) {
        const currentAmount = container.localResources[resource] ?? 0;
        container.localResources[resource] = Math.max(0, currentAmount - amount);
    }
    return newGs;
}

export function updateCapacities(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const currentPlayerId = newGs.currentPlayerId;

    for (const city of newGs.cities.values()) {
        if (city.ownerId === currentPlayerId) {
            const garrisonUnits = city.garrison.map(id => newGs.units.get(id)!);
            city.storageCapacity = garrisonUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].carryCapacity, 0);
            city.buildings.forEach(b => {
                city.storageCapacity += BUILDING_DEFINITIONS[b].storageBonus ?? 0;
            });
        }
    }
    for (const army of newGs.armies.values()) {
        if (army.ownerId === currentPlayerId && army.isCamped) {
            const armyUnits = army.unitIds.map(id => newGs.units.get(id)!);
            army.storageCapacity = armyUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].carryCapacity, 0);
            army.foodStorageCapacity = 0;
            army.buildings?.forEach(b => {
                army.storageCapacity += CAMP_BUILDING_DEFINITIONS[b].storageBonus ?? 0;
                army.foodStorageCapacity! += CAMP_BUILDING_DEFINITIONS[b].foodStorageBonus ?? 0;
            });
        }
    }
    return newGs;
}

export function processFoodAndStarvation(gs: GameState): { newState: GameState; starvedUnitIds: Set<string> } {
    const newGs = deepCloneGameState(gs);
    const currentPlayerId = newGs.currentPlayerId;
    const currentPlayer = newGs.players.find(p => p.id === currentPlayerId)!;

    // Reset turn-based flags for current player's armies
    for (const hex of newGs.hexes.values()) {
        const armyOnHex = hex.armyId ? newGs.armies.get(hex.armyId) : undefined;
        if (armyOnHex && armyOnHex.ownerId === currentPlayerId) {
            delete hex.wasStarving;
            delete hex.wasSick;
        }
    }

    // Set wasStarving flag for armies that will starve this turn
    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
        const armyHex = newGs.hexes.get(axialToString(army.position));
        if (!armyHex) continue;

        const unitsInArmy = army.unitIds.map(id => newGs.units.get(id)!);
        const totalConsumption = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
        const totalFoodStored = unitsInArmy.reduce((sum, u) => sum + u.foodStored, 0) + (army.food ?? 0);
        
        let totalGatherRate = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodGatherRate, 0);
        if (army.isCamped && army.buildings?.includes(CampBuildingType.ForagingPost)) {
            totalGatherRate += CAMP_BUILDING_DEFINITIONS[CampBuildingType.ForagingPost].foodGatherBonus!;
        }

        let foodToGather = 0;
        if(army.isCamped && army.controlledTiles) {
            const availableFood = army.controlledTiles.reduce((sum, key) => sum + (newGs.hexes.get(key)?.currentFood ?? 0), 0);
            foodToGather = Math.min(availableFood, totalGatherRate);
        } else {
            foodToGather = Math.min(armyHex.currentFood, totalGatherRate);
        }

        if (totalFoodStored + foodToGather < totalConsumption) {
            armyHex.wasStarving = true;
        }
    }

    const starvedUnitIds = new Set<string>();

    // Army Food Processing (Gathering & Consumption with pooled resources)
    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
        const unitsInArmy = army.unitIds.map(id => newGs.units.get(id)!);
        if (unitsInArmy.length === 0) continue;

        let foodPool = unitsInArmy.reduce((sum, u) => sum + u.foodStored, 0) + (army.food ?? 0);
        
        let totalGatherRate = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodGatherRate, 0);
        if (army.isCamped && army.buildings?.includes(CampBuildingType.ForagingPost)) {
            totalGatherRate += CAMP_BUILDING_DEFINITIONS[CampBuildingType.ForagingPost].foodGatherBonus!;
        }
        const totalConsumption = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);

        if (army.isCamped && army.controlledTiles) {
            const controlledHexes = army.controlledTiles.map(key => newGs.hexes.get(key)!).filter(Boolean);
            let availableFoodOnTerritory = controlledHexes.reduce((sum, hex) => sum + hex.currentFood, 0);
            let foodToGather = Math.min(availableFoodOnTerritory, totalGatherRate);
            foodPool += foodToGather;
            const sortedHexes = [...controlledHexes].sort((a, b) => b.currentFood - a.currentFood);
            for (const hex of sortedHexes) {
                if (foodToGather <= 0) break;
                const amountFromThisHex = Math.min(foodToGather, hex.currentFood);
                hex.currentFood -= amountFromThisHex;
                foodToGather -= amountFromThisHex;
            }
        } else {
            const armyHex = newGs.hexes.get(axialToString(army.position));
            if(armyHex) {
                const foodToGather = Math.min(armyHex.currentFood, totalGatherRate);
                foodPool += foodToGather;
                armyHex.currentFood -= foodToGather;
            }
        }

        if (foodPool >= totalConsumption) {
            foodPool -= totalConsumption;
        } else {
            for (const unit of unitsInArmy) {
                unit.hp -= STARVATION_DAMAGE;
                starvedUnitIds.add(unit.id);
            }
            foodPool = 0;
        }

        for (const unit of unitsInArmy) {
            unit.foodStored = 0;
        }
        army.food = 0;

        const sortedUnits = [...unitsInArmy].sort((a, b) => UNIT_DEFINITIONS[b.type].foodCarryCapacity - UNIT_DEFINITIONS[a.type].foodCarryCapacity);
        for (const unit of sortedUnits) {
            if (foodPool <= 0) break;
            const unitDef = UNIT_DEFINITIONS[unit.type];
            const amountToStore = Math.min(foodPool, unitDef.foodCarryCapacity);
            unit.foodStored = amountToStore;
            foodPool -= amountToStore;
        }

        if (foodPool > 0 && army.isCamped && army.foodStorageCapacity && army.foodStorageCapacity > 0) {
            const amountToStoreInCamp = Math.min(foodPool, army.foodStorageCapacity);
            army.food = amountToStoreInCamp;
            foodPool -= amountToStoreInCamp;
        }
    }
    
    // City Food Gathering
    const hasFishing = currentPlayer.unlockedTechs.includes('fishing');
    const fishingFoodBonus = hasFishing ? TECH_TREE['fishing'].effects.find(e => e.payload.bonus === 'food_from_water')?.payload.value ?? 0 : 0;
    
    for(const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        for (const tileKey of city.controlledTiles) {
            const hex = newGs.hexes.get(tileKey);
            if(!hex) continue;

            if(!hex.armyId && !hex.cityId) { 
                const foodToGather = Math.min(hex.currentFood, TERRAIN_DEFINITIONS[hex.terrain].foodRegrowth);
                city.food += foodToGather;
                hex.currentFood -= foodToGather;
            }

            if(hex.terrain === TerrainType.Lake || hex.terrain === TerrainType.Sea) {
                city.food += fishingFoodBonus;
            }
        }
    }

    // City Food Capacity and Storage Limit
    for(const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        let capacity = BASE_CITY_FOOD_STORAGE;
        for(const buildingType of city.buildings) {
            capacity += BUILDING_DEFINITIONS[buildingType].foodStorageBonus ?? 0;
        }
        city.foodStorageCapacity = capacity;
        city.food = Math.min(city.food, city.foodStorageCapacity);
    }

    // City Food Consumption & Starvation
    for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        const garrisonUnits = city.garrison.map(id => newGs.units.get(id)!);
        const totalConsumption = garrisonUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
        city.food -= totalConsumption;
        if (city.food < 0) {
            for (const unit of garrisonUnits) {
                unit.hp -= STARVATION_DAMAGE;
                starvedUnitIds.add(unit.id);
            }
            city.food = 0;
        }
    }

    return { newState: newGs, starvedUnitIds };
}

export function processProductionAndGathering(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const currentPlayerId = newGs.currentPlayerId;

    type ProductionContainer = City | Army;
    const processContainer = (container: ProductionContainer, units: Unit[], controlledTiles: string[]) => {
        const totalWorkPoints = units.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].productionYield, 0);
        const productionFocus = container.productionFocus ?? 100;
        const resourceFocus = container.resourceFocus;

        // Production
        if (container.buildQueue && container.buildQueue.length > 0) {
            const productionPoints = totalWorkPoints * (productionFocus / 100);
            const item = container.buildQueue[0];
            item.progress += productionPoints;

            if (item.progress >= item.productionCost) {
                // playSound('build');
                if (item.type === 'unit') {
                    const unitDef = UNIT_DEFINITIONS[item.itemType as UnitType];
                    const newUnitId = generateId();
                    newGs.units.set(newUnitId, { id: newUnitId, type: item.itemType as UnitType, ownerId: container.ownerId, hp: unitDef.maxHp, foodStored: 0, gender: unitDef.gender ?? Gender.None });
                    if ('garrison' in container) { 
                        container.garrison.push(newUnitId);
                    } else { 
                        container.unitIds.push(newUnitId);
                        if (container.isCamped) {
                            container.xp = (container.xp ?? 0) + item.productionCost * CAMP_XP_PER_UNIT_PROD_COST;
                        }
                    }
                } else { 
                    if ('garrison' in container) { 
                        container.buildings.push(item.itemType as BuildingType);
                    } else { 
                        if (item.itemType === CampBuildingType.Tent) {
                            container.tentLevel = (container.tentLevel ?? 0) + 1;
                        } else {
                            container.buildings!.push(item.itemType as CampBuildingType);
                        }
                        if (container.isCamped) {
                            container.xp = (container.xp ?? 0) + item.productionCost * CAMP_XP_PER_BUILDING_PROD_COST;
                        }
                    }
                }
                container.buildQueue.shift();
            }
        }

        // Resource Gathering
        const gatheringPoints = totalWorkPoints * ((100 - productionFocus) / 100);
        if (gatheringPoints > 0 && resourceFocus) {
            const focusedResources = Object.entries(resourceFocus).filter(([_, v]) => v).map(([k, _]) => k as keyof typeof resourceFocus);
            if (focusedResources.length > 0) {
                const pointsPerResource = gatheringPoints / focusedResources.length;
                const totalStored = Object.values(container.localResources).reduce((sum, val) => sum + (val || 0), 0);
                let spaceAvailable = container.storageCapacity - totalStored;
                
                for (const resource of focusedResources) {
                    if (spaceAvailable <= 0) break;
                    let pointsLeft = pointsPerResource;
                    const tilesWithResource = controlledTiles
                        .map(key => newGs.hexes.get(key)!)
                        .filter(h => h && (h as any)[`current${resource.charAt(0).toUpperCase() + resource.slice(1)}`] > 0)
                        .sort((a, b) => (b as any)[`current${resource.charAt(0).toUpperCase() + resource.slice(1)}`] - (a as any)[`current${resource.charAt(0).toUpperCase() + resource.slice(1)}`]);

                    let totalGatheredThisResource = 0;
                    for (const hex of tilesWithResource) {
                        if (pointsLeft <= 0 || spaceAvailable <= 0) break;
                        const resourceKey = `current${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof typeof hex;
                        const amountOnTile = hex[resourceKey] as number;
                        const maxCanGather = Math.min(pointsLeft * GATHERING_YIELD_PER_POINT, spaceAvailable);
                        const amountToGather = Math.min(maxCanGather, amountOnTile);
                        
                        if (amountToGather > 0) {
                            totalGatheredThisResource += amountToGather;
                            (hex[resourceKey] as number) -= amountToGather;
                            pointsLeft -= amountToGather / GATHERING_YIELD_PER_POINT;
                            spaceAvailable -= amountToGather;
                        }
                    }
                    const currentAmount = container.localResources[resource] ?? 0;
                    container.localResources[resource] = currentAmount + Math.round(totalGatheredThisResource);
                }
            }
        }
    };

    for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        const garrisonUnits = city.garrison.map(id => newGs.units.get(id)!);
        processContainer(city, garrisonUnits, city.controlledTiles);
    }

    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped)) {
        const armyUnits = army.unitIds.map(id => newGs.units.get(id)!);
        processContainer(army, armyUnits, army.controlledTiles!);
    }
    
    return newGs;
}

export function processPopulation(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const currentPlayerId = newGs.currentPlayerId;

    // Update population counts first
    for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        city.population = city.garrison.length;
    }
    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped)) {
        army.population = army.unitIds.length;
    }

    const unitsBornThisTurn: { container: Army | City; unit: Unit }[] = [];
    
    // Aging
    for (const unit of Array.from(newGs.units.values()).filter(u => u.ownerId === currentPlayerId && u.type === UnitType.Child)) {
        unit.age = (unit.age || 0) + 1;
        if (unit.age >= 2) {
            unit.type = unit.gender === Gender.Male ? UnitType.Tribesman : UnitType.Tribeswoman;
            const newDef = UNIT_DEFINITIONS[unit.type];
            unit.hp = newDef.maxHp;
            delete unit.age;
        }
    }

    // Reproduction
    const processUnitGroup = (container: Army | City, unitIds: string[]) => {
        const unitsInGroup = unitIds.map(id => newGs.units.get(id)!);
        const hasMales = unitsInGroup.some(u => u.type === UnitType.Tribesman);
        if (hasMales) {
            const females = unitsInGroup.filter(u => u.type === UnitType.Tribeswoman);
            for (const _ of females) {
                if (Math.random() < 0.10) { // 10% chance
                    const childDef = UNIT_DEFINITIONS[UnitType.Child];
                    const newChild: Unit = { 
                        id: generateId(), 
                        type: UnitType.Child, 
                        ownerId: currentPlayerId, 
                        hp: childDef.maxHp, 
                        foodStored: 0, 
                        age: 0,
                        gender: Math.random() < 0.5 ? Gender.Male : Gender.Female
                    };
                    unitsBornThisTurn.push({ container, unit: newChild });
                }
            }
        }
    };

    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
        processUnitGroup(army, army.unitIds);
    }
    for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        processUnitGroup(city, city.garrison);
    }

    // Add newborns and grant XP
    for (const { container, unit } of unitsBornThisTurn) {
        newGs.units.set(unit.id, unit);
        if ('unitIds' in container) { 
            container.unitIds.push(unit.id);
            if (container.isCamped) {
                container.xp = (container.xp ?? 0) + CAMP_XP_PER_NEW_MEMBER;
            }
        } else { 
            container.garrison.push(unit.id);
        }
    }

    // Camp Leveling
    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped)) {
        army.xp = (army.xp ?? 0) + CAMP_XP_PER_TURN; // Passive XP
        if (army.xp !== undefined && army.xpToNextLevel !== undefined && army.xp >= army.xpToNextLevel) {
            army.level = (army.level ?? 1) + 1;
            army.xp -= army.xpToNextLevel;
            army.xpToNextLevel = Math.floor(INITIAL_XP_TO_NEXT_LEVEL * Math.pow(XP_LEVEL_MULTIPLIER, army.level - 1));
            // playSound('levelUp');
        }
    }

    return newGs;
}

export function processSickness(gs: GameState): { newState: GameState, sickUnitIds: Set<string> } {
    const newGs = deepCloneGameState(gs);
    const currentPlayerId = newGs.currentPlayerId;
    const sickUnitIds = new Set<string>();
    
    const applySickness = (container: Army | City, units: Unit[], hex: Hex) => {
        // Increment stagnation turns at the end of the turn for armies that didn't move
        if ('unitIds' in container) {
            hex.armyPresenceTurns = (hex.armyPresenceTurns || 0) + 1;
        }

        const { risk, details } = getSicknessRisk(container, units, hex);
        container.sicknessRisk = risk;
        container.sicknessRiskDetails = details;

        if (units.length > 0 && Math.random() * 100 < risk) {
            // Select one random unit to get sick
            const sickUnit = units[Math.floor(Math.random() * units.length)];
            
            sickUnit.hp -= DISEASE_DAMAGE;
            sickUnitIds.add(sickUnit.id);
            hex.wasSick = true;
        }
    };

    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
        const hex = newGs.hexes.get(axialToString(army.position));
        if (!hex) { army.sicknessRisk = 0; continue; }
        const units = army.unitIds.map(id => newGs.units.get(id)!);
        applySickness(army, units, hex);
    }

    for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        const hex = newGs.hexes.get(axialToString(city.position));
        if (!hex) { city.sicknessRisk = 0; continue; }
        const units = city.garrison.map(id => newGs.units.get(id)!);
        applySickness(city, units, hex);
    }

    return { newState: newGs, sickUnitIds };
}


export function processEconomyAndRecovery(gs: GameState, starvedUnitIds: Set<string>, sickUnitIds: Set<string>): GameState {
    const newGs = deepCloneGameState(gs);
    const currentPlayerId = newGs.currentPlayerId;
    const currentPlayer = newGs.players.find(p => p.id === currentPlayerId)!;

    // Income
    const calculateIncome = (playerId: number, gs: GameState): number => {
        let income = 0;
        for (const city of gs.cities.values()) {
            if (city.ownerId === playerId) {
                income += 5 + (city.controlledTiles.length - 1) * 2;
                for (const buildingType of city.buildings) {
                    income += BUILDING_DEFINITIONS[buildingType].goldBonus ?? 0;
                }
            }
        }
        return income;
    };
    currentPlayer.gold += calculateIncome(currentPlayerId, newGs);
    
    // Research & Culture
    let totalResearchYield = 0;
    let totalCultureYield = 0;
    const allUnitContainers = [
        ...Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId),
        ...Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)
    ];

    for (const container of allUnitContainers) {
        const unitIds = 'garrison' in container ? container.garrison : container.unitIds;
        const units = unitIds.map(id => newGs.units.get(id)!);
        
        totalResearchYield += units.reduce((sum, u) => sum + (UNIT_DEFINITIONS[u.type].researchYield ?? 0), 0);
        totalCultureYield += units.reduce((sum, u) => sum + (u.type === UnitType.Shaman ? 1 : 0), 0);
    }

    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped)) {
        if (army.buildings?.includes(CampBuildingType.FirePit)) {
            totalResearchYield += CAMP_BUILDING_DEFINITIONS[CampBuildingType.FirePit].researchBonus ?? 0;
            totalCultureYield += CAMP_BUILDING_DEFINITIONS[CampBuildingType.FirePit].culturePointBonus ?? 0;
        }
    }

    if (currentPlayer.currentResearchId) {
        const tech = TECH_TREE[currentPlayer.currentResearchId];
        currentPlayer.researchProgress += totalResearchYield;
        if (currentPlayer.currentResearchId === 'fire_mastery') currentPlayer.researchProgress = tech.cost;
        if (currentPlayer.researchProgress >= tech.cost) {
            // playSound('research');
            currentPlayer.unlockedTechs.push(currentPlayer.currentResearchId);
            currentPlayer.researchPoints += currentPlayer.researchProgress - tech.cost;
            currentPlayer.currentResearchId = null;
            currentPlayer.researchProgress = 0;
        }
    } else {
        currentPlayer.researchPoints += totalResearchYield;
    }
    currentPlayer.culturePoints += totalCultureYield;

    // Healing
    const friendlyTiles = new Set<string>();
    Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId).forEach(c => c.controlledTiles.forEach(tile => friendlyTiles.add(tile)));
    Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped && a.controlledTiles).forEach(a => a.controlledTiles!.forEach(tile => friendlyTiles.add(tile)));

    for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
        if (friendlyTiles.has(axialToString(army.position))) {
            const unitsInArmy = army.unitIds.map(id => newGs.units.get(id)!);
            const shamanBonus = unitsInArmy.reduce((sum, u) => sum + (UNIT_DEFINITIONS[u.type].healingBonus ?? 0), 0);
            const firePitBonus = army.isCamped && army.buildings?.includes(CampBuildingType.FirePit) && unitsInArmy.reduce((sum, u) => sum + u.foodStored, 0) > 0 ? 1 : 0;
            const healersTentBonus = army.isCamped && army.buildings?.includes(CampBuildingType.HealersTent) ? CAMP_BUILDING_DEFINITIONS[CampBuildingType.HealersTent].healingBonus! : 0;
            const totalHealAmount = 1 + shamanBonus + firePitBonus + healersTentBonus;
            unitsInArmy.forEach(u => {
                if (!starvedUnitIds.has(u.id) && !sickUnitIds.has(u.id) && u.hp < UNIT_DEFINITIONS[u.type].maxHp) {
                    u.hp = Math.min(UNIT_DEFINITIONS[u.type].maxHp, u.hp + totalHealAmount);
                }
            });
        }
    }

    for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        const units = city.garrison.map(id => newGs.units.get(id)!);
        const bonus = units.reduce((sum, u) => sum + (UNIT_DEFINITIONS[u.type].healingBonus ?? 0), 0);
        const healAmount = 1 + bonus;
        units.forEach(u => {
            if (!starvedUnitIds.has(u.id) && !sickUnitIds.has(u.id) && u.hp < UNIT_DEFINITIONS[u.type].maxHp) {
                u.hp = Math.min(UNIT_DEFINITIONS[u.type].maxHp, u.hp + healAmount);
            }
        });
    }

    return newGs;
}

export function processUnitCleanup(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const currentPlayerId = newGs.currentPlayerId;

    const deadUnitIds = Array.from(newGs.units.values())
        .filter(u => u.ownerId === currentPlayerId && u.hp <= 0)
        .map(u => u.id);

    if (deadUnitIds.length > 0) {
        const deadSet = new Set(deadUnitIds);
        newGs.armies.forEach((army, armyId) => {
            if (army.ownerId === currentPlayerId) {
                army.unitIds = army.unitIds.filter(id => !deadSet.has(id));
                if (army.unitIds.length === 0) {
                    const armyHex = newGs.hexes.get(axialToString(army.position));
                    if (armyHex) {
                        delete armyHex.armyId;
                        armyHex.armyPresenceTurns = 0;
                    }
                    newGs.armies.delete(armyId);
                }
            }
        });
        newGs.cities.forEach(city => {
            if (city.ownerId === currentPlayerId) {
                city.garrison = city.garrison.filter(id => !deadSet.has(id));
            }
        });
        deadSet.forEach(id => newGs.units.delete(id));
    }

    return newGs;
}

export function processCulturalShifts(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const player = newGs.players.find(p => p.id === newGs.currentPlayerId)!;

    const unitsInArmies = Array.from(newGs.armies.values()).filter(a => a.ownerId === player.id).reduce((sum, a) => sum + a.unitIds.length, 0);
    const unitsInCities = Array.from(newGs.cities.values()).filter(c => c.ownerId === player.id).reduce((sum, c) => sum + c.garrison.length, 0);
    if (unitsInArmies + unitsInCities > 0) {
        player.culture.nomadism = Math.max(-100, Math.min(100, player.culture.nomadism + (unitsInArmies / (unitsInArmies + unitsInCities) - 0.5) * 4));
    }
    
    const allPlayerUnits = Array.from(newGs.units.values()).filter(u => u.ownerId === player.id);
    const maleUnits = allPlayerUnits.filter(u => u.gender === Gender.Male).length;
    const femaleUnits = allPlayerUnits.filter(u => u.gender === Gender.Female).length;
    if (maleUnits + femaleUnits > 0) {
        player.culture.genderRoles = Math.max(-100, Math.min(100, player.culture.genderRoles + (femaleUnits / (maleUnits + femaleUnits) - 0.5) * 4));
    }

    if (player.actionsThisTurn.attacks === 0) {
        player.culture.militarism = Math.max(-100, player.culture.militarism - 1);
    }
    player.actionsThisTurn = { attacks: 0 };

    for (const aspect of Object.values(CULTURAL_ASPECTS)) {
        if (!player.culture.unlockedAspects.includes(aspect.id)) {
            if (aspect.unlockConditions.every(cond => cond.threshold > 0 ? player.culture[cond.axis] >= cond.threshold : player.culture[cond.axis] <= cond.threshold)) {
                player.culture.unlockedAspects.push(aspect.id);
                // playSound('upgrade');
            }
        }
    }

    return newGs;
}

export function finalizeTurn(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const nextPlayerId = newGs.currentPlayerId === 1 ? 2 : 1;

    // Reset movement points for the next player
    newGs.armies.forEach(army => {
        if (army.ownerId === nextPlayerId && !army.isCamped) {
           army.movementPoints = army.maxMovementPoints;
        }
   });
   
    // Advance turn and handle global regrowth if it's the end of a full round
   if (nextPlayerId === 1) {
       newGs.turn += 1;
       for (const hex of newGs.hexes.values()) {
           const terrainDef = TERRAIN_DEFINITIONS[hex.terrain];
           hex.currentFood = Math.min(terrainDef.maxFood, hex.currentFood + terrainDef.foodRegrowth);
           hex.currentWood = Math.min(terrainDef.maxWood, hex.currentWood + terrainDef.woodRegrowth);
           hex.currentHides = Math.min(terrainDef.maxHides, hex.currentHides + terrainDef.hidesRegrowth);
       }
   }
   
   newGs.currentPlayerId = nextPlayerId;
   return newGs;
}