import React, { useState, useEffect } from 'react';
import { GameState, AxialCoords, UnitType, Unit, City, Army, Hex, CampBuildingType } from '../types';
import { TERRAIN_DEFINITIONS, UNIT_DEFINITIONS, BUY_INFLUENCE_TILE_COST, BUILDING_DEFINITIONS, BASE_CITY_INCOME, INCOME_PER_INFLUENCE_LEVEL, BASE_CITY_FOOD_STORAGE, CAMP_BUILDING_DEFINITIONS } from '../constants';
import { axialToString } from '../utils/hexUtils';
import { InfluenceIcon, BuildingIcon, ResearchIcon, FoodIcon, ArrowUpIcon, ArrowDownIcon, CultureIcon, WoodIcon, StoneIcon, HidesIcon, ObsidianIcon, SicknessIcon } from './Icons';
import { TECH_TREE } from '../techtree';
import { useGameStore } from '../store/gameStore';

interface GameUIProps {
  selectedHex: AxialCoords | null;
  selectedUnitId: string | null;
  selectedArmyId: string | null;
  campTileSelectionInfo: { armyId: string; totalTiles: number; selectedTiles: Set<string> } | null;
  onBuyInfluenceTile: (cityId: string) => void;
  onOpenSelectionScreen: () => void;
  onOpenResearchScreen: () => void;
  onOpenCultureScreen: () => void;
  isAITurning: boolean;
}

