import { GameState, UnitType, AxialCoords, ArmyDeploymentInfo, AIPersonality, City, Army, Unit, CampBuildingType } from '../types';
import { UNIT_DEFINITIONS, axialDirections, CAMP_INFLUENCE_RANGE } from '../constants';
import { deepCloneGameState } from './gameStateUtils';
// FIX: Import missing function `processBreakCamp`.
import { processProduceUnit, processDeployArmy, findAttackableHexes, calculateReachableHexes, processMoveArmy, processProduceInCamp, processFinalizeCampSetup, processBreakCamp } from './gameLogic';
import { resolveAutoBattle, calculateArmyStrength, calculateDefenderStrength } from './combatLogic';
// FIX: Import missing function `getHexesInRange`.
import { axialToString, stringToAxial, hexDistance, getHexesInRange } from './hexUtils';

// Helper to get total HP percentage of an army
const getArmyHealth = (army: Army, gs: GameState): number => {
    const units = army.unitIds.map(id => gs.units.get(id)!);
    if (units.length === 0) return 0;
    const currentHp = units.reduce((sum, u) => sum + u.hp, 0);
    const maxHp = units.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].maxHp, 0);
    return (currentHp / maxHp) * 100;
};

// Main AI logic entry point
export function runAITurnLogic(gs: GameState): GameState {
    let newGs = deepCloneGameState(gs);
    const aiPlayer = newGs.players.find(p => p.id === newGs.currentPlayerId)!;
    
    // 1. Manage Cities
    const aiCities = Array.from(newGs.cities.values()).filter(c => c.ownerId === aiPlayer.id);
    for (const city of aiCities) {
        newGs = manageCity(newGs, city);
    }

    // 2. Manage Armies
    const aiArmies = Array.from(newGs.armies.values()).filter(a => a.ownerId === aiPlayer.id);
    for (const army of aiArmies) {
        // Ensure army still exists (might have been merged or destroyed)
        if (!newGs.armies.has(army.id)) continue;
        newGs = manageArmy(newGs, army);
    }
    
    return newGs;
}

// City management logic
function manageCity(gs: GameState, city: City): GameState {
    let newGs = gs;
    const aiPlayer = newGs.players.find(p => p.id === city.ownerId)!;

    // Rule: If garrison is large, create a new army
    if (city.garrison.length >= 4) {
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
            const unitTypeToDeploy = city.garrison.map(id => newGs.units.get(id)!.type).includes(UnitType.StoneWarrior)
                ? UnitType.StoneWarrior
                : UnitType.Tribesman;

            const deployInfo: ArmyDeploymentInfo = {
                sourceId: city.id,
                sourceType: 'city',
                unitsToMove: [{ unitType: unitTypeToDeploy, count: 2 }],
            };
            return processDeployArmy(newGs, { deploymentInfo: deployInfo, targetPosition: stringToAxial(deployHexKey) });
        }
    }

    // Rule: If build queue is empty, decide what to produce
    if (city.buildQueue.length === 0) {
        const militaryChance = {
            [AIPersonality.Aggressive]: 0.8,
            [AIPersonality.Defensive]: 0.2,
            [AIPersonality.Balanced]: 0.5,
        }[aiPlayer.personality!];

        const hasUnlockedWarriors = aiPlayer.unlockedTechs.includes('obsidian_knapping');
        const unitToBuild = (Math.random() < militaryChance && hasUnlockedWarriors) ? UnitType.StoneWarrior : UnitType.Tribesman;
        const unitDef = UNIT_DEFINITIONS[unitToBuild];

        const hasSacrifice = unitToBuild !== UnitType.StoneWarrior || city.garrison.some(id => newGs.units.get(id)!.type === UnitType.Tribesman);

        if (aiPlayer.gold >= (unitDef.cost.gold ?? 0) && hasSacrifice) {
            return processProduceUnit(newGs, { unitType: unitToBuild, cityId: city.id });
        }
    }
    
    return newGs;
}

// Army management logic
function manageArmy(gs: GameState, army: Army): GameState {
    const aiPlayer = gs.players.find(p => p.id === army.ownerId)!;
    const health = getArmyHealth(army, gs);

    // Rule: If camped, manage camp. Otherwise, manage mobile army.
    if (army.isCamped) {
        return manageCamp(gs, army, health);
    } else {
        return manageMobileArmy(gs, army, health);
    }
}

