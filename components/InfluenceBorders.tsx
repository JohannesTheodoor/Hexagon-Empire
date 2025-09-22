import React from 'react';
import { GameState, AxialCoords } from '../types';
import { HEX_SIZE, axialDirections } from '../constants';
import { axialToString, stringToAxial, getHexesInRange, axialToPixel } from '../utils/hexUtils';

interface InfluenceBordersProps {
  gameState: GameState;
}

const getHexCenter = (coords: AxialCoords): { x: number; y: number } => {
  const { x, y } = axialToPixel(coords);
  return {
    x: x + HEX_SIZE,
    y: y + (HEX_SIZE * Math.sqrt(3) / 2),
  };
};

// Corrected function for pointy-top hexagons
const getPointyTopHexCorner = (center: { x: number; y: number }, size: number, i: number): { x: number; y: number } => {
  const angleDeg = 60 * i;
  const angleRad = Math.PI / 180 * angleDeg;
  return {
    x: center.x + size * Math.cos(angleRad),
    y: center.y + size * Math.sin(angleRad),
  };
};

const InfluenceBorders: React.FC<InfluenceBordersProps> = ({ gameState }) => {
  const perimeterEdges: { p1: { x: number; y: number }, p2: { x: number; y: number } }[] = [];

  // Corrected map for pointy-top hexagons
  // Corner indices (i for getPointyTopHexCorner): 0:R, 1:TR, 2:TL, 3:L, 4:BL, 5:BR
  // axialDirections indices: 0:E, 1:NE, 2:NW, 3:W, 4:SW, 5:SE
  const borderEdgeCornerMap = [
    [1, 5], // Dir 0 (E) is between Top-Right (1) and Bottom-Right (5)
    [2, 1], // Dir 1 (NE) is between Top-Left (2) and Top-Right (1)
    [3, 2], // Dir 2 (NW) is between Left (3) and Top-Left (2)
    [4, 3], // Dir 3 (W) is between Bottom-Left (4) and Left (3)
    [5, 4], // Dir 4 (SW) is between Bottom-Right (5) and Bottom-Left (4)
    [0, 5], // Dir 5 (SE) is between Right (0) and Bottom-Right (5)
  ];

  for (const city of gameState.cities.values()) {
    // FIX: Use city.controlledTiles instead of the non-existent city.influenceRadius property.
    // FIX: Cast city.controlledTiles to string[] as its type is inferred as 'unknown' after state cloning.
    const influenceSet = new Set(city.controlledTiles as string[]);

    for (const hexKey of influenceSet) {
      if (!gameState.hexes.has(hexKey)) continue;

      const hexCoords = stringToAxial(hexKey);
      const pixelCenter = getHexCenter(hexCoords);

      for (let i = 0; i < 6; i++) {
        const neighborCoords = { q: hexCoords.q + axialDirections[i].q, r: hexCoords.r + axialDirections[i].r };
        const neighborKey = axialToString(neighborCoords);

        // If the neighbor is outside the influence, this edge is a border
        if (!influenceSet.has(neighborKey)) {
          const [c1_idx, c2_idx] = borderEdgeCornerMap[i];
          const p1 = getPointyTopHexCorner(pixelCenter, HEX_SIZE, c1_idx);
          const p2 = getPointyTopHexCorner(pixelCenter, HEX_SIZE, c2_idx);
          perimeterEdges.push({ p1, p2 });
        }
      }
    }
  }

  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ width: '100%', height: '100%' }}>
      <g>
        {perimeterEdges.map((edge, index) => (
          <line
            key={index}
            x1={edge.p1.x}
            y1={edge.p1.y}
            x2={edge.p2.x}
            y2={edge.p2.y}
            stroke="#FFA500" // Orange
            strokeWidth={1.5}
            strokeDasharray="5, 5"
            strokeOpacity={0.75}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
};

export default InfluenceBorders;