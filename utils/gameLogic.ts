import { GameState, CampBuildingType, TerrainType, City, Army, BuildQueueItem, UnitType, BuildingType, Unit, Gender, UnitDefinition, ResourceCost, Player, Hex, AxialCoords, ArmyDeploymentInfo, SicknessRiskDetails, UnitSize, TransferInfo, AIPersonality } from '../types';
import { UNIT_DEFINITIONS, STARVATION_DAMAGE, CAMP_BUILDING_DEFINITIONS, GATHERING_YIELD_PER_POINT, TERRAIN_DEFINITIONS, BASE_CITY_FOOD_STORAGE, BUILDING_DEFINITIONS, CAMP_XP_PER_TURN, CAMP_XP_PER_UNIT_PROD_COST, CAMP_XP_PER_BUILDING_PROD_COST, CAMP_XP_PER_NEW_MEMBER, INITIAL_XP_TO_NEXT_LEVEL, XP_LEVEL_MULTIPLIER, DISEASE_RISK_BASE, DISEASE_STAGNATION_INCREASE_PER_TURN, DISEASE_DAMAGE, CITY_HP, INITIAL_CITY_POPULATION, axialDirections, BUY_INFLUENCE_TILE_COST, CAMP_DEFENSE_BONUS, DISEASE_OVERCROWDING_THRESHOLD, DISEASE_OVERCROWDING_RISK_PER_UNIT, SHAMAN_RISK_REDUCTION_FLAT, MAX_SHAMAN_FLAT_REDUCTION } from '../constants';
import { TECH_TREE } from '../techtree';
import { CULTURAL_ASPECTS } from '../culture';
import { axialToString, getHexesInRange, hexDistance, stringToAxial, PriorityQueue } from './hexUtils';
import { deepCloneGameState } from './gameStateUtils';
import { generateMap } from './worldGeneration';
import { generateId } from './gameStateUtils';
import { generateArmyName } from './nameGenerator';

