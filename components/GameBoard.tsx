import React from 'react';
import Hexagon from './Hexagon';
import { GameState, AxialCoords, Hex, Unit, City, Army } from '../types';
import { HEX_SIZE } from '../constants';
import { axialToString } from '../utils/hexUtils';

interface GameBoardProps {
  gameState: GameState;
  fogOfWarEnabled: boolean;
  visibleHexes: Set<string>;
  exploredHexes: Set<string>;
  selectedHex: AxialCoords | null;
  reachableHexes: Set<string>;
  attackableHexes: Set<string>;
  expandableHexes: Set<string>;
  deployableHexes: Set<string>;
  campSelectableHexes: Set<string>;
  campSelectedHexes: Set<string>;
  influenceMap: Map<string, string>;
  onHexClick: (coords: AxialCoords) => void;
  viewState: { scale: number; translate: { x: number; y: number } };
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, fogOfWarEnabled, visibleHexes, exploredHexes, selectedHex, reachableHexes, attackableHexes, expandableHexes, deployableHexes, campSelectableHexes, campSelectedHexes, influenceMap, onHexClick, viewState }) => {
  const boardWidth = HEX_SIZE * 3 / 2 * gameState.mapWidth + HEX_SIZE / 2;
  const boardHeight = HEX_SIZE * Math.sqrt(3) * gameState.mapHeight;

  const getPlayerForHex = (army?: Army, city?: City) => {
    const ownerId = army?.ownerId ?? city?.ownerId;
    return gameState.players.find(p => p.id === ownerId);
  }

  return (
    <div
      className="absolute top-0 left-0"
      style={{
        transform: `translate(${viewState.translate.x}px, ${viewState.translate.y}px) scale(${viewState.scale})`,
        transformOrigin: '0 0',
      }}
    >
      <div
        className="relative bg-gray-900"
        style={{
          width: `${boardWidth}px`,
          height: `${boardHeight}px`,
        }}
      >
        {Array.from(gameState.hexes.entries()).map(([hexKey, hex]) => {
            const isVisible = !fogOfWarEnabled || visibleHexes.has(hexKey);
            const isExplored = !fogOfWarEnabled || exploredHexes.has(hexKey);
            
            const army = isVisible && hex.armyId ? gameState.armies.get(hex.armyId) : undefined;
            const unitsInArmy = army ? army.unitIds.map(id => gameState.units.get(id)!).filter(Boolean) as Unit[] : [];
            const city = isVisible && hex.cityId ? gameState.cities.get(hex.cityId) : undefined;
            const player = getPlayerForHex(army, city);
            const isStarving = isVisible && !!hex.wasStarving && !!hex.armyId;
            const isSick = isVisible && !!hex.wasSick && !!hex.armyId;
            const influenceBorderColor = influenceMap.get(hexKey);
            
            return (
              <Hexagon
                key={hexKey}
                hex={hex}
                army={army}
                unitsInArmy={unitsInArmy}
                city={city}
                player={player}
                isExplored={isExplored}
                isVisible={isVisible}
                isSelected={selectedHex ? hex.q === selectedHex.q && hex.r === selectedHex.r : false}
                isReachable={reachableHexes.has(hexKey)}
                isAttackable={attackableHexes.has(hexKey)}
                isExpandable={expandableHexes.has(hexKey)}
                isDeployable={deployableHexes.has(hexKey)}
                isCampSelectable={campSelectableHexes.has(hexKey)}
                isCampSelected={campSelectedHexes.has(hexKey)}
                isInPath={false} // Pathfinding visualization not implemented yet
                isStarving={isStarving}
                isSick={isSick}
                influenceBorderColor={influenceBorderColor}
                onClick={() => onHexClick({ q: hex.q, r: hex.r })}
              />
            );
          }
        )}
      </div>
    </div>
  );
};

export default GameBoard;