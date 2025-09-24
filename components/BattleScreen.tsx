
import React, { useMemo } from 'react';
import { GameState, Army, City, Unit, UnitType } from '../types';
import { useGameStore } from '../store/gameStore';
import { calculateArmyStrength, calculateDefenderStrength, ArmyStrength } from '../utils/combatLogic';
import StackedUnitCard from './StackedUnitCard';

interface BattleScreenProps {
  battleInfo: {
    attackerId: string;
    defenderId: string;
    defenderType: 'army' | 'city';
  };
  onResolve: () => void;
  onClose: () => void; // Retreat
}

const groupUnitsByType = (units: Unit[]): Map<UnitType, Unit[]> => {
    const groups = new Map<UnitType, Unit[]>();
    units.forEach(unit => {
        if (!groups.has(unit.type)) {
            groups.set(unit.type, []);
        }
        groups.get(unit.type)!.push(unit);
    });
    return groups;
};

const ArmyPanel: React.FC<{ title: string; army: Army | City; strength: ArmyStrength; gs: GameState }> = ({ title, army, strength, gs }) => {
    const units = ('unitIds' in army ? army.unitIds : army.garrison).map(id => gs.units.get(id)!);
    const unitGroups = groupUnitsByType(units);
    
    return (
        <div className="bg-gray-900/50 rounded-lg p-4 w-full h-full flex flex-col">
            <h3 className="text-2xl font-bold text-center mb-4">{title}</h3>
            <div className="text-center text-sm space-y-1 mb-4">
                <p>Attack Power: <span className="font-semibold text-red-400">{strength.totalAttack}</span></p>
                <p>Effective HP: <span className="font-semibold text-blue-400">{strength.totalEffectiveHp}</span></p>
                <p>Units: <span className="font-semibold">{strength.unitCount}</span></p>
            </div>
            <div className="overflow-y-auto space-y-2 flex-grow p-1 bg-black/20 rounded">
                {Array.from(unitGroups.entries()).map(([unitType, unitList]) => (
                    <StackedUnitCard key={unitType} unitType={unitType} units={unitList} />
                ))}
                 {unitGroups.size === 0 && !('hp' in army && army.hp > 0) && <p className="text-center text-gray-500 pt-16">No Units</p>}
                 {'hp' in army && army.hp > 0 && <p className="text-center text-gray-300 pt-4 font-semibold">City HP: {army.hp}</p>}
            </div>
        </div>
    )
};

const BattleScreen: React.FC<BattleScreenProps> = ({ battleInfo, onResolve, onClose }) => {
    const gameState = useGameStore(state => state.gameState)!;
    
    const { attacker, defender, attackerStrength, defenderStrength, victoryChance, isPlayerDefending } = useMemo(() => {
        const attacker = gameState.armies.get(battleInfo.attackerId)!;
        const defender = battleInfo.defenderType === 'army' 
            ? gameState.armies.get(battleInfo.defenderId)!
            : gameState.cities.get(battleInfo.defenderId)!;

        const attackerStrength = calculateArmyStrength(attacker, gameState);
        const defenderStrength = calculateDefenderStrength(defender, gameState);
        
        const attackerPower = attackerStrength.totalAttack * attackerStrength.totalEffectiveHp;
        const defenderPower = defenderStrength.totalAttack * defenderStrength.totalEffectiveHp;
        const totalPower = attackerPower + defenderPower;
        const chance = totalPower > 0 ? Math.round((attackerPower / totalPower) * 100) : 50;
        
        const playerIsDefending = defender.ownerId === 1;

        return { attacker, defender, attackerStrength, defenderStrength, victoryChance: chance, isPlayerDefending: playerIsDefending };
    }, [gameState, battleInfo]);

    const attackerColor = gameState.players.find(p => p.id === attacker.ownerId)!.color;
    const defenderColor = gameState.players.find(p => p.id === defender.ownerId)!.color;
    
    return (
         <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(5px)'}} aria-modal="true" role="dialog">
            <div className="relative bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border-2 border-gray-600 animate-slide-up"
                style={{
                    backgroundImage: `linear-gradient(to right, ${attackerColor}10, transparent 40%, transparent 60%, ${defenderColor}10)`
                }}>
                <div className="p-4 text-center border-b-2 border-gray-600">
                    <h2 className="text-4xl font-bold">{isPlayerDefending ? "You are under attack!" : "Battle!"}</h2>
                    <p className="text-gray-400">{isPlayerDefending ? `${attacker.name} has engaged your forces!` : "Your army has engaged the enemy."}</p>
                </div>
                
                <div className="p-6 flex-grow grid grid-cols-2 gap-6 overflow-y-hidden">
                    <ArmyPanel title="Attacker" army={attacker} strength={attackerStrength} gs={gameState} />
                    <ArmyPanel title="Defender" army={defender} strength={defenderStrength} gs={gameState} />
                </div>
                
                <div className="p-4 flex-shrink-0 space-y-3">
                    <div className="text-center">
                        <p className="text-lg font-semibold">Projected Outcome</p>
                        <p className="text-2xl font-bold" style={{color: attackerColor}}>{victoryChance}% <span className="text-white">vs</span> <span style={{color: defenderColor}}>{100 - victoryChance}%</span></p>
                    </div>
                    <div className="w-full h-4 bg-gray-900 rounded-full overflow-hidden border-2 border-black flex">
                        <div className="h-full transition-all duration-500" style={{width: `${victoryChance}%`, backgroundColor: attackerColor}}></div>
                        <div className="h-full transition-all duration-500" style={{width: `${100-victoryChance}%`, backgroundColor: defenderColor}}></div>
                    </div>
                </div>

                <div className="p-6 border-t-2 border-gray-600 flex-shrink-0 flex justify-center items-center gap-6">
                    <button disabled className="px-8 py-3 bg-gray-600 text-lg font-semibold rounded-lg cursor-not-allowed opacity-50">Manual Battle</button>
                    <button onClick={onResolve} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-lg font-bold rounded-lg transition-colors">Auto-Resolve</button>
                    <button 
                        onClick={onClose} 
                        disabled={isPlayerDefending}
                        className="px-8 py-3 bg-red-700 hover:bg-red-600 text-lg font-semibold rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        title={isPlayerDefending ? "Cannot retreat when defending" : "Retreat from battle"}
                    >
                        Retreat
                    </button>
                </div>
            </div>
             <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                .animate-slide-up { animation: slideUp 0.4s ease-out; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default BattleScreen;
