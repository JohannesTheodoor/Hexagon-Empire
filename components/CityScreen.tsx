import React, { useState, useMemo } from 'react';
import { GameState, City, UnitType, BuildingType, BuildQueueItem, Unit, TerrainType, Gender, ResourceCost } from '../types';
import { BASE_CITY_INCOME, INCOME_PER_INFLUENCE_LEVEL, BUILDING_DEFINITIONS, UNIT_DEFINITIONS, TERRAIN_DEFINITIONS, BASE_CITY_FOOD_STORAGE, GATHERING_YIELD_PER_POINT } from '../constants';
import { CloseIcon, FoodIcon, InfantryIcon, TankIcon, MarketplaceIcon, GranaryIcon, PlusIcon, TribesmanIcon, TribeswomanIcon, ChildIcon, ShamanIcon, WoodIcon, StoneIcon, HidesIcon, ObsidianIcon, ArrowDownIcon } from './Icons';
import { TECH_TREE } from '../techtree';
import StackedUnitCard from './StackedUnitCard';

interface CityScreenProps {
  gameState: GameState;
  cityId: string;
  onClose: () => void;
  onBuildBuilding: (cityId: string, buildingType: BuildingType) => void;
  onProduceUnit: (unitType: UnitType, cityId: string) => void;
  onUpdateFocus: (cityId: string, focus: { productionFocus: number; resourceFocus: City['resourceFocus']}) => void;
  onDropResource: (containerId: string, containerType: 'city' | 'army', resource: keyof ResourceCost, amount: number) => void;
}

const renderQueueItemIcon = (item: BuildQueueItem) => {
    const iconClass = "w-8 h-8";
    if (item.type === 'unit') {
        switch(item.itemType as UnitType) {
            case UnitType.Infantry: return <InfantryIcon className={iconClass} />;
            case UnitType.Tank: return <TankIcon className={iconClass} />;
            case UnitType.Tribesman: return <TribesmanIcon className={iconClass} />;
            case UnitType.Tribeswoman: return <TribeswomanIcon className={iconClass} />;
            case UnitType.Child: return <ChildIcon className={iconClass} />;
            case UnitType.Shaman: return <ShamanIcon className={iconClass} />;
            default: return null;
        }
    } else {
        switch(item.itemType as BuildingType) {
            case BuildingType.Marketplace: return <MarketplaceIcon className={iconClass} />;
            case BuildingType.Granary: return <GranaryIcon className={iconClass} />;
            default: return null;
        }
    }
};

const renderBuildingIcon = (buildingType: BuildingType) => {
    const iconClass = "w-10 h-10 text-white";
    switch(buildingType) {
        case BuildingType.Marketplace: return <MarketplaceIcon className={iconClass} />;
        case BuildingType.Granary: return <GranaryIcon className={iconClass} />;
        default: return null;
    }
}

const ResourceCostDisplay: React.FC<{ cost: ResourceCost }> = ({ cost }) => {
    const entries = Object.entries(cost);
    if (entries.length === 0) return null;

    return (
        <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Cost:</span>
            {cost.gold && <span>{cost.gold}G</span>}
            {cost.wood && <span className="flex items-center gap-0.5">{cost.wood}<WoodIcon className="w-3 h-3 text-yellow-700"/></span>}
            {cost.stone && <span className="flex items-center gap-0.5">{cost.stone}<StoneIcon className="w-3 h-3 text-gray-400"/></span>}
            {cost.hides && <span className="flex items-center gap-0.5">{cost.hides}<HidesIcon className="w-3 h-3 text-orange-400"/></span>}
            {cost.obsidian && <span className="flex items-center gap-0.5">{cost.obsidian}<ObsidianIcon className="w-3 h-3 text-purple-400"/></span>}
        </div>
    );
};


