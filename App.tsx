




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
import StartScreen from './components/StartScreen';
// FIX: Added City to imports to allow for explicit type annotation.
import { GameState, AxialCoords, UnitType, Army, ArmyDeploymentInfo, Gender, CampBuildingType, Unit, UnitSize, City } from './types';
import { MAP_SIZES, TERRAIN_DEFINITIONS, UNIT_DEFINITIONS, axialDirections, CITY_VISION_RANGE, UNIT_VISION_RANGE, CAMP_INFLUENCE_RANGE, CAMP_VISION_RANGE, CAMP_BUILDING_DEFINITIONS } from './constants';
import { axialToString, stringToAxial, getHexesInRange, hexDistance, axialToPixel, PriorityQueue } from './utils/hexUtils';
import { playSound, setVolume, setMuted, ensureAudioInitialized } from './utils/soundManager';
import { deepCloneGameState } from './utils/gameStateUtils';
import { useGameStore } from './store/gameStore';
import { 
    processHexClick,
    processProduceUnit,
    processDeployArmy
} from './utils/gameLogic';

type WorldSize = 'small' | 'medium' | 'large';

const App: React.FC = () => {
    const gameState = useGameStore(state => state.gameState);
    const startGame = useGameStore(state => state.startGame);
    const endTurn = useGameStore(state => state.endTurn);
    const hexClick = useGameStore(state => state.hexClick);
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
    const [volume, setVolumeState] = useState(0.5);
    const [isMutedState, setIsMutedState] = useState(false);

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
            const clampedScale = Math.max(0.3, Math.min(2.5, newScale));

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
            if (rect && !isPanning && !isCityScreenOpen && !isResearchScreenOpen && !isSettingsOpen && !armyFormationSource && !armyDeploymentInfo && !isCultureScreenOpen) {
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
    }, [isPanning, isCityScreenOpen, isResearchScreenOpen, isSettingsOpen, armyFormationSource, armyDeploymentInfo, isCultureScreenOpen]);

    const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
        mousePosRef.current = { x: e.clientX, y: e.clientY };
    }, []);

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
    }, [handleGlobalMouseMove]);

    const handleStartGame = useCallback((size: WorldSize) => {
        const { width, height } = MAP_SIZES[size];
        startGame(width, height);
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

    const calculateReachableHexes = useCallback((start: AxialCoords, army: Army, gs: GameState): { reachable: Set<string>; costs: Map<string, number> } => {
        if (army.isCamped) return { reachable: new Set(), costs: new Map() };
    
        const costSoFar: Map<string, number> = new Map();
        costSoFar.set(axialToString(start), 0);
        const reachable = new Set<string>();
        
        const player = gs.players.find(p => p.id === army.ownerId)!;
        const unitsInArmy = army.unitIds.map(id => gs.units.get(id)!);
    
        const frontier = new PriorityQueue<{ pos: AxialCoords; cost: number }>();
        frontier.enqueue({ pos: start, cost: 0 }, 0);
    
        while (!frontier.isEmpty()) {
            const current = frontier.dequeue();
            if (!current) break;
    
            axialDirections.forEach(dir => {
                const nextCoords = { q: current.pos.q + dir.q, r: current.pos.r + dir.r };
                const nextKey = axialToString(nextCoords);
                const nextHex = gs.hexes.get(nextKey);
    
                if (nextHex) {
                    const terrainDef = TERRAIN_DEFINITIONS[nextHex.terrain];
                    let moveCost = terrainDef.movementCost;
                    
                    if (terrainDef.requiredTech && !player.unlockedTechs.includes(terrainDef.requiredTech)) {
                        moveCost = 99;
                    }
                    const isImpassableByUnit = unitsInArmy.some(u => UNIT_DEFINITIONS[u.type].size === UnitSize.Large && terrainDef.name === 'Forest');
                    if (isImpassableByUnit) moveCost = 99;
    
                    const newCost = current.cost + moveCost;
                    const isOccupiedByEnemy = nextHex.armyId && gs.armies.get(nextHex.armyId)?.ownerId !== army.ownerId;
    
                    if (newCost <= army.movementPoints && !isOccupiedByEnemy && (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)!)) {
                        costSoFar.set(nextKey, newCost);
                        frontier.enqueue({ pos: nextCoords, cost: newCost }, newCost);
                        reachable.add(nextKey);
                    }
                }
            });
        }
    
        if (army.movementPoints > 0) {
            axialDirections.forEach(dir => {
                const nextCoords = { q: start.q + dir.q, r: start.r + dir.r };
                const nextKey = axialToString(nextCoords);
                const nextHex = gs.hexes.get(nextKey);
                
                if (nextHex) {
                    const terrainDef = TERRAIN_DEFINITIONS[nextHex.terrain];
                    let moveCost = terrainDef.movementCost;
                    
                    const isTechLocked = terrainDef.requiredTech && !player.unlockedTechs.includes(terrainDef.requiredTech);
                    const isImpassableByUnit = unitsInArmy.some(u => UNIT_DEFINITIONS[u.type].size === UnitSize.Large && terrainDef.name === 'Forest');
                    const isOccupiedByEnemy = nextHex.armyId && gs.armies.get(nextHex.armyId)?.ownerId !== army.ownerId;
                    
                    const isPassable = !isTechLocked && !isImpassableByUnit && !isOccupiedByEnemy && moveCost < 99;

                    if (isPassable) {
                        reachable.add(nextKey);
                        if (!costSoFar.has(nextKey)) {
                            costSoFar.set(nextKey, moveCost);
                        }
                    }
                }
            });
        }
    
        return { reachable, costs: costSoFar };
    }, []);

    const findAttackableHexes = useCallback((start: AxialCoords, army: Army, gs: GameState): Set<string> => {
        if (army.isCamped || army.movementPoints === 0) return new Set();
        const attackable = new Set<string>();
        axialDirections.forEach(dir => {
            const neighborCoords = { q: start.q + dir.q, r: start.r + dir.r };
            const neighborKey = axialToString(neighborCoords);
            const neighborHex = gs.hexes.get(neighborKey);
            if (neighborHex) {
                if (neighborHex.armyId) {
                    const targetArmy = gs.armies.get(neighborHex.armyId);
                    if (targetArmy && targetArmy.ownerId !== army.ownerId) attackable.add(neighborKey);
                }
                if (neighborHex.cityId) {
                    const city = gs.cities.get(neighborHex.cityId);
                    if (city && city.ownerId !== army.ownerId) attackable.add(neighborKey);
                }
            }
        });
        return attackable;
    }, []);

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

    }, [gameState, selectedHex, calculateReachableHexes, findAttackableHexes]);
    
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
        if (!gameState || isAITurning || gameOverMessage || isCityScreenOpen || armyFormationSource || isCampScreenOpen || isCultureScreenOpen) return;
        
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

        const selectedArmy = selectedArmyId ? gameState.armies.get(selectedArmyId) : null;
        const isActionableClick = (selectedArmy && selectedArmy.ownerId === gameState.currentPlayerId && (attackableHexes.has(clickedHexKey) || reachableHexes.has(clickedHexKey))) || expandableHexes.has(clickedHexKey);

        if (isActionableClick) {
            if (expandableHexes.has(clickedHexKey)) playSound('upgrade');
            else if (attackableHexes.has(clickedHexKey)) playSound('attack');
            else if (reachableHexes.has(clickedHexKey)) {
                const destArmy = gameState.hexes.get(clickedHexKey)?.armyId ? gameState.armies.get(gameState.hexes.get(clickedHexKey)!.armyId!) : null;
                if(destArmy && destArmy.ownerId === selectedArmy?.ownerId) playSound('upgrade');
                else playSound('move');
            }
            hexClick({ coords, selectedArmyId, reachableHexes, attackableHexes, expandableHexes, pathCosts, selectedHex });
            if (attackableHexes.has(clickedHexKey)) {
                selectHex(null);
            } else {
                selectHex(coords);
            }
        } else {
            selectHex(coords);
        }

    }, [gameState, selectedHex, selectedArmyId, reachableHexes, attackableHexes, expandableHexes, deployableHexes, pathCosts, armyDeploymentInfo, campTileSelectionInfo, isAITurning, gameOverMessage, selectHex, isCityScreenOpen, isCampScreenOpen, armyFormationSource, isCultureScreenOpen, handleFinalizeCampSetup, hexClick]);

    const handleEndTurn = useCallback(() => {
        if (isAITurning || gameOverMessage) return;
        playSound('endTurn');
        endTurn();
        selectHex(null);
    }, [isAITurning, gameOverMessage, selectHex, endTurn]);

    const runAITurn = useCallback(async (gs: GameState) => {
        setIsAITurning(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        let newGs = deepCloneGameState(gs);
        const aiPlayer = newGs.players.find(p => p.id === 2)!;
        const playerCapital = Array.from(newGs.cities.values()).find(c => c.ownerId === 1);

        const aiCities = Array.from(newGs.cities.values()).filter(c => c.ownerId === aiPlayer.id);
        for (const city of aiCities) {
            if (city.buildQueue.length === 0) {
                const unitDef = UNIT_DEFINITIONS[UnitType.Tribesman];
                if (aiPlayer.gold >= (unitDef.cost.gold ?? 0) && (city.localResources.wood ?? 0) >= (unitDef.cost.wood ?? 0)) {
                    newGs = processProduceUnit(newGs, { unitType: UnitType.Tribesman, cityId: city.id });
                }
            }
            if (city.garrison.length >= 2) {
                let deployHexKey: string | null = null;
                for (const dir of axialDirections) {
                    const neighborPos = { q: city.position.q + dir.q, r: city.position.r + dir.r };
                    const neighborKey = axialToString(neighborPos);
                    const neighborHex = newGs.hexes.get(neighborKey);
                    if (neighborHex && !neighborHex.armyId && !neighborHex.cityId) {
                        deployHexKey = neighborKey;
                        break;
                    }
                }
                if (deployHexKey) {
                    const deployInfo: ArmyDeploymentInfo = {
                        sourceId: city.id,
                        sourceType: 'city',
                        unitsToMove: [{ unitType: UnitType.Tribesman, count: 2 }],
                    };
                    newGs = processDeployArmy(newGs, { deploymentInfo: deployInfo, targetPosition: stringToAxial(deployHexKey) });
                }
            }
        }
        
        const aiArmies = Array.from(newGs.armies.values()).filter(a => a.ownerId === aiPlayer.id);
        for (const army of aiArmies) {
             if (!newGs.armies.has(army.id) || army.isCamped) continue;
            army.movementPoints = army.maxMovementPoints;
            const attackable = findAttackableHexes(army.position, army, newGs);
            if (attackable.size > 0) {
                const targetHexKey = Array.from(attackable)[0];
                newGs = processHexClick(newGs, { coords: stringToAxial(targetHexKey), selectedArmyId: army.id, reachableHexes: new Set(), attackableHexes: new Set([targetHexKey]), expandableHexes: new Set(), pathCosts: new Map(), selectedHex: army.position });
                continue;
            }

            if (playerCapital && army.movementPoints > 0) {
                let bestNeighbor: AxialCoords | null = null;
                let minDistance = hexDistance(army.position, playerCapital.position);
                const { reachable, costs } = calculateReachableHexes(army.position, army, newGs);
                
                for(const reachableHexKey of reachable) {
                    const reachableCoords = stringToAxial(reachableHexKey);
                    const dist = hexDistance(reachableCoords, playerCapital.position);
                    if(dist < minDistance) {
                        minDistance = dist;
                        bestNeighbor = reachableCoords;
                    }
                }

                if (bestNeighbor) {
                    newGs = processHexClick(newGs, { coords: bestNeighbor, selectedArmyId: army.id, reachableHexes: reachable, attackableHexes: new Set(), expandableHexes: new Set(), pathCosts: costs, selectedHex: army.position });
                }
            }
        }
        
        _setGameState(newGs); // Set the state after AI logic
        endTurn(); // Now call endTurn on the updated state
        setIsAITurning(false);
    }, [findAttackableHexes, calculateReachableHexes, endTurn, _setGameState]);

    useEffect(() => {
        if (gameState && gameState.currentPlayerId === 2 && !isAITurning && !gameOverMessage) {
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
            {isResearchScreenOpen && <ResearchScreen onClose={() => setIsResearchScreenOpen(false)} />}
            {isCultureScreenOpen && <CultureScreen onClose={() => setIsCultureScreenOpen(false)} />}
            {isSettingsOpen && <SettingsMenu volume={volume} onVolumeChange={handleVolumeChange} isMuted={isMutedState} onMuteToggle={handleMuteToggle} onClose={() => setIsSettingsOpen(false)} />}
            {gameOverMessage && <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50"><h2 className="text-6xl font-bold text-white mb-4">Game Over</h2><p className="text-3xl text-yellow-400 mb-8">{gameOverMessage}</p><button onClick={() => setGameStarted(false)} className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-lg text-xl font-bold text-white transition-colors duration-200">Main Menu</button></div>}
        </>
    );
};

export default App;