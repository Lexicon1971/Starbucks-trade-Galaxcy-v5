
export type CommodityId = string;

export interface Commodity {
  name: string;
  icon: string;
  unitWeight: number;
  minPrice: number;
  maxPrice: number;
  rarity: number;
  description?: string;
}

export interface MarketItem {
  price: number;
  quantity: number;
  standardQuantity: number;
  depletionDays: number; // Track how long it has been empty
}

export type Market = Record<string, MarketItem>;

export interface CargoItem {
  quantity: number;
  averageCost: number;
}

export interface WarehouseItem {
  quantity: number;
  originalAvgCost: number;
  arrivalDay: number; // When does it arrive?
  isContractReserved?: boolean; // v5.8: Prevents auto-claim on arrival
}

// Map of VenueIndex -> CommodityName -> Item
export type Warehouse = Record<number, Record<string, WarehouseItem>>;

export interface LoanOffer {
  firmName: string;
  amount: number;
  interestRate: number;
}

export interface ActiveLoan {
  id: number;
  firmName: string;
  principal: number;
  currentDebt: number;
  interestRate: number;
  daysRemaining: number;
  originalDay: number;
}

export interface BankInvestment {
  id: number;
  amount: number;
  interestRate: number;
  daysRemaining: number; // 1 to 3
  maturityValue: number;
}

export interface Contract {
  id: number;
  firm: string;
  commodity: string;
  quantity: number;
  destinationIndex: number;
  reward: number;
  daysRemaining: number;
  penalty: number;
  status: 'active' | 'completed' | 'failed';
  dayCompleted?: number;
}

export interface LogEntry {
  id: number;
  message: string; // May contain (C) marker for coin
  type: 'info' | 'buy' | 'sell' | 'danger' | 'jump' | 'repair' | 'contract' | 'mining' | 'investment' | 'profit' | 'maintenance' | 'phase' | 'critical' | 'breach' | 'debt' | 'overdraft' | 'surrender' | 'combat_win' | 'combat_loss' | 'defense_win' | 'defense_loss' | 'evasion';
}

export interface DailyReport {
  events: string[];
  quirkyMessage?: { text: string, theme: string }; 
  totalHullDamage: number;
  totalLaserDamage: number;
  fuelUsed: number;
  lostItems: Record<string, number>;
  gainedItems: Record<string, number>;
  insuranceBought: boolean;
  insurancePayout?: number;
}

export interface Stats {
  largestSingleWin: number;
  largestSingleLoss: number;
}

export interface HighScore {
  name: string;
  score: number;
  days: number;
  date: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  type: 'laser' | 'defense' | 'utility' | 'scanner';
  level: number; // 1, 2, 3
  cost: number;
  description: string;
  owned: boolean;
  canBeDamaged?: boolean;
}

export interface PendingTrade {
    action: 'buy' | 'sell';
    commodity: Commodity;
    marketItem: MarketItem;
    ownedItem: CargoItem;
    quantity: number;
    tax: number;
}

export interface GameState {
  day: number;
  cash: number;
  currentVenueIndex: number;
  cargo: Record<string, CargoItem>;
  warehouse: Warehouse;
  cargoWeight: number;
  cargoCapacity: number;
  markets: Market[];
  shipHealth: number;
  laserHealth: number;
  
  // Equipment
  equipment: Record<string, boolean>; // map of EquipmentID -> owned
  
  activeLoans: ActiveLoan[];
  investments: BankInvestment[];
  loanOffers: LoanOffer[];
  activeContracts: Contract[];
  availableContracts: Contract[];
  loanTakenToday: boolean;
  
  venueTradeBans: Record<number, number>; // VenueIndex -> DaysRemaining banned

  messages: LogEntry[];
  stats: Stats;
  gameOver: boolean;
  gamePhase: 1 | 2 | 3 | 4;
  highScores: HighScore[];
  
  tutorialActive: boolean;
  tutorialFlags: Record<string, boolean>; // Tracks which features have been explained
  
  dailyTransactions: Record<string, number>; // Key: VenueIdx_CommodityName -> Count
  
  fomoDailyUse: { mesh: boolean, stims: boolean }; // Track daily fabrication

  // v5.7 Extensions
  warrantLevel: number; // Increases law enforcement encounter chance
  sectorPasses: string[]; // Grants free passage or bonuses in certain sectors
  isMutinyActive?: boolean; // Locks F.O.M.O. and Upgrades decks
  
  pendingTrade?: PendingTrade; // For tax confirmation
}

// Fix: Updated Encounter type union to include 'fuel_breach' and 'cargo_tax' instead of 'fuel_leak' and 'tax'
export interface Encounter {
  type: 'pirate' | 'accident' | 'derelict' | 'fuel_breach' | 'police' | 'mutiny' | 'cargo_tax' | 'structural' | 'visa_audit' | 'scam_customs' | 'god_license' | 'rust_rats';
  title: string;
  description: string;
  riskDamage: number;
  demandAmount?: number; // For pirates/police/bribes
  itemLoss?: string; // For accidents/confiscations
  capacityLoss?: number; // For structural
  targetItem?: string; // For specific failures
}
