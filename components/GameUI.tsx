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
  onEndTurn: () => void;
  onBuyInfluenceTile: (cityId: string) => void;
  onOpenSelectionScreen: () => void;
  onOpenResearchScreen: () => void;
  onOpenCultureScreen: () => void;
  isAITurning: boolean;
}

const GameUI: React.FC<GameUIProps> = ({ gameState, selectedHex, selectedUnitId, selectedArmyId, projectedIncome, onEndTurn, onBuyInfluenceTile, onOpenSelectionScreen, onOpenResearchScreen, onOpenCultureScreen, isAITurning }) => {
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
    const military = culture.militarism