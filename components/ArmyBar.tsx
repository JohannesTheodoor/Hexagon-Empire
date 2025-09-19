import React from 'react';
import { GameState, AxialCoords, Unit, UnitType, Player, City, Army } from '../types';
import { axialToString } from '../utils/hexUtils';
import { InfantryIcon, TankIcon, TribesmanIcon, TribeswomanIcon, PlusIcon, CampIcon, ChildIcon, ShamanIcon } from './Icons';
import { UNIT_DEFINITIONS } from '../constants';

// Group units by type and HP to stack them in the UI.
const groupUnits = (units: Unit[]): { representative: Unit, units: Unit[], count: number }[] => {
  if (!units.length) return [];
  
  const groups = new Map<string, { representative: Unit, units: Unit[], count: number }>();

  for (const unit of units) {
    const key = `${unit.type}-${unit.hp}`;
    
    if (groups.has(key)) {
      const group = groups.get(key)!;
      group.units.push(unit);
      group.count++;
    } else {
      groups.set(key, { representative: unit, units: [unit], count: 1 });
    }
  }
  
  return Array.from(groups.values());
};

// A smaller, icon-focused card for the army bar.
const UnitIconCard: React.FC<{
    unit: Unit;
    count: number;
    player: Player | undefined;
    isSelected: boolean;
    onSelect: () => void;
}> = ({ unit, count, player, isSelected, onSelect }) => {
    const unitDef = UNIT_DEFINITIONS[unit.type];
    const healthPercentage = (unit.hp / unitDef.maxHp) * 100;
    const barColor = healthPercentage > 50 ? 'bg-green-500' : healthPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500';

    const renderIcon = () => {
        const iconClass = 'w-10 h-10 drop-shadow-lg';
        switch(unit.type) {
            case UnitType.Infantry: return <InfantryIcon className={iconClass} />;
            case UnitType.Tank: return <TankIcon className={iconClass} />;
            case UnitType.Tribesman: return <TribesmanIcon className={iconClass} />;
            case UnitType.Tribeswoman: return <TribeswomanIcon className={iconClass} />;
            case UnitType.Child: return <ChildIcon className={iconClass} />;
            case UnitType.Shaman: return <ShamanIcon className={iconClass} />;
            default: return null;
        }
    };

    return (
        <button 
            onClick={onSelect}
            className={`relative w-20 h-20 rounded-lg p-1 flex flex-col justify-center items-center transition-all duration-150 transform hover:scale-105 group`}
            style={{
                backgroundColor: isSelected ? `${player?.color}60` : `${player?.color}30`,
                borderColor: player?.color ?? '#FFFFFF'
            }}
            aria-label={`Select ${unit.type} (${count})`}
        >
             <div className="absolute inset-0 border-2 rounded-lg pointer-events-none" style={{ borderColor: isSelected ? player?.color ?? '#FFFFFF' : 'transparent' }}></div>
            {renderIcon()}
            
            <div className="absolute bottom-1.5 w-[80%]">
                <div className="w-full h-1.5 bg-gray-900/80 rounded-full overflow-hidden border border-black">
                    <div className={`${barColor} h-full rounded-full`} style={{ width: `${healthPercentage}%` }}></div>
                </div>
            </div>

            {count > 1 && (
                <div 
                    className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 z-10"
                    style={{ borderColor: player?.color ?? '#FFFFFF' }}
                >
                    {count}
                </div>
            )}
        </button>
    );
};


interface ArmyBarProps {
    gameState: GameState;
    selectedHex: AxialCoords | null;
    selectedUnitId: string | null;
    selectedArmyId: string | null;
    onSelectUnit: (unitId: string) => void;
    onStartFormArmy: (sourceId: string, sourceType: 'city' | 'army') => void;
    onToggleCamp: (armyId: string) => void;
}