export function initializeGameState(width: number, height: number, numAIPlayers: number, seed?: string): GameState {
    const hexes = generateMap(width, height, seed);
        
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
    ];
    
    const aiColors = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#a855f7']; // Red, Orange, Yellow, Lime, Purple
    const personalities = [AIPersonality.Aggressive, AIPersonality.Defensive, AIPersonality.Balanced];
    for (let i = 0; i < numAIPlayers; i++) {
        const personality = personalities[Math.floor(Math.random() * personalities.length)];
        players.push({
            id: i + 2,
            name: `AI ${i + 1} (${personality})`,
            color: aiColors[i % aiColors.length],
            gold: 50,
            researchPoints: 0,
            culturePoints: 0,
            unlockedTechs: [],
            currentResearchId: 'fire_mastery',
            researchProgress: 0,
            culture: { nomadism: 0, genderRoles: 0, militarism: 0, unlockedAspects: [] },
            personality: personality,
            actionsThisTurn: { attacks: 0 },
        });
    }
    
    const units = new Map<string, Unit>();
    const cities = new Map<string, City>();

    const calculateInitialCityCapacity = (garrisonUnits: Unit[]): number => {
        return garrisonUnits.reduce((sum, unit) => sum + UNIT_DEFINITIONS[unit.type].carryCapacity, 0);
    };

    const playerPositions: AxialCoords[] = [];
    const numTotalPlayers = players.length;
    const centerQ = width / 2;
    const centerR = height / 2;
    const angleOffset = Math.random() * Math.PI * 2;
    const radius = Math.min(width, height) * 0.35;

    for (let i = 0; i < numTotalPlayers; i++) {
        const angle = ((2 * Math.PI / numTotalPlayers) * i) + angleOffset;
        let finalPos: AxialCoords;
        let attempts = 0;
        let isTooClose;
        
        do {
            isTooClose = false;
            const jitterRadius = radius * (1 + (Math.random() - 0.5) * 0.2 * (attempts / 10)); // Jitter increases with attempts
            const jitterAngle = angle + (Math.random() - 0.5) * 0.3 * (attempts / 10);
            
            const desiredPos = {
                // Approximate conversion from cartesian to axial
                q: Math.round(centerQ + jitterRadius * (2/3) * Math.cos(jitterAngle)),
                r: Math.round(centerR + jitterRadius * (-1/3 * Math.cos(jitterAngle) + Math.sqrt(3)/3 * Math.sin(jitterAngle))),
            };
            
            finalPos = findValidPlacement(desiredPos, 15);
            
            for (const existingPos of playerPositions) {
                if (hexDistance(finalPos, existingPos) < 10) { // Ensure minimum distance
                    isTooClose = true;
                    break;
                }
            }
            attempts++;
        } while (isTooClose && attempts < 20);
        
        playerPositions.push(finalPos);
    }

    players.forEach((player, index) => {
        const cityPos = playerPositions[index];
        const cityKey = axialToString(cityPos);
        const cityId = generateId();
        let startGarrisonUnits: Unit[] = [];

        for (let j = 0; j < 5; j++) {
            const manDef = UNIT_DEFINITIONS[UnitType.Tribesman];
            const manId = generateId();
            const manUnit = { id: manId, type: UnitType.Tribesman, ownerId: player.id, hp: manDef.maxHp, foodStored: 0, gender: Gender.Male, attackBonus: 0, defenseBonus: 0 };
            units.set(manId, manUnit);
            startGarrisonUnits.push(manUnit);

            const womanDef = UNIT_DEFINITIONS[UnitType.Tribeswoman];
            const womanId = generateId();
            const womanUnit = { id: womanId, type: UnitType.Tribeswoman, ownerId: player.id, hp: womanDef.maxHp, foodStored: 0, gender: Gender.Female, attackBonus: 0, defenseBonus: 0 };
            units.set(womanId, womanUnit);
            startGarrisonUnits.push(womanUnit);
        }
        
        const city: City = { 
            id: cityId, 
            name: `Capital ${player.id}`, 
            ownerId: player.id, 
            position: cityPos, 
            hp: CITY_HP, 
            maxHp: CITY_HP, 
            population: startGarrisonUnits.length, 
            food: 50, 
            foodStorageCapacity: BASE_CITY_FOOD_STORAGE, 
            level: 1, 
            buildings: [], 
            buildQueue: [], 
            garrison: startGarrisonUnits.map(u=>u.id), 
            controlledTiles: [cityKey], 
            pendingInfluenceExpansions: 0, 
            nextPopulationMilestone: INITIAL_CITY_POPULATION * 2, 
            productionFocus: 100, 
            resourceFocus: { wood: false, stone: false, hides: false, obsidian: false }, 
            isConnectedToNetwork: true, 
            localResources: { wood: 0, stone: 0, hides: 0, obsidian: 0 }, 
            storageCapacity: calculateInitialCityCapacity(startGarrisonUnits) 
        };
        cities.set(cityId, city);
        hexes.get(cityKey)!.cityId = cityId;
    });

    return {
        hexes, units, cities, players,
        armies: new Map(),
        currentPlayerId: 1,
        turn: 1,
        mapWidth: width,
        mapHeight: height,
        pendingBattle: null,
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

export const calculateReachableHexes = (start: AxialCoords, army: Army, gs: GameState): { reachable: Set<string>; costs: Map<string, number> } => {
    if (army.isCamped) return { reachable: new Set(), costs: new Map() };

    const costSoFar: Map<string, number> = new Map();
    costSoFar.set(axialToString(start), 0);
    const reachable = new Set<string>();
    
    const player = gs.players.find(p => p.id === army.ownerId)!;
    const unitsInArmy = army.unitIds.map(id => gs.units.get(id)!);

    const frontier = new PriorityQueue<{ pos: AxialCoords; cost: number }>();
    frontier.enqueue({ pos: start, cost: 0 }, 0);

    while (!frontier.isEmpty()) {
        const current = frontier.dequeue();
        if (!current) break;

        axialDirections.forEach(dir => {
            const nextCoords = { q: current.pos.q + dir.q, r: current.pos.r + dir.r };
            const nextKey = axialToString(nextCoords);
            const nextHex = gs.hexes.get(nextKey);

            if (nextHex) {
                const terrainDef = TERRAIN_DEFINITIONS[nextHex.terrain];
                let moveCost = terrainDef.movementCost;
                
                if (terrainDef.requiredTech && !player.unlockedTechs.includes(terrainDef.requiredTech)) {
                    moveCost = 99;
                }
                const isImpassableByUnit = unitsInArmy.some(u => UNIT_DEFINITIONS[u.type].size === UnitSize.Large && terrainDef.name === 'Forest');
                if (isImpassableByUnit) moveCost = 99;

                const newCost = current.cost + moveCost;
                const isOccupiedByEnemy = nextHex.armyId && gs.armies.get(nextHex.armyId)?.ownerId !== army.ownerId;

                if (newCost <= army.movementPoints && !isOccupiedByEnemy && (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)!)) {
                    costSoFar.set(nextKey, newCost);
                    frontier.enqueue({ pos: nextCoords, cost: newCost }, newCost);
                    reachable.add(nextKey);
                }
            }
        });
    }

    if (army.movementPoints > 0) {
        axialDirections.forEach(dir => {
            const nextCoords = { q: start.q + dir.q, r: start.r + dir.r };
            const nextKey = axialToString(nextCoords);
            const nextHex = gs.hexes.get(nextKey);
            
            if (nextHex) {
                const terrainDef = TERRAIN_DEFINITIONS[nextHex.terrain];
                let moveCost = terrainDef.movementCost;
                
                const isTechLocked = terrainDef.requiredTech && !player.unlockedTechs.includes(terrainDef.requiredTech);
                const isImpassableByUnit = unitsInArmy.some(u => UNIT_DEFINITIONS[u.type].size === UnitSize.Large && terrainDef.name === 'Forest');
                const isOccupiedByEnemy = nextHex.armyId && gs.armies.get(nextHex.armyId)?.ownerId !== army.ownerId;
                
                const isPassable = !isTechLocked && !isImpassableByUnit && !isOccupiedByEnemy && moveCost < 99;

                if (isPassable) {
                    reachable.add(nextKey);
                    if (!costSoFar.has(nextKey)) {
                        costSoFar.set(nextKey, moveCost);
                    }
                }
            }
        });
    }

    return { reachable, costs: costSoFar };
};

