import React, { useState, useMemo, useCallback } from 'react';
import { GameState, Unit, UnitType, Army, City, TransferInfo } from '../types';
import { CloseIcon, TransferIcon, WoodIcon, StoneIcon, HidesIcon, ObsidianIcon, FoodIcon } from './Icons';
import { useGameStore } from '../store/gameStore';
import StackedUnitCard from './StackedUnitCard';
import { playSound } from '../utils/soundManager';
import { UNIT_DEFINITIONS } from '../constants';

interface TransferScreenProps {
  info: TransferInfo;
  onClose: () => void;
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

const TransferPanel: React.FC<{
    title: string;
    unitGroups: Map<UnitType, Unit[]>;
    selectedGroups: Set<UnitType>;
    onGroupSelect: (unitType: UnitType) => void;
    capacity: number;
    currentLoad: number;
    currentFood: number;
}> = ({ title, unitGroups, selectedGroups, onGroupSelect, capacity, currentLoad, currentFood }) => {
    const loadPercentage = capacity > 0 ? (currentLoad / capacity) * 100 : 0;
    
    return (
        <div className="bg-gray-900/50 rounded-lg p-4 flex flex-col h-full">
            <h3 className="text-xl font-bold text-center mb-2">{title}</h3>
            <div className="mb-2 text-center text-sm text-gray-400">
                <p>Capacity: {currentLoad} / {capacity}</p>
                 <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${loadPercentage}%`}}></div>
                </div>
            </div>
            <div className="overflow-y-auto space-y-2 flex-grow p-1">
                {Array.from(unitGroups.entries()).map(([unitType, units]) => (
                    <div key={unitType} onClick={() => onGroupSelect(unitType)} className={`cursor-pointer rounded-lg transition-all duration-150 ${selectedGroups.has(unitType) ? 'ring-2 ring-blue-500 bg-blue-900/50' : ''}`}>
                        <StackedUnitCard unitType={unitType} units={units} />
                    </div>
                ))}
                {unitGroups.size === 0 && <p className="text-center text-gray-500 pt-16">No Units</p>}
            </div>
        </div>
    );
};

const TransferScreen: React.FC<TransferScreenProps> = ({ info, onClose }) => {
    const { sourceArmyId, destinationId, destinationType } = info;
    const gameState = useGameStore(state => state.gameState)!;
    const confirmTransfer = useGameStore(state => state.confirmTransfer);
    
    const sourceArmy = gameState.armies.get(sourceArmyId)!;
    const destinationEntity = destinationType === 'city' ? gameState.cities.get(destinationId)! : gameState.armies.get(destinationId)!;

    const [sourceUnits, setSourceUnits] = useState<Unit[]>(() => sourceArmy.unitIds.map(id => gameState.units.get(id)!));
    const [destUnits, setDestUnits] = useState<Unit[]>(() => ('garrison' in destinationEntity ? destinationEntity.garrison : destinationEntity.unitIds).map(id => gameState.units.get(id)!));
    
    const [selectedSource, setSelectedSource] = useState<Set<UnitType>>(new Set());
    const [selectedDest, setSelectedDest] = useState<Set<UnitType>>(new Set());

    const { sourceCapacity, destCapacity, sourceCurrentLoad, destCurrentLoad, sourceFood, destFood } = useMemo(() => {
        const calculateStats = (entity: Army | City, units: Unit[]) => {
            let capacity = 0;
            let food = 'food' in entity ? (entity.food ?? 0) : 0; // Camp/City food vs Army (no base food)

            if ('garrison' in entity) { // City
                capacity = entity.storageCapacity;
            } else { // Army
                capacity = units.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].carryCapacity, 0);
                if (entity.isCamped) {
                    capacity += entity.storageCapacity;
                }
            }
            const currentLoad = 0; // Resource load not yet implemented in transfer
            return { capacity, currentLoad, food };
        };
        
        const sourceStats = calculateStats(sourceArmy, sourceUnits);
        const destStats = calculateStats(destinationEntity, destUnits);

        return {
            sourceCapacity: sourceStats.capacity,
            destCapacity: destStats.capacity,
            sourceCurrentLoad: sourceStats.currentLoad,
            destCurrentLoad: destStats.currentLoad,
            sourceFood: sourceStats.food,
            destFood: destStats.food
        };
    }, [sourceArmy, destinationEntity, sourceUnits, destUnits]);

    const handleSourceSelect = (unitType: UnitType) => {
        setSelectedSource(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitType)) newSet.delete(unitType);
            else newSet.add(unitType);
            return newSet;
        });
    };

    const handleDestSelect = (unitType: UnitType) => {
        setSelectedDest(prev => {
            const newSet = new Set(prev);
            if (newSet.has(unitType)) newSet.delete(unitType);
            else newSet.add(unitType);
            return newSet;
        });
    };

    const transferToDest = () => {
        if (selectedSource.size === 0) return;
        playSound('move');
        const unitsToMove = sourceUnits.filter(u => selectedSource.has(u.type));
        setSourceUnits(sourceUnits.filter(u => !selectedSource.has(u.type)));
        setDestUnits([...destUnits, ...unitsToMove]);
        setSelectedSource(new Set());
    };

    const transferToSource = () => {
        if (selectedDest.size === 0) return;
        playSound('move');
        const unitsToMove = destUnits.filter(u => selectedDest.has(u.type));
        setDestUnits(destUnits.filter(u => !selectedDest.has(u.type)));
        setSourceUnits([...sourceUnits, ...unitsToMove]);
        setSelectedDest(new Set());
    };

    const handleConfirm = () => {
        playSound('build');
        confirmTransfer({
            transferInfo: info,
            finalSourceUnitIds: sourceUnits.map(u => u.id),
            finalDestinationUnitIds: destUnits.map(u => u.id),
        });
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="relative bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col border-2 border-gray-600" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-20"><CloseIcon className="w-8 h-8" /></button>
                <div className="p-6 border-b-2 border-gray-600">
                    <h2 className="text-3xl font-bold">Transfer Units</h2>
                    <p className="text-gray-400">Move units between groups. Changes are final upon confirmation.</p>
                </div>

                <div className="p-6 flex-grow grid grid-cols-[1fr_auto_1fr] gap-4 overflow-y-hidden">
                    <TransferPanel 
                        title={sourceArmy.name ?? "Source Army"}
                        unitGroups={groupUnitsByType(sourceUnits)}
                        selectedGroups={selectedSource}
                        onGroupSelect={handleSourceSelect}
                        capacity={sourceCapacity}
                        currentLoad={sourceCurrentLoad}
                        currentFood={sourceFood}
                    />
                    
                    <div className="flex flex-col justify-center items-center gap-4">
                        <button onClick={transferToDest} disabled={selectedSource.size === 0} className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"><TransferIcon className="w-8 h-8 transform rotate-90" /></button>
                        <button onClick={transferToSource} disabled={selectedDest.size === 0} className="p-3 rounded-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"><TransferIcon className="w-8 h-8 transform -rotate-90" /></button>
                    </div>

                     <TransferPanel 
                        title={'name' in destinationEntity ? destinationEntity.name : "Destination Army"}
                        unitGroups={groupUnitsByType(destUnits)}
                        selectedGroups={selectedDest}
                        onGroupSelect={handleDestSelect}
                        capacity={destCapacity}
                        currentLoad={destCurrentLoad}
                        currentFood={destFood}
                    />
                </div>

                <div className="p-4 border-t-2 border-gray-600 flex-shrink-0 flex justify-end items-center gap-4">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-lg font-semibold rounded-lg transition-colors">Cancel</button>
                    <button onClick={handleConfirm} className="px-8 py-3 bg-green-600 hover:bg-green-500 text-lg font-bold rounded-lg transition-colors">Confirm Transfer</button>
                </div>
            </div>
        </div>
    );
};

export default TransferScreen;