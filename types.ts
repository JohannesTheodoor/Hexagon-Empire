export enum TerrainType {
  Plains,
  Forest,
  Hills,
  Mountains,
  Desert,
  Lake,
  Swamp,
  Steppe,
  Volcanic,
  Sea,
}

export interface TerrainDefinition {
  name: string;
  color: string;
  movementCost: number;
  defenseBonus: number;
  maxFood: number;
  foodRegrowth: number;
  maxWood: number;
  woodRegrowth: number;
  maxStone: number; // Depletable
  maxHides: number;
  hidesRegrowth: number;
  maxObsidian: number; // Depletable
  diseaseRisk: 'Low' | 'Medium' | 'High';
  requiredTech?: string;
}

export enum UnitType {
    Infantry = 'Infantry',
    Tank = 'Tank',
    Tribesman = 'Tribesman',
    Tribeswoman = 'Tribeswoman',
    Child = 'Child',
    Shaman = 'Shaman',
}

export enum UnitSize {
    Small,
    Large,
}

export enum Gender {
    Male,
    Female,
    None,
}

export type ResourceCost = Partial<Record<'gold' | 'wood' | 'stone' | 'hides' | 'obsidian', number>>;

export interface UnitDefinition {
    movement: number;
    cost: ResourceCost;
    productionCost: number;
    attack: number;
    defense: number;
    maxHp: number;
    size: UnitSize;
    foodGatherRate: number;
    foodConsumption: number;
    productionYield: number;
    carryCapacity: number; // General resource capacity contribution
    foodCarryCapacity: number;
    researchYield?: number;
    healingBonus?: number;
    requiredTech?: string;
    gender?: Gender;
}

export enum BuildingType {
    Marketplace = 'Marketplace',
    Granary = 'Granary',
}

export enum CampBuildingType {
    Palisade = 'Palisade',
    ScoutTent = 'Scout Tent',
    ForagingPost = 'Foraging Post',
    StoragePit = 'Storage Pit',
    FirePit = 'Fire Pit',
    DryingRack = 'Drying Rack',
    HealersTent = "Healer's Tent",
    Tent = 'Tent',
}

export interface BuildingDefinition {
    name: string;
    description: string;
    cost: ResourceCost;
    productionCost: number;
    goldBonus?: number;
    foodBonus?: number;
    foodStorageBonus?: number;
    storageBonus?: number;
    requiredTech?: string;
}

export interface CampBuildingDefinition {
    name: string;
    description: string;
    cost: ResourceCost;
    productionCost: number;
    defenseBonus?: number;
    visionBonus?: number;
    foodGatherBonus?: number;
    storageBonus?: number;
    foodStorageBonus?: number;
    researchBonus?: number;
    culturePointBonus?: number;
    healingBonus?: number;
    diseaseRiskReduction?: number;
    requiredTech?: string;
    housingCapacity?: number;
}

export interface BuildQueueItem {
    id: string;
    type: 'unit' | 'building';
    itemType: UnitType | BuildingType | CampBuildingType;
    productionCost: number;
    progress: number;
}

export interface AxialCoords {
  q: number;
  r: number;
}

export interface Hex extends AxialCoords {
  terrain: TerrainType;
  armyId?: string;
  cityId?: string;
  currentFood: number;
  currentWood: number;
  currentStone: number;
  currentHides: number;
  currentObsidian: number;
  wasStarving?: boolean;
  wasSick?: boolean;
  armyPresenceTurns?: number;
}

export interface Unit {
  id: string;
  type: UnitType;
  ownerId: number;
  hp: number;
  foodStored: number;
  age?: number;
  gender: Gender;
}

export interface SicknessRiskDetails {
    baseTerrain: number;
    stagnation: number;
    overcrowding: number;
    // Reductions
    healersTentReduction: number;
    shamanFlatReduction: number;
}