export const findAttackableHexes = (start: AxialCoords, army: Army, gs: GameState): Set<string> => {
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
};

export function processMoveArmy(gs: GameState, payload: { armyId: string; targetCoords: AxialCoords; pathCost: number; }): GameState {
    const newGs = deepCloneGameState(gs);
    const { armyId, targetCoords, pathCost } = payload;
    
    const army = newGs.armies.get(armyId)!;
    const startHex = newGs.hexes.get(axialToString(army.position))!;
    startHex.armyId = undefined;
    startHex.armyPresenceTurns = 0;
    
    const destinationHex = newGs.hexes.get(axialToString(targetCoords))!;
    destinationHex.armyId = army.id;
    
    army.position = targetCoords;
    army.movementPoints -= pathCost;

    const armyUnits = army.unitIds.map(id => newGs.units.get(id)!);
    const { risk, details } = getSicknessRisk(army, armyUnits, destinationHex);
    army.sicknessRisk = risk;
    army.sicknessRiskDetails = details;
    
    return newGs;
}

export function processClaimTile(gs: GameState, payload: { cityId: string; tileKey: string; }): GameState {
    const newGs = deepCloneGameState(gs);
    const { cityId, tileKey } = payload;
    const city = newGs.cities.get(cityId)!;
    
    if (city.pendingInfluenceExpansions > 0) {
        city.controlledTiles.push(tileKey);
        city.pendingInfluenceExpansions -= 1;
    }
    return newGs;
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
        if (sourceArmy.unitIds.length === 0 && !sourceArmy.isCamped) {
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
        name: generateArmyName(),
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

export function processConfirmTransfer(gs: GameState, payload: { transferInfo: TransferInfo; finalSourceUnitIds: string[]; finalDestinationUnitIds: string[] }): GameState {
    const newGs = deepCloneGameState(gs);
    const { transferInfo, finalSourceUnitIds, finalDestinationUnitIds } = payload;
    const { sourceArmyId, destinationId, destinationType } = transferInfo;

    const sourceArmy = newGs.armies.get(sourceArmyId)!;
    const destination = destinationType === 'city'
        ? newGs.cities.get(destinationId)!
        : newGs.armies.get(destinationId)!;

    // 1. Update unit lists
    sourceArmy.unitIds = finalSourceUnitIds;
    if ('garrison' in destination) {
        destination.garrison = finalDestinationUnitIds;
    } else {
        destination.unitIds = finalDestinationUnitIds;
    }

    // 2. Update source army
    sourceArmy.movementPoints = 0;
    if (sourceArmy.unitIds.length === 0 && !sourceArmy.isCamped) {
        const sourceHex = newGs.hexes.get(axialToString(sourceArmy.position))!;
        sourceHex.armyId = undefined;
        sourceHex.armyPresenceTurns = 0;
        newGs.armies.delete(sourceArmyId);
    } else {
        const sourceUnits = sourceArmy.unitIds.map(id => newGs.units.get(id)!);
        sourceArmy.maxMovementPoints = Math.min(...sourceUnits.map(u => UNIT_DEFINITIONS[u.type].movement));
    }

    // 3. Update destination army (if it's an army)
    if (destinationType === 'army') {
        const destArmy = destination as Army;
        const destUnits = destArmy.unitIds.map(id => newGs.units.get(id)!);
        if (destUnits.length > 0) {
            destArmy.maxMovementPoints = Math.min(...destUnits.map(u => UNIT_DEFINITIONS[u.type].movement));
        }
        if (destArmy.isCamped) {
            // Logic for XP gain on merge could be added here
        }
    }

    return newGs;
}

export function processProduceUnit(gs: GameState, payload: { unitType: UnitType, cityId: string }): GameState {
    const newGs = deepCloneGameState(gs);
    const { unitType, cityId } = payload;
    const city = newGs.cities.get(cityId)!;
    const player = newGs.players.find(p => p.id === city.ownerId)!;
    const unitDef = UNIT_DEFINITIONS[unitType];
    const cost = unitDef.cost;

    const isAdvancedMale = unitDef.gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman, UnitType.StoneWarrior].includes(unitType);
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

    const isAdvancedMale = type === 'unit' && (def as UnitDefinition).gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman, UnitType.StoneWarrior].includes(itemType as UnitType);
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

    const isAdvancedMale = item.type === 'unit' && (def as UnitDefinition).gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman, UnitType.StoneWarrior].includes(item.itemType as UnitType);
    if (isAdvancedMale) {
        const tribesmanDef = UNIT_DEFINITIONS[UnitType.Tribesman];
        const newUnitId = generateId();
        const newUnit: Unit = { id: newUnitId, type: UnitType.Tribesman, ownerId: player.id, hp: tribesmanDef.maxHp, foodStored: 0, gender: Gender.Male, attackBonus: 0, defenseBonus: 0 };
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
        if (army.isCamped && army.buildings) {
            for (const buildingType of army.buildings) {
                const buildingDef = CAMP_BUILDING_DEFINITIONS[buildingType];
                totalGatherRate += buildingDef.foodGatherBonus ?? 0;
            }
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
        if (army.isCamped && army.buildings) {
            for (const buildingType of army.buildings) {
                const buildingDef = CAMP_BUILDING_DEFINITIONS[buildingType];
                totalGatherRate += buildingDef.foodGatherBonus ?? 0;
            }
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
        let productionPoints = totalWorkPoints * (productionFocus / 100);
        if ('isCamped' in container && container.isCamped && container.buildings) {
            for (const buildingType of container.buildings) {
                const buildingDef = CAMP_BUILDING_DEFINITIONS[buildingType];
                productionPoints += buildingDef.productionBonus ?? 0;
            }
        }

        if (container.buildQueue && container.buildQueue.length > 0) {
            const item = container.buildQueue[0];
            item.progress += productionPoints;

            if (item.progress >= item.productionCost) {
                // playSound('build');
                if (item.type === 'unit') {
                    const unitDef = UNIT_DEFINITIONS[item.itemType as UnitType];
                    const newUnitId = generateId();
                    newGs.units.set(newUnitId, { id: newUnitId, type: item.itemType as UnitType, ownerId: container.ownerId, hp: unitDef.maxHp, foodStored: 0, gender: unitDef.gender ?? Gender.None, attackBonus: 0, defenseBonus: 0 });
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
        let gatheringPoints = totalWorkPoints * ((100 - productionFocus) / 100);
        if ('isCamped' in container && container.isCamped && container.buildings) {
            for (const buildingType of container.buildings) {
                const buildingDef = CAMP_BUILDING_DEFINITIONS[buildingType];
                gatheringPoints += buildingDef.gatherBonus ?? 0;
            }
        }

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
            unit.attackBonus = 0;
            unit.defenseBonus = 0;
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
                        gender: Math.random() < 0.5 ? Gender.Male : Gender.Female,
                        attackBonus: 0,
                        defenseBonus: 0,
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
            sickUnit.isSick = true;
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
        // FIX: Add missing return statement.
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
                    if (u.hp === UNIT_DEFINITIONS[u.type].maxHp) {
                        delete u.isSick;
                    }
                }
            });
        }
    }

    for (const city of Array.from(newGs.cities.values()).filter(c => c.ownerId === currentPlayerId)) {
        const units = city.garrison.map(id => newGs.units.get(id)!);
        // FIX: Fix typo `UNIT` to `UNIT_DEFINITIONS` and complete healing logic.
        const bonus = units.reduce((sum, u) => sum + (UNIT_DEFINITIONS[u.type].healingBonus ?? 0), 0);
        const totalHealAmount = 1 + bonus; // Base heal + shaman bonus
        units.forEach(u => {
            if (!starvedUnitIds.has(u.id) && !sickUnitIds.has(u.id) && u.hp < UNIT_DEFINITIONS[u.type].maxHp) {
                u.hp = Math.min(UNIT_DEFINITIONS[u.type].maxHp, u.hp + totalHealAmount);
                if (u.hp === UNIT_DEFINITIONS[u.type].maxHp) {
                    delete u.isSick;
                }
            }
        });
    }

    return newGs;
}