// Camp management logic
function manageCamp(gs: GameState, army: Army, health: number): GameState {
    let newGs = gs;
    
    // Rule: Break camp if healthy and strong enough
    if (health > 90 && army.unitIds.length >= 3) {
        return processBreakCamp(newGs, { armyId: army.id });
    }

    // Rule: If queue is empty, build something useful based on personality
    if ((army.buildQueue ?? []).length === 0) {
        const personality = gs.players.find(p => p.id === army.ownerId)!.personality;
        let buildOrder: CampBuildingType[] = [];

        switch (personality) {
            case AIPersonality.Defensive:
                buildOrder = [CampBuildingType.Palisade, CampBuildingType.Tent, CampBuildingType.StoragePit, CampBuildingType.ForagingPost];
                break;
            case AIPersonality.Aggressive:
                buildOrder = [CampBuildingType.ToolmakersShelter, CampBuildingType.Palisade, CampBuildingType.Tent];
                break;
            case AIPersonality.Balanced:
            default:
                buildOrder = [CampBuildingType.FirePit, CampBuildingType.Tent, CampBuildingType.Palisade, CampBuildingType.StoragePit];
                break;
        }

        for (const buildingType of buildOrder) {
            if (!army.buildings?.includes(buildingType)) {
                 // Simplified resource check
                if ((army.localResources.wood ?? 0) > (UNIT_DEFINITIONS[UnitType.Tribesman].cost.wood ?? 5)) {
                   return processProduceInCamp(newGs, { armyId: army.id, itemType: buildingType, type: 'building' });
                }
            }
        }
    }
    return newGs;
}

// Mobile army management logic
function manageMobileArmy(gs: GameState, army: Army, health: number): GameState {
    let newGs = gs;

    // Rule: If low on health, find a safe place to camp
    if (health < 40) {
        // Find a suitable tile to camp on (simplified: just camp where it is if possible)
        const totalTilesToSelect = 1 + (army.level || 1);
        const campTiles = getHexesInRange(army.position, CAMP_INFLUENCE_RANGE)
            .slice(0, totalTilesToSelect)
            .map(axialToString);
        
        if (army.movementPoints > 0) {
            return processFinalizeCampSetup(newGs, { armyId: army.id, selectedTileKeys: campTiles });
        }
        return newGs; // Can't camp, do nothing
    }

    // Rule: Find and attack a weak enemy if personality allows
// FIX: Pass the correct number of arguments to `findAttackableHexes`.
    const attackable = findAttackableHexes(army.position, army, newGs);
    if (attackable.size > 0) {
        const myStrength = calculateArmyStrength(army, newGs);
        let bestTarget: { id: string; type: 'army' | 'city'; strength: number } | null = null;
        let bestTargetScore = 0;

        for (const hexKey of attackable) {
            const hex = newGs.hexes.get(hexKey)!;
            const targetId = hex.armyId ?? hex.cityId!;
            const targetType = hex.armyId ? 'army' : 'city';
            const targetEntity = targetType === 'army' ? newGs.armies.get(targetId)! : newGs.cities.get(targetId)!;
            
            const targetStrength = calculateDefenderStrength(targetEntity, newGs);
            const score = (myStrength.totalEffectiveHp * myStrength.totalAttack) / (targetStrength.totalEffectiveHp * targetStrength.totalAttack);
            
            if (score > bestTargetScore) {
                bestTargetScore = score;
                bestTarget = { id: targetId, type: targetType, strength: targetStrength.totalEffectiveHp };
            }
        }

        const attackThreshold = {
            [AIPersonality.Aggressive]: 0.7,
            [AIPersonality.Defensive]: 2.0,
            [AIPersonality.Balanced]: 1.1,
        }[gs.players.find(p => p.id === army.ownerId)!.personality!];

        if (bestTarget && bestTargetScore > attackThreshold) {
            const defender = bestTarget.type === 'army' ? newGs.armies.get(bestTarget.id) : newGs.cities.get(bestTarget.id);
            if (defender?.ownerId === 1) { // Human player
                newGs.pendingBattle = { attackerId: army.id, defenderId: bestTarget.id, defenderType: bestTarget.type };
                return newGs;
            } else if (defender) { // AI vs AI
                return resolveAutoBattle(newGs, army.id, bestTarget.id, bestTarget.type);
            }
        }
    }

    // Rule: If no attack target, move towards the nearest enemy
    if (army.movementPoints > 0) {
        const playerThings = [
            ...Array.from(newGs.armies.values()).filter(a => a.ownerId === 1),
            ...Array.from(newGs.cities.values()).filter(c => c.ownerId === 1),
        ];
        if (playerThings.length > 0) {
            let closestTarget: { position: AxialCoords } | null = null;
            let minDistance = Infinity;

            for (const thing of playerThings) {
                const distance = hexDistance(army.position, thing.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestTarget = thing;
                }
            }

            if (closestTarget) {
                const { reachable, costs } = calculateReachableHexes(army.position, army, newGs);
                let bestMove: AxialCoords | null = null;
                let bestMoveDist = minDistance;

                for (const hexKey of reachable) {
                    const coords = stringToAxial(hexKey);
                    const dist = hexDistance(coords, closestTarget.position);
                    if (dist < bestMoveDist) {
                        bestMoveDist = dist;
                        bestMove = coords;
                    }
                }

                if (bestMove) {
                    const cost = costs.get(axialToString(bestMove)) ?? 1;
                    return processMoveArmy(newGs, { armyId: army.id, targetCoords: bestMove, pathCost: cost });
                }
            }
        }
    }
    
    return newGs;
}