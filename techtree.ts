import { Technology, TechEffectType, UnitType, BuildingType, CampBuildingType } from './types';

export const TECH_TREE: Record<string, Technology> = {
    // TIER 1
    'fire_mastery': {
        id: 'fire_mastery',
        name: 'Fire Mastery',
        description: 'Control of fire provides warmth, light, and a focal point for the community. Unlocks the Fire Pit and further innovations.',
        narrative: "For the first time, fire dances at the heart of your camp. Sparks rise into the night sky as warmth and smoke spread among the people. Where once darkness and cold drove them apart, now the tribe gathers around a single point of light.\n\nFire offers more than heat alone: it dries food, keeps predators at bay, and grants the tribe a new sense of unity. In the glow of the flames, you find stories, courage, and the first sparks of something greater.",
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
        narrative: "The fear of the lean season lessens. By digging pits and weaving racks, your people have learned to preserve today's bounty for tomorrow's needs. A full belly in winter is no longer a dream, but a plan. This newfound security allows for more than just survival; it allows for foresight, for stability, and for the first true settlements to take root.",
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
        narrative: "The whispers of the forest have been deciphered. Your people now understand the secrets of root and leaf, distinguishing potent remedies from deadly poisons. This knowledge gives birth to a new role: the Shaman, who can mend wounds and soothe sickness, wielding nature's power to push back against the fragility of life.",
        cost: 10,
        prerequisites: ['fire_mastery'],
        effects: [
            { type: TechEffectType.UnlockUnit, payload: UnitType.Shaman },
            { type: TechEffectType.UnlockBuilding, payload: CampBuildingType.HealersTent }
        ],
        tier: 2,
    },
    'obsidian_knapping': {
        id: 'obsidian_knapping',
        name: 'Obsidian Knapping',
        description: 'Master the art of shaping volcanic glass into deadly points and sharp edges. Unlocks Stone Warriors and the Toolmaker\'s Shelter.',
        narrative: "The black rock, once a mere curiosity, reveals its true nature. With careful, practiced strikes, your artisans learn to flake away its surface, creating edges sharper than any tooth or claw. This breakthrough arms your warriors with deadly new weapons and provides your craftsmen with superior tools, marking a new age of deadly innovation.",
        cost: 15,
        prerequisites: ['fire_mastery'],
        effects: [
            { type: TechEffectType.UnlockUnit, payload: UnitType.StoneWarrior },
            { type: TechEffectType.UnlockBuilding, payload: CampBuildingType.ToolmakersShelter }
        ],
        tier: 2,
    },
    // TIER 3
    'fishing': {
        id: 'fishing',
        name: 'Fishing',
        description: 'Develop nets and boats to gather food from water tiles. Provides +2 food per controlled water tile.',
        narrative: "The rhythmic lapping of waves is no longer a boundary, but an invitation. With woven nets and sharpened spears, your people turn to the rivers and shores, pulling shimmering sustenance from the depths. The water, once a barrier, is now a bountiful, flowing field, promising a new source of life.",
        cost: 1500,
        prerequisites: ['simple_storage'],
        effects: [{ type: TechEffectType.GlobalBonus, payload: { bonus: 'food_from_water', value: 2 } }],
        tier: 3,
    },
    'construction': {
        id: 'construction',
        name: 'Construction',
        description: 'Standardize building practices to create complex structures. Unlocks the Marketplace.',
        narrative: "The earth is reshaped. With a shared understanding of wood, stone, and balance, your people now raise structures that defy the wind and rain. Huts become houses, paths become roads, and the idea of a permanent city, a hub of trade and community, begins to solidify from mud and timber into reality.",
        cost: 2500,
        prerequisites: ['simple_storage'],
        effects: [{ type: TechEffectType.UnlockBuilding, payload: BuildingType.Marketplace }],
        tier: 3,
    },
    'forging': {
        id: 'forging',
        name: 'Forging',
        description: 'Harness the power of fire and metal to create powerful engines of war. Unlocks the Tank.',
        narrative: "The heart of the mountain is ripped open, and its stone gives way to a substance that can be shaped by fire and will. Metal, once a stubborn rock, now flows and hardens into tools of unprecedented strength and weapons of terrifying sharpness. The age of wood and stone is ending; the age of iron begins.",
        cost: 3000,
        prerequisites: ['simple_storage'],
        effects: [{ type: TechEffectType.UnlockUnit, payload: UnitType.Tank }],
        tier: 3,
    },
    'mountaineering': {
        id: 'mountaineering',
        name: 'Mountaineering',
        description: 'Develop techniques and equipment to cross treacherous mountains.',
        narrative: "The jagged peaks that once walled off the world are now a challenge to be met. With sturdy ropes and determined hearts, your explorers learn to read the stone, finding paths where none existed. The world expands, as the sky itself seems within reach from these new, breathtaking heights.",
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
        narrative: "The rhythm of the seasons is now bound to the will of your people. Instead of chasing food, you command it to grow. Fields are cleared, seeds are sown, and the land itself is tamed. This revolution in sustenance frees hands for new crafts and minds for new ideas, laying the foundation for true civilization.",
        cost: 1000,
        prerequisites: ['construction'],
        effects: [{ type: TechEffectType.UnlockBuilding, payload: BuildingType.Granary }],
        tier: 4,
    },
    'mining': {
        id: 'mining',
        name: 'Mining',
        description: 'Develop advanced mineral extraction methods. Gain +1 Gold from each controlled Hills tile.',
        narrative: "Your people delve into the darkness of the earth and emerge with glittering treasures. The veins of the world are laid bare, yielding not just stronger metals, but also the lustrous gold that will become the lifeblood of trade and power. Wealth is no longer measured in food alone, but in the shimmering contents of a coffer.",
        cost: 1200,
        prerequisites: ['mountaineering'],
        effects: [{ type: TechEffectType.GlobalBonus, payload: { bonus: 'gold_from_hills', value: 1 } }],
        tier: 4,
    },
    'sailing': {
        id: 'sailing',
        name: 'Sailing',
        description: 'Construct basic rafts and boats to traverse lakes and seas.',
        narrative: "The horizon calls. By harnessing the wind in woven sails, your people are no longer bound to the coastline. The vast, intimidating expanse of the sea becomes a highway to distant lands and untold riches. The world is suddenly much larger, and your place in it, much grander.",
        cost: 2000,
        prerequisites: ['fishing'],
        effects: [], // Effect is handled in movement logic
        tier: 4,
    },
};