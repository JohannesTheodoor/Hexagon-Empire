import { GameState, UnitType, AxialCoords, ArmyDeploymentInfo } from '../types';
import { UNIT_DEFINITIONS, axialDirections } from '../constants';
import { deepCloneGameState } from './gameStateUtils';
import { processHexClick, processProduceUnit, processDeployArmy, findAttackableHexes, calculateReachableHexes } from './gameLogic';
import { axialToString, stringToAxial, hexDistance } from './hexUtils';

export function runAITurnLogic(gs: GameState): GameState {
    let newGs = deepCloneGameState(gs);
    const aiPlayer = newGs.players.find(p => p.id === 2)!;
    const playerCapital = Array.from(newGs.cities.values()).find(c => c.ownerId === 1);

    const aiCities = Array.from(newGs.cities.values()).filter(c => c.ownerId === aiPlayer.id);
    for (const city of aiCities) {
        if (city.buildQueue.length === 0) {
            const unitDef = UNIT_DEFINITIONS[UnitType.Tribesman];
            if (aiPlayer.gold >= (unitDef.cost.gold ?? 0) && (city.localResources.wood ?? 0) >= (unitDef.cost.wood ?? 0)) {
                newGs = processProduceUnit(newGs, { unitType: UnitType.Tribesman, cityId: city.id });
            }
        }
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
                const deployInfo: ArmyDeploymentInfo = {
                    sourceId: city.id,
                    sourceType: 'city',
                    unitsToMove: [{ unitType: UnitType.Tribesman, count: 2 }],
                };
                newGs = processDeployArmy(newGs, { deploymentInfo: deployInfo, targetPosition: stringToAxial(deployHexKey) });
            }
        }
    }
    
    const aiArmies = Array.from(newGs.armies.values()).filter(a => a.ownerId === aiPlayer.id);
    for (const army of aiArmies) {
         if (!newGs.armies.has(army.id) || army.isCamped) continue;
        army.movementPoints = army.maxMovementPoints;
        const attackable = findAttackableHexes(army.position, army, newGs);
        if (attackable.size > 0) {
            const targetHexKey = Array.from(attackable)[0];
            newGs = processHexClick(newGs, { coords: stringToAxial(targetHexKey), selectedArmyId: army.id, reachableHexes: new Set(), attackableHexes: new Set([targetHexKey]), expandableHexes: new Set(), pathCosts: new Map(), selectedHex: army.position });
            continue;
        }

        if (playerCapital && army.movementPoints > 0) {
            let bestNeighbor: AxialCoords | null = null;
            let minDistance = hexDistance(army.position, playerCapital.position);
            const { reachable, costs } = calculateReachableHexes(army.position, army, newGs);
            
            for(const reachableHexKey of reachable) {
                const reachableCoords = stringToAxial(reachableHexKey);
                const dist = hexDistance(reachableCoords, playerCapital.position);
                if(dist < minDistance) {
                    minDistance = dist;
                    bestNeighbor = reachableCoords;
                }
            }

            if (bestNeighbor) {
                newGs = processHexClick(newGs, { coords: bestNeighbor, selectedArmyId: army.id, reachableHexes: reachable, attackableHexes: new Set(), expandableHexes: new Set(), pathCosts: costs, selectedHex: army.position });
            }
        }
    }
    
    return newGs;
}