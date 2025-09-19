import React, { useState, useEffect } from 'react';
import { GameState, AxialCoords, UnitType, Unit, City, Army, Hex } from '../types';
import { TERRAIN_DEFINITIONS, UNIT_DEFINITIONS, BUY_INFLUENCE_TILE_COST, BUILDING_DEFINITIONS, BASE_CITY_INCOME, INCOME_PER_INFLUENCE_LEVEL, BASE_CITY_FOOD_STORAGE } from '../constants';
import { axialToString } from '../utils/hexUtils';
import { InfluenceIcon, BuildingIcon, ResearchIcon, FoodIcon, ArrowUpIcon, ArrowDownIcon, CultureIcon, WoodIcon, StoneIcon, HidesIcon, ObsidianIcon } from './Icons';
import { TECH_TREE } from '../techtree';

interface GameUIProps {
  gameState: GameState;
  selectedHex: AxialCoords | null;
  selectedUnitId: string | null;
  selectedArmyId: string | null;
  projectedIncome: number;
  totalPlayerResources: { wood: number; stone: number; hides: number; obsidian: number };
  campTileSelectionInfo: { armyId: string; totalTiles: number; selectedTiles: Set<string> } | null;
  onEndTurn: () => void;
  onBuyInfluenceTile: (cityId: string) => void;
  onOpenSelectionScreen: () => void;
  onOpenResearchScreen: () => void;
  onOpenCultureScreen: () => void;
  isAITurning: boolean;
}

