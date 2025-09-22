import { create } from 'zustand';
import { GameState, AxialCoords, UnitType, BuildingType, BuildQueueItem, ArmyDeploymentInfo, City, Army, CampBuildingType, ResourceCost } from '../types';
import { deepCloneGameState } from '../utils/gameStateUtils';
import { 
    initializeGameState,
    processHexClick,
    processFinalizeCampSetup,
    processBreakCamp,
    processDeployArmy,
    processProduceUnit,
    processProduceInCamp,
    processCancelProduction,
    processBuyInfluenceTile,
    processSetResearch,
    processRenameArmy,
    processUpdateCityFocus,
    processUpdateCampFocus,
    processDropResource,
    updateCapacities,
    processFoodAndStarvation, 
    processProductionAndGathering, 
    processPopulation,
    processSickness,
    processEconomyAndRecovery,
    processUnitCleanup,
    processCulturalShifts,
    finalizeTurn
} from '../utils/gameLogic';

interface GameStateSlice {
    gameState: GameState | null;
    
    // Actions
    startGame: (width: number, height: number) => void;
    endTurn: () => void;
    hexClick: (payload: { coords: AxialCoords; selectedArmyId: string | null; reachableHexes: Set<string>; attackableHexes: Set<string>; expandableHexes: Set<string>; pathCosts: Map<string, number>; selectedHex: AxialCoords | null; }) => void;
    finalizeCampSetup: (payload: { armyId: string; selectedTileKeys: string[] }) => void;
    breakCamp: (payload: { armyId: string }) => void;
    deployArmy: (payload: { deploymentInfo: ArmyDeploymentInfo; targetPosition: AxialCoords }) => void;
    produceUnit: (payload: { unitType: UnitType, cityId: string }) => void;
    produceInCamp: (payload: { armyId: string, itemType: UnitType | CampBuildingType, type: 'unit' | 'building' }) => void;
    cancelProduction: (payload: { containerId: string, containerType: 'city' | 'army', queueItemId: string }) => void;
    buyInfluenceTile: (payload: { cityId: string }) => void;
    setResearch: (payload: { techId: string }) => void;
    renameArmy: (payload: { armyId: string, newName: string }) => void;
    updateCityFocus: (payload: { cityId: string; focus: { productionFocus: number; resourceFocus: City['resourceFocus']} }) => void;
    updateCampFocus: (payload: { armyId: string; focus: { productionFocus: number; resourceFocus: Army['resourceFocus']} }) => void;
    dropResource: (payload: { containerId: string, containerType: 'city' | 'army', resource: keyof ResourceCost, amount: number }) => void;
    
    // Direct state setter for special cases (e.g., AI turn)
    _setGameState: (newState: GameState) => void;
}

export const useGameStore = create<GameStateSlice>((set, get) => ({
    gameState: null,
    
    startGame: (width, height) => set({ gameState: initializeGameState(width, height) }),
    
    endTurn: () => {
        const currentState = get().gameState;
        if (!currentState) return;

        let tempGs = deepCloneGameState(currentState);
        tempGs = updateCapacities(tempGs);
        const { newState: gsAfterFood, starvedUnitIds } = processFoodAndStarvation(tempGs);
        tempGs = gsAfterFood;
        tempGs = processProductionAndGathering(tempGs);
        tempGs = processPopulation(tempGs);
        const { newState: gsAfterSickness, sickUnitIds } = processSickness(tempGs);
        tempGs = gsAfterSickness;
        tempGs = processEconomyAndRecovery(tempGs, starvedUnitIds, sickUnitIds);
        tempGs = processUnitCleanup(tempGs);
        tempGs = processCulturalShifts(tempGs);
        tempGs = finalizeTurn(tempGs);
        
        set({ gameState: tempGs });
    },
    
    hexClick: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processHexClick(currentState, payload) });
        }
    },

    finalizeCampSetup: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processFinalizeCampSetup(currentState, payload) });
        }
    },
    
    breakCamp: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processBreakCamp(currentState, payload) });
        }
    },
    
    deployArmy: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processDeployArmy(currentState, payload) });
        }
    },
    
    produceUnit: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processProduceUnit(currentState, payload) });
        }
    },
    
    produceInCamp: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processProduceInCamp(currentState, payload) });
        }
    },

    cancelProduction: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processCancelProduction(currentState, payload) });
        }
    },

    buyInfluenceTile: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processBuyInfluenceTile(currentState, payload) });
        }
    },

    setResearch: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processSetResearch(currentState, payload) });
        }
    },

    renameArmy: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processRenameArmy(currentState, payload) });
        }
    },
    
    updateCityFocus: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processUpdateCityFocus(currentState, payload) });
        }
    },

    updateCampFocus: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processUpdateCampFocus(currentState, payload) });
        }
    },
    
    dropResource: (payload) => {
        const currentState = get().gameState;
        if (currentState) {
            set({ gameState: processDropResource(currentState, payload) });
        }
    },

    _setGameState: (newState) => set({ gameState: newState }),
}));
