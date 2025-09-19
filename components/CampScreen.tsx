import React, { useState, useEffect, useMemo } from 'react';
import { GameState, UnitType, Unit, TerrainType, CampBuildingType, BuildQueueItem, Gender, Army, ResourceCost } from '../types';
import { UNIT_DEFINITIONS, TERRAIN_DEFINITIONS, CAMP_BUILDING_DEFINITIONS, GATHERING_YIELD_PER_POINT } from '../constants';
import { CloseIcon, ResearchIcon, PlusIcon, InfantryIcon, TankIcon, TribesmanIcon, TribeswomanIcon, ChildIcon, ShamanIcon, PalisadeIcon, ScoutTentIcon, ForagingPostIcon, WoodIcon, StoneIcon, HidesIcon, ObsidianIcon, StoragePitIcon, ArrowDownIcon, FirePitIcon, FoodIcon, DryingRackIcon } from './Icons';
import StackedUnitCard from './StackedUnitCard';
import { axialToString } from '../utils/hexUtils';

interface CampScreenProps {
  gameState: GameState;
  armyId: string;
  onClose: () => void;
  onProduceInCamp: (armyId: string, itemType: UnitType | CampBuildingType, type: 'unit' | 'building') => void;
  onRenameArmy: (armyId: string, newName: string) => void;
  onUpdateFocus: (armyId: string, focus: { productionFocus: number; resourceFocus: Army['resourceFocus']}) => void;
  onDropResource: (containerId: string, containerType: 'city' | 'army', resource: keyof ResourceCost, amount: number) => void;
}

const EditableArmyName: React.FC<{ army: Army; onRename: (newName: string) => void }> = ({ army, onRename }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(army.name ?? 'Army');

    useEffect(() => {
        setName(army.name ?? 'Army');
    }, [army.name]);

    const handleSave = () => {
        if (name.trim()) {
            onRename(name.trim());
        } else {
            setName(army.name ?? 'Army'); // Reset if empty
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="bg-gray-900 text-3xl font-bold rounded px-2 -mx-2"
                autoFocus
            />
        );
    }

    return (
        <h2 className="text-3xl font-bold cursor-pointer hover:bg-gray-700/50 px-2 -mx-2 rounded" onClick={() => setIsEditing(true)}>
            {army.name ?? 'Army'}
        </h2>
    );
};

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
        switch(item.itemType as CampBuildingType) {
            case CampBuildingType.FirePit: return <FirePitIcon className={iconClass} />;
            case CampBuildingType.Palisade: return <PalisadeIcon className={iconClass} />;
            case CampBuildingType.ScoutTent: return <ScoutTentIcon className={iconClass} />;
            case CampBuildingType.ForagingPost: return <ForagingPostIcon className={iconClass} />;
            case CampBuildingType.StoragePit: return <StoragePitIcon className={iconClass} />;
            case CampBuildingType.DryingRack: return <DryingRackIcon className={iconClass} />;
            default: return null;
        }
    }
};

