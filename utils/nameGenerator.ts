
export const generateArmyName = (): string => {
    const prefixes = [
        "Raging", "Fearless", "Wood", "Steppe", "Black",
        "Iron", "Stone", "Silent", "Sun", "Moon", "Dire"
    ];

    const suffixes = [
        "Bulls", "Lions", "Bears", "Horses", "Wolfs",
        "Ravens", "Serpents", "Stalkers", "Guard", "Sworn"
    ];

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    if (Math.random() < 0.5) {
        return `${prefix} ${suffix}`;
    } else {
        return `${suffix} of the ${prefix}`;
    }
};
