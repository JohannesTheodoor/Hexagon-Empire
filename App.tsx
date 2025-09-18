import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameBoard from './components/GameBoard';
import GameUI from './components/GameUI';
import GameToolbar from './components/GameToolbar';
import SettingsMenu from './components/SettingsMenu';
import CityScreen from './components/CityScreen';
import CampScreen from './components/CampScreen';
import ArmyBar from './components/ArmyBar';
import ResearchScreen from './components/ResearchScreen';
import CultureScreen from './components/CultureScreen';
import CreateArmyScreen from './components/CreateArmyScreen';
// FIX: Import UnitDefinition to resolve 'Cannot find name' error.
import { GameState, AxialCoords, Hex, TerrainType, Unit, UnitType, City, Player, UnitSize, BuildingType, BuildQueueItem, TechEffectType, Army, ArmyDeploymentInfo, Gender, CampBuildingType, UnitDefinition } from './types';
import { MAP_WIDTH, MAP_HEIGHT, TERRAIN_DEFINITIONS, UNIT_DEFINITIONS, axialDirections, CITY_HP, UNIT_VISION_RANGE, CITY_VISION_RANGE, BUY_INFLUENCE_TILE_COST, BASE_CITY_INCOME, INCOME_PER_INFLUENCE_LEVEL, UNIT_HEAL_AMOUNT, INITIAL_CITY_POPULATION, BUILDING_DEFINITIONS, STARVATION_DAMAGE, CAMP_DEFENSE_BONUS, BASE_CITY_FOOD_STORAGE, CAMP_INFLUENCE_RANGE, INITIAL_CAMP_POPULATION_MILESTONE, CAMP_POPULATION_PER_LEVEL, CAMP_VISION_RANGE, CAMP_BUILDING_DEFINITIONS } from './constants';
import { axialToString, stringToAxial, getHexesInRange, hexDistance, axialToPixel } from './utils/hexUtils';
import { playSound, setVolume, setMuted, ensureAudioInitialized } from './utils/soundManager';
import { TECH_TREE } from './techtree';
import { CULTURAL_ASPECTS } from './culture';

const generateId = () => Math.random().toString(36).substring(2, 9);

// A simple priority queue for pathfinding (A* or Dijkstra)
class PriorityQueue<T> {
  private elements: { item: T; priority: number }[] = [];

