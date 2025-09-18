
import { AxialCoords } from '../types';
import { HEX_SIZE } from '../constants';

export const axialToString = (coords: AxialCoords): string => `${coords.q},${coords.r}`;

export const stringToAxial = (s: string): AxialCoords => {
  const [q, r] = s.split(',').map(Number);
  return { q, r };
};

export const axialToPixel = (coords: AxialCoords): { x: number; y: number } => {
  const x = HEX_SIZE * (3 / 2 * coords.q);
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * coords.q + Math.sqrt(3) * coords.r);
  return { x, y };
};

export const hexDistance = (a: AxialCoords, b: AxialCoords): number =>
  (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;

export const getHexesInRange = (center: AxialCoords, range: number): AxialCoords[] => {
    const results: AxialCoords[] = [];
    for (let q = -range; q <= range; q++) {
        for (let r = Math.max(-range, -q - range); r <= Math.min(range, -q + range); r++) {
            results.push({ q: center.q + q, r: center.r + r });
        }
    }
    return results;
};