// FIX: Add missing function `processUnitCleanup`.
export function processUnitCleanup(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const unitsToRemove = new Set<string>();

    for (const unit of newGs.units.values()) {
        if (unit.hp <= 0) {
            unitsToRemove.add(unit.id);
        }
    }

    if (unitsToRemove.size > 0) {
        for (const city of newGs.cities.values()) {
            city.garrison = city.garrison.filter(id => !unitsToRemove.has(id));
        }
        for (const army of newGs.armies.values()) {
            army.unitIds = army.unitIds.filter(id => !unitsToRemove.has(id));
            if (army.unitIds.length === 0 && !army.isCamped) {
                const armyHex = newGs.hexes.get(axialToString(army.position));
                if (armyHex) {
                    armyHex.armyId = undefined;
                }
                newGs.armies.delete(army.id);
            }
        }
        for (const unitId of unitsToRemove) {
            newGs.units.delete(unitId);
        }
    }

    return newGs;
}

// FIX: Add missing function `processCulturalShifts`.
export function processCulturalShifts(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    const player = newGs.players.find(p => p.id === newGs.currentPlayerId)!;

    // Shift towards aggressive if attacks were made
    if (player.actionsThisTurn.attacks > 0) {
        player.culture.militarism = Math.min(100, player.culture.militarism + player.actionsThisTurn.attacks * 2);
    } else {
        // Passive shift towards peaceful
        player.culture.militarism = Math.max(-100, player.culture.militarism - 0.5);
    }
    
    // Check for new cultural aspects unlocked
    for (const aspect of Object.values(CULTURAL_ASPECTS)) {
        if (!player.culture.unlockedAspects.includes(aspect.id)) {
            const conditionsMet = aspect.unlockConditions.every(cond => {
                const axisValue = player.culture[cond.axis];
                return cond.threshold > 0 ? axisValue >= cond.threshold : axisValue <= cond.threshold;
            });
            if (conditionsMet) {
                player.culture.unlockedAspects.push(aspect.id);
            }
        }
    }

    return newGs;
}

