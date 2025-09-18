import { Technology, TechEffectType, UnitType, BuildingType } from './types';

export const TECH_TREE: Record<string, Technology> = {
    'agriculture': {
        id: 'agriculture',
        name: 'Agriculture',
        description: 'Master farming techniques to support larger populations. Unlocks the Granary.',
        cost: 1000,
        prerequisites: [],
        effects: [{ type: TechEffectType.UnlockBuilding, payload: BuildingType.Granary }],
        tier: 1,
    },
    'mining': {
        id: 'mining',
        name: 'Mining',
        description: 'Develop advanced mineral extraction methods. Gain +1 Gold from each controlled Hills tile.',
        cost: 1200,
        prerequisites: [],
        effects: [{ type: TechEffectType.GlobalBonus, payload: { bonus: 'gold_from_hills', value: 1 } }],
        tier: 1,
    },
    'sailing': {
        id: 'sailing',
        name: 'Sailing',
        description: 'Construct basic rafts and boats to traverse lakes and seas.',
        cost: 2000,
        prerequisites: [],
        effects: [], // Effect is handled in movement logic
        tier: 1,
    },
    'fishing': {
        id: 'fishing',
        name: 'Fishing',
        description: 'Develop nets and boats to gather food from water tiles. Provides +2 food per controlled water tile.',
        cost: 1500,
        prerequisites: ['agriculture'],
        effects: [{ type: TechEffectType.GlobalBonus, payload: { bonus: 'food_from_water', value: 2 } }],
        tier: 2,
    },
    'construction': {
        id: 'construction',
        name: 'Construction',
        description: 'Standardize building practices to create complex structures. Unlocks the Marketplace.',
        cost: 2500,
        prerequisites: ['agriculture'],
        effects: [{ type: TechEffectType.UnlockBuilding, payload: BuildingType.Marketplace }],
        tier: 2,
    },
    'forging': {
        id: 'forging',
        name: 'Forging',
        description: 'Harness the power of fire and metal to create powerful engines of war. Unlocks the Tank.',
        cost: 3000,
        prerequisites: ['mining'],
        effects: [{ type: TechEffectType.UnlockUnit, payload: UnitType.Tank }],
        tier: 2,
    },
    'mountaineering': {
        id: 'mountaineering',
        name: 'Mountaineering',
        description: 'Develop techniques and equipment to cross treacherous mountains.',
        cost: 2500,
        prerequisites: ['mining'],
        effects: [], // Effect is handled in movement logic
        tier: 2,
    },
};