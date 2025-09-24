import React, { useState, useMemo } from 'react';
import { GameState, Unit, UnitType, Army } from '../types';
import { CloseIcon, InfantryIcon, TankIcon, TribesmanIcon, TribeswomanIcon, ChildIcon, ShamanIcon, StoneWarriorIcon } from './Icons';
import { useGameStore } from '../store/gameStore';

interface CreateArmyScreenProps {
  sourceId: string;
  sourceType: 'city' | 'army';
  onClose: () => void;
  onConfirmFormation: (unitsToMove: { unitType: UnitType; count: number }[]) => void;
}

const groupUnitsByType = (units: Unit[]): Map<UnitType, Unit[]> => {
    const groups = new Map<UnitType, Unit[]>();
    for (const unit of units) {
        if (!groups.has(unit.type)) {
            groups.set(unit.type, []);
        }
        groups.get(unit.type)!.push(unit);
    }
    return groups;
};

const UnitQuantitySelector: React.FC<{
    unitType: UnitType;
    availableCount: number;
    selectedCount: number;
    onCountChange: (newCount: number) => void;
}> = ({ unitType, availableCount, selectedCount, onCountChange }) => {
    const increment = () => onCountChange(Math.min(availableCount, selectedCount + 1));
    const decrement = () => onCountChange(Math.max(0, selectedCount - 1));

    return (
        <div className="p-3 rounded-lg flex items-center gap-4 bg-gray-700/50">
            {unitType === UnitType.Infantry && <InfantryIcon className="w-8 h-8 flex-shrink-0" />}
            {unitType === UnitType.Tank && <TankIcon className="w-8 h-8 flex-shrink-0" />}
            {unitType === UnitType.Tribesman && <TribesmanIcon className="w-8 h-8 flex-shrink-0" />}
            {unitType === UnitType.Tribeswoman && <TribeswomanIcon className="w-8 h-8 flex-shrink-0" />}
            {unitType === UnitType.Child && <ChildIcon className="w-8 h-8 flex-shrink-0" />}
            {unitType === UnitType.Shaman && <ShamanIcon className="w-8 h-8 flex-shrink-0" />}
            {unitType === UnitType.StoneWarrior && <StoneWarriorIcon className="w-8 h-8 flex-shrink-0" />}
            <div className="flex-grow">
                <p className="font-semibold">{unitType}</p>
                <p className="text-xs text-gray-400">Available: {availableCount}</p>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={decrement} className="w-8 h-8 rounded bg-gray-600 hover:bg-gray-500 text-lg font-bold">-</button>
                <span className="w-10 text-center font-bold text-lg">{selectedCount}</span>
                <button onClick={increment} className="w-8 h-8 rounded bg-gray-600 hover:bg-gray-500 text-lg font-bold">+</button>
            </div>
        </div>
    );
};

const CreateArmyScreen: React.FC<CreateArmyScreenProps> = ({ sourceId, sourceType, onClose, onConfirmFormation }) => {
  const gameState = useGameStore(state => state.gameState);
  const [unitsToMove, setUnitsToMove] = useState<Map<UnitType, number>>(new Map());

  const { availableUnitsGrouped, sourceName } = useMemo(() => {
    if (!gameState) return { availableUnitsGrouped: new Map(), sourceName: '' };
    let units: Unit[] = [];
    let name = '';
    if (sourceType === 'city') {
      const city = gameState.cities.get(sourceId);
      if (city) {
        units = city.garrison.map(id => gameState.units.get(id)).filter(Boolean) as Unit[];
        name = city.name;
      }
    } else {
      const army = gameState.armies.get(sourceId);
      if (army) {
        units = army.unitIds.map(id => gameState.units.get(id)).filter(Boolean) as Unit[];
        name = `Army at ${army.position.q},${army.position.r}`;
      }
    }
    return { availableUnitsGrouped: groupUnitsByType(units), sourceName: name };
  }, [gameState, sourceId, sourceType]);

  const handleCountChange = (unitType: UnitType, newCount: number) => {
    setUnitsToMove(prev => new Map(prev).set(unitType, newCount));
  };

  // FIX: Explicitly type the parameters of the reduce function to prevent them from being inferred as 'unknown'.
  const totalUnitsToMove = Array.from(unitsToMove.values()).reduce((a: number, b: number) => a + b, 0);

  const handleConfirm = () => {
    const unitsToMoveArray = Array.from(unitsToMove.entries())
      .map(([unitType, count]) => ({ unitType, count }))
      .filter(item => item.count > 0);
    onConfirmFormation(unitsToMoveArray);
  };

  return (
    <div
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-lg h-[80vh] flex flex-col border-2 border-gray-600"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-20"
          aria-label="Close form army screen"
        >
          <CloseIcon className="w-8 h-8" />
        </button>

        <div className="p-6 border-b-2 border-gray-600">
          <h2 className="text-3xl font-bold">{sourceType === 'city' ? 'Form New Army' : 'Split Army'}</h2>
          <p className="text-gray-400">Select units to move from {sourceName}.</p>
        </div>

        <div className="p-6 overflow-y-auto flex-grow space-y-3">
          {Array.from(availableUnitsGrouped.entries()).map(([unitType, units]) => (
            <UnitQuantitySelector
              key={unitType}
              unitType={unitType}
              availableCount={units.length}
              selectedCount={unitsToMove.get(unitType) ?? 0}
              onCountChange={(newCount) => handleCountChange(unitType, newCount)}
            />
          ))}
           {availableUnitsGrouped.size === 0 && <p className="text-gray-400 text-center pt-8">No units available.</p>}
        </div>

        <div className="p-4 border-t-2 border-gray-600 flex-shrink-0 flex justify-end items-center gap-4">
          <p className="text-gray-300">Selected: {totalUnitsToMove} unit(s)</p>
          <button
            onClick={handleConfirm}
            disabled={totalUnitsToMove === 0}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-lg font-bold rounded-lg transition-colors"
          >
            Next: Select Tile
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateArmyScreen;