import { GameState, Hex, Unit, City, Army } from '../types';

// New robust deep cloning function to prevent state corruption during turn processing.
export const deepCloneGameState = (gs: GameState): GameState => {
  // Convert Maps to Arrays for stringification, which is a safe way to deep clone.
  const stringifiableState = {
    ...gs,
    hexes: Array.from(gs.hexes.entries()),
    units: Array.from(gs.units.entries()),
    cities: Array.from(gs.cities.entries()),
    armies: Array.from(gs.armies.entries()),
  };
  
  const serialized = JSON.stringify(stringifiableState);
  const parsed = JSON.parse(serialized);

  // FIX: Re-hydrate the game state after JSON.parse, which strips all type information.
  // This involves reconstructing the Maps and then casting the plain object back to GameState.
  // This single fix prevents cascading 'unknown' type errors throughout the application.
  const rehydratedState = {
    ...parsed,
    hexes: new Map<string, Hex>(parsed.hexes),
    units: new Map<string, Unit>(parsed.units),
    cities: new Map<string, City>(parsed.cities),
    armies: new Map<string, Army>(parsed.armies),
  };
  
  return rehydratedState as GameState;
};

export const generateId = () => Math.random().toString(36).substring(2, 9);