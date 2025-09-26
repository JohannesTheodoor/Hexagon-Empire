

import React, { useState, useEffect, useMemo } from 'react';
import { GameState, UnitType, Unit, TerrainType, CampBuildingType, BuildQueueItem, Gender, Army, ResourceCost } from '../types';
import { UNIT_DEFINITIONS, TERRAIN_DEFINITIONS, CAMP_BUILDING_DEFINITIONS, GATHERING_YIELD_PER_POINT } from '../constants';
import { CloseIcon, ResearchIcon, PlusIcon, InfantryIcon, TankIcon, TribesmanIcon, TribeswomanIcon, ChildIcon, ShamanIcon, PalisadeIcon, ScoutTentIcon, ForagingPostIcon, WoodIcon, StoneIcon, HidesIcon, ObsidianIcon, StoragePitIcon, ArrowDownIcon, FirePitIcon, FoodIcon, DryingRackIcon, SicknessIcon, ArrowUpIcon, HealersTentIcon, TentIcon, UsersIcon, ToolmakersShelterIcon, HunterIcon } from './Icons';
import StackedUnitCard from './StackedUnitCard';
import { axialToString } from '../utils/hexUtils';
import { useGameStore } from '../store/gameStore';
import { playSound } from '../utils/soundManager';

interface CampScreenProps {
  armyId: string;
  onClose: () => void;
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
            case UnitType.Hunter: return <HunterIcon className={iconClass} />;
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
            case CampBuildingType.HealersTent: return <HealersTentIcon className={iconClass} />;
            case CampBuildingType.Tent: return <TentIcon className={iconClass} />;
            case CampBuildingType.ToolmakersShelter: return <ToolmakersShelterIcon className={iconClass} />;
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
        case CampBuildingType.HealersTent: return <HealersTentIcon className={iconClass} />;
        case CampBuildingType.Tent: return <TentIcon className={iconClass} />;
        case CampBuildingType.ToolmakersShelter: return <ToolmakersShelterIcon className={iconClass} />;
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

const SicknessDetailsPanel: React.FC<{ details: Army['sicknessRiskDetails'], sickUnitCount: number, totalUnitCount: number }> = ({ details, sickUnitCount, totalUnitCount }) => {
    if (!details) return null;
    return (
        <div className="pl-4 pt-1 space-y-1 text-xs text-gray-300 border-l-2 border-gray-600 ml-2">
            <div className="flex justify-between"><span>Affected Units:</span> <span className="font-semibold text-purple-400">{sickUnitCount} / {totalUnitCount}</span></div>
            <div className="flex justify-between"><span>Base (Terrain):</span> <span className="font-semibold text-orange-400">+{details.baseTerrain.toFixed(1)}%</span></div>
            {details.stagnation > 0 && <div className="flex justify-between"><span>Stagnation:</span> <span className="font-semibold text-orange-400">+{details.stagnation.toFixed(1)}%</span></div>}
            {details.overcrowding > 0 && <div className="flex justify-between"><span>Overcrowding:</span> <span className="font-semibold text-orange-400">+{details.overcrowding.toFixed(1)}%</span></div>}
            {details.healersTentReduction > 0 && <div className="flex justify-between"><span>Healer's Tent:</span> <span className="font-semibold text-green-400">-{details.healersTentReduction.toFixed(1)}%</span></div>}
            {details.shamanFlatReduction > 0 && <div className="flex justify-between"><span>Shaman's Influence:</span> <span className="font-semibold text-green-400">-{details.shamanFlatReduction.toFixed(1)}%</span></div>}
        </div>
    );
};


const CampScreen: React.FC<CampScreenProps> = ({ armyId, onClose }) => {
  const gameState = useGameStore(state => state.gameState);
  const produceInCamp = useGameStore(state => state.produceInCamp);
  const renameArmy = useGameStore(state => state.renameArmy);
  const updateCampFocus = useGameStore(state => state.updateCampFocus);
  const dropResource = useGameStore(state => state.dropResource);
  const cancelProduction = useGameStore(state => state.cancelProduction);

  const army = gameState?.armies.get(armyId);
  const [productionFocus, setProductionFocus] = useState(army?.productionFocus ?? 100);
  const [resourceFocus, setResourceFocus] = useState(army?.resourceFocus ?? { wood: false, stone: false, hides: false, obsidian: false });
  const [isStorageManagerOpen, setStorageManagerOpen] = useState(false);
  const [isFoodDetailsExpanded, setIsFoodDetailsExpanded] = useState(false);
  const [isSicknessDetailsExpanded, setIsSicknessDetailsExpanded] = useState(false);
  const [isOvercrowdingDetailsExpanded, setIsOvercrowdingDetailsExpanded] = useState(false);

  if (!gameState || !army || !army.isCamped || army.level === undefined) return null;

  const player = gameState.players.find(p => p.id === army.ownerId);
  if (!player) return null;

  const isCurrentPlayerCamp = player.id === gameState.currentPlayerId;
  const garrisonedUnits = army.unitIds.map(id => gameState.units.get(id)).filter(Boolean) as Unit[];
  const sickUnitCount = garrisonedUnits.filter(u => u.hp < UNIT_DEFINITIONS[u.type].maxHp).length;

  const groupedGarrison = garrisonedUnits.reduce((acc, unit) => {
    if (!acc.has(unit.type)) {
        acc.set(unit.type, []);
    }
    acc.get(unit.type)!.push(unit);
    return acc;
  }, new Map<UnitType, Unit[]>());

  const armyHex = gameState.hexes.get(axialToString(army.position));
  const terrainDef = armyHex ? TERRAIN_DEFINITIONS[armyHex.terrain] : null;

  const { availableResources, availableFoodOnTerritory } = useMemo(() => {
    const available = { wood: 0, stone: 0, hides: 0, obsidian: 0 };
    let food = 0;
    if (!army.controlledTiles) return { availableResources: available, availableFoodOnTerritory: food };
    for (const tileKey of army.controlledTiles) {
        const hex = gameState.hexes.get(tileKey);
        if (hex) {
            food += Math.floor(hex.currentFood);
            if (hex.currentWood > 0) available.wood += Math.floor(hex.currentWood);
            if (hex.currentStone > 0) available.stone += Math.floor(hex.currentStone);
            if (hex.currentHides > 0) available.hides += Math.floor(hex.currentHides);
            if (hex.currentObsidian > 0) available.obsidian += Math.floor(hex.currentObsidian);
        }
    }
    return { availableResources: available, availableFoodOnTerritory: food };
  }, [army.controlledTiles, gameState.hexes]);

  // Food calculations
  const totalUnitFoodStored = garrisonedUnits.reduce((sum: number, u: Unit) => sum + u.foodStored, 0);
  const totalFoodStored = (army.food ?? 0) + totalUnitFoodStored;
  const totalUnitFoodCapacity = garrisonedUnits.reduce((sum: number, u: Unit) => sum + UNIT_DEFINITIONS[u.type].foodCarryCapacity, 0);
  const totalCampFoodCapacity = army.foodStorageCapacity ?? 0;
  const totalOverallFoodCapacity = totalUnitFoodCapacity + totalCampFoodCapacity;
  let totalFoodGatherRate = garrisonedUnits.reduce((sum: number, u: Unit) => sum + UNIT_DEFINITIONS[u.type].foodGatherRate, 0);
  if (army.buildings?.includes(CampBuildingType.ForagingPost)) {
      totalFoodGatherRate += CAMP_BUILDING_DEFINITIONS[CampBuildingType.ForagingPost].foodGatherBonus ?? 0;
  }
  const totalConsumption = garrisonedUnits.reduce((sum: number, u: Unit) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
  const foodToGather = Math.min(availableFoodOnTerritory, totalFoodGatherRate);
  const netFoodChange = foodToGather - totalConsumption;
  const netColor = netFoodChange >= 0 ? 'text-green-400' : 'text-red-400';
  
  const totalWorkPoints = garrisonedUnits.reduce((sum: number, u: Unit) => sum + UNIT_DEFINITIONS[u.type].productionYield, 0);
  const productionPoints = Number(totalWorkPoints) * (Number(productionFocus) / 100);
  const gatheringPoints = Number(totalWorkPoints) * ((100 - Number(productionFocus)) / 100);
  const focusedResourcesCount = Object.values(resourceFocus).filter(v => v).length;
  const pointsPerResource = focusedResourcesCount > 0 ? gatheringPoints / focusedResourcesCount : 0;
  const projectedYield = Math.round(pointsPerResource * GATHERING_YIELD_PER_POINT);
  const totalStoredResources = Object.values(army.localResources).reduce((sum: number, val: unknown) => sum + (Number(val) || 0), 0);

  const progressPercentage = (Number(army.xp ?? 0) / Number(army.xpToNextLevel ?? 1)) * 100;
  
  const risk = army.sicknessRisk ?? 0;
  const riskColor = risk > 50 ? 'bg-red-500' : risk > 20 ? 'bg-yellow-500' : 'bg-green-500';

  const housingCapacity = army.tentLevel ? CAMP_BUILDING_DEFINITIONS[CampBuildingType.Tent].housingCapacity! * Math.pow(2, Number(army.tentLevel) - 1) : 0;
  const overcrowdingPercentage = housingCapacity > 0 ? Math.min(100, (garrisonedUnits.length / housingCapacity) * 100) : (garrisonedUnits.length > 0 ? 100 : 0);
  const isOvercrowded = garrisonedUnits.length > housingCapacity;
  const overcrowdingBarColor = isOvercrowded ? 'bg-red-500' : overcrowdingPercentage > 80 ? 'bg-yellow-500' : 'bg-green-500';
  const overcrowdedCount = isOvercrowded ? garrisonedUnits.length - housingCapacity : 0;
  const overcrowdingSicknessBonus = army.sicknessRiskDetails?.overcrowding ?? 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newFocus = parseInt(e.target.value, 10);
    setProductionFocus(newFocus);
    updateCampFocus({ armyId: army.id, focus: { productionFocus: newFocus, resourceFocus } });
  };
  
  const handleCheckboxChange = (resource: keyof typeof resourceFocus) => {
    const newResourceFocus = { ...resourceFocus, [resource]: !resourceFocus[resource] };
    setResourceFocus(newResourceFocus);
    updateCampFocus({ armyId: army.id, focus: { productionFocus, resourceFocus: newResourceFocus } });
  };
  
  const handleProduceInCamp = (itemType: UnitType | CampBuildingType, type: 'unit' | 'building') => {
    const def = type === 'unit' ? UNIT_DEFINITIONS[itemType as UnitType] : CAMP_BUILDING_DEFINITIONS[itemType as CampBuildingType];
    const isAdvancedMale = type === 'unit' && (def as any).gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman, UnitType.StoneWarrior].includes(itemType as UnitType);
    const hasSacrifice = !isAdvancedMale || garrisonedUnits.some(u => u.type === UnitType.Tribesman);
    
    let cost = def.cost;
    if (itemType === CampBuildingType.Tent) {
        const baseDef = CAMP_BUILDING_DEFINITIONS[CampBuildingType.Tent];
        const queuedTentUpgrades = army.buildQueue?.filter(item => item.itemType === CampBuildingType.Tent).length ?? 0;
        const currentTentLevel = (Number(army.tentLevel ?? 0)) + queuedTentUpgrades;
        const costMultiplier = Math.pow(2, currentTentLevel);
        cost = Object.entries(baseDef.cost).reduce((acc, [key, value]) => {
            acc[key as keyof ResourceCost] = value * costMultiplier;
            return acc;
        }, {} as ResourceCost);
    }
    
    const canAfford = player.gold >= (cost.gold ?? 0) &&
                    (army.localResources.wood ?? 0) >= (cost.wood ?? 0) &&
                    (army.localResources.stone ?? 0) >= (cost.stone ?? 0) &&
                    (army.localResources.hides ?? 0) >= (cost.hides ?? 0) &&
                    (army.localResources.obsidian ?? 0) >= (cost.obsidian ?? 0) &&
                    hasSacrifice;
    if (canAfford) {
        playSound('build');
        produceInCamp({ armyId: army.id, itemType, type });
    } else {
        playSound('error');
    }
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
                    const isAdvancedMale = def.gender === Gender.Male && [UnitType.Infantry, UnitType.Shaman, UnitType.StoneWarrior].includes(unitType);
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
                              {unitType === UnitType.Hunter && <HunterIcon className="w-8 h-8" />}
                              <div>
                                  <p className="font-bold">{unitType}</p>
                                  <ResourceCostDisplay cost={def.cost} />
                                  <div className="text-xs text-gray-400">
                                      <span>Prod: {def.productionCost}</span>
                                      {isAdvancedMale && <span className="ml-2 text-orange-400">(Req. 1 Tribesman)</span>}
                                  </div>
                              </div>
                            </div>
                            <button onClick={() => handleProduceInCamp(unitType, 'unit')} disabled={!canAfford} className={`px-3 py-1 text-sm font-bold rounded ${canAfford ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 cursor-not-allowed'}`}>Add to Queue</button>
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
                    if (buildingType === CampBuildingType.Tent) {
                        const tentDef = CAMP_BUILDING_DEFINITIONS[CampBuildingType.Tent];
                        const queuedTentUpgrades = army.buildQueue?.filter(item => item.itemType === CampBuildingType.Tent).length ?? 0;
                        const effectiveTentLevel = (Number(army.tentLevel ?? 0)) + queuedTentUpgrades;
                        const costMultiplier = Math.pow(2, effectiveTentLevel);

                        const tentCost = Object.entries(tentDef.cost).reduce((acc, [key, value]) => {
                            acc[key as keyof ResourceCost] = value * costMultiplier;
                            return acc;
                        }, {} as ResourceCost);
                        const tentProdCost = tentDef.productionCost * costMultiplier;

                        const canAffordTent = player.gold >= (tentCost.gold ?? 0)
                                    && (army.localResources.wood ?? 0) >= (tentCost.wood ?? 0)
                                    && (army.localResources.stone ?? 0) >= (tentCost.stone ?? 0)
                                    && (army.localResources.hides ?? 0) >= (tentCost.hides ?? 0)
                                    && (army.localResources.obsidian ?? 0) >= (tentCost.obsidian ?? 0);
                        
                        const isTentQueued = queuedTentUpgrades > 0;
                        const tentButtonLabel = (army.tentLevel ?? 0) === 0 ? "Build Tent" : `Upgrade Tent (Lvl ${effectiveTentLevel + 1})`;

                         return (
                            <div key={buildingType} className="flex justify-between items-center p-2 bg-gray-900/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    {renderBuildingIcon(buildingType)}
                                    <div>
                                        <p className="font-bold">{tentDef.name}</p>
                                        <ResourceCostDisplay cost={tentCost} />
                                        <p className="text-xs text-gray-400">Prod: {tentProdCost}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleProduceInCamp(buildingType, 'building')} disabled={!canAffordTent} className={`px-3 py-1 text-sm font-bold rounded ${canAffordTent ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 cursor-not-allowed'}`}>
                                    {tentButtonLabel}
                                </button>
                            </div>
                         )
                    }

                    const def = CAMP_BUILDING_DEFINITIONS[buildingType];
                    const hasRequiredTech = !def.requiredTech || player.unlockedTechs.includes(def.requiredTech);
                    const isAlreadyBuilt = army.buildings?.includes(buildingType);
                    const isQueued = army.buildQueue?.some(item => item.itemType === buildingType);
                    // FIX: The left-hand side of an arithmetic operation may be an invalid type due to state cloning.
                    // Explicitly cast army.level to a number and use Array.isArray to safely get length.
                    const hasEmptySlot = (Array.isArray(army.buildings) ? army.buildings.length : 0) + (army.tentLevel ? 1 : 0) < Number(army.level);

                    if (!hasRequiredTech || isAlreadyBuilt || isQueued) return null;
                    
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
                             <button onClick={() => handleProduceInCamp(buildingType, 'building')} disabled={!canAfford || !hasEmptySlot} className={`px-3 py-1 text-sm font-bold rounded ${canAfford && hasEmptySlot ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-500 cursor-not-allowed'}`}>
                                {hasEmptySlot ? 'Add to Queue' : 'No Slot'}
                             </button>
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
            <EditableArmyName army={army} onRename={(newName: string) => renameArmy({ armyId: army.id, newName })} />
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
                <button
                    onClick={() => setIsOvercrowdingDetailsExpanded(prev => !prev)}
                    className="w-full flex justify-between items-center text-left p-2 -mx-2 rounded hover:bg-white/10 transition-colors"
                    aria-expanded={isOvercrowdingDetailsExpanded}
                    aria-controls="overcrowding-details-panel"
                >
                    <div className="flex items-center gap-1.5">
                        <UsersIcon className="w-5 h-5 text-gray-300" />
                        <span className="font-bold text-lg">Housing Status</span>
                    </div>
                    <span className={`font-semibold text-lg ${isOvercrowded ? 'text-red-400' : 'text-green-400'}`}>
                        {garrisonedUnits.length} / {housingCapacity}
                    </span>
                </button>
                <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                    <div className={`${overcrowdingBarColor} h-full rounded-full`} style={{ width: `${overcrowdingPercentage}%`}}></div>
                </div>

                {isOvercrowdingDetailsExpanded && (
                    <div id="overcrowding-details-panel" className="pl-4 pt-2 mt-2 space-y-2 text-sm text-gray-300 border-l-2 border-gray-600 ml-2">
                        <h4 className="font-bold text-gray-200 text-base mb-1">Overcrowding Details</h4>
                        <div className="flex justify-between"><span>Total Tent Capacity:</span> <span className="font-semibold">{housingCapacity}</span></div>
                        <div className="flex justify-between"><span>Total Population:</span> <span className="font-semibold">{garrisonedUnits.length}</span></div>
                        <div className={`flex justify-between font-bold ${isOvercrowded ? 'text-red-400' : 'text-green-400'}`}>
                            <span>Status:</span> 
                            <span>
                                {isOvercrowded ? `${overcrowdedCount} member(s) overcrowded` : 'Capacity OK'}
                            </span>
                        </div>
                        <div className="flex justify-between pt-1 mt-1 border-t border-gray-700">
                            <span>Sickness Risk Bonus:</span> 
                            <span className="font-semibold text-orange-400">+{overcrowdingSicknessBonus.toFixed(1)}%</span>
                        </div>
                    </div>
                )}
            </div>
            
            <div>
                 <button
                    onClick={() => setIsSicknessDetailsExpanded(prev => !prev)}
                    className="w-full flex justify-between items-center text-left p-1 -mx-1 rounded hover:bg-white/10 transition-colors"
                    aria-expanded={isSicknessDetailsExpanded}
                >
                    <span className="flex items-center gap-1.5 font-bold">
                        <SicknessIcon className="w-4 h-4 text-purple-400"/>
                        Sickness Risk
                    </span>
                    <span className="font-semibold">{Math.round(risk)}%</span>
                </button>
                <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                    <div className={`${riskColor} h-full rounded-full`} style={{ width: `${risk}%` }}></div>
                </div>
                {isSicknessDetailsExpanded && <SicknessDetailsPanel details={army.sicknessRiskDetails} sickUnitCount={sickUnitCount} totalUnitCount={garrisonedUnits.length} />}
            </div>
             
             <div>
                <button
                    onClick={() => setIsFoodDetailsExpanded(prev => !prev)}
                    className={`w-full flex justify-between items-center text-left p-2 -mx-2 rounded hover:bg-white/10 transition-colors ${netColor}`}
                    aria-expanded={isFoodDetailsExpanded}
                    aria-controls="food-details-panel"
                >
                    <div className="flex items-center gap-1.5">
                        <FoodIcon className="w-5 h-5" />
                        <span className="font-bold text-lg">Food Supply</span>
                    </div>
                    <span className="font-semibold text-lg">
                        {totalFoodStored} / {totalOverallFoodCapacity}
                    </span>
                </button>

                {isFoodDetailsExpanded && (
                    <div id="food-details-panel" className="pl-4 pt-2 mt-2 space-y-2 text-sm text-gray-300 border-l-2 border-gray-600 ml-2">
                        <h4 className="font-bold text-gray-200 text-base mb-1">Flow per Turn</h4>
                        <div className="flex justify-between"><span>On Territory:</span> <span className="font-semibold">{availableFoodOnTerritory}</span></div>
                        <div className="flex justify-between"><span>Gathering:</span> <span className="font-semibold text-green-400">+{foodToGather}</span></div>
                        <div className="flex justify-between"><span>Consumption:</span> <span className="font-semibold text-orange-400">-{totalConsumption}</span></div>
                        <div className="flex justify-between font-bold text-base pt-1 mt-1 border-t border-gray-700"><span>Net:</span> <span className={netColor}>{netFoodChange >= 0 ? '+' : ''}{netFoodChange}</span></div>
                        
                        <h4 className="font-bold text-gray-200 text-base mt-3 mb-1 pt-2 border-t border-gray-700">Storage Breakdown</h4>
                        <div className="flex justify-between"><span>In Units:</span> <span className="font-semibold">{totalUnitFoodStored} / {totalUnitFoodCapacity}</span></div>
                        <div className="flex justify-between"><span>In Camp:</span> <span className="font-semibold">{army.food ?? 0} / {totalCampFoodCapacity}</span></div>

                    </div>
                )}
             </div>


             <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-1 mt-4">Local Resource Storage</h3>
                <div className="w-full h-2.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                    <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(totalStoredResources / Number(army.storageCapacity)) * 100}%`}}></div>
                </div>
                <p className="text-right text-xs">{totalStoredResources} / {army.storageCapacity} (Goods)</p>
                 <div className="grid grid-cols-2 text-sm gap-x-4 gap-y-1 mt-2">
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
                                <button onClick={() => dropResource({containerId: army.id, containerType: 'army', resource: res, amount})} title="Drop all" className="p-1 rounded bg-red-800 hover:bg-red-700"><ArrowDownIcon className="w-4 h-4"/></button>
                             </div>
                        )
                    })}
                </div>
            )}
          </div>
          
          {/* Middle Column: Buildings & Workforce */}
          <div className="md:col-span-1">
             <h3 className="text-lg font-semibold text-gray-300 mb-2">Buildings ({((Array.isArray(army.buildings) ? army.buildings.length : 0) + (army.tentLevel ? 1 : 0))} / {Number(army.level)})</h3>
             <div className="grid grid-cols-2 gap-2">
                {army.tentLevel && army.tentLevel > 0 && (
                    <div key="tent" className="bg-gray-700/50 p-2 rounded-lg flex flex-col items-center justify-center text-center h-24" title={CAMP_BUILDING_DEFINITIONS[CampBuildingType.Tent].description}>
                        <TentIcon className="w-10 h-10 text-white" />
                        <p className="font-semibold text-sm mt-1">Tent (Lvl {army.tentLevel})</p>
                    </div>
                )}
                {army.buildings?.map((buildingType, index) => {
                    const def = CAMP_BUILDING_DEFINITIONS[buildingType];
                    return (
                        <div key={index} className="bg-gray-700/50 p-2 rounded-lg flex flex-col items-center justify-center text-center h-24" title={def.description}>
                            {renderBuildingIcon(buildingType)}
                            <p className="font-semibold text-sm mt-1">{def.name}</p>
                        </div>
                    )
                })}
                {(() => {
                    // FIX: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
                    // This is caused by state cloning stripping type information. Safely cast properties to numbers.
                    const armyLevel = Number(army.level ?? 0);
                    const buildingsCount = Array.isArray(army.buildings) ? army.buildings.length : 0;
                    const tentCount = army.tentLevel ? 1 : 0;
                    const emptySlots = armyLevel - (buildingsCount + tentCount);
                    if (emptySlots <= 0) return null;

                    return Array.from({ length: emptySlots }).map((_, index) => {
                        const isSlotQueued = army.buildQueue?.some(item => item.type === 'building');
                         if (isCurrentPlayerCamp && !isSlotQueued && index === 0) {
                             return <div key={`empty-${index}`} className="bg-gray-900/50 p-2 rounded-lg flex items-center justify-center h-24 text-gray-500 italic">Empty Slot</div>
                        }
                        return <div key={`locked-${index}`} className="bg-gray-900/80 rounded-lg h-24"></div>
                    });
                })()}
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
                                             <div className="flex items-center gap-2">
                                                <p className="text-xs text-gray-400">{turnsLeft} turns</p>
                                                {isCurrentPlayerCamp && (
                                                    <button 
                                                        onClick={() => cancelProduction({containerId: army.id, containerType: 'army', queueItemId: item.id})}
                                                        className="p-1 rounded-full bg-red-800/70 hover:bg-red-700"
                                                        title="Cancel production"
                                                    >
                                                        <CloseIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
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