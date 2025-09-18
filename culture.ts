import { CulturalAspect, CultureAxis } from './types';

export const CULTURAL_ASPECTS: Record<string, CulturalAspect> = {
    'settled_tradition': {
        id: 'settled_tradition',
        name: 'Settled Traditions',
        description: 'Your people value stability and permanent homes. City defense is increased.',
        unlockConditions: [{ axis: CultureAxis.Nomadism, threshold: -50 }],
    },
    'nomadic_heritage': {
        id: 'nomadic_heritage',
        name: 'Nomadic Heritage',
        description: 'Your people are always on the move. Armies require less food.',
        unlockConditions: [{ axis: CultureAxis.Nomadism, threshold: 50 }],
    },
    'patriarchal_authority': {
        id: 'patriarchal_authority',
        name: 'Patriarchal Authority',
        description: 'Male leaders dominate society, leading to more effective military units.',
        unlockConditions: [{ axis: CultureAxis.GenderRoles, threshold: -50 }],
    },
    'matriarchal_wisdom': {
        id: 'matriarchal_wisdom',
        name: 'Matriarchal Wisdom',
        description: 'Female leaders guide your people, leading to faster research and growth.',
        unlockConditions: [{ axis: CultureAxis.GenderRoles, threshold: 50 }],
    },
    'defensive_posture': {
        id: 'defensive_posture',
        name: 'Defensive Posture',
        description: 'A focus on defense makes your territory harder to conquer.',
        unlockConditions: [{ axis: CultureAxis.Militarism, threshold: -50 }],
    },
    'aggressive_expansion': {
        id: 'aggressive_expansion',
        name: 'Aggressive Expansion',
        description: 'An aggressive mindset grants bonuses to your attacking armies.',
        unlockConditions: [{ axis: CultureAxis.Militarism, threshold: 50 }],
    },
};