import { Technology, TechEffectType, UnitType, BuildingType, CampBuildingType } from './types';

export const TECH_TREE: Record<string, Technology> = {
    // TIER 1
    'fire_mastery': {
        id: 'fire_mastery',
        name: 'Fire Mastery',
        description: 'Control of fire provides warmth, light, and a focal point for the community. Unlocks the Fire Pit and further innovations.',
        cost: 10,
        prerequisites: [],
        effects: [{ type: TechEffectType.UnlockBuilding, payload: CampBuildingType.FirePit }],
        tier: 1,
    },
    // TIER 2
    'simple_storage': {
        id: 'simple_storage',
        name: 'Simple Storage',
        description: 'Develop methods for food preservation and resource stockpiling. Unlocks the Storage Pit and Drying Rack.',
        cost: 5,
        prerequisites: ['fire_mastery'],
        effects: [
            { type: TechEffectType.UnlockBuilding, payload: CampBuildingType.StoragePit },
            { type: TechEffectType.UnlockBuilding, payload: CampBuildingType.DryingRack }
        ],
        tier: 2,
    },
    'herbal_lore': {
        id: 'herbal_lore',
        name: 'Herbal Lore',
        description: 'Study of plants and natural remedies. Unlocks the Shaman unit and allows construction of Healer\'s Tents.',
        cost: 10,
        prerequisites: ['fire_mastery'],
        effects: [
            { type: TechEffectType.UnlockUnit, payload: UnitType.Shaman },
            { type: TechEffectType.UnlockBuilding, payload: CampBuildingType.HealersTent }
        ],
        tier: 2,
    },
    // TIER 3
    'fishing': {
        id: 'fishing',
        name: 'Fishing',
        description: 'Develop nets and boats to gather food from water tiles. Provides +2 food per controlled water tile.',
        cost: 1500,
        prerequisites: ['simple_storage'],
        effects: [{ type: TechEffectType.GlobalBonus, payload: { bonus: 'food_from_water', value: 2 } }],
        tier: 3,
    },
    'construction': {
        id: 'construction',
        name: 'Construction',
        description: 'Standardize building practices to create complex structures. Unlocks the Marketplace.',
        cost: 2500,
        prerequisites: ['simple_storage'],
        effects: [{ type: TechEffectType.UnlockBuilding, payload: BuildingType.Marketplace }],
        tier: 3,
    },
    'forging': {
        id: 'forging',
        name: 'Forging',
        description: 'Harness the power of fire and metal to create powerful engines of war. Unlocks the Tank.',
        cost: 3000,
        prerequisites: ['simple_storage'],
        effects: [{ type: TechEffectType.UnlockUnit, payload: UnitType.Tank }],
        tier: 3,
    },
    'mountaineering': {
        id: 'mountaineering',
        name: 'Mountaineering',
        description: 'Develop techniques and equipment to cross treacherous mountains.',
        cost: 2500,
        prerequisites: ['simple_storage'],
        effects: [], // Effect is handled in movement logic
        tier: 3,
    },
    // TIER 4
    'agriculture': {
        id: 'agriculture',
        name: 'Agriculture',
        description: 'Master farming techniques to support larger populations. Unlocks the Granary.',
        cost: 1000,
        prerequisites: ['construction'],
        effects: [{ type: TechEffectType.UnlockBuilding, payload: BuildingType.Granary }],
        tier: 4,
    },
    'mining': {
        id: 'mining',
        name: 'Mining',
        description: 'Develop advanced mineral extraction methods. Gain +1 Gold from each controlled Hills tile.',
        cost: 1200,
        prerequisites: ['mountaineering'],
        effects: [{ type: TechEffectType.GlobalBonus, payload: { bonus: 'gold_from_hills', value: 1 } }],
        tier: 4,
    },
    'sailing': {
        id: 'sailing',
        name: 'Sailing',
        description: 'Construct basic rafts and boats to traverse lakes and seas.',
        cost: 2000,
        prerequisites: ['fishing'],
        effects: [], // Effect is handled in movement logic
        tier: 4,
    },
};