const calculateIncome = (playerId: number, gs: GameState): number => {
    let income = 0;
    const player = gs.players.find(p => p.id === playerId);
    if (!player) return 0;
    
    for (const city of gs.cities.values()) {
        if (city.ownerId === playerId) {
            income += BASE_CITY_INCOME + (city.controlledTiles.length - 1) * INCOME_PER_INFLUENCE_LEVEL;
            for (const buildingType of city.buildings) {
                income += BUILDING_DEFINITIONS[buildingType].goldBonus ?? 0;
            }
        }
    }
    return income;
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


const GameUI: React.FC<GameUIProps> = ({ selectedHex, selectedUnitId, selectedArmyId, campTileSelectionInfo, onBuyInfluenceTile, onOpenSelectionScreen, onOpenResearchScreen, onOpenCultureScreen, isAITurning }) => {
  const gameState = useGameStore(state => state.gameState);
  const onEndTurn = useGameStore(state => state.endTurn);
  const [isFoodDetailsExpanded, setIsFoodDetailsExpanded] = useState(false);
  const [isSicknessDetailsExpanded, setIsSicknessDetailsExpanded] = useState(false);
  
  useEffect(() => {
    setIsFoodDetailsExpanded(false);
    setIsSicknessDetailsExpanded(false);
  }, [selectedArmyId]);

  if (!gameState) return null;

  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
  if (!currentPlayer) return null;

  const projectedIncome = calculateIncome(currentPlayer.id, gameState);

  const totalPlayerResources = { wood: 0, stone: 0, hides: 0, obsidian: 0 };
    const currentPlayerId = gameState.currentPlayerId;
    for (const city of gameState.cities.values()) {
        if (city.ownerId === currentPlayerId && city.isConnectedToNetwork) {
            totalPlayerResources.wood += city.localResources.wood ?? 0;
            totalPlayerResources.stone += city.localResources.stone ?? 0;
            totalPlayerResources.hides += city.localResources.hides ?? 0;
            totalPlayerResources.obsidian += city.localResources.obsidian ?? 0;
        }
    }
     for (const army of gameState.armies.values()) {
        if (army.ownerId === currentPlayerId && army.isCamped && army.isConnectedToNetwork) {
            totalPlayerResources.wood += army.localResources.wood ?? 0;
            totalPlayerResources.stone += army.localResources.stone ?? 0;
            totalPlayerResources.hides += army.localResources.hides ?? 0;
            totalPlayerResources.obsidian += army.localResources.obsidian ?? 0;
        }
    }

  const hexKey = selectedHex ? axialToString(selectedHex) : null;
  const hex = hexKey ? gameState.hexes.get(hexKey) : null;
  const army = selectedArmyId ? gameState.armies.get(selectedArmyId) : null;
  const city = hex?.cityId ? gameState.cities.get(hex.cityId) : null;
  const selectedUnit = selectedUnitId ? gameState.units.get(selectedUnitId) : null;

  const getCultureSummary = () => {
    const { culture } = currentPlayer;
    const nomadism = culture.nomadism > 33 ? 'Nomadic' : culture.nomadism < -33 ? 'Settled' : 'Balanced';
    const gender = culture.genderRoles > 33 ? 'Matriarchal' : culture.genderRoles < -33 ? 'Patriarchal' : 'Egalitarian';
    const military = culture.militarism > 33 ? 'Aggressive' : culture.militarism < -33 ? 'Defensive' : 'Peaceful';
    return `${nomadism} | ${gender} | ${military}`;
  }
  
  const renderUnitGroupInfo = (selectedUnit: Unit) => {
    const container = army || city;
    if (!container) return <p>Unit container not found.</p>;

    const allUnitIdsInContainer = 'garrison' in container ? container.garrison : container.unitIds;
    const allUnitsInContainer = allUnitIdsInContainer.map(id => gameState.units.get(id)!).filter(Boolean) as Unit[];

    const unitsOfType = allUnitsInContainer.filter(u => u.type === selectedUnit.type);

    const subgroups = new Map<string, Unit[]>();
    for (const unit of unitsOfType) {
        const key = `${unit.hp}-${unit.isSick ? 'sick' : 'healthy'}`;
        if (!subgroups.has(key)) {
            subgroups.set(key, []);
        }
        subgroups.get(key)!.push(unit);
    }

    const unitDef = UNIT_DEFINITIONS[selectedUnit.type];
    const sortedSubgroups = Array.from(subgroups.entries()).sort(([keyA], [keyB]) => {
        const hpA = parseInt(keyA.split('-')[0], 10);
        const hpB = parseInt(keyB.split('-')[0], 10);
        return hpB - hpA;
    });

    return (
        <div>
            <h3 className="text-lg font-bold mb-1">{selectedUnit.type} ({unitsOfType.length} total)</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mb-2">
                <p>Attack: <span className="font-semibold text-red-400">{unitDef.attack}</span></p>
                <p>Defense: <span className="font-semibold text-blue-400">{unitDef.defense}</span></p>
                <p>Gather: <span className="font-semibold text-green-400">{unitDef.foodGatherRate}</span></p>
                <p>Consumes: <span className="font-semibold text-orange-400">{unitDef.foodConsumption}</span></p>
            </div>
            <div className="space-y-2 border-t border-gray-600 pt-2 max-h-48 overflow-y-auto">
                <h4 className="text-md font-semibold text-gray-300">Squads</h4>
                {sortedSubgroups.map(([key, units]) => {
                    const [hpStr, status] = key.split('-');
                    const hp = parseInt(hpStr, 10);
                    const isSick = status === 'sick';
                    const healthPercentage = (hp / unitDef.maxHp) * 100;
                    const barColor = healthPercentage > 50 ? 'bg-green-500' : healthPercentage > 25 ? 'bg-yellow-500' : 'bg-red-500';
                    return (
                        <div key={key} className="p-2 bg-gray-900/50 rounded">
                            <p className="font-semibold flex items-center gap-2">
                                {units.length}x {selectedUnit.type}
                                {isSick && <SicknessIcon className="w-4 h-4 text-purple-400" title="Sick"/>}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                                <span>HP: {hp} / {unitDef.maxHp}</span>
                                <div className="flex-grow h-1.5 bg-gray-700 rounded-full">
                                    <div className={`${barColor} h-full rounded-full`} style={{ width: `${healthPercentage}%` }}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const renderArmyInfo = (army: Army) => {
    const unitsInArmy = army.unitIds.map(id => gameState.units.get(id)!);

    const totalUnitFoodStored = unitsInArmy.reduce((sum, u) => sum + u.foodStored, 0);
    const totalFoodStored = army.isCamped ? (army.food ?? 0) + totalUnitFoodStored : totalUnitFoodStored;

    const totalUnitFoodCapacity = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodCarryCapacity, 0);
    const totalFoodCarryCapacity = army.isCamped ? (army.foodStorageCapacity ?? 0) + totalUnitFoodCapacity : totalUnitFoodCapacity;

    const totalConsumption = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
    
    let availableFoodOnTerritory = 0;
    if (army.isCamped && army.controlledTiles) {
        availableFoodOnTerritory = army.controlledTiles.reduce((sum, key) => {
            const hex = gameState.hexes.get(key);
            return sum + (hex?.currentFood ?? 0);
        }, 0);
    } else {
        const armyHex = gameState.hexes.get(axialToString(army.position));
        availableFoodOnTerritory = armyHex?.currentFood ?? 0;
    }

    let totalGatherRate = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodGatherRate, 0);
    if (army.isCamped && army.buildings?.includes(CampBuildingType.ForagingPost)) {
        totalGatherRate += CAMP_BUILDING_DEFINITIONS[CampBuildingType.ForagingPost].foodGatherBonus ?? 0;
    }
    
    const foodToGather = Math.min(availableFoodOnTerritory, totalGatherRate);
    const netFood = foodToGather - totalConsumption;
    const netColor = netFood >= 0 ? 'text-green-400' : 'text-red-400';
    
    const risk = army.sicknessRisk ?? 0;
    const riskColor = risk > 50 ? 'bg-red-500' : risk > 20 ? 'bg-yellow-500' : 'bg-green-500';
    const sickUnitCount = unitsInArmy.filter(u => u.isSick).length;

    return (
        <div>
            <h3 className="text-lg font-bold mb-2">{army.name ?? "Army"} {army.isCamped ? `(Lvl ${army.level})` : ""}</h3>
            <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Units:</span> <span className="font-semibold">{army.unitIds.length}</span></div>
                <div className="flex justify-between"><span>Movement:</span> <span className="font-semibold text-yellow-400">{army.movementPoints} / {army.maxMovementPoints}</span></div>
            </div>
             <div className="mt-2 pt-2 border-t border-gray-600 space-y-1 text-sm">
                 <button
                    onClick={() => setIsFoodDetailsExpanded(prev => !prev)}
                    className={`w-full flex justify-between items-center text-left p-1 -mx-1 rounded hover:bg-white/10 transition-colors ${netColor}`}
                    aria-expanded={isFoodDetailsExpanded}
                    aria-controls="food-details-panel"
                >
                    <div className="flex items-center gap-1.5">
                        {netFood >= 0 ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
                        <span className="font-bold">Food Supply</span>
                    </div>
                    <span className="font-semibold">
                        {Math.floor(totalFoodStored)} / {totalFoodCarryCapacity}
                    </span>
                </button>

                {isFoodDetailsExpanded && (
                    <div id="food-details-panel" className="pl-4 pt-1 space-y-1 text-xs text-gray-300 border-l-2 border-gray-600 ml-2">
                        <div className="flex justify-between"><span>On Territory:</span> <span className="font-semibold">{Math.floor(availableFoodOnTerritory)}</span></div>
                        <div className="flex justify-between"><span>Gathering / turn:</span> <span className="font-semibold text-green-400">+{Math.round(foodToGather)}</span></div>
                        <div className="flex justify-between"><span>Consumption / turn:</span> <span className="font-semibold text-orange-400">-{totalConsumption}</span></div>
                        <div className="flex justify-between font-bold text-sm"><span>Net / turn:</span> <span className={netFood >= 0 ? 'text-green-500' : 'text-red-500'}>{netFood >= 0 ? '+' : ''}{Math.round(netFood)}</span></div>
                    </div>
                )}
            </div>
             <div className="mt-2 pt-2 border-t border-gray-600 space-y-1 text-sm">
                 <button
                    onClick={() => setIsSicknessDetailsExpanded(prev => !prev)}
                    className="w-full flex justify-between items-center text-left p-1 -mx-1 rounded hover:bg-white/10 transition-colors"
                    aria-expanded={isSicknessDetailsExpanded}
                    aria-controls="sickness-details-panel"
                >
                    <span className="flex items-center gap-1.5 font-bold">
                        <SicknessIcon className="w-4 h-4 text-purple-400" />
                        Sickness Risk
                    </span>
                    <span className="font-semibold">{Math.round(risk)}%</span>
                </button>

                 <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-black">
                    <div className={`${riskColor} h-full rounded-full`} style={{ width: `${risk}%` }}></div>
                </div>
                 {isSicknessDetailsExpanded && <SicknessDetailsPanel details={army.sicknessRiskDetails} sickUnitCount={sickUnitCount} totalUnitCount={army.unitIds.length} />}
            </div>
            {army.isCamped && army.ownerId === currentPlayer.id && (
                 <div className="mt-2 pt-2 border-t border-gray-600">
                    <button
                        onClick={onOpenSelectionScreen}
                        className="w-full flex justify-center items-center gap-2 px-3 py-1.5 text-sm rounded bg-gray-600 hover:bg-gray-500 transition-colors"
                        aria-label="Open camp screen"
                    >
                        <BuildingIcon className="w-4 h-4" />
                        <span>View Camp</span>
                    </button>
                </div>
            )}
        </div>
    );
  }

  const renderCityInfo = (city: City) => {
    return (
        <div>
          <h3 className="text-lg font-bold">{city.name}</h3>
           {city.ownerId === currentPlayer.id && city.pendingInfluenceExpansions > 0 && (
              <div className="my-2 p-2 bg-green-900/50 border border-green-500 rounded-lg text-center animate-pulse">
                  <p className="font-bold text-green-300">Territory Expansion Available!</p>
                  <p className="text-sm text-green-400">Select an adjacent tile to claim.</p>
              </div>
          )}
          <div className="space-y-1 text-sm mt-2">
            <div className="flex justify-between"><span>Owner:</span> <span className="font-semibold">{gameState.players.find(p => p.id === city.ownerId)?.name}</span></div>
            <div className="flex justify-between"><span>HP:</span> <span className="font-semibold">{city.hp} / {city.maxHp}</span></div>
            <div className="flex justify-between"><span>Population:</span> <span className="font-semibold">{city.population}</span></div>
            <div className="flex justify-between"><span>Food Storage:</span> <span className="font-semibold text-green-300">{city.food} / {city.foodStorageCapacity}</span></div>
          </div>
          {city.ownerId === currentPlayer.id && (
            <div className="mt-2 pt-2 border-t border-gray-600 flex flex-col gap-2">
                <button
                    onClick={onOpenSelectionScreen}
                    disabled={isAITurning}
                    className="w-full flex justify-center items-center gap-2 px-3 py-1.5 text-sm rounded bg-gray-600 hover:bg-gray-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    aria-label="Open city screen"
                >
                    <BuildingIcon className="w-4 h-4" />
                    <span>View City</span>
                </button>
                <button
                    onClick={() => onBuyInfluenceTile(city.id)}
                    disabled={currentPlayer.gold < BUY_INFLUENCE_TILE_COST || isAITurning}
                    className="w-full flex justify-center items-center gap-2 px-3 py-1.5 text-sm rounded bg-purple-600 hover:bg-purple-500 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Buy influence tile for ${BUY_INFLUENCE_TILE_COST} gold`}
                >
                    <InfluenceIcon className="w-4 h-4" />
                    <span>Buy Tile ({BUY_INFLUENCE_TILE_COST}G)</span>
                </button>
            </div>
        )}
        </div>
      );
  }

  const renderHexInfo = (hex: Hex) => {
    const terrainDef = TERRAIN_DEFINITIONS[hex.terrain];
    return (
        <div>
            <h3 className="text-lg font-bold mb-2">{terrainDef.name}</h3>
             <div className="space-y-1 text-sm grid grid-cols-2 gap-x-4">
                <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><FoodIcon className="w-4 h-4 text-green-300" /> Food:</span> 
                    <span className="font-semibold">{Math.floor(hex.currentFood)}/{terrainDef.maxFood}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Regrowth:</span> 
                    <span className="font-semibold text-green-400">+{terrainDef.foodRegrowth}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><WoodIcon className="w-4 h-4 text-yellow-700" /> Wood:</span> 
                    <span className="font-semibold">{Math.floor(hex.currentWood)}/{terrainDef.maxWood}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Regrowth:</span> 
                    <span className="font-semibold text-green-400">+{terrainDef.woodRegrowth}</span>
                </div>
                <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><StoneIcon className="w-4 h-4 text-gray-400" /> Stone:</span> 
                    <span className="font-semibold">{Math.floor(hex.currentStone)}/{terrainDef.maxStone}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><HidesIcon className="w-4 h-4 text-orange-400" /> Hides:</span> 
                    <span className="font-semibold">{Math.floor(hex.currentHides)}/{terrainDef.maxHides}</span>
                </div>
                <div className="flex justify-between col-start-2">
                    <span>Regrowth:</span> 
                    <span className="font-semibold text-green-400">+{terrainDef.hidesRegrowth}</span>
                </div>
                <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><ObsidianIcon className="w-4 h-4 text-purple-400" /> Obsidian:</span> 
                    <span className="font-semibold">{Math.floor(hex.currentObsidian)}/{terrainDef.maxObsidian}</span>
                </div>

                <div className="col-span-2 pt-2 mt-1 border-t border-gray-600 flex justify-between">
                    <span>Defense Bonus:</span> 
                    <span className="font-semibold text-blue-400">+{terrainDef.defenseBonus}</span>
                </div>
                 <div className="col-span-2 flex justify-between">
                    <span>Disease Risk:</span> 
                    <span className="font-semibold" style={{color: terrainDef.diseaseRisk === 'High' ? '#ef4444' : terrainDef.diseaseRisk === 'Medium' ? '#f59e0b' : '#86efac'}}>{terrainDef.diseaseRisk}</span>
                </div>
            </div>
        </div>
    );
  };
  
  const renderCampTileSelectionInfo = () => {
    if (!campTileSelectionInfo) return null;
    const { totalTiles, selectedTiles } = campTileSelectionInfo;
    const remaining = totalTiles - selectedTiles.size;
    return (
        <div className="bg-yellow-800/80 p-3 rounded-lg border-2 border-yellow-500 text-center">
            <h3 className="text-lg font-semibold text-yellow-200 mb-1">Setting Up Camp</h3>
            <p className="text-yellow-300">
                Select {remaining} more tile{remaining !== 1 ? 's' : ''} for your camp's territory.
            </p>
            <p className="font-bold text-xl mt-1">{selectedTiles.size} / {totalTiles}</p>
        </div>
    )
  }

  return (
    <div 
      className="absolute top-0 right-0 h-full w-80 bg-gray-800 bg-opacity-80 backdrop-blur-sm text-white p-4 flex flex-col shadow-lg border-l-2 border-gray-700 z-40"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex-grow overflow-y-auto">
        <h2 className="text-2xl font-bold mb-2 border-b-2 pb-2 transition-colors duration-300" style={{borderColor: currentPlayer.color}}>
           {isAITurning ? `${currentPlayer.name}'s Turn...` : `Turn ${gameState.turn}: ${currentPlayer.name}`}
        </h2>
        <div className="grid grid-cols-3 gap-x-3 gap-y-1 mb-4 text-sm">
            <div className="flex items-center gap-1.5" title="Gold">
                <span className="font-bold text-lg text-yellow-400">G</span>
                <span className="font-semibold">{currentPlayer.gold}{!isAITurning && <span className="text-green-400 text-xs">(+{projectedIncome})</span>}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Total Wood">
                <WoodIcon className="w-4 h-4 text-yellow-700" />
                <span className="font-semibold">{totalPlayerResources.wood}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Total Stone">
                <StoneIcon className="w-4 h-4 text-gray-400" />
                <span className="font-semibold">{totalPlayerResources.stone}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Total Hides">
                <HidesIcon className="w-4 h-4 text-orange-400" />
                <span className="font-semibold">{totalPlayerResources.hides}</span>
            </div>
             <div className="flex items-center gap-1.5" title="Total Obsidian">
                <ObsidianIcon className="w-4 h-4 text-purple-400" />
                <span className="font-semibold">{totalPlayerResources.obsidian}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Culture Points">
                <CultureIcon className="w-4 h-4 text-purple-300" />
                <span className="font-semibold">{currentPlayer.culturePoints}</span>
            </div>
        </div>
        
        <div className="flex flex-col gap-4 mb-4">
            <button
              onClick={onOpenResearchScreen}
              disabled={isAITurning}
              className="w-full p-3 bg-gray-900/50 rounded hover:bg-gray-900/80 disabled:cursor-not-allowed transition-colors text-left"
              aria-label="Open research screen"
            >
              {currentPlayer.currentResearchId ? (
                  <>
                      <p className="text-sm text-gray-300">Currently Researching:</p>
                      <p className="font-semibold text-cyan-300">{TECH_TREE[currentPlayer.currentResearchId].name}</p>
                      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden border border-black my-1">
                          <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(currentPlayer.researchProgress / TECH_TREE[currentPlayer.currentResearchId].cost) * 100}%` }}></div>
                      </div>
                      <p className="text-right text-xs text-gray-400">{Math.floor(currentPlayer.researchProgress)} / {TECH_TREE[currentPlayer.currentResearchId].cost}</p>
                  </>
              ) : (
                <div className="flex items-center gap-2">
                    <ResearchIcon className="w-5 h-5 text-cyan-400" />
                    <div>
                        <p className="font-semibold text-cyan-300">No Active Research</p>
                        <p className="text-sm text-gray-400 mt-1">Click to choose a technology.</p>
                    </div>
                </div>
              )}
            </button>

            <button
              onClick={onOpenCultureScreen}
              disabled={isAITurning}
              className="w-full p-3 bg-gray-900/50 rounded hover:bg-gray-900/80 disabled:cursor-not-allowed transition-colors text-left"
              aria-label="Open culture screen"
            >
                <div className="flex items-center gap-2">
                    <CultureIcon className="w-5 h-5 text-purple-300" />
                     <div>
                        <p className="font-semibold text-purple-300">Culture</p>
                        <p className="text-sm text-gray-400 mt-1">{getCultureSummary()}</p>
                    </div>
                </div>
            </button>
        </div>


        <div className="bg-gray-900/50 p-3 rounded-lg min-h-[150px]">
            { campTileSelectionInfo 
                ? renderCampTileSelectionInfo() 
                : <>
                    <h3 className="text-lg font-semibold mb-2 border-b border-gray-600 pb-1">Selection</h3>
                    { selectedUnit ? renderUnitGroupInfo(selectedUnit)
                    : army ? renderArmyInfo(army)
                    : city ? renderCityInfo(city)
                    : hex ? renderHexInfo(hex)
                    : <p className="text-gray-400">Click on a hex to see details.</p>
                    }
                  </>
            }
        </div>

      </div>

      <div className="flex-shrink-0 pt-4">
        <button
          onClick={() => onEndTurn()}
          disabled={isAITurning || !!campTileSelectionInfo}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-lg font-bold transition-colors duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          End Turn
        </button>
      </div>
    </div>
  );
};

export default GameUI;