const GameUI: React.FC<GameUIProps> = ({ gameState, selectedHex, selectedUnitId, selectedArmyId, projectedIncome, totalPlayerResources, campTileSelectionInfo, onEndTurn, onBuyInfluenceTile, onOpenSelectionScreen, onOpenResearchScreen, onOpenCultureScreen, isAITurning }) => {
  const [isFoodDetailsExpanded, setIsFoodDetailsExpanded] = useState(false);
  const currentPlayer = gameState.players.find(p => p.id === gameState.currentPlayerId);
  
  useEffect(() => {
    setIsFoodDetailsExpanded(false);
  }, [selectedArmyId]);

  if (!currentPlayer) return null;

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
  
  const renderUnitInfo = (unit: Unit) => {
    const unitDef = UNIT_DEFINITIONS[unit.type];
    const owner = gameState.players.find(p => p.id === unit.ownerId);

    return (
        <div>
            <h3 className="text-lg font-bold mb-1">{unit.type}</h3>
            <p className="text-sm">Owner: <span style={{ color: owner?.color }}>{owner?.name}</span></p>
            <div className="my-2">
                <p className="text-sm font-semibold text-gray-300">HP: {unit.hp} / {unitDef.maxHp}</p>
                <div className="w-full h-1.5 bg-gray-900 rounded-full overflow-hidden border border-black">
                    <div className="bg-green-500 h-full rounded-full" style={{ width: `${(unit.hp / unitDef.maxHp) * 100}%` }}></div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <p>Attack: <span className="font-semibold text-red-400">{unitDef.attack}</span></p>
                <p>Defense: <span className="font-semibold text-blue-400">{unitDef.defense}</span></p>
                <p>Gather: <span className="font-semibold text-green-400">{unitDef.foodGatherRate}</span></p>
                <p>Consumes: <span className="font-semibold text-orange-400">{unitDef.foodConsumption}</span></p>
                <p>Production: <span className="font-semibold text-yellow-400">{unitDef.productionYield}</span></p>
                <p>Res. Capacity: <span className="font-semibold text-gray-300">{unitDef.carryCapacity}</span></p>
                 {army && <p>Food Stored: <span className="font-semibold text-green-300">{unit.foodStored} / {unitDef.foodCarryCapacity}</span></p>}
            </div>
        </div>
    );
  }

  const renderArmyInfo = (army: Army) => {
    const unitsInArmy = army.unitIds.map(id => gameState.units.get(id)!);
    const totalFoodStored = unitsInArmy.reduce((sum, u) => sum + u.foodStored, 0);
    const totalFoodCarryCapacity = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodCarryCapacity, 0);
    const totalConsumption = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodConsumption, 0);
    
    const armyHex = gameState.hexes.get(axialToString(army.position));
    const hexFood = armyHex?.currentFood ?? 0;
    const totalGatherRate = unitsInArmy.reduce((sum, u) => sum + UNIT_DEFINITIONS[u.type].foodGatherRate, 0);
    const foodToGather = Math.min(hexFood, totalGatherRate);
    const netFood = foodToGather - totalConsumption;
    const netColor = netFood >= 0 ? 'text-green-400' : 'text-red-400';

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
                        {totalFoodStored} / {totalFoodCarryCapacity}
                    </span>
                </button>

                {isFoodDetailsExpanded && (
                    <div id="food-details-panel" className="pl-4 pt-1 space-y-1 text-xs text-gray-300 border-l-2 border-gray-600 ml-2">
                        <div className="flex justify-between"><span>On Territory:</span> <span className="font-semibold">{hexFood}</span></div>
                        <div className="flex justify-between"><span>Gathering / turn:</span> <span className="font-semibold text-green-400">+{foodToGather}</span></div>
                        <div className="flex justify-between"><span>Consumption / turn:</span> <span className="font-semibold text-orange-400">-{totalConsumption}</span></div>
                        <div className="flex justify-between font-bold text-sm"><span>Net / turn:</span> <span className={netFood >= 0 ? 'text-green-500' : 'text-red-500'}>{netFood >= 0 ? '+' : ''}{netFood}</span></div>
                    </div>
                )}
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
    const riskColor = hex.currentDiseaseRisk > 50 ? '#ef4444'
                    : hex.currentDiseaseRisk > 25 ? '#f59e0b'
                    : '#86efac';
    return (
        <div>
            <h3 className="text-lg font-bold mb-2">{terrainDef.name}</h3>
             <div className="space-y-1 text-sm grid grid-cols-2 gap-x-4">
                <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><FoodIcon className="w-4 h-4 text-green-300" /> Food:</span> 
                    <span className="font-semibold">{hex.currentFood}/{terrainDef.maxFood}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Regrowth:</span> 
                    <span className="font-semibold text-green-400">+{terrainDef.foodRegrowth}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><WoodIcon className="w-4 h-4 text-yellow-700" /> Wood:</span> 
                    <span className="font-semibold">{hex.currentWood}/{terrainDef.maxWood}</span>
                </div>
                 <div className="flex justify-between">
                    <span>Regrowth:</span> 
                    <span className="font-semibold text-green-400">+{terrainDef.woodRegrowth}</span>
                </div>
                <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><StoneIcon className="w-4 h-4 text-gray-400" /> Stone:</span> 
                    <span className="font-semibold">{hex.currentStone}/{terrainDef.maxStone}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><HidesIcon className="w-4 h-4 text-orange-400" /> Hides:</span> 
                    <span className="font-semibold">{hex.currentHides}/{terrainDef.maxHides}</span>
                </div>
                <div className="flex justify-between col-start-2">
                    <span>Regrowth:</span> 
                    <span className="font-semibold text-green-400">+{terrainDef.hidesRegrowth}</span>
                </div>
                <div className="flex justify-between">
                    <span className="flex items-center gap-1.5"><ObsidianIcon className="w-4 h-4 text-purple-400" /> Obsidian:</span> 
                    <span className="font-semibold">{hex.currentObsidian}/{terrainDef.maxObsidian}</span>
                </div>

                <div className="col-span-2 pt-2 mt-1 border-t border-gray-600 flex justify-between">
                    <span>Defense Bonus:</span> 
                    <span className="font-semibold text-blue-400">+{terrainDef.defenseBonus}</span>
                </div>
                 <div className="col-span-2 flex justify-between">
                    <span>Disease Risk:</span> 
                    <span className="font-semibold" style={{color: terrainDef.diseaseRisk === 'High' ? '#ef4444' : terrainDef.diseaseRisk === 'Medium' ? '#f59e0b' : '#86efac'}}>{terrainDef.diseaseRisk}</span>
                </div>
                 <div className="col-span-2 flex justify-between">
                    <span>Current Risk:</span> 
                    <span className="font-semibold" style={{color: riskColor}}>{Math.round(hex.currentDiseaseRisk)}%</span>
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
                    { selectedUnit ? renderUnitInfo(selectedUnit)
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