const ArmyBar: React.FC<ArmyBarProps> = ({ gameState, selectedHex, selectedUnitId, selectedArmyId, onSelectUnit, onStartFormArmy, onToggleCamp }) => {
    const army = selectedArmyId ? gameState.armies.get(selectedArmyId) : null;
    const cityOnHex = selectedHex ? gameState.cities.get(gameState.hexes.get(axialToString(selectedHex))?.cityId ?? '') : null;
    
    const unitsToShow: Unit[] = [];
    if (army) {
        army.unitIds.forEach(id => {
            const unit = gameState.units.get(id);
            if (unit) unitsToShow.push(unit);
        });
    } else if (cityOnHex) {
        cityOnHex.garrison.forEach(id => {
            const unit = gameState.units.get(id);
            if(unit) unitsToShow.push(unit);
        })
    }
    
    if (unitsToShow.length === 0) return null;

    const player = gameState.players.find(p => p.id === (army?.ownerId ?? cityOnHex?.ownerId));
    const isPlayersTurn = player?.id === gameState.currentPlayerId;

    const groupedUnits = groupUnits(unitsToShow);

    // A stack is "selected" if the currently selected unit ID belongs to any unit in that stack.
    const isStackSelected = (group: { units: Unit[] }) => {
        if (!selectedUnitId) return false;
        return group.units.some(u => u.id === selectedUnitId);
    };

    const showFormArmyButton = isPlayersTurn && cityOnHex && cityOnHex.garrison.length > 0;
    const showSplitArmyButton = isPlayersTurn && army && army.unitIds.length > 1;
    const isSplitDisabled = showSplitArmyButton && army ? army.movementPoints <= 0 : false;
    const showCampButton = isPlayersTurn && army;

    return (
        <div 
            className="absolute bottom-0 left-0 right-0 h-32 bg-gray-900 bg-opacity-80 backdrop-blur-sm p-2 flex items-center justify-center gap-2 z-30 border-t-2 border-gray-700"
            onMouseDown={(e) => e.stopPropagation()} // Prevent map panning when interacting with the bar
        >
            <div className="flex-shrink-0 flex flex-col gap-1">
                {(showFormArmyButton || showSplitArmyButton) && (
                     <button
                        onClick={() => {
                            if (showFormArmyButton && cityOnHex) onStartFormArmy(cityOnHex.id, 'city');
                            else if (showSplitArmyButton && army) onStartFormArmy(army.id, 'army');
                        }}
                        className={`w-20 h-[42px] rounded-lg p-1 flex items-center justify-center bg-blue-800/50 transition-colors ${isSplitDisabled ? 'cursor-not-allowed opacity-50' : 'hover:bg-blue-700/70'}`}
                        title={
                            isSplitDisabled ? "Cannot split: No movement points left" :
                            showFormArmyButton ? "Form a new army" : "Split this army"
                        }
                        disabled={isSplitDisabled}
                    >
                        <PlusIcon className="w-6 h-6" />
                        <span className="text-xs font-semibold ml-1">{showFormArmyButton ? 'Form' : 'Split'}</span>
                    </button>
                )}
                 {showCampButton && army && (
                    <button
                        onClick={() => onToggleCamp(army.id)}
                        className={`w-20 h-[42px] rounded-lg p-1 flex items-center justify-center transition-colors ${army.isCamped ? 'bg-yellow-800/70 hover:bg-yellow-700/80' : 'bg-green-800/50 hover:bg-green-700/70'}`}
                        title={army.isCamped ? "Break camp" : "Make camp (requires movement points)"}
                        disabled={!army.isCamped && army.movementPoints <= 0}
                    >
                        <CampIcon className="w-6 h-6" />
                        <span className="text-xs font-semibold ml-1">{army.isCamped ? 'Break' : 'Camp'}</span>
                    </button>
                 )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
                {groupedUnits.map(group => (
                    <UnitIconCard
                        key={`${group.representative.type}-${group.representative.hp}`}
                        unit={group.representative}
                        count={group.count}
                        player={player}
                        isSelected={isStackSelected(group)}
                        onSelect={() => onSelectUnit(group.representative.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ArmyBar;