  enqueue(item: T, priority: number) {
    this.elements.push({ item, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue(): T | undefined {
    return this.elements.shift()?.item;
  }

  isEmpty(): boolean {
    return this.elements.length === 0;
  }
}

const calculateIncome = (playerId: number, gs: GameState): number => {
    let income = 0;
    const player = gs.players.find(p => p.id === playerId)!;

    // Income from cities based on influence and buildings
    for (const city of gs.cities.values()) {
        if (city.ownerId === playerId) {
            income += BASE_CITY_INCOME + (city.controlledTiles.length - 1) * INCOME_PER_INFLUENCE_LEVEL;
            for (const buildingType of city.buildings) {
                income += BUILDING_DEFINITIONS[buildingType].goldBonus ?? 0;
            }
            for (const techId of player.unlockedTechs) {
                const tech = TECH_TREE[techId];
                for (const effect of tech.effects) {
                    if (effect.type === TechEffectType.GlobalBonus && effect.payload.bonus === 'gold_from_hills') {
                         for (const tileKey of city.controlledTiles) {
                            const hex = gs.hexes.get(tileKey);
                            if (hex && hex.terrain === TerrainType.Hills) {
                                income += effect.payload.value;
                            }
                        }
                    }
                }
            }
        }
    }
    // Income from units/armies is not a thing in this ruleset, only terrain bonus for cities
    return income;
};

// New robust deep cloning function to prevent state corruption during turn processing.
const deepCloneGameState = (gs: GameState): GameState => {
  // Convert Maps to Arrays for stringification, which is a safe way to deep clone.
  const stringifiableState = {
    ...gs,
    hexes: Array.from(gs.hexes.entries()),
    units: Array.from(gs.units.entries()),
    cities: Array.from(gs.cities.entries()),
    armies: Array.from(gs.armies.entries()),
  };
  
  const serialized = JSON.stringify(stringifiableState);
  const parsed = JSON.parse(serialized);

  // Re-hydrate Maps from the stringified Arrays.
  return {
    ...parsed,
    hexes: new Map(parsed.hexes),
    units: new Map(parsed.units),
    cities: new Map(parsed.cities),
    armies: new Map(parsed.armies),
  };
};

const App: React.FC = () => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [selectedHex, setSelectedHex] = useState<AxialCoords | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [selectedArmyId, setSelectedArmyId] = useState<string | null>(null);
    const [reachableHexes, setReachableHexes] = useState<Set<string>>(new Set());
    const [attackableHexes, setAttackableHexes] = useState<Set<string>>(new Set());
    const [expandableHexes, setExpandableHexes] = useState<Set<string>>(new Set());
    const [deployableHexes, setDeployableHexes] = useState<Set<string>>(new Set());
    const [campTileSelectionInfo, setCampTileSelectionInfo] = useState<{ armyId: string; totalTiles: number; selectedTiles: Set<string> } | null>(null);
    const [influenceMap, setInfluenceMap] = useState<Map<string, string>>(new Map());
    const [isAITurning, setIsAITurning] = useState(false);
    const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
    const [fogOfWarEnabled, setFogOfWarEnabled] = useState(true);
    const [visibleHexes, setVisibleHexes] = useState<Set<string>>(new Set());
    const [exploredHexes, setExploredHexes] = useState<Set<string>>(new Set());
    
    const [viewState, setViewState] = useState({
        scale: 1,
        translate: { x: 50, y: 50 },
    });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const mousePosRef = useRef({ x: 0, y: 0 });

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCityScreenOpen, setIsCityScreenOpen] = useState(false);
    const [isCampScreenOpen, setIsCampScreenOpen] = useState(false);
    const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
    const [isResearchScreenOpen, setIsResearchScreenOpen] = useState(false);
    const [isCultureScreenOpen, setIsCultureScreenOpen] = useState(false);
    const [armyFormationSource, setArmyFormationSource] = useState<{ sourceId: string; sourceType: 'city' | 'army' } | null>(null);
    const [armyDeploymentInfo, setArmyDeploymentInfo] = useState<ArmyDeploymentInfo | null>(null);
    const [volume, setVolumeState] = useState(0.5);
    const [isMutedState, setIsMutedState] = useState(false);

    useEffect(() => {
        const initAudio = () => {
            ensureAudioInitialized();
            window.removeEventListener('click', initAudio);
        };
        window.addEventListener('click', initAudio);
        return () => window.removeEventListener('click', initAudio);
    }, []);

    useEffect(() => { setVolume(volume); }, [volume]);
    useEffect(() => { setMuted(isMutedState); }, [isMutedState]);

    const handleVolumeChange = (newVolume: number) => {
        setVolumeState(newVolume);
        if (isMutedState && newVolume > 0) setIsMutedState(false);
    };
    
    const handleMuteToggle = () => setIsMutedState(prev => !prev);
    
    // Panning and Zooming Logic
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (isCityScreenOpen || isResearchScreenOpen || isSettingsOpen || armyFormationSource) return;
        e.preventDefault();
        const zoomFactor = 1.1;
        const { clientX, clientY, deltaY } = e;

        setViewState(prev => {
            const newScale = deltaY < 0 ? prev.scale * zoomFactor : prev.scale / zoomFactor;
            const clampedScale = Math.max(0.3, Math.min(2.5, newScale));

            if (clampedScale === prev.scale) return prev;

            const rect = gameContainerRef.current?.getBoundingClientRect();
            if (!rect) return prev;
            
            const mouseX = clientX - rect.left;
            const mouseY = clientY - rect.top;

            const mapX = (mouseX - prev.translate.x) / prev.scale;
            const mapY = (mouseY - prev.translate.y) / prev.scale;

            const newTranslateX = mouseX - mapX * clampedScale;
            const newTranslateY = mouseY - mapY * clampedScale;

            return {
                scale: clampedScale,
                translate: { x: newTranslateX, y: newTranslateY },
            };
        });
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0 || isCityScreenOpen || isResearchScreenOpen || isSettingsOpen || armyFormationSource) return;
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            translateX: viewState.translate.x,
            translateY: viewState.translate.y,
        };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) return;
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewState(prev => ({
            ...prev,
            translate: {
                x: panStartRef.current.translateX + dx,
                y: panStartRef.current.translateY + dy,
            }
        }));
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };
    
    useEffect(() => {
        let animationFrameId: number;
        const gameLoop = () => {
            const rect = gameContainerRef.current?.getBoundingClientRect();
            if (rect && !isPanning && !isCityScreenOpen && !isResearchScreenOpen && !isSettingsOpen && !armyFormationSource && !armyDeploymentInfo && !isCultureScreenOpen) {
                const { x, y } = mousePosRef.current;
                const edgeSize = 40;
                const panSpeed = 10;
                let dx = 0;
                let dy = 0;

                if (x < rect.left + edgeSize && x > rect.left) dx = panSpeed;
                if (x > rect.right - edgeSize && x < rect.right) dx = -panSpeed;
                if (y < rect.top + edgeSize && y > rect.top) dy = panSpeed;
                if (y > rect.bottom - edgeSize && y < rect.bottom) dy = -panSpeed;

                if (dx !== 0 || dy !== 0) {
                    setViewState(prev => ({
                        ...prev,
                        translate: { x: prev.translate.x + dx, y: prev.translate.y + dy },
                    }));
                }
            }
            animationFrameId = requestAnimationFrame(gameLoop);
        };
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPanning, isCityScreenOpen, isResearchScreenOpen, isSettingsOpen, armyFormationSource, armyDeploymentInfo, isCultureScreenOpen]);

    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, [handleGlobalMouseMove]);

    const generateMap = (): Map<string, Hex> => {
        const hexes = new Map<string, Hex>();
        for (let q = 0; q < MAP_WIDTH; q++) {
            for (let r = 0; r < MAP_HEIGHT; r++) {
                const rand = Math.random();
                let terrainType: TerrainType;
                if (rand < 0.25) terrainType = TerrainType.Plains;
                else if (rand < 0.45) terrainType = TerrainType.Forest;
                else if (rand < 0.60) terrainType = TerrainType.Hills;
                else if (rand < 0.70) terrainType = TerrainType.Steppe;
                else if (rand < 0.80) terrainType = TerrainType.Sea;
                else if (rand < 0.88) terrainType = TerrainType.Desert;
                else if (rand < 0.93) terrainType = TerrainType.Swamp;
                else if (rand < 0.96) terrainType = TerrainType.Lake;
                else if (rand < 0.98) terrainType = TerrainType.Volcanic;
                else terrainType = TerrainType.Mountains;

                const terrainDef = TERRAIN_DEFINITIONS[terrainType];
                const hex: Hex = { 
                    q, r, terrain: terrainType, 
                    currentFood: terrainDef.maxFood,
                    currentWood: terrainDef.maxWood,
                    currentStone: terrainDef.maxStone,
                    currentHides: terrainDef.maxHides,
                    currentObsidian: terrainDef.maxObsidian,
                };
                hexes.set(axialToString(hex), hex);
            }
        }
        return hexes;
    };

    const initializeGame = useCallback(() => {
        const hexes = generateMap();
        const players: Player[] = [
            { id: 1, name: 'Player 1', color: '#3b82f6', gold: 50, wood: 50, stone: 50, hides: 20, obsidian: 0, researchPoints: 0, unlockedTechs: [], currentResearchId: null, researchProgress: 0, culture: { nomadism: 0, genderRoles: 0, militarism: 0, unlockedAspects: [] }, actionsThisTurn: { attacks: 0 } },
            { id: 2, name: 'AI Opponent', color: '#ef4444', gold: 50, wood: 50, stone: 50, hides: 20, obsidian: 0, researchPoints: 0, unlockedTechs: [], currentResearchId: null, researchProgress: 0, culture: { nomadism: 0, genderRoles: 0, militarism: 0, unlockedAspects: [] }, actionsThisTurn: { attacks: 0 } },
        ];
        
        const units = new Map<string, Unit>();
        const cities = new Map<string, City>();

        // Player 1 setup
        const p1CityPos = { q: 5, r: 8 };
        const p1CityKey = axialToString(p1CityPos);
        const p1CityId = generateId();
        let p1StartGarrison: string[] = [];

        for (let i = 0; i < 5; i++) {
            const manDef = UNIT_DEFINITIONS[UnitType.Tribesman];
            const manId = generateId();
            units.set(manId, { id: manId, type: UnitType.Tribesman, ownerId: 1, hp: manDef.maxHp, foodStored: 0, gender: Gender.Male });
            p1StartGarrison.push(manId);

            const womanDef = UNIT_DEFINITIONS[UnitType.Tribeswoman];
            const womanId = generateId();
            units.set(womanId, { id: womanId, type: UnitType.Tribeswoman, ownerId: 1, hp: womanDef.maxHp, foodStored: 0, gender: Gender.Female });
            p1StartGarrison.push(womanId);
        }
        const p1City: City = { id: p1CityId, name: 'Capital 1', ownerId: 1, position: p1CityPos, hp: CITY_HP, maxHp: CITY_HP, population: p1StartGarrison.length, food: 50, foodStorageCapacity: BASE_CITY_FOOD_STORAGE, level: 1, buildings: [], buildQueue: [], garrison: p1StartGarrison, controlledTiles: [p1CityKey], pendingInfluenceExpansions: 0, nextPopulationMilestone: INITIAL_CITY_POPULATION * 2 };
        cities.set(p1CityId, p1City);
        hexes.get(p1CityKey)!.cityId = p1CityId;


        // Player 2 (AI) setup
        const p2CityPos = { q: MAP_WIDTH - 6, r: 8 };
        const p2CityKey = axialToString(p2CityPos);
        const p2CityId = generateId();
        let p2StartGarrison: string[] = [];

        for (let i = 0; i < 5; i++) {
            const manDef = UNIT_DEFINITIONS[UnitType.Tribesman];
            const manId = generateId();
            units.set(manId, { id: manId, type: UnitType.Tribesman, ownerId: 2, hp: manDef.maxHp, foodStored: 0, gender: Gender.Male });
            p2StartGarrison.push(manId);

            const womanDef = UNIT_DEFINITIONS[UnitType.Tribeswoman];
            const womanId = generateId();
            units.set(womanId, { id: womanId, type: UnitType.Tribeswoman, ownerId: 2, hp: womanDef.maxHp, foodStored: 0, gender: Gender.Female });
            p2StartGarrison.push(womanId);
        }
        const p2City: City = { id: p2CityId, name: 'Capital 2', ownerId: 2, position: p2CityPos, hp: CITY_HP, maxHp: CITY_HP, population: p2StartGarrison.length, food: 50, foodStorageCapacity: BASE_CITY_FOOD_STORAGE, level: 1, buildings: [], buildQueue: [], garrison: p2StartGarrison, controlledTiles: [p2CityKey], pendingInfluenceExpansions: 0, nextPopulationMilestone: INITIAL_CITY_POPULATION * 2 };
        cities.set(p2CityId, p2City);
        hexes.get(p2CityKey)!.cityId = p2CityId;

        setGameState({
            hexes, units, cities, players,
            armies: new Map(),
            currentPlayerId: 1,
            turn: 1,
        });
        setGameOverMessage(null);
        setSelectedHex(null);
        setSelectedUnitId(null);
        setSelectedArmyId(null);
        setReachableHexes(new Set());
        setAttackableHexes(new Set());
        setExpandableHexes(new Set());
        setDeployableHexes(new Set());
        setCampTileSelectionInfo(null);
        setExploredHexes(new Set());
        setIsAITurning(false);
        setIsCityScreenOpen(false);
        setIsResearchScreenOpen(false);
        setIsCultureScreenOpen(false);
        setArmyFormationSource(null);
        setArmyDeploymentInfo(null);
    }, []);

    useEffect(() => { initializeGame(); }, [initializeGame]);

    const calculateVisibility = useCallback((gs: GameState) => {
        const newVisible = new Set<string>();
        const playerThings = [
            ...Array.from(gs.armies.values()).filter(u => u.ownerId === 1),
            ...Array.from(gs.cities.values()).filter(c => c.ownerId === 1)
        ];

        for (const thing of playerThings) {
            const isArmy = 'unitIds' in thing;
            let range = isArmy ? UNIT_VISION_RANGE : CITY_VISION_RANGE;
            if (isArmy && (thing as Army).isCamped) {
                const army = thing as Army;
                range = CAMP_VISION_RANGE;
                if (army.buildings?.includes(CampBuildingType.ScoutTent)) {
                    range += CAMP_BUILDING_DEFINITIONS[CampBuildingType.ScoutTent].visionBonus!;
                }
            }
            const visibleFromThing = getHexesInRange(thing.position, range);
            for (const hexCoords of visibleFromThing) {
                const key = axialToString(hexCoords);
                if (gs.hexes.has(key)) newVisible.add(key);
            }
        }
        
        setVisibleHexes(newVisible);
        setExploredHexes(prev => new Set([...prev, ...newVisible]));
    }, []);
    
    useEffect(() => {
        if (!gameState) return;
        const newInfluenceMap = new Map<string, string>();
        for (const city of gameState.cities.values()) {
            const player = gameState.players.find(p => p.id === city.ownerId);
            if (player) {
                for (const tileKey of city.controlledTiles) {
                    newInfluenceMap.set(tileKey, player.color + '80'); // Add alpha for subtle fill
                }
            }
        }
        for (const army of gameState.armies.values()) {
             if (army.isCamped && army.controlledTiles) {
                const player = gameState.players.find(p => p.id === army.ownerId);
                if (player) {
                    for (const tileKey of army.controlledTiles) {
                         if (gameState.hexes.has(tileKey) && !newInfluenceMap.has(tileKey)) {
                             newInfluenceMap.set(tileKey, player.color + '80');
                        }
                    }
                }
            }
        }
        setInfluenceMap(newInfluenceMap);
    }, [gameState]);

    useEffect(() => {
        if (gameState) calculateVisibility(gameState);
    }, [gameState, calculateVisibility]);

    const findReachableHexes = useCallback((start: AxialCoords, army: Army, gs: GameState): Set<string> => {
        if (army.isCamped) return new Set();
        const reachable = new Set<string>();
        const frontier = new PriorityQueue<{ pos: AxialCoords; cost: number }>();
        frontier.enqueue({ pos: start, cost: 0 }, 0);
        
        const costSoFar: Map<string, number> = new Map();
        costSoFar.set(axialToString(start), 0);

        const unitsInArmy = army.unitIds.map(id => gs.units.get(id)!);
        const player = gs.players.find(p => p.id === army.ownerId)!;
        
        while (!frontier.isEmpty()) {
            const current = frontier.dequeue();
            if (!current) break;

            if (current.cost > 0) reachable.add(axialToString(current.pos));

            axialDirections.forEach(dir => {
                const nextCoords = { q: current.pos.q + dir.q, r: current.pos.r + dir.r };
                const nextKey = axialToString(nextCoords);
                const nextHex = gs.hexes.get(nextKey);

                if (nextHex) {
                    const terrainDef = TERRAIN_DEFINITIONS[nextHex.terrain];
                    let moveCost = terrainDef.movementCost;
                    
                    // Check for tech-locked tiles
                    if (terrainDef.requiredTech && !player.unlockedTechs.includes(terrainDef.requiredTech)) {
                        moveCost = 99;
                    }

                    // Check if any unit in the army cannot traverse the terrain
                    const isImpassable = unitsInArmy.some(u => {
                        const unitDef = UNIT_DEFINITIONS[u.type];
                        return unitDef.size === UnitSize.Large && nextHex.terrain === TerrainType.Forest;
                    });
                    if (isImpassable) moveCost = 99;

                    const newCost = current.cost + moveCost;
                    
                    const isOccupiedByEnemy = nextHex.armyId && gs.armies.get(nextHex.armyId)?.ownerId !== army.ownerId;

                    if (newCost <= army.movementPoints && !isOccupiedByEnemy && (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)!)) {
                        costSoFar.set(nextKey, newCost);
                        frontier.enqueue({ pos: nextCoords, cost: newCost }, newCost);
                    }
                }
            });
        }
        
        return reachable;
    }, []);

    const findAttackableHexes = useCallback((start: AxialCoords, army: Army, gs: GameState): Set<string> => {
        if (army.isCamped || army.movementPoints === 0) return new Set();
        const attackable = new Set<string>();
        axialDirections.forEach(dir => {
            const neighborCoords = { q: start.q + dir.q, r: start.r + dir.r };
            const neighborKey = axialToString(neighborCoords);
            const neighborHex = gs.hexes.get(neighborKey);
            if (neighborHex) {
                if (neighborHex.armyId) {
                    const targetArmy = gs.armies.get(neighborHex.armyId);
                    if (targetArmy && targetArmy.ownerId !== army.ownerId) attackable.add(neighborKey);
                }
                if (neighborHex.cityId) {
                    const city = gs.cities.get(neighborHex.cityId);
                    if (city && city.ownerId !== army.ownerId) attackable.add(neighborKey);
                }
            }
        });
        return attackable;
    }, []);

    useEffect(() => {
        if (!gameState || !selectedHex) {
            setSelectedArmyId(null);
            setExpandableHexes(new Set());
            return;
        }

        const hexKey = axialToString(selectedHex);
        const hex = gameState.hexes.get(hexKey);
        const armyId = hex?.armyId;
        const cityId = hex?.cityId;
        
        setSelectedArmyId(armyId ?? null);

        if(armyId) {
            const army = gameState.armies.get(armyId);
            if (army && army.ownerId === gameState.currentPlayerId) {
                 setReachableHexes(findReachableHexes(army.position, army, gameState));
                 setAttackableHexes(findAttackableHexes(army.position, army, gameState));
            } else {
                 setReachableHexes(new Set());
                 setAttackableHexes(new Set());
            }
        } else {
            setReachableHexes(new Set());
            setAttackableHexes(new Set());
        }

        const city = cityId ? gameState.cities.get(cityId) : null;
        if (city && city.ownerId === gameState.currentPlayerId && city.pendingInfluenceExpansions > 0) {
            const newExpandable = new Set<string>();
            const allControlledByAnyCity = new Set(Array.from(gameState.cities.values()).flatMap(c => c.controlledTiles));
            for (const tileKey of city.controlledTiles) {
                const coords = stringToAxial(tileKey);
                for (const dir of axialDirections) {
                    const neighborCoords = { q: coords.q + dir.q, r: coords.r + dir.r };
                    const neighborKey = axialToString(neighborCoords);
                    if (gameState.hexes.has(neighborKey) && !allControlledByAnyCity.has(neighborKey)) newExpandable.add(neighborKey);
                }
            }
            setExpandableHexes(newExpandable);
        } else {
            setExpandableHexes(new Set());
        }

    }, [gameState, selectedHex, findReachableHexes, findAttackableHexes]);
    
    const selectHex = useCallback((coords: AxialCoords | null) => {
        // Cancel army deployment if a different hex is selected
        if (armyDeploymentInfo) {
            setArmyDeploymentInfo(null);
            setDeployableHexes(new Set());
        }
        if (campTileSelectionInfo) {
            setCampTileSelectionInfo(null);
        }
        setSelectedHex(coords);
        setSelectedUnitId(null); // Deselect detailed unit view when hex changes
    }, [armyDeploymentInfo, campTileSelectionInfo]);

    const handleSelectUnit = useCallback((unitId: string) => {
        if (!gameState || isAITurning || gameOverMessage) return;
        const unit = gameState.units.get(unitId);
        if (!unit) return;
        if (unit.ownerId === gameState.currentPlayerId) {
            setSelectedUnitId(unitId);
        }
    }, [gameState, isAITurning, gameOverMessage]);

    const handleFinalizeCampSetup = useCallback((armyId: string, selectedTileKeys: string[]) => {
        setGameState(prevGs => {
            if (!prevGs) return null;
            const army = prevGs.armies.get(armyId);
            if (!army) return prevGs;
    
            playSound('build');
            const newGs = { ...prevGs, armies: new Map(prevGs.armies) };
            const newArmy = { ...army };
    
            newArmy.isCamped = true;
            newArmy.movementPoints = 0;
            newArmy.controlledTiles = selectedTileKeys;
    
            // Initialize camp properties if it's the first time
            if (newArmy.level === undefined) {
                newArmy.level = 1;
                newArmy.population = newArmy.unitIds.length;
                newArmy.buildings = [];
                newArmy.buildQueue = [];
                newArmy.nextPopulationMilestone = INITIAL_CAMP_POPULATION_MILESTONE;
            }
    
            newGs.armies.set(armyId, newArmy);
            return newGs;
        });
        setCampTileSelectionInfo(null);
    }, []);

    const handleHexClick = useCallback((coords: AxialCoords) => {
        if (!gameState || isAITurning || gameOverMessage || isCityScreenOpen || armyFormationSource || isCampScreenOpen || isCultureScreenOpen) return;
        
        const clickedHexKey = axialToString(coords);
        const clickedHex = gameState.hexes.get(clickedHexKey);
        if (!clickedHex) return;

        // Camp Tile Selection Logic
        if (campTileSelectionInfo) {
            const { armyId, totalTiles, selectedTiles } = campTileSelectionInfo;
            const army = gameState.armies.get(armyId)!;
            const potentialTiles = getHexesInRange(army.position, CAMP_INFLUENCE_RANGE);
            const isSelectable = potentialTiles.some(h => h.q === coords.q && h.r === coords.r);
            const isArmyHomeTile = clickedHexKey === axialToString(army.position);

            if (isSelectable) {
                const newSelected = new Set(selectedTiles);
                if (newSelected.has(clickedHexKey)) {
                    if (!isArmyHomeTile) { // Cannot deselect the army's own tile
                        newSelected.delete(clickedHexKey);
                    }
                } else if (newSelected.size < totalTiles) {
                    newSelected.add(clickedHexKey);
                }

                if (newSelected.size === totalTiles) {
                    handleFinalizeCampSetup(armyId, Array.from(newSelected));
                } else {
                    setCampTileSelectionInfo({ ...campTileSelectionInfo, selectedTiles: newSelected });
                }
            } else {
                playSound('error');
            }
            return;
        }


        // Army Deployment Logic
        if (armyDeploymentInfo) {
            if(deployableHexes.has(clickedHexKey)) {
                handleFinalizeArmyDeployment(coords);
            } else {
                playSound('error');
                setArmyDeploymentInfo(null);
                setDeployableHexes(new Set());
            }
            return;
        }

        // Territory Expansion Logic
        if (expandableHexes.has(clickedHexKey) && selectedHex) {
            const selectedHexKey = axialToString(selectedHex);
            const cityId = gameState.hexes.get(selectedHexKey)?.cityId;
            const city = cityId ? gameState.cities.get(cityId) : null;
            if (city && city.ownerId === gameState.currentPlayerId && city.pendingInfluenceExpansions > 0) {
                playSound('upgrade');
                setGameState(prevGs => {
                    if (!prevGs) return null;
                    const newGs = { ...prevGs, cities: new Map(prevGs.cities) };
                    const cityToUpdate = { ...newGs.cities.get(cityId)! };
                    cityToUpdate.controlledTiles = [...cityToUpdate.controlledTiles, clickedHexKey];
                    cityToUpdate.pendingInfluenceExpansions -= 1;
                    newGs.cities.set(cityId, cityToUpdate);
                    return newGs;
                });
                return;
            }
        }

        const selectedArmy = selectedArmyId ? gameState.armies.get(selectedArmyId) : null;

        if (selectedArmy && selectedArmy.ownerId === gameState.currentPlayerId) {
            // An army is selected, so this click is an order
            if (attackableHexes.has(clickedHexKey)) {
                // ATTACK
                playSound('attack');
                setGameState(prevGs => {
                    if (!prevGs) return null;
                    const newGs = { ...prevGs, hexes: new Map(prevGs.hexes), units: new Map(prevGs.units), cities: new Map(prevGs.cities), armies: new Map(prevGs.armies), players: prevGs.players.map(p => ({...p})) };
                    
                    const attackerArmy = { ...newGs.armies.get(selectedArmy.id)! };
                    const defenderHex = newGs.hexes.get(clickedHexKey)!;
                    const defenderArmyId = defenderHex.armyId;
                    
                    // Update culture for attacking
                    const playerToUpdate = newGs.players.find(p => p.id === attackerArmy.ownerId)!;
                    playerToUpdate.culture.militarism = Math.min(100, playerToUpdate.culture.militarism + 2);
                    playerToUpdate.actionsThisTurn.attacks += 1;

                    if (defenderArmyId) {
                        const defenderArmy = { ...newGs.armies.get(defenderArmyId)! };
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

                            // Attacker damages defender
                            const damageToDefender = Math.max(0, attackerUnitDef.attack - (defenderUnitDef.defense + terrainBonus + campBonus));
                            defenderUnit.hp -= damageToDefender;

                            // Defender damages attacker (counter-attack)
                            const damageToAttacker = Math.max(0, defenderUnitDef.attack - attackerUnitDef.defense);
                            attackerUnit.hp -= damageToAttacker;
                            
                             // Check for deaths
                            if (defenderUnit.hp <= 0) {
                                defenderArmy.unitIds.shift();
                                newGs.units.delete(defenderUnit.id);
                            }
                            if (attackerUnit.hp <= 0) {
                                attackerArmy.unitIds.shift();
                                newGs.units.delete(attackerUnit.id);
                            }
                        }
                        
                        // Update or delete defender army
                        if (defenderArmy.unitIds.length === 0) {
                            newGs.armies.delete(defenderArmy.id);
                            const hexToUpdate = { ...newGs.hexes.get(clickedHexKey)! };
                            delete hexToUpdate.armyId;
                            newGs.hexes.set(clickedHexKey, hexToUpdate);
                        } else {
                            newGs.armies.set(defenderArmy.id, defenderArmy);
                        }
                    }
                    
                    attackerArmy.movementPoints = 0;
                     // Update or delete attacker army
                    if (attackerArmy.unitIds.length === 0) {
                        newGs.armies.delete(attackerArmy.id);
                        const startHexKey = axialToString(attackerArmy.position);
                        const hexToUpdate = { ...newGs.hexes.get(startHexKey)! };
                        delete hexToUpdate.armyId;
                        newGs.hexes.set(startHexKey, hexToUpdate);
                    } else {
                        newGs.armies.set(attackerArmy.id, attackerArmy);
                    }
                    
                    return newGs;
                });
                selectHex(null);
            } else if (reachableHexes.has(clickedHexKey)) {
                // MOVE / MERGE / GARRISON
                const destinationHex = gameState.hexes.get(clickedHexKey)!;
                const destinationArmyId = destinationHex.armyId;
                const destinationCityId = destinationHex.cityId;

                // 1. MERGE LOGIC
                if (destinationArmyId) {
                    const destinationArmy = gameState.armies.get(destinationArmyId);
                    if (destinationArmy && destinationArmy.ownerId === selectedArmy.ownerId) {
                        playSound('upgrade'); // Use a distinct sound for merging
                        setGameState(prevGs => {
                            if (!prevGs) return prevGs;
                            const newGs = { ...prevGs, armies: new Map(prevGs.armies), hexes: new Map(prevGs.hexes), units: new Map(prevGs.units) };
                            
                            const movingArmy = newGs.armies.get(selectedArmy.id)!;
                            const stationaryArmy = { ...newGs.armies.get(destinationArmy.id)! };

                            // Combine units
                            stationaryArmy.unitIds.push(...movingArmy.unitIds);

                            // Recalculate max movement for the merged army
                            const allUnitsInMergedArmy = stationaryArmy.unitIds.map(id => newGs.units.get(id)!);
                            stationaryArmy.maxMovementPoints = Math.min(...allUnitsInMergedArmy.map(u => UNIT_DEFINITIONS[u.type].movement));
                            stationaryArmy.movementPoints = 0; // Move is complete

                            newGs.armies.set(stationaryArmy.id, stationaryArmy);

                            // Remove the moving army
                            newGs.armies.delete(movingArmy.id);
                            const movingArmyStartHex = { ...newGs.hexes.get(axialToString(movingArmy.position))! };
                            delete movingArmyStartHex.armyId;
                            newGs.hexes.set(axialToString(movingArmy.position), movingArmyStartHex);

                            return newGs;
                        });
                        selectHex(coords); // Select the merged army's hex
                        return; // End click handling
                    }
                }

                // 2. GARRISON LOGIC
                if (destinationCityId) {
                    const destinationCity = gameState.cities.get(destinationCityId);
                    if (destinationCity && destinationCity.ownerId === selectedArmy.ownerId) {
                        playSound('move');
                        setGameState(prevGs => {
                            if (!prevGs) return prevGs;
                            
                            const newGs = { ...prevGs, cities: new Map(prevGs.cities), armies: new Map(prevGs.armies), hexes: new Map(prevGs.hexes), units: new Map(prevGs.units) };
                            const cityToUpdate = { ...newGs.cities.get(destinationCity.id)! };
                            const armyToMerge = newGs.armies.get(selectedArmy.id)!;
                            
                            for(const unitId of armyToMerge.unitIds) {
                                const unit = newGs.units.get(unitId)!;
                                cityToUpdate.food += unit.foodStored;
                                unit.foodStored = 0;
                            }
                            
                            cityToUpdate.garrison.push(...armyToMerge.unitIds);
                            newGs.cities.set(destinationCity.id, cityToUpdate);

                            newGs.armies.delete(selectedArmy.id);
                            const armyHex = { ...newGs.hexes.get(axialToString(armyToMerge.position))! };
                            delete armyHex.armyId;
                            newGs.hexes.set(axialToString(armyToMerge.position), armyHex);

                            return newGs;
                        });
                        selectHex(null);
                        return;
                    }
                }

                // 3. REGULAR MOVE
                playSound('move');
                const startHexKey = axialToString(selectedArmy.position);
                setGameState(prevGs => {
                    if (!prevGs) return null;
                    const newGs = { ...prevGs, hexes: new Map(prevGs.hexes), armies: new Map(prevGs.armies) };
                    
                    const startHex = { ...newGs.hexes.get(startHexKey)! };
                    delete startHex.armyId;
                    newGs.hexes.set(startHexKey, startHex);
                    
                    const endHex = { ...newGs.hexes.get(clickedHexKey)! };
                    endHex.armyId = selectedArmy.id;
                    newGs.hexes.set(clickedHexKey, endHex);
                    
                    const moveCost = 1; // Simplified cost
                    const newArmy = { ...selectedArmy, position: coords, movementPoints: selectedArmy.movementPoints - moveCost }; 
                    newGs.armies.set(selectedArmy.id, newArmy);
                    return newGs;
                });
                selectHex(coords);
            } else {
                playSound('error');
                selectHex(coords);
            }
        } else {
            selectHex(coords);
        }

    }, [gameState, selectedHex, selectedArmyId, reachableHexes, attackableHexes, expandableHexes, deployableHexes, armyDeploymentInfo, campTileSelectionInfo, isAITurning, gameOverMessage, selectHex, isCityScreenOpen, isCampScreenOpen, armyFormationSource, isCultureScreenOpen, handleFinalizeCampSetup]);

    const handleEndTurn = useCallback((currentGs: GameState) => {
        if (isAITurning || gameOverMessage) return;
        playSound('endTurn');
        setGameState(() => {
            let newGs: GameState = deepCloneGameState(currentGs);
            
            const currentPlayerId = newGs.currentPlayerId;
            const nextPlayerId = currentPlayerId === 1 ? 2 : 1;
            const currentPlayer = newGs.players.find(p => p.id === currentPlayerId)!;

            // 0. Global Resource Gathering (Wood, Stone, Hides, Obsidian)
            for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                for (const tileKey of city.controlledTiles) {
                    const hex = newGs.hexes.get(tileKey);
                    if (!hex || hex.armyId || hex.cityId) continue; // Don't gather from occupied tiles

                    currentPlayer.wood += hex.currentWood;
                    hex.currentWood = 0;
                    
                    currentPlayer.stone += hex.currentStone;
                    hex.currentStone = 0; // Depletable

                    currentPlayer.hides += hex.currentHides;
                    hex.currentHides = 0;
                    
                    currentPlayer.obsidian += hex.currentObsidian;
                    hex.currentObsidian = 0; // Depletable
                }
            }
            
            // Reset wasStarving flag for current player's armies
            for (const hex of newGs.hexes.values()) {
                const armyOnHex = hex.armyId ? newGs.armies.get(hex.armyId) : undefined;
                if (armyOnHex && armyOnHex.ownerId === currentPlayerId) {
                    delete hex.wasStarving;
                }
            }
            
            // Set wasStarving flag for armies that will starve this turn
            for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
                const armyHex = newGs.hexes.get(axialToString(army.position));
                if (!armyHex) continue;

                const unitsInArmy = army.unitIds.map(id => newGs.units.get(id)!);
                const totalConsumption = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
                const totalFoodStored = unitsInArmy.reduce((sum, u) => sum + u.foodStored, 0);
                
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

            // 1. Army Food Processing (Gathering & Consumption with pooled resources)
            for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
                const unitsInArmy = army.unitIds.map(id => newGs.units.get(id)!);
                if (unitsInArmy.length === 0) continue;

                // Step 1: Pool resources
                let foodPool = unitsInArmy.reduce((sum, u) => sum + u.foodStored, 0);
                const totalCarryCapacity = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].carryCapacity, 0);
                let totalGatherRate = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodGatherRate, 0);
                if (army.isCamped && army.buildings?.includes(CampBuildingType.ForagingPost)) {
                    totalGatherRate += CAMP_BUILDING_DEFINITIONS[CampBuildingType.ForagingPost].foodGatherBonus!;
                }
                const totalConsumption = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);

                // Step 2: Gather food from hex/tiles
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

                // Step 3: Consume food
                if (foodPool >= totalConsumption) {
                    foodPool -= totalConsumption;
                } else {
                    // Starvation
                    for (const unit of unitsInArmy) {
                        unit.hp -= STARVATION_DAMAGE;
                        starvedUnitIds.add(unit.id);
                    }
                    foodPool = 0;
                }

                // Step 4: Redistribute food back to units, respecting total capacity
                foodPool = Math.min(foodPool, totalCarryCapacity);

                // Clear all stored food first
                for (const unit of unitsInArmy) {
                    unit.foodStored = 0;
                }

                // Redistribute remaining food, prioritizing units with larger capacity
                const sortedUnits = [...unitsInArmy].sort((a, b) => UNIT_DEFINITIONS[b.type].carryCapacity - UNIT_DEFINITIONS[a.type].carryCapacity);
                for (const unit of sortedUnits) {
                    if (foodPool <= 0) break;
                    const unitDef = UNIT_DEFINITIONS[unit.type];
                    const amountToStore = Math.min(foodPool, unitDef.carryCapacity);
                    unit.foodStored = amountToStore;
                    foodPool -= amountToStore;
                }
            }
            
            // 2. City Food Gathering
            const hasFishing = currentPlayer.unlockedTechs.includes('fishing');
            const fishingFoodBonus = hasFishing ? TECH_TREE['fishing'].effects.find(e => e.payload.bonus === 'food_from_water')?.payload.value ?? 0 : 0;
            
            for(const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                for (const tileKey of city.controlledTiles) {
                    const hex = newGs.hexes.get(tileKey);
                    if(!hex) continue;
        
                    // Regular land-based gathering from unoccupied tiles
                    if(!hex.armyId && !hex.cityId) { 
                        const foodToGather = Math.min(hex.currentFood, TERRAIN_DEFINITIONS[hex.terrain].foodRegrowth);
                        city.food += foodToGather;
                        hex.currentFood -= foodToGather;
                    }

                    // Fishing bonus from water tiles
                    if(hex.terrain === TerrainType.Lake || hex.terrain === TerrainType.Sea) {
                        city.food += fishingFoodBonus;
                    }
                }
            }

            // 2b. City Food Capacity and Storage Limit
            for(const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                let capacity = BASE_CITY_FOOD_STORAGE;
                for(const buildingType of city.buildings) {
                    capacity += BUILDING_DEFINITIONS[buildingType].foodStorageBonus ?? 0;
                }
                city.foodStorageCapacity = capacity;
                city.food = Math.min(city.food, city.foodStorageCapacity);
            }

            // 3. City Food Consumption & Starvation
            for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                const garrisonUnits = city.garrison.map(id => newGs.units.get(id)!);
                const totalConsumption = garrisonUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
                city.food -= totalConsumption;
                if (city.food < 0) {
                    // Starvation in city
                    for (const unit of garrisonUnits) {
                        unit.hp -= STARVATION_DAMAGE;
                        starvedUnitIds.add(unit.id);
                    }
                    city.food = 0;
                }
            }

            // 4. City Production
            for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                if (city.buildQueue.length > 0) {
                    const garrisonUnits = city.garrison.map(id => newGs.units.get(id)!);
                    const cityProduction = garrisonUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].productionYield, 0);

                    const item = city.buildQueue[0];
                    item.progress += cityProduction;
                    if (item.progress >= item.productionCost) {
                        playSound('build');
                        if (item.type === 'unit') {
                            const unitDef = UNIT_DEFINITIONS[item.itemType as UnitType];
                            const newUnitId = generateId();
                            newGs.units.set(newUnitId, { 
                                id: newUnitId, 
                                type: item.itemType as UnitType, 
                                ownerId: city.ownerId, 
                                hp: unitDef.maxHp, 
                                foodStored: 0,
                                gender: unitDef.gender ?? Gender.None
                            });
                            city.garrison.push(newUnitId);
                        } else {
                             city.buildings.push(item.itemType as BuildingType);
                        }
                        city.buildQueue.shift();
                    }
                }
            }

            // 5. Camp Production
            for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped)) {
                if (army.buildQueue && army.buildQueue.length > 0) {
                    const armyUnits = army.unitIds.map(id => newGs.units.get(id)!);
                    const armyProduction = armyUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].productionYield, 0);

                    const item = army.buildQueue[0];
                    item.progress += armyProduction;
                    if (item.progress >= item.productionCost) {
                        playSound('build');
                        if (item.type === 'unit') {
                            const unitDef = UNIT_DEFINITIONS[item.itemType as UnitType];
                            const newUnitId = generateId();
                            newGs.units.set(newUnitId, { 
                                id: newUnitId, 
                                type: item.itemType as UnitType, 
                                ownerId: army.ownerId, 
                                hp: unitDef.maxHp, 
                                foodStored: 0,
                                gender: unitDef.gender ?? Gender.None
                            });
                            army.unitIds.push(newUnitId);
                        } else { // 'building'
                             army.buildings!.push(item.itemType as CampBuildingType);
                        }
                        army.buildQueue.shift();
                    }
                }
            }

            // 6. Update City/Camp Population & Leveling
            for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                city.population = city.garrison.length;
            }
             for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped)) {
                army.population = army.unitIds.length;
                if (army.level !== undefined && army.nextPopulationMilestone !== undefined && army.population >= army.nextPopulationMilestone) {
                    army.level += 1;
                    army.nextPopulationMilestone += CAMP_POPULATION_PER_LEVEL;
                    playSound('levelUp');
                }
            }
            
            // 7. Reproduction and Aging
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
            // Add newborns to the game state
            for (const { container, unit } of unitsBornThisTurn) {
                newGs.units.set(unit.id, unit);
                if ('unitIds' in container) { // It's an Army
                    container.unitIds.push(unit.id);
                } else { // It's a City
                    container.garrison.push(unit.id);
                }
            }
            
            // 8. Healing & Income & Research
            currentPlayer.gold += calculateIncome(currentPlayerId, newGs);
            
            // Research Points
            let totalResearchYield = 0;
            for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                const garrisonUnits = city.garrison.map(id => newGs.units.get(id)!);
                totalResearchYield += garrisonUnits.reduce((sum, u) => sum + (UNIT_DEFINITIONS[u.type].researchYield ?? 0), 0);
            }
            for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
                const armyUnits = army.unitIds.map(id => newGs.units.get(id)!);
                totalResearchYield += armyUnits.reduce((sum, u) => sum + (UNIT_DEFINITIONS[u.type].researchYield ?? 0), 0);
            }

            if (currentPlayer.currentResearchId) {
                const tech = TECH_TREE[currentPlayer.currentResearchId];
                currentPlayer.researchProgress += totalResearchYield;
                if (currentPlayer.researchProgress >= tech.cost) {
                    playSound('research');
                    currentPlayer.unlockedTechs.push(currentPlayer.currentResearchId);
                    const pointsOverflow = currentPlayer.researchProgress - tech.cost;
                    currentPlayer.currentResearchId = null;
                    currentPlayer.researchProgress = 0;
                    currentPlayer.researchPoints += pointsOverflow;
                }
            } else {
                currentPlayer.researchPoints += totalResearchYield;
            }
            
            // Healing Logic
            const friendlyTiles = new Set<string>();
            for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                city.controlledTiles.forEach(tileKey => friendlyTiles.add(tileKey));
            }
            for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId && a.isCamped && a.controlledTiles)) {
                army.controlledTiles.forEach(tileKey => friendlyTiles.add(tileKey));
            }

            const processHealingForGroup = (unitIds: string[]) => {
                const unitsInGroup = unitIds.map(id => newGs.units.get(id)!);
                const healingBonus = unitsInGroup.reduce((sum, u) => sum + (UNIT_DEFINITIONS[u.type].healingBonus ?? 0), 0);
                const baseHealAmount = 1;
                const totalHealAmount = baseHealAmount + healingBonus;

                for (const unit of unitsInGroup) {
                    if (unit.ownerId === currentPlayerId && !starvedUnitIds.has(unit.id)) {
                        const unitDef = UNIT_DEFINITIONS[unit.type];
                        if (unit.hp > 0 && unit.hp < unitDef.maxHp) {
                            unit.hp = Math.min(unitDef.maxHp, unit.hp + totalHealAmount);
                        }
                    }
                }
            };

            for (const army of Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId)) {
                if (friendlyTiles.has(axialToString(army.position))) {
                    processHealingForGroup(army.unitIds);
                }
            }
            for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
                processHealingForGroup(city.garrison);
            }
            
            // 9. CULTURAL SHIFTS
            const playerToUpdate = currentPlayer;
            
            // Nomadism
            const unitsInArmies = Array.from(newGs.armies.values()).filter(a => a.ownerId === currentPlayerId).reduce((sum, a) => sum + a.unitIds.length, 0);
            const unitsInCities = Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId).reduce((sum, c) => sum + c.garrison.length, 0);
            const totalUnits = unitsInArmies + unitsInCities;
            if (totalUnits > 0) {
                const nomadicRatio = unitsInArmies / totalUnits;
                const shift = (nomadicRatio - 0.5) * 4; // Shift by up to +/- 2 per turn
                playerToUpdate.culture.nomadism = Math.max(-100, Math.min(100, playerToUpdate.culture.nomadism + shift));
            }

            // Gender Roles
            const allPlayerUnits = Array.from(newGs.units.values()).filter(u => u.ownerId === currentPlayerId);
            const maleUnits = allPlayerUnits.filter(u => u.gender === Gender.Male).length;
            const femaleUnits = allPlayerUnits.filter(u => u.gender === Gender.Female).length;
            if (maleUnits + femaleUnits > 0) {
                const matriarchalRatio = femaleUnits / (maleUnits + femaleUnits);
                const shift = (matriarchalRatio - 0.5) * 4; // Shift by up to +/- 2 per turn
                playerToUpdate.culture.genderRoles = Math.max(-100, Math.min(100, playerToUpdate.culture.genderRoles + shift));
            }
            
            // Militarism decay if no attacks were made
            if (playerToUpdate.actionsThisTurn.attacks === 0) {
                playerToUpdate.culture.militarism = Math.max(-100, playerToUpdate.culture.militarism - 1);
            }
            playerToUpdate.actionsThisTurn = { attacks: 0 }; // Reset for next turn

            // Check for new cultural aspect unlocks
            for (const aspect of Object.values(CULTURAL_ASPECTS)) {
                if (!playerToUpdate.culture.unlockedAspects.includes(aspect.id)) {
                    const conditionsMet = aspect.unlockConditions.every(cond => {
                        const currentValue = playerToUpdate.culture[cond.axis];
                        return cond.threshold > 0 ? currentValue >= cond.threshold : currentValue <= cond.threshold;
                    });
                    if (conditionsMet) {
                        playerToUpdate.culture.unlockedAspects.push(aspect.id);
                        playSound('upgrade');
                    }
                }
            }


            // 10. Reset movement points for NEXT player's armies
            newGs.armies.forEach(army => {
                 if (army.ownerId === nextPlayerId && !army.isCamped) {
                    army.movementPoints = army.maxMovementPoints;
                 }
            });
            
            // 11. Advance turn & Global Resource Regrowth
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
        });
        selectHex(null);
    }, [isAITurning, gameOverMessage, selectHex]);

    const runAITurn = useCallback(async (gs: GameState) => {
        setIsAITurning(true);
        // Add a small delay for UX so the turn change is visible
        await new Promise(resolve => setTimeout(resolve, 500));

        let newGs = deepCloneGameState(gs);
        const aiPlayer = newGs.players.find(p => p.id === 2)!;
        const playerCapital = Array.from(newGs.cities.values()).find(c => c.ownerId === 1);

        // --- AI City Management ---
        const aiCities = Array.from(newGs.cities.values()).filter(c => c.ownerId === aiPlayer.id);
        for (const city of aiCities) {
            // 1. Production: If queue is empty, build a cheap unit.
            if (city.buildQueue.length === 0) {
                const unitDef = UNIT_DEFINITIONS[UnitType.Tribesman];
                if (aiPlayer.gold >= unitDef.cost) {
                    aiPlayer.gold -= unitDef.cost;
                    city.buildQueue.push({
                        id: generateId(),
                        type: 'unit',
                        itemType: UnitType.Tribesman,
                        productionCost: unitDef.productionCost,
                        progress: 0,
                    });
                }
            }

            // 2. Form Army: If garrison is large enough, send out an army.
            if (city.garrison.length >= 2) {
                let deployHexKey: string | null = null;
                for (const dir of axialDirections) {
                    const neighborPos = { q: city.position.q + dir.q, r: city.position.r + dir.r };
                    const neighborKey = axialToString(neighborPos);
                    const neighborHex = newGs.hexes.get(neighborKey);
                    if (neighborHex && !neighborHex.armyId && !neighborHex.cityId) {
                        deployHexKey = neighborKey;
                        break;
                    }
                }

                if (deployHexKey) {
                    const deployPos = stringToAxial(deployHexKey);
                    const unitsToDeployIds = city.garrison.slice(0, 2);
                    city.garrison = city.garrison.slice(2);

                    const unitsInArmy = unitsToDeployIds.map(id => newGs.units.get(id)!);
                    const slowestSpeed = Math.min(...unitsInArmy.map(u => UNIT_DEFINITIONS[u.type].movement));

                    const newArmy: Army = {
                        id: generateId(),
                        ownerId: aiPlayer.id,
                        position: deployPos,
                        unitIds: unitsToDeployIds,
                        movementPoints: slowestSpeed,
                        maxMovementPoints: slowestSpeed,
                        name: "AI Marauders",
                        foundingTurn: newGs.turn
                    };
                    newGs.armies.set(newArmy.id, newArmy);
                    const targetHex = newGs.hexes.get(deployHexKey)!;
                    targetHex.armyId = newArmy.id;
                }
            }
        }

        // --- AI Army Management ---
        const aiArmies = Array.from(newGs.armies.values()).filter(a => a.ownerId === aiPlayer.id);
        for (const army of aiArmies) {
             if (!newGs.armies.has(army.id) || army.isCamped) continue;

            // Make sure army has movement points for this turn
            army.movementPoints = army.maxMovementPoints;

            // 1. Attack if possible
            const attackable = findAttackableHexes(army.position, army, newGs);
            if (attackable.size > 0) {
                const targetHexKey = Array.from(attackable)[0];
                const targetHex = newGs.hexes.get(targetHexKey)!;
                const defenderArmyId = targetHex.armyId;

                // Simple combat logic, army vs army only for now
                if (defenderArmyId) {
                    const defenderArmy = newGs.armies.get(defenderArmyId)!;
                    const attackerUnit = newGs.units.get(army.unitIds[0]);
                    const defenderUnit = newGs.units.get(defenderArmy.unitIds[0]);

                    if (attackerUnit && defenderUnit) {
                        const attackerUnitDef = UNIT_DEFINITIONS[attackerUnit.type];
                        const defenderUnitDef = UNIT_DEFINITIONS[defenderUnit.type];
                        const terrainBonus = TERRAIN_DEFINITIONS[targetHex.terrain].defenseBonus;

                        const damageToDefender = Math.max(0, attackerUnitDef.attack - (defenderUnitDef.defense + terrainBonus));
                        defenderUnit.hp -= damageToDefender;

                        const damageToAttacker = Math.max(0, defenderUnitDef.attack - attackerUnitDef.defense);
                        attackerUnit.hp -= damageToAttacker;

                        if (defenderUnit.hp <= 0) {
                            defenderArmy.unitIds.shift();
                            newGs.units.delete(defenderUnit.id);
                        }
                        if (attackerUnit.hp <= 0) {
                            army.unitIds.shift();
                            newGs.units.delete(attackerUnit.id);
                        }

                        if (defenderArmy.unitIds.length === 0) {
                            newGs.armies.delete(defenderArmy.id);
                            targetHex.armyId = undefined;
                        }
                        if (army.unitIds.length === 0) {
                            const attackerHex = newGs.hexes.get(axialToString(army.position))!;
                            attackerHex.armyId = undefined;
                            newGs.armies.delete(army.id);
                        }
                    }
                }
                army.movementPoints = 0;
                continue; // Done with this army, move to next
            }

            // 2. Move towards player capital if no attack is possible
            if (playerCapital && army.movementPoints > 0) {
                let bestNeighbor: AxialCoords | null = null;
                let minDistance = hexDistance(army.position, playerCapital.position);

                for (const dir of axialDirections) {
                    const neighborPos = { q: army.position.q + dir.q, r: army.position.r + dir.r };
                    const neighborKey = axialToString(neighborPos);
                    const neighborHex = newGs.hexes.get(neighborKey);

                    if (neighborHex && !neighborHex.armyId && !neighborHex.cityId) {
                        const terrainDef = TERRAIN_DEFINITIONS[neighborHex.terrain];
                        if (terrainDef.movementCost < 99 && army.movementPoints >= terrainDef.movementCost) {
                            const dist = hexDistance(neighborPos, playerCapital.position);
                            if (dist < minDistance) {
                                minDistance = dist;
                                bestNeighbor = neighborPos;
                            }
                        }
                    }
                }

                if (bestNeighbor) {
                    const moveCost = TERRAIN_DEFINITIONS[newGs.hexes.get(axialToString(bestNeighbor))!.terrain].movementCost;
                    
                    const oldHex = newGs.hexes.get(axialToString(army.position))!;
                    oldHex.armyId = undefined;

                    const newHex = newGs.hexes.get(axialToString(bestNeighbor))!;
                    newHex.armyId = army.id;

                    army.position = bestNeighbor;
                    army.movementPoints -= moveCost;
                }
            }
        }

        handleEndTurn(newGs);
        setIsAITurning(false);
    }, [handleEndTurn, findAttackableHexes]);

    useEffect(() => {
        if (gameState && gameState.currentPlayerId === 2 && !isAITurning && !gameOverMessage) {
            runAITurn(gameState);
        }
    }, [gameState, isAITurning, runAITurn, gameOverMessage]);

    const handleStartFormArmy = useCallback((sourceId: string, sourceType: 'city' | 'army') => {
        if (!gameState) return;
        setArmyFormationSource({ sourceId, sourceType });
    }, [gameState]);

    const handleToggleCamp = useCallback((armyId: string) => {
        if (!gameState || isAITurning || campTileSelectionInfo) return;
        
        const army = gameState.armies.get(armyId);
        if (!army || army.ownerId !== gameState.currentPlayerId) return;

        if (army.isCamped) {
             // Breaking camp
            playSound('build'); 
            setGameState(prevGs => {
                if (!prevGs) return null;
                const newGs = { ...prevGs, armies: new Map(prevGs.armies) };
                const newArmy = { ...newGs.armies.get(armyId)! };
                newArmy.isCamped = false;
                newArmy.controlledTiles = [];
                newArmy.movementPoints = newArmy.maxMovementPoints;
                newGs.armies.set(armyId, newArmy);
                return newGs;
            });
        } else {
            // Making camp - enter selection mode
            if (army.movementPoints > 0) {
                const totalTilesToSelect = 1 + (army.level || 1);
                setCampTileSelectionInfo({
                    armyId: armyId,
                    totalTiles: totalTilesToSelect,
                    selectedTiles: new Set([axialToString(army.position)])
                });
            } else {
                playSound('error');
            }
        }
    }, [gameState, isAITurning, campTileSelectionInfo]);

    const handleConfirmArmyFormation = useCallback((unitsToMove: { unitType: UnitType; count: number }[]) => {
        if (!gameState || !armyFormationSource) return;
        
        const info: ArmyDeploymentInfo = { ...armyFormationSource, unitsToMove };
        setArmyDeploymentInfo(info);
        setArmyFormationSource(null);

        let sourcePosition: AxialCoords | undefined;
        if(info.sourceType === 'city') {
            sourcePosition = gameState.cities.get(info.sourceId)?.position;
        } else {
            sourcePosition = gameState.armies.get(info.sourceId)?.position;
        }

        if (!sourcePosition) return;

        const newDeployableHexes = new Set<string>();
        for (const dir of axialDirections) {
            const neighborPos = { q: sourcePosition.q + dir.q, r: sourcePosition.r + dir.r };
            const neighborKey = axialToString(neighborPos);
            const neighborHex = gameState.hexes.get(neighborKey);
            if (neighborHex && !neighborHex.armyId && !neighborHex.cityId) {
                newDeployableHexes.add(neighborKey);
            }
        }
        setDeployableHexes(newDeployableHexes);
    }, [gameState, armyFormationSource]);

    const handleFinalizeArmyDeployment = useCallback((targetPosition: AxialCoords) => {
        if (!gameState || !armyDeploymentInfo) return;
        playSound('upgrade');

        setGameState(prevGs => {
            if (!prevGs) return null;
            const newGs = { ...prevGs, cities: new Map(prevGs.cities), armies: new Map(prevGs.armies), units: new Map(prevGs.units), hexes: new Map(prevGs.hexes) };
            const { sourceId, sourceType, unitsToMove } = armyDeploymentInfo;

            const unitIdsToDeploy: string[] = [];
            const availableUnits = sourceType === 'city' ? 
                [...(newGs.cities.get(sourceId)?.garrison ?? [])] :
                [...(newGs.armies.get(sourceId)?.unitIds ?? [])];

            for (const { unitType, count } of unitsToMove) {
                const matchingUnitIds = availableUnits
                    .map(id => newGs.units.get(id)!)
                    .filter(u => u.type === unitType)
                    .slice(0, count)
                    .map(u => u.id);
                unitIdsToDeploy.push(...matchingUnitIds);
            }

            if (unitIdsToDeploy.length === 0) return newGs; // Should not happen with validation

            // Update source
            if (sourceType === 'city') {
                const city = { ...newGs.cities.get(sourceId)! };
                city.garrison = city.garrison.filter(id => !unitIdsToDeploy.includes(id));
                newGs.cities.set(sourceId, city);
            } else { // 'army'
                const sourceArmy = { ...newGs.armies.get(sourceId)! };
                sourceArmy.unitIds = sourceArmy.unitIds.filter(id => !unitIdsToDeploy.includes(id));
                // If source army is empty, delete it
                if (sourceArmy.unitIds.length === 0) {
                    const sourceHex = { ...newGs.hexes.get(axialToString(sourceArmy.position))! };
                    delete sourceHex.armyId;
                    newGs.hexes.set(axialToString(sourceArmy.position), sourceHex);
                    newGs.armies.delete(sourceId);
                } else {
                    newGs.armies.set(sourceId, sourceArmy);
                }
            }

            // Create new army
            const unitsInArmy = unitIdsToDeploy.map(id => newGs.units.get(id)!);
            const slowestUnitSpeed = Math.min(...unitsInArmy.map(u => UNIT_DEFINITIONS[u.type].movement));
            const armyId = generateId();
            const newArmy: Army = { 
                id: armyId, 
                ownerId: unitsInArmy[0].ownerId, 
                position: targetPosition, 
                unitIds: unitIdsToDeploy, 
                movementPoints: 0, 
                maxMovementPoints: slowestUnitSpeed,
                name: "Army",
                foundingTurn: newGs.turn
            };
            newGs.armies.set(armyId, newArmy);
            
            const targetHex = { ...newGs.hexes.get(axialToString(targetPosition))! };
            targetHex.armyId = armyId;
            newGs.hexes.set(axialToString(targetPosition), targetHex);
            
            return newGs;
        });

        selectHex(targetPosition);
        setArmyDeploymentInfo(null);
        setDeployableHexes(new Set());
    }, [gameState, armyDeploymentInfo, selectHex]);

    const handleProduceUnit = useCallback((unitType: UnitType, cityId: string) => {
        if (!gameState || isAITurning || gameOverMessage) return;
        const city = gameState.cities.get(cityId);
        if (!city || city.ownerId !== gameState.currentPlayerId) return;
        const player = gameState.players.find(p => p.id === gameState.currentPlayerId)!;
        const unitDef = UNIT_DEFINITIONS[unitType];

        const isAdvancedMale = unitDef.gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman].includes(unitType);
        let sacrificeUnitId: string | undefined = undefined;

        if (isAdvancedMale) {
            const garrisonUnits = city.garrison.map(id => gameState.units.get(id)!);
            const sacrificeUnit = garrisonUnits.find(u => u.type === UnitType.Tribesman);
            if (!sacrificeUnit) {
                playSound('error');
                return; // Button should have been disabled, but check anyway
            }
            sacrificeUnitId = sacrificeUnit.id;
        }

        if (player.gold < unitDef.cost) {
            playSound('error');
            return;
        }

        playSound('build');
        setGameState(prevGs => {
            if (!prevGs) return null;
            const newGs = { ...prevGs, cities: new Map(prevGs.cities), players: prevGs.players.map(p => ({...p})), units: new Map(prevGs.units) };
            const playerToUpdate = newGs.players.find(p => p.id === player.id)!;
            playerToUpdate.gold -= unitDef.cost;
            const cityToUpdate = { ...newGs.cities.get(cityId)! };

            // Consume sacrifice unit
            if (sacrificeUnitId) {
                cityToUpdate.garrison = cityToUpdate.garrison.filter(id => id !== sacrificeUnitId);
                newGs.units.delete(sacrificeUnitId);
            }

            cityToUpdate.buildQueue.push({ id: generateId(), type: 'unit', itemType: unitType, productionCost: unitDef.productionCost, progress: 0 });
            newGs.cities.set(cityId, cityToUpdate);
            return newGs;
        });
    }, [gameState, isAITurning, gameOverMessage]);

    const handleProduceInCamp = useCallback((armyId: string, itemType: UnitType | CampBuildingType, type: 'unit' | 'building') => {
        if (!gameState || isAITurning || gameOverMessage) return;
        
        const army = gameState.armies.get(armyId);
        if (!army || army.ownerId !== gameState.currentPlayerId || !army.isCamped) return;
        
        const player = gameState.players.find(p => p.id === gameState.currentPlayerId)!;
        
        const def = type === 'unit' 
            ? UNIT_DEFINITIONS[itemType as UnitType] 
            : CAMP_BUILDING_DEFINITIONS[itemType as CampBuildingType];

        const isAdvancedMale = type === 'unit' && (def as UnitDefinition).gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman].includes(itemType as UnitType);
        let sacrificeUnitId: string | undefined = undefined;

        if (isAdvancedMale) {
            const unitsInArmy = army.unitIds.map(id => gameState.units.get(id)!);
            const sacrificeUnit = unitsInArmy.find(u => u.type === UnitType.Tribesman);
            if (!sacrificeUnit) {
                playSound('error');
                return;
            }
            sacrificeUnitId = sacrificeUnit.id;
        }

        if (player.gold < def.cost) {
            playSound('error');
            return;
        }

        playSound('build');
        setGameState(prevGs => {
            if (!prevGs) return null;
            const newGs = { ...prevGs, armies: new Map(prevGs.armies), players: prevGs.players.map(p => ({...p})), units: new Map(prevGs.units) };
            const playerToUpdate = newGs.players.find(p => p.id === player.id)!;
            playerToUpdate.gold -= def.cost;
            
            const armyToUpdate = { ...newGs.armies.get(armyId)! };
            armyToUpdate.buildQueue = [...(armyToUpdate.buildQueue ?? [])]; // ensure it's a new array

            if (sacrificeUnitId) {
                armyToUpdate.unitIds = armyToUpdate.unitIds.filter(id => id !== sacrificeUnitId);
                newGs.units.delete(sacrificeUnitId);
            }

            armyToUpdate.buildQueue.push({ id: generateId(), type, itemType, productionCost: def.productionCost, progress: 0 });
            newGs.armies.set(armyId, armyToUpdate);
            return newGs;
        });
    }, [gameState, isAITurning, gameOverMessage]);

    const handleBuyInfluenceTile = useCallback((cityId: string) => {
        if (!gameState || isAITurning || gameOverMessage) return;
        const city = gameState.cities.get(cityId);
        if (!city || city.ownerId !== gameState.currentPlayerId) return;
        const player = gameState.players.find(p => p.id === gameState.currentPlayerId)!;
        if (player.gold < BUY_INFLUENCE_TILE_COST) { playSound('error'); return; }
        playSound('upgrade');
        setGameState(prevGs => {
            if (!prevGs) return null;
            const newGs = { ...prevGs, cities: new Map(prevGs.cities), players: prevGs.players.map(p => ({...p})) };
            const newCity = { ...newGs.cities.get(cityId)! };
            newCity.pendingInfluenceExpansions += 1;
            newGs.cities.set(cityId, newCity);
            const newPlayer = newGs.players.find(p => p.id === player.id)!;
            newPlayer.gold -= BUY_INFLUENCE_TILE_COST;
            return newGs;
        });
    }, [gameState, isAITurning, gameOverMessage]);
    
    const handleSetCurrentResearch = useCallback((techId: string) => {
        if (!gameState || isAITurning) return;
        playSound('build');
        setGameState(prev => {
            if (!prev) return null;
            const newGs = { ...prev, players: prev.players.map(p => ({...p}))};
            const player = newGs.players.find(p => p.id === newGs.currentPlayerId)!;
            
            const tech = TECH_TREE[techId];
            const prereqsMet = tech.prerequisites.every(p => player.unlockedTechs.includes(p));

            if (player.currentResearchId !== techId && !player.unlockedTechs.includes(techId) && prereqsMet) {
                player.currentResearchId = techId;
            }
            return newGs;
        });
        setIsResearchScreenOpen(false); // Close screen after selection
    }, [gameState, isAITurning]);
    
    const handleRenameArmy = useCallback((armyId: string, newName: string) => {
        setGameState(prevGs => {
            if (!prevGs) return null;
            const army = prevGs.armies.get(armyId);
            if (!army) return prevGs;

            const newGs = { ...prevGs, armies: new Map(prevGs.armies) };
            const newArmy = { ...army, name: newName };
            newGs.armies.set(armyId, newArmy);
            return newGs;
        });
    }, []);

    const handleGoHome = () => {
        if (!gameState || !gameContainerRef.current) return;
        
        const player = gameState.players.find(p => p.id === gameState.currentPlayerId);
        if (!player) return;

        const capital = Array.from(gameState.cities.values()).find(c => c.ownerId === player.id);
        if (!capital) return;
        
        playSound('move');

        const pixelPos = axialToPixel(capital.position);
        const hexCenterX = pixelPos.x + 40; // HEX_SIZE
        const hexCenterY = pixelPos.y + (40 * Math.sqrt(3) / 2);

        const containerRect = gameContainerRef.current.getBoundingClientRect();

        setViewState(prev => {
            const newTranslateX = (containerRect.width / 2) - (hexCenterX * prev.scale);
            const newTranslateY = (containerRect.height / 2) - (hexCenterY * prev.scale);
            return {
                ...prev,
                translate: { x: newTranslateX, y: newTranslateY },
            };
        });
    };

    const handleOpenSelectionScreen = () => {
        if (!gameState || !selectedHex) return;
        const hexKey = axialToString(selectedHex);
        const hex = gameState.hexes.get(hexKey);
        if (hex?.cityId) {
            setIsCityScreenOpen(true);
        } else if (hex?.armyId) {
            const army = gameState.armies.get(hex.armyId);
            if (army?.isCamped) {
                setSelectedCampId(army.id);
                setIsCampScreenOpen(true);
            }
        }
    };

    const handleBuildBuilding = () => {};
    const toggleFogOfWar = () => setFogOfWarEnabled(prev => !prev);
    const toggleSettingsMenu = () => setIsSettingsOpen(prev => !prev);
    
    if (!gameState) return <div className="w-screen h-screen bg-gray-900 text-white flex items-center justify-center">Loading Game...</div>;
    
    const projectedIncome = calculateIncome(gameState.currentPlayerId, gameState);
    const cityOnSelectedHex = selectedHex ? gameState.cities.get(gameState.hexes.get(axialToString(selectedHex))?.cityId ?? '') : null;
    
    const campSelectableHexes = new Set<string>();
    const campSelectedHexes = new Set<string>();
    if (campTileSelectionInfo) {
        const army = gameState.armies.get(campTileSelectionInfo.armyId)!;
        const potentialHexes = getHexesInRange(army.position, CAMP_INFLUENCE_RANGE);
        potentialHexes.forEach(hexCoords => campSelectableHexes.add(axialToString(hexCoords)));
        campTileSelectionInfo.selectedTiles.forEach(key => campSelectedHexes.add(key));
    }

    return (
        <>
            <GameToolbar fogOfWarEnabled={fogOfWarEnabled} onToggleFogOfWar={toggleFogOfWar} onToggleSettings={toggleSettingsMenu} onGoHome={handleGoHome} />
            <div 
                id="game-container" 
                ref={gameContainerRef}
                className={`w-screen h-screen bg-gray-900 overflow-hidden select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} 
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <GameBoard gameState={gameState} selectedHex={selectedHex} reachableHexes={reachableHexes} attackableHexes={attackableHexes} expandableHexes={expandableHexes} deployableHexes={deployableHexes} campSelectableHexes={campSelectableHexes} campSelectedHexes={campSelectedHexes} influenceMap={influenceMap} onHexClick={handleHexClick} viewState={viewState} fogOfWarEnabled={fogOfWarEnabled} visibleHexes={visibleHexes} exploredHexes={exploredHexes} />
                <GameUI gameState={gameState} selectedHex={selectedHex} selectedUnitId={selectedUnitId} selectedArmyId={selectedArmyId} projectedIncome={projectedIncome} campTileSelectionInfo={campTileSelectionInfo} onEndTurn={() => handleEndTurn(gameState)} onBuyInfluenceTile={handleBuyInfluenceTile} onOpenSelectionScreen={handleOpenSelectionScreen} onOpenResearchScreen={() => setIsResearchScreenOpen(true)} onOpenCultureScreen={() => setIsCultureScreenOpen(true)} isAITurning={isAITurning} />
                <ArmyBar gameState={gameState} selectedHex={selectedHex} selectedUnitId={selectedUnitId} selectedArmyId={selectedArmyId} onSelectUnit={handleSelectUnit} onStartFormArmy={handleStartFormArmy} onToggleCamp={handleToggleCamp} />
            </div>
            {isCityScreenOpen && cityOnSelectedHex && <CityScreen gameState={gameState} cityId={cityOnSelectedHex.id} onClose={() => setIsCityScreenOpen(false)} onBuildBuilding={handleBuildBuilding} onProduceUnit={handleProduceUnit} />}
            {isCampScreenOpen && selectedCampId && <CampScreen gameState={gameState} armyId={selectedCampId} onClose={() => setIsCampScreenOpen(false)} onProduceInCamp={handleProduceInCamp} onRenameArmy={handleRenameArmy} />}
            {armyFormationSource && <CreateArmyScreen gameState={gameState} sourceId={armyFormationSource.sourceId} sourceType={armyFormationSource.sourceType} onClose={() => setArmyFormationSource(null)} onConfirmFormation={handleConfirmArmyFormation} />}
            {isResearchScreenOpen && <ResearchScreen gameState={gameState} onClose={() => setIsResearchScreenOpen(false)} onSetResearch={handleSetCurrentResearch} />}
            {isCultureScreenOpen && <CultureScreen gameState={gameState} onClose={() => setIsCultureScreenOpen(false)} />}
            {isSettingsOpen && <SettingsMenu volume={volume} onVolumeChange={handleVolumeChange} isMuted={isMutedState} onMuteToggle={handleMuteToggle} onClose={() => setIsSettingsOpen(false)} />}
            {gameOverMessage && <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50"><h2 className="text-6xl font-bold text-white mb-4">Game Over</h2><p className="text-3xl text-yellow-400 mb-8">{gameOverMessage}</p><button onClick={initializeGame} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-xl font-bold text-white transition-colors duration-200">Play Again</button></div>}
        </>
    );
};

export default App;