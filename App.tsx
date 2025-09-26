import React, { useState, useEffect, useCallback, useRef } from 'react';
import GameBoard from './components/GameBoard';
import GameUI from './components/GameUI';
import GameToolbar from './components/GameToolbar';
import SettingsMenu from './components/SettingsMenu';
import CityScreen from './components/CityScreen';
import CampScreen from './components/CampScreen';
import ArmyBar from './components/ArmyBar';
import ResearchScreen from './components/ResearchScreen';
import CultureScreen from './components/CultureScreen';
import CreateArmyScreen from './components/CreateArmyScreen';
import TransferScreen from './components/TransferScreen';
import StartScreen from './components/StartScreen';
import TechUnlockedScreen from './components/TechUnlockedScreen';
import BattleScreen from './components/BattleScreen';
import BattleReportScreen from './components/BattleReportScreen';
// FIX: Added City to imports to allow for explicit type annotation.
import { GameState, AxialCoords, UnitType, Army, ArmyDeploymentInfo, Gender, CampBuildingType, Unit, UnitSize, City, TransferInfo } from './types';
import { MAP_SIZES, TERRAIN_DEFINITIONS, UNIT_DEFINITIONS, axialDirections, CITY_VISION_RANGE, UNIT_VISION_RANGE, CAMP_INFLUENCE_RANGE, CAMP_VISION_RANGE, CAMP_BUILDING_DEFINITIONS } from './constants';
import { axialToString, stringToAxial, getHexesInRange, hexDistance, axialToPixel, PriorityQueue } from './utils/hexUtils';
import { playSound, setVolume, setMuted, ensureAudioInitialized } from './utils/soundManager';
import { useGameStore } from './store/gameStore';
import { 
    calculateReachableHexes, 
    findAttackableHexes
} from './utils/gameLogic';
import { runAITurnLogic } from './utils/aiLogic';
import { deepCloneGameState } from './utils/gameStateUtils';

type WorldSize = 'small' | 'medium' | 'large';