export interface Army {
  id: string;
  ownerId: number;
  position: AxialCoords;
  unitIds: string[];
  movementPoints: number;
  maxMovementPoints: number;
  name?: string;
  foundingTurn: number;
  isCamped?: boolean;
  controlledTiles?: string[];
  isConnectedToNetwork?: boolean;
  // New properties for when isCamped is true
  level?: number;
  population?: number;
  buildings?: CampBuildingType[];
  tentLevel?: number;
  buildQueue?: BuildQueueItem[];
  xp?: number;
  xpToNextLevel?: number;
  productionFocus?: number; // 0-100, only when isCamped
  resourceFocus?: { // only when isCamped
      wood: boolean;
      stone: boolean;
      hides: boolean;
      obsidian: boolean;
  };
  localResources: ResourceCost;
  storageCapacity: number;
  food?: number;
  foodStorageCapacity?: number;
  sicknessRisk?: number; // Current percentage risk of disease
  sicknessRiskDetails?: SicknessRiskDetails;
}

export interface City {
  id:string;
  ownerId: number;
  position: AxialCoords;
  name: string;
  hp: number;
  maxHp: number;
  population: number; // This is now just the count of units in garrison
  food: number;
  foodStorageCapacity: number;
  level: number;
  buildings: BuildingType[];
  buildQueue: BuildQueueItem[];
  garrison: string[];
  controlledTiles: string[];
  pendingInfluenceExpansions: number;
  nextPopulationMilestone: number;
  productionFocus: number; // 0-100
  resourceFocus: {
      wood: boolean;
      stone: boolean;
      hides: boolean;
      obsidian: boolean;
  };
  isConnectedToNetwork: boolean;
  localResources: ResourceCost;
  storageCapacity: number;
  sicknessRisk?: number;
  sicknessRiskDetails?: SicknessRiskDetails;
}

export interface PlayerCulture {
    nomadism: number; // -100 (Settled) to 100 (Nomadic)
    genderRoles: number; // -100 (Patriarchal) to 100 (Matriarchal)
    militarism: number; // -100 (Defensive) to 100 (Aggressive)
    unlockedAspects: string[];
}

export interface Player {
  id: number;
  name: string;
  color: string;
  gold: number;
  researchPoints: number; // Unassigned research points
  culturePoints: number;
  unlockedTechs: string[];
  currentResearchId: string | null; // The ID of the tech currently being researched
  researchProgress: number; // How many points have been invested in the current research
  culture: PlayerCulture;
  actionsThisTurn: {
      attacks: number;
  };
}

export interface GameState {
  hexes: Map<string, Hex>;
  units: Map<string, Unit>;
  cities: Map<string, City>;
  armies: Map<string, Army>;
  players: Player[];
  currentPlayerId: number;
  turn: number;
  mapWidth: number;
  mapHeight: number;
}

export interface ArmyDeploymentInfo {
    sourceId: string;
    sourceType: 'city' | 'army';
    unitsToMove: { unitType: UnitType; count: number }[];
}


// Tech Tree Types
export enum TechEffectType {
    UnlockUnit,
    UnlockBuilding,
    GlobalBonus,
}

export interface TechEffect {
    type: TechEffectType;
    payload: any; // e.g., UnitType, BuildingType, or bonus details { bonus: 'gold_from_hills', value: 1 }
}

export interface Technology {
    id: string;
    name: string;
    description: string;
    cost: number;
    prerequisites: string[];
    effects: TechEffect[];
    tier: number;
}

// Culture Types
export enum CultureAxis {
    Nomadism = 'nomadism',
    GenderRoles = 'genderRoles',
    Militarism = 'militarism',
}

export interface CulturalAspectUnlockCondition {
    axis: CultureAxis;
    threshold: number; // e.g., > 50 or < -50
}

export interface CulturalAspect {
    id: string;
    name: string;
    description: string;
    unlockConditions: CulturalAspectUnlockCondition[];
}