import { GameState, Army, City, Unit, Hex, UnitType, Player, BattleReport, BattleParticipantReport, BattleReportUnit } from '../types';
import { UNIT_DEFINITIONS, TERRAIN_DEFINITIONS, CAMP_DEFENSE_BONUS, CAMP_BUILDING_DEFINITIONS } from '../constants';
import { deepCloneGameState } from './gameStateUtils';
import { axialToString } from './hexUtils';

export interface ArmyStrength {
    totalAttack: number;
    totalEffectiveHp: number;
    unitCount: number;
}

const groupUnitsForReport = (units: Unit[]): BattleReportUnit[] => {
    const unitMap = new Map<UnitType, number>();
    for (const unit of units) {
        unitMap.set(unit.type, (unitMap.get(unit.type) ?? 0) + 1);
    }
    return Array.from(unitMap.entries()).map(([unitType, count]) => ({ unitType, count })).sort((a,b) => a.unitType.localeCompare(b.unitType));
};

export const calculateArmyStrength = (army: Army, gs: GameState): ArmyStrength => {
    const units = army.unitIds.map(id => gs.units.get(id)!);
    const hex = gs.hexes.get(axialToString(army.position))!;

    let totalAttack = 0;
    let totalEffectiveHp = 0;

    const terrainBonus = TERRAIN_DEFINITIONS[hex.terrain].defenseBonus;
    let campBonus = 0;
    if (army.isCamped) {
        campBonus = CAMP_DEFENSE_BONUS;
        // ... add building bonuses
    }

    for (const unit of units) {
        const unitDef = UNIT_DEFINITIONS[unit.type];
        totalAttack += unitDef.attack;
        totalEffectiveHp += unit.hp + unitDef.defense + terrainBonus + campBonus;
    }
    
    return { totalAttack, totalEffectiveHp, unitCount: units.length };
}

// Simplified version for city/defender strength
export const calculateDefenderStrength = (defender: Army | City, gs: GameState): ArmyStrength => {
    if ('unitIds' in defender) { // It's an army
        return calculateArmyStrength(defender, gs);
    } else { // It's a city
        const units = defender.garrison.map(id => gs.units.get(id)!);
        const hex = gs.hexes.get(axialToString(defender.position))!;
        
        let totalAttack = 0;
        let totalEffectiveHp = defender.hp; // City HP is the base
        const terrainBonus = TERRAIN_DEFINITIONS[hex.terrain].defenseBonus;

        for (const unit of units) {
            const unitDef = UNIT_DEFINITIONS[unit.type];
            totalAttack += unitDef.attack;
            totalEffectiveHp += unit.hp + unitDef.defense + terrainBonus;
        }

        return { totalAttack, totalEffectiveHp, unitCount: units.length };
    }
};

