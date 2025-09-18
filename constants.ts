import { TerrainType, TerrainDefinition, UnitType, UnitDefinition, UnitSize, BuildingType, BuildingDefinition, Gender, CampBuildingType, CampBuildingDefinition } from './types';

export const MAP_WIDTH = 25;
export const MAP_HEIGHT = 17;
export const HEX_SIZE = 40;
export const CITY_HP = 100;
export const INITIAL_CITY_POPULATION = 10;
export const CITY_POPULATION_PER_LEVEL = 50; // A city levels up for every X pop above initial
export const BASE_CITY_FOOD_STORAGE = 100;

export const UNIT_VISION_RANGE = 1;
export const CITY_VISION_RANGE = 3;
export const CAMP_VISION_RANGE = 1;
export const CAMP_INFLUENCE_RANGE = 1;
export const BUY_INFLUENCE_TILE_COST = 50;
export const CAMP_DEFENSE_BONUS = 3;
export const INITIAL_CAMP_POPULATION_MILESTONE = 10;
export const CAMP_POPULATION_PER_LEVEL = 10;


export const BASE_CITY_INCOME = 5;
export const INCOME_PER_INFLUENCE_LEVEL = 2; // Gold per controlled tile beyond the first

export const UNIT_HEAL_AMOUNT = 2; // HP healed per turn in friendly influence
export const STARVATION_DAMAGE = 1;

export const TERRAIN_DEFINITIONS: Record<TerrainType, TerrainDefinition> = {
  [TerrainType.Plains]: { name: 'Plains', color: '#8db152', movementCost: 1, defenseBonus: 0, maxFood: 50, foodRegrowth: 11, maxWood: 8, woodRegrowth: 1, maxStone: 8, maxHides: 6, hidesRegrowth: 1, maxObsidian: 0, diseaseRisk: 'Low' },
  [TerrainType.Forest]: { name: 'Forest', color: '#4a784a', movementCost: 2, defenseBonus: 2, maxFood: 35, foodRegrowth: 6, maxWood: 18, woodRegrowth: 1, maxStone: 0, maxHides: 5, hidesRegrowth: 1, maxObsidian: 0, diseaseRisk: 'Medium' },
  [TerrainType.Hills]: { name: 'Hills', color: '#a69078', movementCost: 2, defenseBonus: 2, maxFood: 15, foodRegrowth: 1, maxWood: 4, woodRegrowth: 1, maxStone: 40, maxHides: 3, hidesRegrowth: 1, maxObsidian: 3, diseaseRisk: 'Low' },
  [TerrainType.Mountains]: { name: 'Mountains', color: '#7d7d7d', movementCost: 99, defenseBonus: 3, maxFood: 4, foodRegrowth: 1, maxWood: 0, woodRegrowth: 0, maxStone: 120, maxHides: 1, hidesRegrowth: 1, maxObsidian: 6, diseaseRisk: 'Low', requiredTech: 'mountaineering' },
  [TerrainType.Desert]: { name: 'Desert', color: '#d2b48c', movementCost: 2, defenseBonus: -1, maxFood: 1, foodRegrowth: 1, maxWood: 0, woodRegrowth: 0, maxStone: 8, maxHides: 1, hidesRegrowth: 1, maxObsidian: 0, diseaseRisk: 'Medium' },
  [TerrainType.Lake]: { name: 'Lake', color: '#7fdbff', movementCost: 99, defenseBonus: 0, maxFood: 85, foodRegrowth: 24, maxWood: 12, woodRegrowth: 1, maxStone: 12, maxHides: 4, hidesRegrowth: 1, maxObsidian: 0, diseaseRisk: 'Low', requiredTech: 'sailing' },
  [TerrainType.Swamp]: { name: 'Swamp', color: '#556B2F', movementCost: 2, defenseBonus: 1, maxFood: 25, foodRegrowth: 4, maxWood: 9, woodRegrowth: 1, maxStone: 4, maxHides: 4, hidesRegrowth: 1, maxObsidian: 0, diseaseRisk: 'High' },
  [TerrainType.Steppe]: { name: 'Steppe', color: '#c3d08b', movementCost: 1, defenseBonus: 1, maxFood: 45, foodRegrowth: 8, maxWood: 4, woodRegrowth: 1, maxStone: 6, maxHides: 8, hidesRegrowth: 1, maxObsidian: 0, diseaseRisk: 'Low' },
  [TerrainType.Volcanic]: { name: 'Volcanic', color: '#694545', movementCost: 2, defenseBonus: 1, maxFood: 35, foodRegrowth: 4, maxWood: 2, woodRegrowth: 1, maxStone: 30, maxHides: 2, hidesRegrowth: 1, maxObsidian: 12, diseaseRisk: 'Medium' },
  [TerrainType.Sea]: { name: 'Sea', color: '#00008B', movementCost: 99, defenseBonus: 0, maxFood: 60, foodRegrowth: 14, maxWood: 3, woodRegrowth: 1, maxStone: 6, maxHides: 2, hidesRegrowth: 1, maxObsidian: 0, diseaseRisk: 'Low', requiredTech: 'sailing' },
};