const App: React.FC = () => {
    const gameState = useGameStore(state => state.gameState);
    const startGame = useGameStore(state => state.startGame);
    const endTurn = useGameStore(state => state.endTurn);
    const moveArmy = useGameStore(state => state.moveArmy);
    const claimTile = useGameStore(state => state.claimTile);
    const autoBattle = useGameStore(state => state.autoBattle);
    const dismissBattleReport = useGameStore(state => state.dismissBattleReport);
    const finalizeCampSetup = useGameStore(state => state.finalizeCampSetup);
    const breakCamp = useGameStore(state => state.breakCamp);
    const deployArmy = useGameStore(state => state.deployArmy);
    const buyInfluenceTile = useGameStore(state => state.buyInfluenceTile);
    const _setGameState = useGameStore(state => state._setGameState);

    const [gameStarted, setGameStarted] = useState<boolean>(false);
    const [selectedHex, setSelectedHex] = useState<AxialCoords | null>(null);
    const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
    const [selectedArmyId, setSelectedArmyId] = useState<string | null>(null);
    const [reachableHexes, setReachableHexes] = useState<Set<string>>(new Set());
    const [pathCosts, setPathCosts] = useState<Map<string, number>>(new Map());
    const [attackableHexes, setAttackableHexes] = useState<Set<string>>(new Set());
    const [expandableHexes, setExpandableHexes] = useState<Set<string>>(new Set());
    const [deployableHexes, setDeployableHexes] = useState<Set<string>>(new Set());
    const [campTileSelectionInfo, setCampTileSelectionInfo] = useState<{ armyId: string; totalTiles: number; selectedTiles: Set<string> } | null>(null);
    const [influenceMap, setInfluenceMap] = useState<Map<string, string>>(new Map());
    const [isAITurning, setIsAITurning] = useState(false);
    const [gameOverMessage, setGameOverMessage] = useState<string | null>(null);
    const [fogOfWarEnabled, setFogOfWarEnabled] = useState(true);
    const [visibleHexes, setVisibleHexes] = useState<Set<string>>(new Set());
    const [exploredHexes, setExploredHexes] = useState<Set<string>>(new Set());
    
    const [viewState, setViewState] = useState({
        scale: 1,
        translate: { x: 50, y: 50 },
    });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const mousePosRef = useRef({ x: 0, y: 0 });

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCityScreenOpen, setIsCityScreenOpen] = useState(false);
    const [isCampScreenOpen, setIsCampScreenOpen] = useState(false);
    const [selectedCampId, setSelectedCampId] = useState<string | null>(null);
    const [isResearchScreenOpen, setIsResearchScreenOpen] = useState(false);
    const [isCultureScreenOpen, setIsCultureScreenOpen] = useState(false);
    const [armyFormationSource, setArmyFormationSource] = useState<{ sourceId: string; sourceType: 'city' | 'army' } | null>(null);
    const [armyDeploymentInfo, setArmyDeploymentInfo] = useState<ArmyDeploymentInfo | null>(null);
    const [transferInfo, setTransferInfo] = useState<TransferInfo | null>(null);
    const [battleInfo, setBattleInfo] = useState<{ attackerId: string; defenderId: string; defenderType: 'army' | 'city' } | null>(null);
    const [volume, setVolumeState] = useState(0.5);
    const [isMutedState, setIsMutedState] = useState(false);
    const [justUnlockedTechId, setJustUnlockedTechId] = useState<string | null>(null);
    const [notifiedTechs, setNotifiedTechs] = useState<Set<string>>(new Set());

    useEffect(() => {
        const initAudio = () => {
            ensureAudioInitialized();
            window.removeEventListener('click', initAudio);
        };
        window.addEventListener('click', initAudio);
        return () => window.removeEventListener('click', initAudio);
    }, []);

    useEffect(() => { setVolume(volume); }, [volume]);
    useEffect(() => { setMuted(isMutedState); }, [isMutedState]);

    // New, corrected effect for handling the tech unlocked popup
    useEffect(() => {
        // Guard against running when no game, it's AI turn, or a popup is already open
        if (!gameState || gameState.currentPlayerId !== 1 || isAITurning) {
            return;
        }

        const player = gameState.players.find(p => p.id === 1);
        if (!player) return;

        // Find the first tech that is unlocked but hasn't been shown in a popup yet
        const unnotifiedTech = player.unlockedTechs.find(techId => !notifiedTechs.has(techId));

        if (unnotifiedTech) {
            // Check if any other modal is open to prevent overlap
            if (!isCityScreenOpen && !isCampScreenOpen && !isResearchScreenOpen && !isCultureScreenOpen && !isSettingsOpen && !armyFormationSource && !transferInfo && !justUnlockedTechId && !battleInfo && !gameState.battleReport) {
                setJustUnlockedTechId(unnotifiedTech);
                // Important: Update the notified set so this doesn't trigger again for the same tech
                setNotifiedTechs(prev => new Set(prev).add(unnotifiedTech));
            }
        }
    }, [gameState, isAITurning, notifiedTechs, isCityScreenOpen, isCampScreenOpen, isResearchScreenOpen, isCultureScreenOpen, isSettingsOpen, armyFormationSource, transferInfo, justUnlockedTechId, battleInfo]);


    const handleVolumeChange = (newVolume: number) => {
        setVolumeState(newVolume);
        if (isMutedState && newVolume > 0) setIsMutedState(false);
    };
    
    const handleMuteToggle = () => setIsMutedState(prev => !prev);
    
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (isCityScreenOpen || isResearchScreenOpen || isSettingsOpen || armyFormationSource) return;
        e.preventDefault();
        const zoomFactor = 1.1;
        const { clientX, clientY, deltaY } = e;

        setViewState(prev => {
            const newScale = deltaY < 0 ? prev.scale * zoomFactor : prev.scale / zoomFactor;
            const clampedScale = Math.max(0.2, Math.min(3.0, newScale));

            if (clampedScale === prev.scale) return prev;

            const rect = gameContainerRef.current?.getBoundingClientRect();
            if (!rect) return prev;
            
            const mouseX = clientX - rect.left;
            const mouseY = clientY - rect.top;

            const mapX = (mouseX - prev.translate.x) / prev.scale;
            const mapY = (mouseY - prev.translate.y) / prev.scale;

            const newTranslateX = mouseX - mapX * clampedScale;
            const newTranslateY = mouseY - mapY * clampedScale;

            return {
                scale: clampedScale,
                translate: { x: newTranslateX, y: newTranslateY },
            };
        });
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button !== 0 || isCityScreenOpen || isResearchScreenOpen || isSettingsOpen || armyFormationSource) return;
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
            x: e.clientX,
            y: e.clientY,
            translateX: viewState.translate.x,
            translateY: viewState.translate.y,
        };
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isPanning) return;
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setViewState(prev => ({
            ...prev,
            translate: {
                x: panStartRef.current.translateX + dx,
                y: panStartRef.current.translateY + dy,
            }
        }));
    };

    const handleMouseUp = () => {
        setIsPanning(false);
    };
    
    useEffect(() => {
        let animationFrameId: number;
        const gameLoop = () => {
            const rect = gameContainerRef.current?.getBoundingClientRect();
            if (rect && !isPanning && !isCityScreenOpen && !isResearchScreenOpen && !isSettingsOpen && !armyFormationSource && !armyDeploymentInfo && !isCultureScreenOpen && !transferInfo && !battleInfo && !gameState?.battleReport) {
                const { x, y } = mousePosRef.current;
                const edgeSize = 40;
                const panSpeed = 10;
                let dx = 0;
                let dy = 0;

                if (x < rect.left + edgeSize && x > rect.left) dx = panSpeed;
                if (x > rect.right - edgeSize && x < rect.right) dx = -panSpeed;
                if (y < rect.top + edgeSize && y > rect.top) dy = panSpeed;
                if (y > rect.bottom - edgeSize && y < rect.bottom) dy = -panSpeed;

                if (dx !== 0 || dy !== 0) {
                    setViewState(prev => ({
                        ...prev,
                        translate: { x: prev.translate.x + dx, y: prev.translate.y + dy },
                    }));
                }
            }
            animationFrameId = requestAnimationFrame(gameLoop);
        };
        animationFrameId = requestAnimationFrame(gameLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isPanning, isCityScreenOpen, isResearchScreenOpen, isSettingsOpen, armyFormationSource, armyDeploymentInfo, isCultureScreenOpen, transferInfo, battleInfo, gameState?.battleReport]);

    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, [handleGlobalMouseMove]);

    const handleStartGame = useCallback((size: WorldSize, numAIPlayers: number, seed?: string) => {
        const { width, height } = MAP_SIZES[size];
        startGame(width, height, numAIPlayers, seed);
        setGameStarted(true);
        playSound('endTurn');
        setGameOverMessage(null);
        setSelectedHex(null);
        setSelectedUnitId(null);
        setSelectedArmyId(null);
        setReachableHexes(new Set());
        setAttackableHexes(new Set());
        setExpandableHexes(new Set());
        setDeployableHexes(new Set());
        setCampTileSelectionInfo(null);
        setExploredHexes(new Set());
        setIsAITurning(false);
        setIsCityScreenOpen(false);
        setIsResearchScreenOpen(false);
        setIsCultureScreenOpen(false);
        setArmyFormationSource(null);
        setArmyDeploymentInfo(null);
        setNotifiedTechs(new Set());
    }, [startGame]);

    const calculateVisibility = useCallback((gs: GameState) => {
        const newVisible = new Set<string>();
        const playerThings = [
            ...Array.from(gs.armies.values()).filter(u => u.ownerId === 1),
            ...Array.from(gs.cities.values()).filter(c => c.ownerId === 1)
        ];

        for (const thing of playerThings) {
            const isArmy = 'unitIds' in thing;
            let range = isArmy ? UNIT_VISION_RANGE : CITY_VISION_RANGE;
            if (isArmy && (thing as Army).isCamped) {
                const army = thing as Army;
                range = CAMP_VISION_RANGE;
                if (army.buildings?.includes(CampBuildingType.ScoutTent)) {
                    range += CAMP_BUILDING_DEFINITIONS[CampBuildingType.ScoutTent].visionBonus!;
                }
            }
            const visibleFromThing = getHexesInRange(thing.position, range);
            for (const hexCoords of visibleFromThing) {
                const key = axialToString(hexCoords);
                if (gs.hexes.has(key)) newVisible.add(key);
            }
        }
        
        setVisibleHexes(newVisible);
        setExploredHexes(prev => new Set([...prev, ...newVisible]));
    }, []);
    
    useEffect(() => {
        if (!gameState) return;
        const newInfluenceMap = new Map<string, string>();
        for (const city of gameState.cities.values()) {
            const player = gameState.players.find(p => p.id === city.ownerId);
            if (player) {
                for (const tileKey of city.controlledTiles) {
                    newInfluenceMap.set(tileKey, player.color + '80');
                }
            }
        }
        for (const army of gameState.armies.values()) {
             if (army.isCamped && army.controlledTiles) {
                const player = gameState.players.find(p => p.id === army.ownerId);
                if (player) {
                    for (const tileKey of army.controlledTiles) {
                         if (gameState.hexes.has(tileKey) && !newInfluenceMap.has(tileKey)) {
                             newInfluenceMap.set(tileKey, player.color + '80');
                        }
                    }
                }
            }
        }
        setInfluenceMap(newInfluenceMap);
    }, [gameState]);

    useEffect(() => {
        if (gameState) calculateVisibility(gameState);
    }, [gameState, calculateVisibility]);

    useEffect(() => {
        if (!gameState || !selectedHex) {
            setSelectedArmyId(null);
            setExpandableHexes(new Set());
            return;
        }

        const hexKey = axialToString(selectedHex);
        const hex = gameState.hexes.get(hexKey);
        const armyId = hex?.armyId;
        const cityId = hex?.cityId;
        
        setSelectedArmyId(armyId ?? null);

        if(armyId) {
            const army = gameState.armies.get(armyId);
            if (army && army.ownerId === gameState.currentPlayerId) {
                 const { reachable, costs } = calculateReachableHexes(army.position, army, gameState);
                 setReachableHexes(reachable);
                 setPathCosts(costs);
                 setAttackableHexes(findAttackableHexes(army.position, army, gameState));
            } else {
                 setReachableHexes(new Set());
                 setPathCosts(new Map());
                 setAttackableHexes(new Set());
            }
        } else {
            setReachableHexes(new Set());
            setPathCosts(new Map());
            setAttackableHexes(new Set());
        }

        const city = cityId ? gameState.cities.get(cityId) : null;
        if (city && city.ownerId === gameState.currentPlayerId && city.pendingInfluenceExpansions > 0) {
            const newExpandable = new Set<string>();
            // FIX: Explicitly type 'c' as City to resolve 'unknown' type error.
            const allControlledByAnyCity = new Set((Array.from(gameState.cities.values()) as City[]).flatMap(c => c.controlledTiles));
            // FIX: Cast city.controlledTiles to string[] to allow iteration, as its type is inferred as 'unknown' after state cloning.
            for (const tileKey of city.controlledTiles as string[]) {
                const coords = stringToAxial(tileKey);
                for (const dir of axialDirections) {
                    const neighborCoords = { q: coords.q + dir.q, r: coords.r + dir.r };
                    const neighborKey = axialToString(neighborCoords);
                    if (gameState.hexes.has(neighborKey) && !allControlledByAnyCity.has(neighborKey)) newExpandable.add(neighborKey);
                }
            }
            setExpandableHexes(newExpandable);
        } else {
            setExpandableHexes(new Set());
        }

    }, [gameState, selectedHex]);
    
    const selectHex = useCallback((coords: AxialCoords | null) => {
        if (armyDeploymentInfo) {
            setArmyDeploymentInfo(null);
            setDeployableHexes(new Set());
        }
        if (campTileSelectionInfo) {
            setCampTileSelectionInfo(null);
        }
        setSelectedHex(coords);
        setSelectedUnitId(null);
    }, [armyDeploymentInfo, campTileSelectionInfo]);

    const handleSelectUnit = useCallback((unitId: string) => {
        if (!gameState || isAITurning || gameOverMessage) return;
        const unit = gameState.units.get(unitId);
        if (!unit) return;
        if (unit.ownerId === gameState.currentPlayerId) {
            setSelectedUnitId(unitId);
        }
    }, [gameState, isAITurning, gameOverMessage]);

    const handleFinalizeCampSetup = useCallback((armyId: string, selectedTileKeys: string[]) => {
        playSound('build');
        finalizeCampSetup({ armyId, selectedTileKeys });
        setCampTileSelectionInfo(null);
    }, [finalizeCampSetup]);

    const handleHexClick = useCallback((coords: AxialCoords) => {
        if (!gameState || isAITurning || gameOverMessage || isCityScreenOpen || armyFormationSource || isCampScreenOpen || isCultureScreenOpen || transferInfo || justUnlockedTechId || battleInfo || gameState.battleReport) return;
        
        const clickedHexKey = axialToString(coords);
        const clickedHex = gameState.hexes.get(clickedHexKey);
        if (!clickedHex) return;

        if (campTileSelectionInfo) {
            const { armyId, totalTiles, selectedTiles } = campTileSelectionInfo;
            const army = gameState.armies.get(armyId)!;
            const potentialTiles = getHexesInRange(army.position, CAMP_INFLUENCE_RANGE);
            const isSelectable = potentialTiles.some(h => h.q === coords.q && h.r === coords.r);
            const isArmyHomeTile = clickedHexKey === axialToString(army.position);

            if (isSelectable) {
                const newSelected = new Set(selectedTiles);
                if (newSelected.has(clickedHexKey)) {
                    if (!isArmyHomeTile) newSelected.delete(clickedHexKey);
                } else if (newSelected.size < totalTiles) {
                    newSelected.add(clickedHexKey);
                }

                if (newSelected.size === totalTiles) {
                    handleFinalizeCampSetup(armyId, Array.from(newSelected));
                } else {
                    setCampTileSelectionInfo({ ...campTileSelectionInfo, selectedTiles: newSelected });
                }
            } else {
                playSound('error');
            }
            return;
        }

        if (armyDeploymentInfo) {
            if(deployableHexes.has(clickedHexKey)) {
                handleFinalizeArmyDeployment(coords);
            } else {
                playSound('error');
                setArmyDeploymentInfo(null);
                setDeployableHexes(new Set());
            }
            return;
        }

        // Action dispatcher based on context
        if (attackableHexes.has(clickedHexKey) && selectedArmyId) {
            const defenderArmyId = clickedHex.armyId;
            const defenderCityId = clickedHex.cityId;
            
            if (defenderArmyId) {
                setBattleInfo({ attackerId: selectedArmyId, defenderId: defenderArmyId, defenderType: 'army' });
            } else if (defenderCityId) {
                setBattleInfo({ attackerId: selectedArmyId, defenderId: defenderCityId, defenderType: 'city' });
            }
            return;
        }

        if (selectedArmyId && reachableHexes.has(clickedHexKey)) {
            const selectedArmy = gameState.armies.get(selectedArmyId);
            if (selectedArmy) {
                const destArmyId = clickedHex.armyId;
                const destCityId = clickedHex.cityId;
                if (destArmyId) {
                    const destArmy = gameState.armies.get(destArmyId);
                    if (destArmy && destArmy.ownerId === selectedArmy.ownerId) {
                        setTransferInfo({ sourceArmyId: selectedArmyId, destinationId: destArmyId, destinationType: 'army' });
                        selectHex(null);
                        return;
                    }
                }
                if (destCityId) {
                    const destCity = gameState.cities.get(destCityId);
                    if (destCity && destCity.ownerId === selectedArmy.ownerId) {
                        setTransferInfo({ sourceArmyId: selectedArmyId, destinationId: destCityId, destinationType: 'city' });
                        selectHex(null);
                        return;
                    }
                }
            }
            // If it's reachable but not a merge target, it's a move.
            playSound('move');
            const cost = pathCosts.get(clickedHexKey) ?? 99;
            moveArmy({ armyId: selectedArmyId, targetCoords: coords, pathCost: cost });
            selectHex(coords); // Move selection with army
            return;
        }

        if (expandableHexes.has(clickedHexKey) && selectedHex) {
            const cityIdOnSelected = gameState.hexes.get(axialToString(selectedHex))?.cityId;
            if(cityIdOnSelected) {
                playSound('upgrade');
                claimTile({ cityId: cityIdOnSelected, tileKey: clickedHexKey });
                return;
            }
        }
        
        // Default behavior if no other action is taken
        selectHex(coords);

    }, [gameState, selectedHex, selectedArmyId, reachableHexes, attackableHexes, expandableHexes, deployableHexes, pathCosts, armyDeploymentInfo, campTileSelectionInfo, isAITurning, gameOverMessage, selectHex, isCityScreenOpen, isCampScreenOpen, armyFormationSource, isCultureScreenOpen, transferInfo, justUnlockedTechId, battleInfo, handleFinalizeCampSetup, moveArmy, claimTile]);

    const handleEndTurn = useCallback(() => {
        if (isAITurning || gameOverMessage) return;
        playSound('endTurn');
        endTurn();
        selectHex(null);
    }, [isAITurning, gameOverMessage, selectHex, endTurn]);

    const runAITurn = useCallback(async (gs: GameState) => {
        setIsAITurning(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const newGs = runAITurnLogic(gs);
        
        // If the AI initiated a battle against the player, show the battle screen and pause the turn.
        if (newGs.pendingBattle) {
            const defender = newGs.pendingBattle.defenderType === 'army' 
                ? newGs.armies.get(newGs.pendingBattle.defenderId)
                : newGs.cities.get(newGs.pendingBattle.defenderId);
            
            if (defender?.ownerId === 1) {
                setBattleInfo(newGs.pendingBattle);
                // Clear the pending battle from the state immediately after setting it for the UI
                const stateWithoutPendingBattle = deepCloneGameState(newGs);
                delete stateWithoutPendingBattle.pendingBattle;
                _setGameState(stateWithoutPendingBattle);
                // The turn is now paused, waiting for the player to resolve the battle.
                // isAITurning remains true. endTurn() is NOT called.
                return; 
            }
        }
        
        // If no player interaction is required, update state and proceed to next turn.
        _setGameState(newGs);
        endTurn();
        setIsAITurning(false);
    }, [endTurn, _setGameState]);

    useEffect(() => {
        if (gameState && gameState.currentPlayerId > 1 && !isAITurning && !gameOverMessage && !gameState.battleReport) {
            runAITurn(gameState);
        }
    }, [gameState, isAITurning, runAITurn, gameOverMessage]);

    const handleStartFormArmy = useCallback((sourceId: string, sourceType: 'city' | 'army') => {
        if (!gameState) return;
        if (sourceType === 'army') {
            const army = gameState.armies.get(sourceId);
            if (army && army.movementPoints <= 0) {
                playSound('error');
                return;
            }
        }
        setArmyFormationSource({ sourceId, sourceType });
    }, [gameState]);

    const handleToggleCamp = useCallback((armyId: string) => {
        if (!gameState || isAITurning || campTileSelectionInfo) return;
        const army = gameState.armies.get(armyId);
        if (!army || army.ownerId !== gameState.currentPlayerId) return;

        if (army.isCamped) {
            playSound('build'); 
            breakCamp({ armyId });
        } else {
            if (army.movementPoints > 0) {
                const totalTilesToSelect = 1 + (army.level || 1);
                setCampTileSelectionInfo({
                    armyId: armyId,
                    totalTiles: totalTilesToSelect,
                    selectedTiles: new Set([axialToString(army.position)])
                });
            } else {
                playSound('error');
            }
        }
    }, [gameState, isAITurning, campTileSelectionInfo, breakCamp]);

    const handleConfirmArmyFormation = useCallback((unitsToMove: { unitType: UnitType; count: number }[]) => {
        if (!gameState || !armyFormationSource) return;
        
        const info: ArmyDeploymentInfo = { ...armyFormationSource, unitsToMove };
        setArmyDeploymentInfo(info);
        setArmyFormationSource(null);

        const player = gameState.players.find(p => p.id === gameState.currentPlayerId);
        if (!player) return;

        let sourcePosition: AxialCoords | undefined;
        if(info.sourceType === 'city') {
            sourcePosition = gameState.cities.get(info.sourceId)?.position;
        } else {
            sourcePosition = gameState.armies.get(info.sourceId)?.position;
        }

        if (!sourcePosition) return;

        const newDeployableHexes = new Set<string>();
        for (const dir of axialDirections) {
            const neighborPos = { q: sourcePosition.q + dir.q, r: sourcePosition.r + dir.r };
            const neighborKey = axialToString(neighborPos);
            const neighborHex = gameState.hexes.get(neighborKey);
            
            if (neighborHex && !neighborHex.armyId && !neighborHex.cityId) {
                const terrainDef = TERRAIN_DEFINITIONS[neighborHex.terrain];
                const isPassable = terrainDef.movementCost < 99 || (terrainDef.requiredTech && player.unlockedTechs.includes(terrainDef.requiredTech));
                if(isPassable) newDeployableHexes.add(neighborKey);
            }
        }
        setDeployableHexes(newDeployableHexes);
    }, [gameState, armyFormationSource]);

    const handleFinalizeArmyDeployment = useCallback((targetPosition: AxialCoords) => {
        if (!armyDeploymentInfo) return;
        playSound('upgrade');
        deployArmy({ deploymentInfo: armyDeploymentInfo, targetPosition });
        selectHex(targetPosition);
        setArmyDeploymentInfo(null);
        setDeployableHexes(new Set());
    }, [armyDeploymentInfo, selectHex, deployArmy]);

    const handleBuyInfluenceTile = useCallback((cityId: string) => {
        if (!gameState || isAITurning || gameOverMessage) return;
        const player = gameState.players.find(p => p.id === gameState.currentPlayerId)!;
        if (player.gold < 50) { playSound('error'); return; }
        playSound('upgrade');
        buyInfluenceTile({ cityId });
    }, [gameState, isAITurning, gameOverMessage, buyInfluenceTile]);
    
    const handleGoHome = () => {
        if (!gameState || !gameContainerRef.current) return;
        const player = gameState.players.find(p => p.id === gameState.currentPlayerId);
        if (!player) return;
        // FIX: The type of `capital` was inferred as `unknown` because the type information for
        // the items in the `gameState.cities` map is lost during state cloning.
        // Casting the array of cities to `City[]` allows TypeScript to correctly infer
        // the type of `capital` as `City | undefined`.
        const capital = (Array.from(gameState.cities.values()) as City[]).find(c => c.ownerId === player.id);
        if (!capital) return;
        playSound('move');
        const pixelPos = axialToPixel(capital.position);
        const hexCenterX = pixelPos.x + 40;
        const hexCenterY = pixelPos.y + (40 * Math.sqrt(3) / 2);
        const containerRect = gameContainerRef.current.getBoundingClientRect();
        setViewState(prev => ({ ...prev, translate: { x: (containerRect.width / 2) - (hexCenterX * prev.scale), y: (containerRect.height / 2) - (hexCenterY * prev.scale) } }));
    };

    const handleOpenSelectionScreen = () => {
        if (!gameState || !selectedHex) return;
        const hexKey = axialToString(selectedHex);
        const hex = gameState.hexes.get(hexKey);
        if (hex?.cityId) {
            setIsCityScreenOpen(true);
        } else if (hex?.armyId) {
            const army = gameState.armies.get(hex.armyId);
            if (army?.isCamped) {
                setSelectedCampId(army.id);
                setIsCampScreenOpen(true);
            }
        }
    };

    const toggleFogOfWar = () => setFogOfWarEnabled(prev => !prev);
    const toggleSettingsMenu = () => setIsSettingsOpen(prev => !prev);
    
    if (!gameStarted) {
        return <StartScreen onStartGame={handleStartGame} />;
    }

    if (!gameState) return <div className="w-screen h-screen bg-gray-900 text-white flex items-center justify-center">Generating World...</div>;
    
    const cityOnSelectedHex = selectedHex ? gameState.cities.get(gameState.hexes.get(axialToString(selectedHex))?.cityId ?? '') : null;
    
    const campSelectableHexes = new Set<string>();
    const campSelectedHexes = new Set<string>();
    if (campTileSelectionInfo) {
        const army = gameState.armies.get(campTileSelectionInfo.armyId)!;
        const potentialHexes = getHexesInRange(army.position, CAMP_INFLUENCE_RANGE);
        potentialHexes.forEach(hexCoords => campSelectableHexes.add(axialToString(hexCoords)));
        campTileSelectionInfo.selectedTiles.forEach(key => campSelectedHexes.add(key));
    }

    return (
        <>
            <GameToolbar fogOfWarEnabled={fogOfWarEnabled} onToggleFogOfWar={toggleFogOfWar} onToggleSettings={toggleSettingsMenu} onGoHome={handleGoHome} />
            <div 
                id="game-container" 
                ref={gameContainerRef}
                className={`w-screen h-screen bg-gray-900 overflow-hidden select-none ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} 
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <GameBoard gameState={gameState} selectedHex={selectedHex} reachableHexes={reachableHexes} attackableHexes={attackableHexes} expandableHexes={expandableHexes} deployableHexes={deployableHexes} campSelectableHexes={campSelectableHexes} campSelectedHexes={campSelectedHexes} influenceMap={influenceMap} onHexClick={handleHexClick} viewState={viewState} fogOfWarEnabled={fogOfWarEnabled} visibleHexes={visibleHexes} exploredHexes={exploredHexes} />
                <GameUI selectedHex={selectedHex} selectedUnitId={selectedUnitId} selectedArmyId={selectedArmyId} campTileSelectionInfo={campTileSelectionInfo} onBuyInfluenceTile={handleBuyInfluenceTile} onOpenSelectionScreen={handleOpenSelectionScreen} onOpenResearchScreen={() => setIsResearchScreenOpen(true)} onOpenCultureScreen={() => setIsCultureScreenOpen(true)} isAITurning={isAITurning} />
                <ArmyBar selectedHex={selectedHex} selectedUnitId={selectedUnitId} selectedArmyId={selectedArmyId} onSelectUnit={handleSelectUnit} onStartFormArmy={handleStartFormArmy} onToggleCamp={handleToggleCamp} />
            </div>
            {isCityScreenOpen && cityOnSelectedHex && <CityScreen cityId={cityOnSelectedHex.id} onClose={() => setIsCityScreenOpen(false)} />}
            {isCampScreenOpen && selectedCampId && <CampScreen armyId={selectedCampId} onClose={() => setIsCampScreenOpen(false)} />}
            {armyFormationSource && <CreateArmyScreen sourceId={armyFormationSource.sourceId} sourceType={armyFormationSource.sourceType} onClose={() => setArmyFormationSource(null)} onConfirmFormation={handleConfirmArmyFormation} />}
            {transferInfo && <TransferScreen info={transferInfo} onClose={() => setTransferInfo(null)} />}
            {isResearchScreenOpen && <ResearchScreen onClose={() => setIsResearchScreenOpen(false)} />}
            {isCultureScreenOpen && <CultureScreen onClose={() => setIsCultureScreenOpen(false)} />}
            {isSettingsOpen && <SettingsMenu volume={volume} onVolumeChange={handleVolumeChange} isMuted={isMutedState} onMuteToggle={handleMuteToggle} onClose={() => setIsSettingsOpen(false)} />}
            {justUnlockedTechId && (
                <TechUnlockedScreen
                    techId={justUnlockedTechId}
                    onClose={() => setJustUnlockedTechId(null)}
                    onChooseNewResearch={() => {
                        setJustUnlockedTechId(null);
                        setIsResearchScreenOpen(true);
                    }}
                />
            )}
            {battleInfo && (
                <BattleScreen 
                    battleInfo={battleInfo}
                    onClose={() => { // Retreat
                        if (isAITurning) return; // Can't retreat when defending
                        playSound('error');
                        setBattleInfo(null);
                    }}
                    onResolve={() => {
                        playSound('attack');
                        autoBattle(battleInfo);
                        setBattleInfo(null);
                    }}
                />
            )}
            {gameState.battleReport && (
                <BattleReportScreen
                    report={gameState.battleReport}
                    onClose={() => {
                        dismissBattleReport();
                        selectHex(null);
                        if (isAITurning) {
                            endTurn();
                            setIsAITurning(false);
                        }
                    }}
                />
            )}
            {gameOverMessage && <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50"><h2 className="text-6xl font-bold text-white mb-4">Game Over</h2><p className="text-3xl text-yellow-400 mb-8">{gameOverMessage}</p><button onClick={() => setGameStarted(false)} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-xl font-bold text-white transition-colors duration-200">Main Menu</button></div>}
        </>
    );
};

export default App;