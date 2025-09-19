import React from 'react';
import { HEX_SIZE, TERRAIN_DEFINITIONS, UNIT_DEFINITIONS, CITY_HP } from '../constants';
import { Hex, Unit, City, Player, Army } from '../types';
import { InfantryIcon, TankIcon, CityIcon, FoodIcon, PlusIcon, TribesmanIcon, TribeswomanIcon, ChildIcon, ShamanIcon, CampIcon, SicknessIcon } from './Icons';
import { UnitType } from '../types';

interface HexagonProps {
  hex: Hex;
  army: Army | undefined;
  unitsInArmy: Unit[];
  city: City | undefined;
  player: Player | undefined;
  isSelected: boolean;
  isExplored: boolean;
  isVisible: boolean;
  isReachable: boolean;
  isAttackable: boolean;
  isExpandable: boolean;
  isDeployable: boolean;
  isCampSelectable?: boolean;
  isCampSelected?: boolean;
  isInPath: boolean;
  isStarving: boolean;
  isSick: boolean;
  influenceBorderColor?: string;
  onClick: () => void;
}

const Hexagon: React.FC<HexagonProps> = ({ hex, army, unitsInArmy, city, player, isSelected, isExplored, isVisible, isReachable, isAttackable, isExpandable, isDeployable, isCampSelectable, isCampSelected, isInPath, isStarving, isSick, influenceBorderColor, onClick }) => {
  const BORDER_OFFSET = 2;
  const CELL_SIZE = HEX_SIZE;
  const RENDER_SIZE = CELL_SIZE - BORDER_OFFSET;

  const getPoints = (size: number) => Array.from({ length: 6 })
    .map((_, i) => {
      const angle_deg = 60 * i;
      const angle_rad = Math.PI / 180 * angle_deg;
      return [
        size + size * Math.cos(angle_rad),
        size + size * Math.sin(angle_rad)
      ].join(',');
    })
    .join(' ');
  
  const cellPoints = getPoints(CELL_SIZE);
  const renderPoints = getPoints(RENDER_SIZE);

  if (!isExplored) {
    return (
       <div className="absolute" style={{ left: `${CELL_SIZE * 3 / 2 * hex.q}px`, top: `${CELL_SIZE * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r)}px` }}>
         <div className="relative" style={{ width: CELL_SIZE * 2, height: CELL_SIZE * Math.sqrt(3) }}>
           <svg viewBox={`0 0 ${CELL_SIZE * 2} ${CELL_SIZE * 2}`} className="w-full h-full" style={{ transform: `translateY(-${(CELL_SIZE * 2 - CELL_SIZE * Math.sqrt(3))/2}px)` }}>
             <polygon
               points={cellPoints}
               fill="#1a202c" // very dark blue-gray
               stroke="#00000080"
               strokeWidth={2}
             />
           </svg>
         </div>
       </div>
    );
  }

  const terrain = TERRAIN_DEFINITIONS[hex.terrain];
  
  const topUnit = unitsInArmy.length > 0
    ? unitsInArmy.find(u => u.type === UnitType.Tank) || unitsInArmy.find(u => u.type === UnitType.Infantry) || unitsInArmy[0]
    : undefined;

  const renderArmyIcon = () => {
    if ((!topUnit && !army?.isCamped) || city) return null;

    const iconClass = `w-1/2 h-1/2 absolute top-1/4 left-1/4 drop-shadow-lg`;
    if (army?.isCamped) {
        return <CampIcon className={iconClass} />;
    }

    if (!topUnit) return null;

    switch (topUnit.type) {
      case UnitType.Infantry:
        return <InfantryIcon className={iconClass} />;
      case UnitType.Tank:
        return <TankIcon className={iconClass} />;
      case UnitType.Tribesman:
        return <TribesmanIcon className={iconClass} />;
      case UnitType.Tribeswoman:
        return <TribeswomanIcon className={iconClass} />;
      case UnitType.Child:
        return <ChildIcon className={iconClass} />;
      case UnitType.Shaman:
        return <ShamanIcon className={iconClass} />;
      default:
        return null;
    }
  };
  
  const renderHealthBar = () => {
    const target = topUnit || city;
    if (!target || army?.isCamped) return null; // Don't show health bar for camps

    const isUnit = 'type' in target; // is Unit
    const maxHp = isUnit ? UNIT_DEFINITIONS[target.type].maxHp : CITY_HP;
    const currentHp = target.hp;
    
    if (currentHp >= maxHp) return null; // Don't show for full health targets

    const healthPercentage = (currentHp / maxHp) * 100;
    const barColor = healthPercentage > 50 ? 'bg-green-500' : healthPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500';
    
    return (
       <div className="absolute -bottom-1 left-[15%] w-[70%] h-1.5 bg-gray-700 rounded-full overflow-hidden border border-black z-10">
         <div className={`${barColor} h-full rounded-full`} style={{ width: `${healthPercentage}%` }}></div>
       </div>
    )
  }

  const renderCity = () => {
    if (!city) return null;
    return <CityIcon className="w-2/3 h-2/3 absolute top-[16.66%] left-[16.66%] opacity-80 drop-shadow-lg" />;
  };
  
  const renderArmyBadge = () => {
    const unitCount = army ? army.unitIds.length : (city ? city.garrison.length : 0);

    if (unitCount === 0) return null;
    // Show if there is more than one unit in an army, OR if there are any units garrisoned in a city.
    if (unitCount <= 1 && !city) return null;

    return (
        <div className="absolute -top-1 -right-1 bg-gray-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 z-20" style={{ borderColor: player?.color ?? '#FFFFFF' }}>
            {unitCount}
        </div>
    )
  }

  const renderStarvationIndicator = () => {
    if (!isStarving) return null;
    return (
        <div className="absolute -top-1 -left-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-black z-20" title="Starving">
            <FoodIcon className="w-3 h-3" />
        </div>
    )
  }

  const renderSicknessIndicator = () => {
    if (!isSick) return null;
    return (
        <div className="absolute bottom-0 -left-1 bg-purple-600 text-white rounded-full w-5 h-5 flex items-center justify-center border-2 border-black z-20" title="Sick">
            <SicknessIcon className="w-3 h-3" />
        </div>
    )
  }

  const ringColor = player ? player.color : '#FFFFFF';

  return (
    <div
      className="absolute"
      style={{
        left: `${CELL_SIZE * 3 / 2 * hex.q}px`,
        top: `${CELL_SIZE * (Math.sqrt(3) / 2 * hex.q + Math.sqrt(3) * hex.r)}px`,
      }}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="relative cursor-pointer group" style={{ width: CELL_SIZE * 2, height: CELL_SIZE * Math.sqrt(3) }}>
        {/* Influence Border (Background) */}
        {influenceBorderColor && (
          <svg viewBox={`0 0 ${CELL_SIZE * 2} ${CELL_SIZE * 2}`} className="w-full h-full absolute top-0 left-0" style={{ transform: `translateY(-${(CELL_SIZE * 2 - CELL_SIZE * Math.sqrt(3))/2}px)` }}>
            <polygon points={cellPoints} fill={influenceBorderColor} />
          </svg>
        )}

        {/* Main Hexagon (Foreground) */}
        <div className="absolute" style={{ top: `${BORDER_OFFSET * Math.sqrt(3) / 2}px`, left: `${BORDER_OFFSET}px`}}>
            <div className="relative" style={{ width: RENDER_SIZE * 2, height: RENDER_SIZE * Math.sqrt(3) }}>
                <svg
                    viewBox={`0 0 ${RENDER_SIZE * 2} ${RENDER_SIZE * 2}`}
                    className="w-full h-full"
                    style={{ transform: `translateY(-${(RENDER_SIZE * 2 - RENDER_SIZE * Math.sqrt(3))/2}px)` }}
                >
                    <polygon
                        points={renderPoints}
                        fill={terrain.color}
                        stroke={isSelected ? '#fde047' : '#00000050'}
                        strokeWidth={isSelected ? 6 : 2}
                        className="transition-all duration-150"
                    />
                    {!isVisible && <polygon points={renderPoints} fill="rgba(26, 32, 44, 0.7)" />}
                    {isReachable && <polygon points={renderPoints} fill="rgba(255, 255, 255, 0.4)" />}
                    {isAttackable && <polygon points={renderPoints} fill="rgba(239, 68, 68, 0.5)" />}
                    {isInPath && <polygon points={renderPoints} fill="rgba(59, 130, 246, 0.6)" />}
                    {isExpandable && <polygon points={renderPoints} fill="rgba(74, 222, 128, 0.5)" />}
                    {isDeployable && <polygon points={renderPoints} fill="rgba(167, 139, 250, 0.6)" />}
                    {isCampSelectable && <polygon points={renderPoints} fill="rgba(203, 213, 225, 0.5)" />}
                    {isCampSelected && <polygon points={renderPoints} fill="rgba(253, 224, 71, 0.6)" />}
                </svg>

                <div className="absolute inset-0 flex items-center justify-center text-white" style={{ top: `${RENDER_SIZE * (Math.sqrt(3) - 2) / 2}px` }}>
                  {city && <div className="absolute inset-0" style={{ color: ringColor }}>{renderCity()}</div>}
                  {army && <div className="absolute inset-0" style={{ color: ringColor }}>{renderArmyIcon()}</div>}
                  {renderHealthBar()}
                  {renderArmyBadge()}
                  {renderStarvationIndicator()}
                  {renderSicknessIndicator()}
                  {isExpandable && <PlusIcon className="w-1/2 h-1/2 text-white opacity-70 drop-shadow-lg" />}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Hexagon;