export const UNIT_DEFINITIONS: Record<UnitType, UnitDefinition> = {
    [UnitType.Infantry]: { 
        movement: 2, cost: 10, productionCost: 300, attack: 6, defense: 3, maxHp: 10, 
        size: UnitSize.Small, foodGatherRate: 1, foodConsumption: 3, 
        productionYield: 1, carryCapacity: 5, researchYield: 0, healingBonus: 0,
        gender: Gender.Male,
    },
    [UnitType.Tank]: { 
        movement: 4, cost: 25, productionCost: 800, attack: 10, defense: 6, maxHp: 20, 
        size: UnitSize.Large, foodGatherRate: 0, foodConsumption: 5, 
        productionYield: 0, carryCapacity: 10, requiredTech: 'forging', researchYield: 0, healingBonus: 0,
        gender: Gender.None,
    },
    [UnitType.Tribesman]: { 
        movement: 1, cost: 5, productionCost: 100, attack: 1, defense: 1, maxHp: 5, 
        size: UnitSize.Small, foodGatherRate: 1, foodConsumption: 1, 
        productionYield: 2, carryCapacity: 2, researchYield: 0, healingBonus: 0,
        gender: Gender.Male,
    },
    [UnitType.Tribeswoman]: { 
        movement: 1, cost: 5, productionCost: 100, attack: 1, defense: 1, maxHp: 5, 
        size: UnitSize.Small, foodGatherRate: 2, foodConsumption: 1, 
        productionYield: 1, carryCapacity: 2, researchYield: 0, healingBonus: 0,
        gender: Gender.Female,
    },
    [UnitType.Child]: {
        movement: 1, cost: 0, productionCost: 0, attack: 0, defense: 0, maxHp: 3,
        size: UnitSize.Small, foodGatherRate: 0, foodConsumption: 1,
        productionYield: 0, carryCapacity: 0, researchYield: 0, healingBonus: 0
    },
    [UnitType.Shaman]: {
        movement: 1, cost: 15, productionCost: 400, attack: 1, defense: 2, maxHp: 8,
        size: UnitSize.Small, foodGatherRate: 0, foodConsumption: 2,
        productionYield: 0, carryCapacity: 5, researchYield: 2, healingBonus: 1,
        gender: Gender.Male,
    }
};

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
    [BuildingType.Marketplace]: { name: 'Marketplace', description: '+5 Gold per turn.', cost: 100, productionCost: 1000, goldBonus: 5, requiredTech: 'construction' },
    [BuildingType.Granary]: { name: 'Granary', description: '+10 Food production & +50 Food storage.', cost: 75, productionCost: 600, foodBonus: 10, foodStorageBonus: 50, requiredTech: 'agriculture' },
};

export const CAMP_BUILDING_DEFINITIONS: Record<CampBuildingType, CampBuildingDefinition> = {
    [CampBuildingType.Palisade]: { name: 'Palisade', description: '+2 Defense bonus for the camp.', cost: 50, productionCost: 500, defenseBonus: 2 },
    [CampBuildingType.ScoutTent]: { name: 'Scout Tent', description: '+1 Vision range for the camp.', cost: 40, productionCost: 400, visionBonus: 1 },
    [CampBuildingType.ForagingPost]: { name: 'Foraging Post', description: '+5 Food gathering per turn from this tile.', cost: 60, productionCost: 600, foodGatherBonus: 5 },
};

export const axialDirections: {q: number, r: number}[] = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];