const renderBuildingIcon = (buildingType: CampBuildingType) => {
    const iconClass = "w-10 h-10 text-white";
     switch(buildingType) {
        case CampBuildingType.FirePit: return <FirePitIcon className={iconClass} />;
        case CampBuildingType.Palisade: return <PalisadeIcon className={iconClass} />;
        case CampBuildingType.ScoutTent: return <ScoutTentIcon className={iconClass} />;
        case CampBuildingType.ForagingPost: return <ForagingPostIcon className={iconClass} />;
        case CampBuildingType.StoragePit: return <StoragePitIcon className={iconClass} />;
        case CampBuildingType.DryingRack: return <DryingRackIcon className={iconClass} />;
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


const CampScreen: React.FC<CampScreenProps> = ({ gameState, armyId, onClose, onProduceInCamp, onRenameArmy, onUpdateFocus, onDropResource }) => {
  const army = gameState.armies.get(armyId);
  const [productionFocus, setProductionFocus] = useState(army?.productionFocus ?? 100);
  const [resourceFocus, setResourceFocus] = useState(army?.resourceFocus ?? { wood: false, stone: false, hides: false, obsidian: false });
  const [isStorageManagerOpen, setStorageManagerOpen] = useState(false);

  if (!army || !army.isCamped || army.level === undefined) return null;

  const player = gameState.players.find(p => p.id === army.ownerId);
  if (!player) return null;

  const isCurrentPlayerCamp = player.id === gameState.currentPlayerId;
  const garrisonedUnits = army.unitIds.map(id => gameState.units.get(id)).filter(Boolean) as Unit[];

  const groupedGarrison = garrisonedUnits.reduce((acc, unit) => {
    if (!acc.has(unit.type)) {
        acc.set(unit.type, []);
    }
    acc.get(unit.type)!.push(unit);
    return acc;
  }, new Map<UnitType, Unit[]>());

  const armyHex = gameState.hexes.get(axialToString(army.position));
  const terrainDef = armyHex ? TERRAIN_DEFINITIONS[armyHex.terrain] : null;

  const availableResources = useMemo(() => {
    const available = { wood: 0, stone: 0, hides: 0, obsidian: 0 };
    if (!army.controlledTiles) return available;
    for (const tileKey of army.controlledTiles) {
        const hex = gameState.hexes.get(tileKey);
        if (hex) {
            if (hex.currentWood > 0) available.wood += Math.floor(hex.currentWood);
            if (hex.currentStone > 0) available.stone += Math.floor(hex.currentStone);
            if (hex.currentHides > 0) available.hides += Math.floor(hex.currentHides);
            if (hex.currentObsidian > 0) available.obsidian += Math.floor(hex.currentObsidian);
        }
    }
    return available;
  }, [army.controlledTiles, gameState.hexes]);

  const totalWorkPoints = garrisonedUnits.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].productionYield, 0);
  const productionPoints = totalWorkPoints * (productionFocus / 100);
  const gatheringPoints = totalWorkPoints * ((100 - productionFocus) / 100);
  const focusedResourcesCount = Object.values(resourceFocus).filter(v => v).length;
  const pointsPerResource = focusedResourcesCount > 0 ? gatheringPoints / focusedResourcesCount : 0;
  const projectedYield = Math.round(pointsPerResource * GATHERING_YIELD_PER_POINT);
  const totalStoredResources = Object.values(army.localResources).reduce((sum, val) => sum + (val || 0), 0);

  const progressPercentage = (army.xp ?? 0) / (army.xpToNextLevel ?? 1) * 100;
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFocus = parseInt(e.target.value, 10);
    setProductionFocus(newFocus);
    onUpdateFocus(army.id, { productionFocus: newFocus, resourceFocus });
  };
  
  const handleCheckboxChange = (resource: keyof typeof resourceFocus) => {
    const newResourceFocus = { ...resourceFocus, [resource]: !resourceFocus[resource] };
    setResourceFocus(newResourceFocus);
    onUpdateFocus(army.id, { productionFocus, resourceFocus: newResourceFocus });
  };

  const renderUnitProduction = () => {
    if (!isCurrentPlayerCamp) return null;
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
                                    && (army.localResources.wood ?? 0) >= (def.cost.wood ?? 0)
                                    && (army.localResources.stone ?? 0) >= (def.cost.stone ?? 0)
                                    && (army.localResources.hides ?? 0) >= (def.cost.hides ?? 0)
                                    && (army.localResources.obsidian ?? 0) >= (def.cost.obsidian ?? 0)
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
                            <button onClick={() => onProduceInCamp(army.id, unitType, 'unit')} disabled={!canAfford} className={`px-3 py-1 text-sm font-bold rounded ${canAfford ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 cursor-not-allowed'}`}>Add to Queue</button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
  }

  const renderBuildingProduction = () => {
     if (!isCurrentPlayerCamp) return null;
     return(
         <div className="mt-4">
            <h4 className="text-md font-semibold mb-2 text-gray-300">Construct Building</h4>
            <div className="space-y-2">
                {Object.values(CampBuildingType).map(buildingType => {
                    const def = CAMP_BUILDING_DEFINITIONS[buildingType];
                    const hasRequiredTech = !def.requiredTech || player.unlockedTechs.includes(def.requiredTech);
                    if (!hasRequiredTech || army.buildings?.includes(buildingType)) return null;
                    
                     const canAfford = player.gold >= (def.cost.gold ?? 0)
                                    && (army.localResources.wood ?? 0) >= (def.cost.wood ?? 0)
                                    && (army.localResources.stone ?? 0) >= (def.cost.stone ?? 0)
                                    && (army.localResources.hides ?? 0) >= (def.cost.hides ?? 0)
                                    && (army.localResources.obsidian ?? 0) >= (def.cost.obsidian ?? 0);

                    return (
                         <div key={buildingType} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg">
                             <div className="flex items-center gap-2">
                                 {renderBuildingIcon(buildingType)}
                                 <div>
                                     <p className="font-bold">{buildingType}</p>
                                     <ResourceCostDisplay cost={def.cost} />
                                     <p className="text-xs text-gray-400">Prod: {def.productionCost}</p>
                                 </div>
                             </div>
                             <button onClick={() => onProduceInCamp(army.id, buildingType, 'building')} disabled={!canAfford} className={`px-3 py-1 text-sm font-bold rounded ${canAfford ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 cursor-not-allowed'}`}>Add to Queue</button>
                         </div>
                    )
                })}
            </div>
        </div>
     )
  }
  
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
          aria-label="Close camp screen"
        >
          <CloseIcon className="w-8 h-8" />
        </button>

        <div className="p-6 border-b-2 flex justify-between items-center flex-shrink-0" style={{ borderColor: player?.color ?? '#4a5568' }}>
          <div>
            <EditableArmyName army={army} onRename={(newName: string) => onRenameArmy(army.id, newName)} />
            <p className="text-gray-400">Founded Turn {army.foundingTurn} on {terrainDef?.name}</p>
          </div>
          <div className="text-right">
              <p className="text-2xl font-bold">Level {army.level}</p>
              <p className="text-sm text-gray-400">XP: {Math.floor(army.xp ?? 0)} / {army.xpToNextLevel}</p>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-y-auto flex-grow">
          {/* Left Column: Stats & Garrison */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-lg font-semibold text-gray-300 mb-1">Members ({garrisonedUnits.length})</h3>
            <div className="bg-gray-900/50 p-2 rounded-lg h-48 overflow-y-auto space-y-2">
                {garrisonedUnits.length > 0 ? (
                    Array.from(groupedGarrison.entries()).map(([unitType, units]) => (
                        <StackedUnitCard key={unitType} unitType={unitType} units={units} />
                    ))
                ) : (
                    <p className="text-center text-gray-400 pt-8">No units in camp.</p>
                )}
            </div>
             <div>
              <h3 className="text-lg font-semibold text-gray-300 mb-1">Level Progress</h3>
              <p className="text-2xl font-bold">{Math.floor(army.xp ?? 0)} / {army.xpToNextLevel}</p>
              <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
            
             <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-1">Local Resource Storage</h3>
                <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(totalStoredResources / army.storageCapacity) * 100}%`}}></div>
                </div>
                <p className="text-right text-xs">{totalStoredResources} / {army.storageCapacity} (Goods)</p>
                 <div className="grid grid-cols-2 text-sm gap-x-4 gap-y-1 mt-2">
                    <p className="flex items-center gap-1.5 col-span-2"><FoodIcon className="w-4 h-4 text-green-300" /> Food: <span className="font-semibold">{army.food ?? 0} / {army.foodStorageCapacity ?? 0}</span></p>
                    <p className="flex items-center gap-1.5"><WoodIcon className="w-4 h-4 text-yellow-700" /> Wood: <span className="font-semibold">{army.localResources.wood ?? 0}</span></p>
                    <p className="flex items-center gap-1.5"><StoneIcon className="w-4 h-4 text-gray-400" /> Stone: <span className="font-semibold">{army.localResources.stone ?? 0}</span></p>
                    <p className="flex items-center gap-1.5"><HidesIcon className="w-4 h-4 text-orange-400" /> Hides: <span className="font-semibold">{army.localResources.hides ?? 0}</span></p>
                    <p className="flex items-center gap-1.5"><ObsidianIcon className="w-4 h-4 text-purple-400" /> Obsidian: <span className="font-semibold">{army.localResources.obsidian ?? 0}</span></p>
                 </div>
                 <button onClick={() => setStorageManagerOpen(prev => !prev)} className="mt-2 text-sm text-cyan-400 hover:underline">
                    {isStorageManagerOpen ? 'Hide' : 'Manage Storage'}
                 </button>
            </div>
            {isStorageManagerOpen && (
                <div className="bg-gray-900/50 p-2 rounded-lg space-y-2">
                    {Object.keys(army.localResources).map(resStr => {
                        const res = resStr as keyof ResourceCost;
                        const amount = army.localResources[res] ?? 0;
                        if (amount === 0) return null;
                        return (
                             <div key={res} className="flex items-center justify-between text-sm">
                                <span className="capitalize">{res}: {amount}</span>
                                <button onClick={() => onDropResource(army.id, 'army', res, amount)} title="Drop all" className="p-1 rounded bg-red-800 hover:bg-red-700"><ArrowDownIcon className="w-4 h-4"/></button>
                             </div>
                        )
                    })}
                </div>
            )}
          </div>
          
          {/* Middle Column: Buildings & Workforce */}
          <div className="md:col-span-1">
             <h3 className="text-lg font-semibold text-gray-300 mb-2">Buildings ({army.buildings?.length ?? 0} / {army.level})</h3>
             <div className="grid grid-cols-2 gap-2">
                {Array.from({ length: army.level }).map((_, index) => {
                    const buildingType = army.buildings?.[index];
                    if (buildingType) {
                        const def = CAMP_BUILDING_DEFINITIONS[buildingType];
                        return (
                            <div key={index} className="bg-gray-700/50 p-2 rounded-lg flex flex-col items-center justify-center text-center h-24" title={def.description}>
                                {renderBuildingIcon(buildingType)}
                                <p className="font-semibold text-sm mt-1">{def.name}</p>
                            </div>
                        )
                    }
                    const isSlotQueued = army.buildQueue?.some(item => item.type === 'building');
                    if (isCurrentPlayerCamp && !isSlotQueued && (army.buildings?.length ?? 0) < army.level && index === (army.buildings?.length ?? 0)) {
                         return <div key={index} className="bg-gray-900/50 p-2 rounded-lg flex items-center justify-center h-24 text-gray-500 italic">Empty Slot</div>
                    }
                    return <div key={index} className="bg-gray-900/80 rounded-lg h-24"></div>
                })}
             </div>
             {isCurrentPlayerCamp && (
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
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Production Queue ({army.buildQueue?.length ?? 0})</h3>
                <p className="text-sm text-gray-400 mb-2">Production Points: <span className="font-bold text-blue-400">{Math.round(productionPoints)}</span> / turn</p>
                <div className="bg-gray-900/50 p-3 rounded-lg flex-grow flex flex-col">
                    <div className="space-y-3 overflow-y-auto flex-grow mb-4">
                        {(army.buildQueue?.length ?? 0) > 0 ? (
                            army.buildQueue!.map(item => {
                                const name = item.type === 'unit' 
                                    ? item.itemType 
                                    : CAMP_BUILDING_DEFINITIONS[item.itemType as CampBuildingType].name;
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
                    {renderBuildingProduction()}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default CampScreen;