const CityScreen: React.FC<CityScreenProps> = ({ gameState, cityId, onClose, onBuildBuilding, onProduceUnit, onUpdateFocus, onDropResource }) => {
  const city = gameState.cities.get(cityId);
  
  const [productionFocus, setProductionFocus] = useState(city?.productionFocus ?? 100);
  const [resourceFocus, setResourceFocus] = useState(city?.resourceFocus ?? { wood: false, stone: false, hides: false, obsidian: false });
  const [isStorageManagerOpen, setStorageManagerOpen] = useState(false);
  const [dropAmount, setDropAmount] = useState('');

  if (!city) return null;

  const player = gameState.players.find(p => p.id === city.ownerId);
  if (!player) return null;
  
  const isCurrentPlayerCity = player.id === gameState.currentPlayerId;
  const garrisonedUnits = city.garrison.map(id => gameState.units.get(id)).filter(Boolean) as Unit[];

  const groupedGarrison = garrisonedUnits.reduce((acc, unit) => {
    if (!acc.has(unit.type)) {
        acc.set(unit.type, []);
    }
    acc.get(unit.type)!.push(unit);
    return acc;
  }, new Map<UnitType, Unit[]>());


  const totalWorkPoints = garrisonedUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].productionYield, 0);
  const foodConsumption = garrisonedUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
  
  const hasFishing = player.unlockedTechs.includes('fishing');
  const fishingFoodBonus = hasFishing ? TECH_TREE['fishing'].effects.find(e => e.payload.bonus === 'food_from_water')?.payload.value ?? 0 : 0;

  const { yields, availableResources } = useMemo(() => {
    const yields = { food: 0, wood: 0, stone: 0, hides: 0, obsidian: 0 };
    const available = { wood: 0, stone: 0, hides: 0, obsidian: 0 };
    for (const tileKey of city.controlledTiles) {
        const hex = gameState.hexes.get(tileKey);
        if (hex) {
            if (hex.currentWood > 0) available.wood += hex.currentWood;
            if (hex.currentStone > 0) available.stone += hex.currentStone;
            if (hex.currentHides > 0) available.hides += hex.currentHides;
            if (hex.currentObsidian > 0) available.obsidian += hex.currentObsidian;

            if (!hex.armyId && !hex.cityId) { 
                const terrainDef = TERRAIN_DEFINITIONS[hex.terrain];
                yields.food += terrainDef.foodRegrowth;
            }
            if (hex.terrain === TerrainType.Sea || hex.terrain === TerrainType.Lake) {
                yields.food += fishingFoodBonus;
            }
        }
    }
     for (const buildingType of city.buildings) {
        yields.food += BUILDING_DEFINITIONS[buildingType].foodBonus ?? 0;
    }
    return { yields, availableResources: available };
  }, [city.controlledTiles, city.buildings, gameState.hexes, fishingFoodBonus]);


  const foodSurplus = yields.food - foodConsumption;
  
  let goldFromCity = BASE_CITY_INCOME + (city.controlledTiles.length - 1) * INCOME_PER_INFLUENCE_LEVEL;
  for(const buildingType of city.buildings) {
      goldFromCity += BUILDING_DEFINITIONS[buildingType].goldBonus ?? 0;
  }
  
  const prevPopMilestone = city.nextPopulationMilestone / 2;
  const popProgressToNextLevel = city.population - prevPopMilestone;
  const popRangeForLevel = city.nextPopulationMilestone - prevPopMilestone;
  const progressPercentage = (popProgressToNextLevel / popRangeForLevel) * 100;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFocus = parseInt(e.target.value, 10);
    setProductionFocus(newFocus);
    onUpdateFocus(city.id, { productionFocus: newFocus, resourceFocus });
  };
  
  const handleCheckboxChange = (resource: keyof typeof resourceFocus) => {
    const newResourceFocus = { ...resourceFocus, [resource]: !resourceFocus[resource] };
    setResourceFocus(newResourceFocus);
    onUpdateFocus(city.id, { productionFocus, resourceFocus: newResourceFocus });
  };
  
  const handleDropClick = (resource: keyof ResourceCost, amountStr: string) => {
      const amount = parseInt(amountStr, 10);
      if (!isNaN(amount) && amount > 0) {
          onDropResource(city.id, 'city', resource, amount);
          setDropAmount('');
      }
  };

  const renderUnitProduction = () => {
    if (!isCurrentPlayerCity) return null;

    const availableUnitTypes = Object.values(UnitType).filter(type => ![UnitType.Child, UnitType.Tribesman, UnitType.Tribeswoman].includes(type));

    return (
        <div className="mt-4">
            <h4 className="text-md font-semibold mb-2 text-gray-300">Produce Unit</h4>
            <div className="space-y-2">
                {availableUnitTypes.map(unitType => {
                    const def = UNIT_DEFINITIONS[unitType];
                    const hasRequiredTech = !def.requiredTech || player.unlockedTechs.includes(def.requiredTech);
                    if (!hasRequiredTech) return null;

                    const isAdvancedMale = def.gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman].includes(unitType);
                    const hasSacrifice = isAdvancedMale ? garrisonedUnits.some(u => u.type === UnitType.Tribesman) : true;

                    const canAfford = player.gold >= (def.cost.gold ?? 0)
                                    && (city.localResources.wood ?? 0) >= (def.cost.wood ?? 0)
                                    && (city.localResources.stone ?? 0) >= (def.cost.stone ?? 0)
                                    && (city.localResources.hides ?? 0) >= (def.cost.hides ?? 0)
                                    && (city.localResources.obsidian ?? 0) >= (def.cost.obsidian ?? 0)
                                    && hasSacrifice;
                    
                    return (
                        <div key={unitType} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg">
                            <div className="flex items-center gap-2">
                              {unitType === UnitType.Infantry && <InfantryIcon className="w-8 h-8" />}
                              {unitType === UnitType.Tank && <TankIcon className="w-8 h-8" />}
                              {unitType === UnitType.Shaman && <ShamanIcon className="w-8 h-8" />}
                              <div>
                                  <p className="font-bold">{unitType}</p>
                                  <ResourceCostDisplay cost={def.cost} />
                                  <div className="text-xs text-gray-400">
                                    <span>Prod: {def.productionCost}</span>
                                    {isAdvancedMale && <span className="ml-2 text-orange-400">(Req. 1 Tribesman)</span>}
                                  </div>
                              </div>
                            </div>
                            <button
                              onClick={() => onProduceUnit(unitType, city.id)}
                              disabled={!canAfford}
                              className={`px-3 py-1 text-sm font-bold rounded ${canAfford ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 cursor-not-allowed'}`}
                             >
                              Add to Queue
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
  const buildingSlots = Array.from({ length: city.level });
  const productionPoints = totalWorkPoints * (productionFocus / 100);
  const gatheringPoints = totalWorkPoints * ((100 - productionFocus) / 100);
  const focusedResourcesCount = Object.values(resourceFocus).filter(v => v).length;
  const pointsPerResource = focusedResourcesCount > 0 ? gatheringPoints / focusedResourcesCount : 0;
  const projectedYield = Math.round(pointsPerResource * GATHERING_YIELD_PER_POINT);
  const totalStoredResources = Object.values(city.localResources).reduce((sum, val) => sum + (val || 0), 0);

  return (
    <div 
      className="absolute inset-0 bg-black/70 flex items-center justify-center z-50"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative bg-gray-800 text-white rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col border-2 border-gray-600"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors z-20"
          aria-label="Close city screen"
        >
          <CloseIcon className="w-8 h-8" />
        </button>

        <div className="p-6 border-b-2 flex justify-between items-center flex-shrink-0" style={{ borderColor: player?.color ?? '#4a5568' }}>
          <div>
            <h2 className="text-3xl font-bold">{city.name}</h2>
            <p className="text-gray-400">Owned by {player?.name}</p>
          </div>
          <div className="text-right">
              <p className="text-2xl font-bold">Level {city.level}</p>
              <p className="text-sm text-gray-400">Next level at {city.nextPopulationMilestone} Pop</p>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-grow">
          {/* Left Column: Stats & Garrison */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-lg font-semibold text-gray-300 mb-1">Garrison ({garrisonedUnits.length})</h3>
            <div className="bg-gray-900/50 p-2 rounded-lg h-48 overflow-y-auto space-y-2">
                {garrisonedUnits.length > 0 ? (
                    Array.from(groupedGarrison.entries()).map(([unitType, units]) => (
                        <StackedUnitCard key={unitType} unitType={unitType} units={units} />
                    ))
                ) : (
                    <p className="text-center text-gray-400 pt-8">No units garrisoned.</p>
                )}
            </div>
             <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-1">Population</h3>
              <p className="text-2xl font-bold">{city.population} / {city.nextPopulationMilestone}</p>
              <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            
             <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-1">Local Resource Storage</h3>
                <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(totalStoredResources / city.storageCapacity) * 100}%`}}></div>
                </div>
                <p className="text-right text-xs">{totalStoredResources} / {city.storageCapacity}</p>
                 <div className="grid grid-cols-2 text-sm gap-x-4 gap-y-1 mt-2">
                    <p className="flex items-center gap-1.5"><WoodIcon className="w-4 h-4 text-yellow-700" /> Wood: <span className="font-semibold">{city.localResources.wood ?? 0}</span></p>
                    <p className="flex items-center gap-1.5"><StoneIcon className="w-4 h-4 text-gray-400" /> Stone: <span className="font-semibold">{city.localResources.stone ?? 0}</span></p>
                    <p className="flex items-center gap-1.5"><HidesIcon className="w-4 h-4 text-orange-400" /> Hides: <span className="font-semibold">{city.localResources.hides ?? 0}</span></p>
                    <p className="flex items-center gap-1.5"><ObsidianIcon className="w-4 h-4 text-purple-400" /> Obsidian: <span className="font-semibold">{city.localResources.obsidian ?? 0}</span></p>
                 </div>
                 <button onClick={() => setStorageManagerOpen(prev => !prev)} className="mt-2 text-sm text-cyan-400 hover:underline">
                    {isStorageManagerOpen ? 'Hide' : 'Manage Storage'}
                 </button>
            </div>
            {isStorageManagerOpen && (
                <div className="bg-gray-900/50 p-2 rounded-lg space-y-2">
                    {Object.keys(city.localResources).map(resStr => {
                        const res = resStr as keyof ResourceCost;
                        const amount = city.localResources[res] ?? 0;
                        if (amount === 0) return null;
                        return (
                             <div key={res} className="flex items-center justify-between text-sm">
                                <span className="capitalize">{res}: {amount}</span>
                                <button onClick={() => onDropResource(city.id, 'city', res, amount)} title="Drop all" className="p-1 rounded bg-red-800 hover:bg-red-700"><ArrowDownIcon className="w-4 h-4"/></button>
                             </div>
                        )
                    })}
                </div>
            )}
            <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-1">Resource Yield / Turn</h3>
                <div className="grid grid-cols-2 text-sm gap-x-4">
                  <p>Gold: <span className="font-semibold text-yellow-400">+{goldFromCity}</span></p>
                  <p className="flex items-center gap-1.5"><FoodIcon className="w-4 h-4" /> Food: <span className={`font-semibold ${foodSurplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>{foodSurplus >= 0 ? '+' : ''}{foodSurplus}</span></p>
                </div>
                 <p className="text-xs text-gray-400 mt-1">Food Stored: {city.food}/{city.foodStorageCapacity}</p>
            </div>

          </div>
          
          {/* Middle Column: Buildings & Workforce */}
          <div className="md:col-span-1">
             <h3 className="text-lg font-semibold text-gray-300 mb-2">Buildings ({city.buildings.length} / {city.level})</h3>
             <div className="grid grid-cols-2 gap-2">
                {buildingSlots.map((_, index) => {
                    const buildingType = city.buildings[index];
                    if (buildingType) {
                        const def = BUILDING_DEFINITIONS[buildingType];
                        return (
                            <div key={index} className="bg-gray-700/50 p-2 rounded-lg flex flex-col items-center justify-center text-center h-24" title={def.description}>
                                {renderBuildingIcon(buildingType)}
                                <p className="font-semibold text-sm mt-1">{def.name}</p>
                            </div>
                        )
                    }
                    const isSlotQueued = city.buildQueue.some(item => item.type === 'building');
                    if (isCurrentPlayerCity && !isSlotQueued && city.buildings.length < city.level && index === city.buildings.length) {
                         return <button key={index} onClick={() => onBuildBuilding(city.id, BuildingType.Marketplace)} disabled={!isCurrentPlayerCity} className="bg-gray-900/50 p-2 rounded-lg flex items-center justify-center h-24 hover:bg-gray-700 disabled:cursor-not-allowed transition-colors"><PlusIcon className="w-10 h-10 text-gray-500" /></button>
                    }
                    return <div key={index} className="bg-gray-900/80 rounded-lg h-24"></div>
                })}
             </div>
             {isCurrentPlayerCity && (
                <div className="mt-4 pt-4 border-t-2 border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Workforce Allocation</h3>
                    <div className="bg-gray-900/50 p-3 rounded-lg">
                        <div className="flex justify-between text-sm font-semibold">
                            <span>Gathering</span>
                            <span>Production</span>
                        </div>
                        <input type="range" min="0" max="100" value={productionFocus} onChange={handleSliderChange} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500 my-1"/>
                        <div className="flex justify-between text-xs text-gray-400">
                            <span>{Math.round(gatheringPoints)} points</span>
                            <span>{Math.round(productionPoints)} points</span>
                        </div>

                        <h4 className="text-md font-semibold mt-3 mb-2 text-gray-400">Resource Focus</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.keys(resourceFocus).map(res => {
                                const typedRes = res as keyof typeof resourceFocus;
                                return (
                                    <label key={res} className={`flex items-center gap-2 p-2 rounded ${availableResources[typedRes] === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-700/50'}`}>
                                        <input type="checkbox" checked={resourceFocus[typedRes]} onChange={() => handleCheckboxChange(typedRes)} disabled={availableResources[typedRes] === 0} className="form-checkbox h-5 w-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                                        <span className="capitalize flex-grow">{res}</span>
                                        <span className="text-xs text-gray-400">
                                            {resourceFocus[typedRes] && <span className="text-green-400 font-semibold">+{projectedYield}</span>}
                                            <span className="ml-2">Av: {availableResources[typedRes]}</span>
                                        </span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                </div>
             )}
          </div>
          
          {/* Right Column: Production Queue */}
            <div className="md:col-span-1">
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Production Queue ({city.buildQueue.length})</h3>
                <p className="text-sm text-gray-400 mb-2">Production Points: <span className="font-bold text-blue-400">{Math.round(productionPoints)}</span> / turn</p>
                <div className="bg-gray-900/50 p-3 rounded-lg flex-grow flex flex-col">
                    <div className="space-y-3 overflow-y-auto flex-grow mb-4">
                        {city.buildQueue.length > 0 ? (
                            city.buildQueue.map(item => {
                                const name = item.type === 'unit' 
                                    ? item.itemType 
                                    : BUILDING_DEFINITIONS[item.itemType as BuildingType].name;
                                const progressPercentage = (item.progress / item.productionCost) * 100;
                                const turnsLeft = productionPoints > 0 ? Math.ceil((item.productionCost - item.progress) / productionPoints) : '∞';

                                return (
                                    <div key={item.id} className="p-2 bg-gray-700/50 rounded">
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <div className="flex items-center gap-2">
                                                {renderQueueItemIcon(item)}
                                                <p className="font-semibold">{name}</p>
                                            </div>
                                            <p className="text-xs text-gray-400">{turnsLeft} turns</p>
                                        </div>
                                        <div className="w-full h-2 bg-gray-600 rounded-full overflow-hidden border border-black">
                                            <div className="bg-green-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
                                        </div>
                                        <p className="text-right text-xs mt-0.5">{Math.floor(item.progress)} / {item.productionCost}</p>
                                    </div>
                                )
                            })
                        ) : (
                            <p className="text-center text-gray-400 py-4">Queue is empty.</p>
                        )}
                    </div>
                    {renderUnitProduction()}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CityScreen;