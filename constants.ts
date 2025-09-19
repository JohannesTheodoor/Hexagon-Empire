import { TerrainType, TerrainDefinition, UnitType, UnitDefinition, UnitSize, BuildingType, BuildingDefinition, Gender, CampBuildingType, CampBuildingDefinition } from './types';

export const MAP_SIZES = {
    small: { width: 25, height: 17 },
    medium: { width: 35, height: 25 },
    large: { width: 50, height: 35 },
};

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
export const GATHERING_YIELD_PER_POINT = 0.5;

// New Camp XP System Constants
export const CAMP_XP_PER_TURN = 10;
export const CAMP_XP_PER_BUILDING_PROD_COST = 0.5; // 50% of production cost as XP
export const CAMP_XP_PER_UNIT_PROD_COST = 0.25; // 25% of production cost as XP
export const CAMP_XP_PER_NEW_MEMBER = 20; // XP for merging or reproduction
export const INITIAL_XP_TO_NEXT_LEVEL = 150; // XP needed for Lvl 1 -> Lvl 2
export const XP_LEVEL_MULTIPLIER = 1.5; // Each level costs 1.5x the previous


export const BASE_CITY_INCOME = 5;
export const INCOME_PER_INFLUENCE_LEVEL = 2; // Gold per controlled tile beyond the first

export const UNIT_HEAL_AMOUNT = 2; // HP healed per turn in friendly influence
export const STARVATION_DAMAGE = 1;

// Disease Constants
export const DISEASE_RISK_BASE: Record<'Low' | 'Medium' | 'High', number> = {
  Low: 5,
  Medium: 10,
  High: 20,
};
export const DISEASE_RISK_INCREASE_PER_EXPOSURE = 3;
export const DISEASE_DAMAGE = 1;

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
        movement: 2, cost: { gold: 10, hides: 5 }, productionCost: 300, attack: 6, defense: 3, maxHp: 10, 
        size: UnitSize.Small, foodGatherRate: 1, foodConsumption: 3, 
        productionYield: 1, carryCapacity: 3, foodCarryCapacity: 2, researchYield: 0, healingBonus: 0,
        gender: Gender.Male,
    },
    [UnitType.Tank]: { 
        movement: 4, cost: { gold: 25, stone: 15 }, productionCost: 800, attack: 10, defense: 6, maxHp: 20, 
        size: UnitSize.Large, foodGatherRate: 0, foodConsumption: 5, 
        productionYield: 0, carryCapacity: 5, foodCarryCapacity: 0, requiredTech: 'forging', researchYield: 0, healingBonus: 0,
        gender: Gender.None,
    },
    [UnitType.Tribesman]: { 
        movement: 1, cost: { gold: 5 }, productionCost: 100, attack: 1, defense: 1, maxHp: 5, 
        size: UnitSize.Small, foodGatherRate: 1, foodConsumption: 1, 
        productionYield: 2, carryCapacity: 2, foodCarryCapacity: 1, researchYield: 0, healingBonus: 0,
        gender: Gender.Male,
    },
    [UnitType.Tribeswoman]: { 
        movement: 1, cost: { gold: 5 }, productionCost: 100, attack: 1, defense: 1, maxHp: 5, 
        size: UnitSize.Small, foodGatherRate: 2, foodConsumption: 1, 
        productionYield: 1, carryCapacity: 1, foodCarryCapacity: 2, researchYield: 0, healingBonus: 0,
        gender: Gender.Female,
    },
    [UnitType.Child]: {
        movement: 1, cost: {}, productionCost: 0, attack: 0, defense: 0, maxHp: 3,
        size: UnitSize.Small, foodGatherRate: 0, foodConsumption: 1,
        productionYield: 0, carryCapacity: 0, foodCarryCapacity: 0, researchYield: 0, healingBonus: 0
    },
    [UnitType.Shaman]: {
        movement: 1, cost: { gold: 15, obsidian: 2 }, productionCost: 400, attack: 1, defense: 2, maxHp: 8,
        size: UnitSize.Small, foodGatherRate: 0, foodConsumption: 2,
        productionYield: 0, carryCapacity: 1, foodCarryCapacity: 2, researchYield: 2, healingBonus: 1,
        gender: Gender.Male,
    }
};

export const BUILDING_DEFINITIONS: Record<BuildingType, BuildingDefinition> = {
    [BuildingType.Marketplace]: { name: 'Marketplace', description: '+5 Gold per turn, +50 resource storage.', cost: { gold: 100, wood: 50 }, productionCost: 1000, goldBonus: 5, storageBonus: 50, requiredTech: 'construction' },
    [BuildingType.Granary]: { name: 'Granary', description: '+10 Food production & +50 Food storage.', cost: { gold: 75, wood: 20, stone: 10 }, productionCost: 600, foodBonus: 10, foodStorageBonus: 50, requiredTech: 'agriculture' },
};

export const CAMP_BUILDING_DEFINITIONS: Record<CampBuildingType, CampBuildingDefinition> = {
    [CampBuildingType.FirePit]: { name: 'Fire Pit', description: '+1 Research, +1 Culture point per turn. Enhances healing if food is available.', cost: { wood: 5, stone: 1 }, productionCost: 10, researchBonus: 1, culturePointBonus: 1, requiredTech: 'fire_mastery' },
    [CampBuildingType.Palisade]: { name: 'Palisade', description: '+2 Defense bonus for the camp.', cost: { wood: 50 }, productionCost: 500, defenseBonus: 2 },
    [CampBuildingType.ScoutTent]: { name: 'Scout Tent', description: '+1 Vision range for the camp.', cost: { wood: 10, hides: 30 }, productionCost: 400, visionBonus: 1 },
    [CampBuildingType.ForagingPost]: { name: 'Foraging Post', description: '+5 Food gathering per turn from this tile.', cost: { wood: 60 }, productionCost: 600, foodGatherBonus: 5 },
    [CampBuildingType.StoragePit]: { name: 'Storage Pit', description: '+50 resource storage capacity.', cost: { wood: 10, stone: 5, hides: 2 }, productionCost: 15, storageBonus: 50, requiredTech: 'simple_storage' },
    [CampBuildingType.DryingRack]: { name: 'Drying Rack', description: 'Increases camp food storage by 10.', cost: { wood: 8 }, productionCost: 18, foodStorageBonus: 10, requiredTech: 'simple_storage' },
};

export const axialDirections: {q: number, r: number}[] = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];