// FIX: Add missing function `finalizeTurn`.
export function finalizeTurn(gs: GameState): GameState {
    const newGs = deepCloneGameState(gs);
    
    // Reset actions for the player who just finished
    const finishedPlayer = newGs.players.find(p => p.id === newGs.currentPlayerId)!;
    finishedPlayer.actionsThisTurn = { attacks: 0 };

    // Clear any pending battle info before changing player
    delete newGs.pendingBattle;

    // Change current player
    newGs.currentPlayerId = (newGs.currentPlayerId % newGs.players.length) + 1;

    // Increment turn number if it's player 1's turn again
    if (newGs.currentPlayerId === 1) {
        newGs.turn += 1;
        // Also do regrowth for all tiles
        for (const hex of newGs.hexes.values()) {
            const terrainDef = TERRAIN_DEFINITIONS[hex.terrain];
            hex.currentFood = Math.min(terrainDef.maxFood, hex.currentFood + terrainDef.foodRegrowth);
            hex.currentWood = Math.min(terrainDef.maxWood, hex.currentWood + terrainDef.woodRegrowth);
            // Stone/Obsidian don't regrow
            hex.currentHides = Math.min(terrainDef.maxHides, hex.currentHides + terrainDef.hidesRegrowth);
        }
    }
    
    const nextPlayer = newGs.players.find(p => p.id === newGs.currentPlayerId)!;
    
    // Replenish movement points for the new current player's armies
    for (const army of newGs.armies.values()) {
        if (army.ownerId === nextPlayer.id) {
            army.movementPoints = army.maxMovementPoints;
        }
    }

    // Reset stagnation timers for enemy armies
    for (const hex of newGs.hexes.values()) {
        if (hex.armyId) {
            const army = newGs.armies.get(hex.armyId);
            if (army && army.ownerId !== nextPlayer.id) {
                hex.armyPresenceTurns = 0;
            }
        }
    }

    return newGs;
}