export const resolveAutoBattle = (gs: GameState, attackerId: string, defenderId: string, defenderType: 'army' | 'city'): GameState => {
    const newGs = deepCloneGameState(gs);

    const attacker = newGs.armies.get(attackerId)!;
    const defender = defenderType === 'army' 
        ? newGs.armies.get(defenderId)!
        : newGs.cities.get(defenderId)!;
    
    // --- CAPTURE PRE-BATTLE STATE for report ---
    const attackerPlayer = newGs.players.find(p => p.id === attacker.ownerId)!;
    const defenderPlayer = newGs.players.find(p => p.id === defender.ownerId)!;
    
    const initialAttackerUnits = attacker.unitIds.map(id => ({...newGs.units.get(id)!})); // shallow copy
    const initialDefenderUnits = ('unitIds' in defender ? defender.unitIds : defender.garrison).map(id => ({...newGs.units.get(id)!}));

    // --- BATTLE CALCULATION ---
    const attackerStrength = calculateArmyStrength(attacker, newGs);
    const defenderStrength = calculateDefenderStrength(defender, newGs);

    const attackerPower = attackerStrength.totalAttack * attackerStrength.totalEffectiveHp;
    const defenderPower = defenderStrength.totalAttack * defenderStrength.totalEffectiveHp;
    const totalPower = attackerPower + defenderPower;
    
    if (totalPower > 0) {
        const attackerLossRatio = defenderPower / totalPower;
        const defenderLossRatio = attackerPower / totalPower;

        // Apply losses to attacker
        let attackerHpToLose = Math.round(attackerStrength.totalEffectiveHp * attackerLossRatio);
        const attackerUnits = attacker.unitIds.map(id => newGs.units.get(id)!).sort((a,b) => a.hp - b.hp); // lose weakest first
        for(const unit of attackerUnits) {
            if(attackerHpToLose <= 0) break;
            const damage = Math.min(unit.hp, attackerHpToLose);
            unit.hp -= damage;
            attackerHpToLose -= damage;
        }

        // Apply losses to defender
        let defenderHpToLose = Math.round(defenderStrength.totalEffectiveHp * defenderLossRatio);
        const defenderUnits = ('unitIds' in defender ? defender.unitIds : defender.garrison).map(id => newGs.units.get(id)!).sort((a,b) => a.hp - b.hp);
        for(const unit of defenderUnits) {
            if(defenderHpToLose <= 0) break;
            const damage = Math.min(unit.hp, defenderHpToLose);
            unit.hp -= damage;
            defenderHpToLose -= damage;
        }
        if ('hp' in defender && 'maxHp' in defender) { // It's a city
            const cityDamage = Math.min(defender.hp, defenderHpToLose);
            defender.hp -= cityDamage;
        }
    }

    // --- CLEANUP ---
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
        }
        for (const unitId of unitsToRemove) {
            newGs.units.delete(unitId);
        }
    }
    
    // --- DETERMINE OUTCOME & BUILD REPORT ---
    const attackerDefeated = attacker.unitIds.length === 0;
    const defenderDefeated = ('unitIds' in defender && defender.unitIds.length === 0 && !defender.isCamped) || ('hp' in defender && defender.hp <= 0);

    const finalAttackerUnits = attackerDefeated ? [] : attacker.unitIds.map(id => newGs.units.get(id)!);
    const finalDefenderUnits = defenderDefeated ? [] : ('unitIds' in defender ? defender.unitIds : defender.garrison).map(id => newGs.units.get(id)!);

    const createParticipantReport = (player: Player, initialUnits: Unit[], finalUnits: Unit[], isWinner: boolean): BattleParticipantReport => {
        const initialGrouped = groupUnitsForReport(initialUnits);
        const finalGrouped = groupUnitsForReport(finalUnits);
        
        const lostGrouped: BattleReportUnit[] = [];
        initialGrouped.forEach(initial => {
            const final = finalGrouped.find(f => f.unitType === initial.unitType);
            const lostCount = initial.count - (final?.count ?? 0);
            if (lostCount > 0) {
                lostGrouped.push({ unitType: initial.unitType, count: lostCount });
            }
        });

        return {
            name: player.name,
            color: player.color,
            initialUnits: initialGrouped,
            lostUnits: lostGrouped,
            remainingUnits: finalGrouped,
            isWinner,
        };
    };

    const attackerReport = createParticipantReport(attackerPlayer, initialAttackerUnits, finalAttackerUnits, !attackerDefeated && defenderDefeated);
    const defenderReport = createParticipantReport(defenderPlayer, initialDefenderUnits, finalDefenderUnits, !defenderDefeated && attackerDefeated);

    newGs.battleReport = {
        attacker: attackerReport,
        defender: defenderReport,
    };

    // --- APPLY BATTLE CONSEQUENCES ---
    const defenderHex = newGs.hexes.get(axialToString(defender.position))!;
    
    if (attackerDefeated) {
        const attackerHex = newGs.hexes.get(axialToString(attacker.position))!;
        attackerHex.armyId = undefined;
        newGs.armies.delete(attacker.id);
    } else {
        attacker.movementPoints = 0;
        if (defenderDefeated) {
             const attackerHex = newGs.hexes.get(axialToString(attacker.position))!;
             attackerHex.armyId = undefined;
             attacker.position = defender.position;
             defenderHex.armyId = attacker.id;
             defenderHex.cityId = undefined;
             if ('unitIds' in defender) { // defender was an army
                 newGs.armies.delete(defender.id);
             } else { // defender was a city
                newGs.cities.delete(defender.id);
             }
        }
    }
    
    const playerToUpdate = newGs.players.find(p => p.id === attacker.ownerId)!;
    playerToUpdate.culture.militarism = Math.min(100, playerToUpdate.culture.militarism + 5);
    playerToUpdate.actionsThisTurn.attacks += 1;

    return newGs;
};