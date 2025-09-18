import React from 'react';
import { Unit, UnitType } from '../types';
import { UNIT_DEFINITIONS } from '../constants';
import { InfantryIcon, TankIcon, TribesmanIcon, TribeswomanIcon, ChildIcon, ShamanIcon } from './Icons';

interface StackedUnitCardProps {
  unitType: UnitType;
  units: Unit[];
}

const StackedUnitCard: React.FC<StackedUnitCardProps> = ({ unitType, units }) => {
    const count = units.length;
    if (count === 0) return null;

    const def = UNIT_DEFINITIONS[unitType];
    const totalHp = units.reduce((sum, u) => sum + u.hp, 0);
    const totalMaxHp = count * def.maxHp;
    const healthPercentage = totalMaxHp > 0 ? (totalHp / totalMaxHp) * 100 : 0;
    
    const totalAttack = count * def.attack;
    const totalDefense = count * def.defense;

    const renderIcon = (type: UnitType) => {
        const iconClass = "w-8 h-8 flex-shrink-0";
        switch(type) {
            case UnitType.Infantry: return <InfantryIcon className={iconClass} />;
            case UnitType.Tank: return <TankIcon className={iconClass} />;
            case UnitType.Tribesman: return <TribesmanIcon className={iconClass} />;
            case UnitType.Tribeswoman: return <TribeswomanIcon className={iconClass} />;
            case UnitType.Child: return <ChildIcon className={iconClass} />;
            case UnitType.Shaman: return <ShamanIcon className={iconClass} />;
            default: return null;
        }
    }
    
    return (
        <div className="bg-gray-700/50 p-2 rounded flex items-center gap-3">
            {renderIcon(unitType)}
            <div className="flex-grow">
                <p className="font-semibold">{count} x {unitType}</p>
                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-black my-1">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${healthPercentage}%` }}></div>
                </div>
                 <p className="text-xs text-gray-400">
                    ATK: <span className="font-bold text-red-400">{totalAttack}</span>, 
                    DEF: <span className="font-bold text-blue-400">{totalDefense}</span>
                </p>
            </div>
        </div>
    );
};

export default StackedUnitCard;
