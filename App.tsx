/**
 * ============================================================================
 * PROJECT: STAR BUCKS TRADE EMPIRE 5
 * VERSION: v5.9.4 (Senior Analyst Elite Mining Patch)
 * ============================================================================
 * 
 * FEATURE MANIFEST / INTEGRITY CHECKLIST:
 * [✓] CORE: Market Evolution (Supply/Demand, Phase Multipliers)
 * [✓] CORE: Day/Phase Cycling (Goal Thresholds, Phase 4 Overtime)
 * [✓] BANKING: Multiple Loans (Limit 3), Term Deposits, Overdraft Interest (15%)
 * [✓] LOGISTICS: Private Shipping, Warehouse Storage (3-day Seizure), Auto-Claim
 * [✓] SHOP: Equipment Upgrades (Lasers, Shields, Cannons, Cargo Expansion)
 * [✓] TRAVEL: Integrated C.A.T. Station (Main Terminal), Vertical Toggles
 * [✓] FOMO: Daily Batch Fabrication (Mesh, Stim-Packs), 7-Digit Capacity
 * [✓] COMMS: G.I.G.O System Logging, Quirky News Updates
 * [✓] DATA: Firebase/Local Persistence, Legendary Hall of Fame
 * [✓] UI: Terminal-Integrated Windows (v5.6.2 Fixes)
 * [✓] v5.7.0: OVERHAULED Chance Encounters. FIXED Hull/Cargo Integrity logic.
 *             FIXED Insurance Payout (95% via E.X.C.E.S.S.). ADDED Warrants & Passes.
 * [✓] v5.8.0: FIXED Intel Exit button. ADDED Intel Stock/Storage info. 
 *             FIXED $B logo markers. LOCKED contract shipments in storage.
 * [✓] v5.9.0: MOVED Legends to Header (Gold Trophy). ADDED Wiki Tab (Sector Codex).
 * [✓] v5.9.3: REWORKED Mining (3x cost, health-based yield). ADDED Voice Synth.
 *             FIXED 'boolean is not defined' error in state initialization.
 * [✓] v5.9.4: REFINED HUD layout (shifted items closer). BALANCED Mining sweet-spot.
 *             FORCED Overload toggle off if laser disabled.
 * 
 * ============================================================================
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  COMMODITIES, VENUES, BASE_DISTANCE_MATRIX, LOAN_FIRMS, SHOP_ITEMS, CONTRACT_FIRMS,
  INITIAL_CARGO_CAPACITY, BASE_MAX_CARGO_CAPACITY, CARGO_UPGRADE_AMOUNT, CARGO_UPGRADE_COST,
  TONS_UNIT, CURRENCY_UNIT, COIN_MARKER, FUEL_NAME, NUTRI_PASTE_NAME, H2O_NAME, POWER_CELL_NAME, MESH_NAME,
  GOAL_PHASE_1_DAYS, GOAL_PHASE_1_AMOUNT, GOAL_PHASE_2_DAYS, GOAL_PHASE_2_AMOUNT, GOAL_PHASE_3_DAYS, GOAL_PHASE_3_AMOUNT, GOAL_OVERTIME_DAYS,
  CONTRACT_LIMIT_P1, CONTRACT_LIMIT_P2, CONTRACT_LIMIT_P3, TRADE_BAN_DURATION,
  REPAIR_COST, REPAIR_INCREMENT, MAX_REPAIR_HEALTH, LOAN_REPAYMENT_DAYS, LASER_REPAIR_COST, QUIRKY_MESSAGES_DB, TUTORIAL_QUOTES,
  MINING_OVERLOAD_YIELD_MULT, MINING_OVERLOAD_RISK_MULT
} from './constants.ts';
import { GameState, Market, LoanOffer, LogEntry, DailyReport, Commodity, HighScore, CargoItem, EquipmentItem, Encounter, ActiveLoan, Contract, WarehouseItem, PendingTrade, Warehouse, MarketItem } from './types.ts';
import { Building2, Rocket, XCircle, Trophy, Zap, Truck, Shield, Wrench, Fuel, Crosshair, Heart, Swords, Skull, Box, AlertTriangle, Radar, ClipboardList, Radio, HelpCircle, Warehouse as WarehouseIcon, RefreshCw, Factory, Map as MapIcon, BarChart3, PowerOff, Droplets, Pill, Save, Volume2, VolumeX, Menu, Anchor, Cpu, Hourglass, ToggleLeft, ToggleRight, Info, LineChart, ChevronUp, ChevronDown, Circle, CheckCircle2, BookOpen } from 'lucide-react';

// --- BLOCK 1: EXTERNAL SERVICES (FIREBASE & AUDIO) --------------------------

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
  storageBucket: "PROJECT_ID.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

let db: any = null;
try {
  if (firebaseConfig.projectId !== "PROJECT_ID") {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (e) {
  console.log("Firebase fallback.");
}

class SoundEngine {
    private ctx: AudioContext | null = null;
    private masterGain: GainNode | null = null;
    public isMuted: boolean = false;
    private voiceInterval: any = null;

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.masterGain.gain.value = 0.6; 
            this.startAmbience();
        } else if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.6, this.ctx!.currentTime, 0.1);
        }
        if (this.isMuted) {
            window.speechSynthesis.cancel();
        }
        return this.isMuted;
    }

    startAmbience() {
        if (this.voiceInterval) clearInterval(this.voiceInterval);
        this.voiceInterval = setInterval(() => {
            if(!this.isMuted && Math.random() < 0.5) this.playComputerNoise();
        }, 12000);
    }

    playComputerNoise() {
        if (this.isMuted || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, t);
        for(let i=0; i<6; i++) {
            osc.frequency.linearRampToValueAtTime(800 + Math.random() * 1000, t + (i*0.05));
        }
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.3);

        const bSize = this.ctx.sampleRate * 0.5;
        const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < bSize; i++) d[i] = (Math.random() * 2 - 1) * 0.1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = b;
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.02, t);
        noiseGain.gain.linearRampToValueAtTime(0, t + 0.2);
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.masterGain);
        noise.start(t);
    }

    play(type: 'click' | 'coin' | 'warp' | 'error' | 'success' | 'alarm') {
        if (this.isMuted || !this.ctx || !this.masterGain) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.masterGain);

        switch (type) {
            case 'click':
                osc.type = 'square';
                osc.frequency.setValueAtTime(880, t); 
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                osc.start(t);
                osc.stop(t + 0.1);
                break;
            case 'coin':
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, t);
                osc.frequency.setValueAtTime(1800, t + 0.08); 
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
                osc.start(t);
                osc.stop(t + 0.4);
                break;
            case 'error':
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(110, t);
                osc.frequency.linearRampToValueAtTime(80, t + 0.3);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;
            case 'warp':
                const bSize = this.ctx.sampleRate * 2;
                const b = this.ctx.createBuffer(1, bSize, this.ctx.sampleRate);
                const d = b.getChannelData(0);
                for (let i = 0; i < bSize; i++) d[i] = Math.random() * 2 - 1;
                const noise = this.ctx.createBufferSource();
                noise.buffer = b;
                const nf = this.ctx.createBiquadFilter();
                nf.type = 'lowpass';
                nf.frequency.setValueAtTime(100, t);
                nf.frequency.exponentialRampToValueAtTime(5000, t + 1.5);
                const ng = this.ctx.createGain();
                ng.gain.setValueAtTime(0.3, t);
                ng.gain.linearRampToValueAtTime(0, t + 2);
                noise.connect(nf);
                nf.connect(ng);
                ng.connect(this.masterGain);
                noise.start(t);
                break;
            case 'success':
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, t); 
                osc.frequency.setValueAtTime(659.25, t + 0.1); 
                osc.frequency.setValueAtTime(783.99, t + 0.2); 
                gain.gain.setValueAtTime(0.05, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.5);
                osc.start(t);
                osc.stop(t + 0.5);
                break;
            case 'alarm':
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, t);
                osc.frequency.linearRampToValueAtTime(1200, t + 0.15);
                osc.frequency.linearRampToValueAtTime(800, t + 0.3);
                gain.gain.setValueAtTime(0.1, t);
                gain.gain.linearRampToValueAtTime(0, t + 0.3);
                osc.start(t);
                osc.stop(t + 0.3);
                break;
        }
    }
}

const SFX = new SoundEngine();

// -- RETRO SYNTH VOICE ENGINE --
const speakRetro = (text: string) => {
    if (SFX.isMuted) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.pitch = 0.5;
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    // Attempt to pick a robotic sounding voice if available
    const voices = window.speechSynthesis.getVoices();
    const roboticVoice = voices.find(v => v.name.toLowerCase().includes('google uk english male') || v.name.toLowerCase().includes('robot'));
    if (roboticVoice) utterance.voice = roboticVoice;
    window.speechSynthesis.speak(utterance);
};

// --- BLOCK 2: UTILITIES & FORMATTERS -----------------------------------------

const formatCurrencyLog = (amount: number) => {
  return `${COIN_MARKER} ${formatCompactNumber(amount)}`;
};

const formatCompactNumber = (num: number, useMForMillions: boolean = false) => {
    if (Math.abs(num) >= 1000000000000) return (num / 1000000000000).toFixed(1).replace(/\.0$/, '') + 'T';
    if (Math.abs(num) >= 1000000000) return (num / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (Math.abs(num) >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + (useMForMillions ? 'M' : 'M');
    if (Math.abs(num) >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return num.toLocaleString();
};

const getFuelCost = (from: number, to: number, weight: number, phase: number) => {
  const distance = BASE_DISTANCE_MATRIX[from][to];
  if (phase === 1) return distance * 2;
  const fuelPerDist = Math.max(1, Math.ceil(weight / 1000));
  return fuelPerDist * distance;
};

const getCargoValue = (cargo: Record<string, CargoItem>, currentMarket: Market) => {
  return Object.entries(cargo).reduce((sum, [name, item]) => sum + (item.quantity * (currentMarket[name]?.price || 0)), 0);
};

const getLogColorClass = (type: LogEntry['type']) => {
    switch (type) {
        case 'critical':
        case 'breach':
        case 'debt':
        case 'danger': 
        case 'overdraft':
        case 'surrender':
        case 'combat_win':
        case 'combat_loss':
        case 'defense_win':
        case 'defense_loss': return 'text-red-400 font-bold';
        case 'mining': return 'text-cyan-400';
        case 'investment':
        case 'profit': return 'text-green-400';
        case 'maintenance': 
        case 'evasion': return 'text-orange-400';
        case 'contract':
        case 'buy': return 'text-blue-400';
        case 'phase': return 'text-purple-400';
        case 'jump': return 'text-yellow-400';
        case 'repair': return 'text-lime-400';
        case 'sell': return 'text-green-400';
        default: return 'text-gray-400';
    }
};

const getReportEventColorClass = (e: string) => {
    if (e.includes('WARNING') || e.includes('CRITICAL') || e.includes('DEFAULT') || e.includes('BREACH') || e.includes('LOSS') || e.includes('TRAP') || e.includes('OVERDRAFT') || e.includes('SURRENDER') || e.includes('Laser Overload') || e.includes('MATURITY') || e.includes('P.I.G.S') || e.includes('SEIZURE')) return 'text-red-400 font-bold';
    if (e.includes('MINING') || e.includes('FABRICATION')) return 'text-cyan-400';
    if (e.includes('INVESTMENT') || e.includes('PROFIT') || e.includes('SALVAGE')) return 'text-green-400';
    if (e.includes('CONTRACT') || e.includes('ARRIVAL')) return 'text-blue-400';
    if (e.includes('PHASE')) return 'text-purple-400 font-bold';
    if (e.includes('MAINTENANCE')) return 'text-orange-400';
    return 'text-gray-300';
};

// --- BLOCK 3: ATOMIC UI COMPONENTS ------------------------------------------

const StarCoin = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block align-middle mb-0.5 mx-0.5">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#fbbf24" stroke="#b45309" strokeWidth="1.5" />
    <text x="12" y="17.5" fontSize="13" fontWeight="900" textAnchor="middle" fill="#000" fontFamily="sans-serif">B</text>
  </svg>
);

const PriceDisplay = ({ value, colored = false, size, compact = false }: { value: number, colored?: boolean, size?: string, compact?: boolean }) => (
  <span className={`font-mono font-bold whitespace-nowrap inline-flex items-center ${size || ''} ${colored ? (value >= 0 ? 'text-green-400' : 'text-red-400') : ''}`}>
    <StarCoin size={size && size.includes('text-xs') ? 14 : (size && size.includes('text-sm') ? 16 : 20)} /> {compact ? formatCompactNumber(Math.round(Math.abs(value))) : Math.round(Math.abs(value)).toLocaleString()} {value < 0 ? '(DR)' : ''}
  </span>
);

const VerticalToggle = ({ checked, onChange, disabled, label, rightContent }: { checked: boolean, onChange: (e: any) => void, disabled?: boolean, label?: string, rightContent?: React.ReactNode }) => (
    <div className={`flex items-center space-x-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
        {label && <span className="text-[9px] text-gray-400 uppercase font-black text-left leading-tight w-20">{label}</span>}
        <div 
            onClick={() => !disabled && onChange({ target: { checked: !checked } })} 
            className={`relative w-5 h-10 rounded-lg cursor-pointer border-2 border-gray-700 bg-gray-900 overflow-hidden shadow-inner transition-all ${checked ? 'border-green-500/50' : 'border-red-500/50'}`}
        >
            <div className={`absolute left-0 w-full h-1/2 flex items-center justify-center transition-opacity ${checked ? 'bg-green-600 opacity-100' : 'opacity-0'}`}>
                <ChevronUp size={10} className="text-white" />
            </div>
            <div className={`absolute bottom-0 left-0 w-full h-1/2 flex items-center justify-center transition-opacity ${checked ? 'opacity-0' : 'bg-red-600 opacity-100'}`}>
                <ChevronDown size={10} className="text-white" />
            </div>
            {/* Handle/Knob */}
            <div className={`absolute left-0 w-full h-1/3 bg-gray-600 border-y border-gray-400 transition-all duration-300 z-10`} style={{ top: checked ? '0%' : '66.6%' }}></div>
        </div>
        {rightContent && <div className="ml-1">{rightContent}</div>}
    </div>
);

const renderLogMessage = (msg: string) => {
    const markerRegex = /\([Cc]\)/g;
    const parts = msg.split(markerRegex);
    if (parts.length === 1) return msg;
    
    return (
        <span>
            {parts.map((part, i) => (
                <React.Fragment key={i}>
                    {part}
                    {i < parts.length - 1 && <StarCoin size={14} />}
                </React.Fragment>
            ))}
        </span>
    );
};

const StatusDial = ({ value, max, icon: Icon, color, label, isPercent }: { value: number, max: number, icon: any, color: string, label: string, isPercent?: boolean }) => {
  const percentage = Math.min(Math.max(value / max, 0), 1) * 100;
  
  return (
    <div className="flex flex-col items-center mx-1 md:mx-1 p-1 bg-black/40 rounded border border-gray-700 w-16 md:w-20">
        <div className="flex justify-between items-center w-full mb-0.5">
            <Icon size={12} className={color} />
            <span className={`text-[8px] md:text-[10px] font-bold ${color}`}>{value}{isPercent?'%':''}</span>
        </div>
        <div className="w-full bg-gray-800 rounded-full h-1 mb-0.5 overflow-hidden">
            <div className={`h-1 rounded-full ${color.replace('text-', 'bg-')}`} style={{ width: `${percentage}%` }}></div>
        </div>
        <div className="text-[7px] md:text-[8px] text-white uppercase tracking-wider font-bold">{label}</div>
    </div>
  );
};

// --- BLOCK 4: MAIN APP COMPONENT & ENGINE ------------------------------------

export default function App() {
  
  // -- STATE: CORE GAME -------------------------------------------------------
  const [state, setState] = useState<GameState | null>(null);
  const [modal, setModal] = useState<{ type: string, data: any, color?: string }>({ type: 'none', data: null });
  const [isMuted, setIsMuted] = useState(false);
  const commsContainerRef = useRef<HTMLDivElement>(null);
  const [hasSave, setHasSave] = useState(false);
  
  // -- STATE: INPUTS & UI -----------------------------------------------------
  const [buyQuantities, setBuyQuantities] = useState<Record<string, string>>({});
  const [sellQuantities, setSellQuantities] = useState<Record<string, string>>({});
  const [shippingQuantities, setShippingQuantities] = useState<Record<string, string>>({});
  const [shippingDestinations, setShippingDestinations] = useState<Record<string, string>>({}); 
  const [shippingSource, setShippingSource] = useState<Record<string, { type: 'cargo' | 'warehouse', venueIdx: number }>>({}); 
  const [shippingTiers, setShippingTiers] = useState<Record<string, string>>({});
  const [logisticsTab, setLogisticsTab] = useState<'shipping' | 'contracts' | 'warehouse'>('contracts');
  const [highScoreName, setHighScoreName] = useState('');
  const [highlightShippingItem, setHighlightShippingItem] = useState<string | null>(null);
  const [stagedContract, setStagedContract] = useState<Contract | null>(null);
  const [shippingSuccessMessage, setShippingSuccessMessage] = useState<string | null>(null);
  const [cargoUpgradeQty, setCargoUpgradeQty] = useState<string>('1');
  const [fomoQty, setFomoQty] = useState<string>(''); 
  const [fomoStimQty, setFomoStimQty] = useState<string>(''); 
  const [claimQuantities, setClaimQuantities] = useState<Record<string, string>>({});
  const [bankInvestAmount, setBankInvestAmount] = useState<string>('');
  const [bankInvestTerm, setBankInvestTerm] = useState<string>('1');
  
  // -- STATE: v5.1 UI Toggles
  const [priorityAcknowledged, setPriorityAcknowledged] = useState(false);

  // -- STATE: TRAVEL CONFIG ---------------------------------------------------
  const [travelConfig, setTravelConfig] = useState({
      insurance: false,
      mining: false,
      overload: false,
      invest95: false
  });

  // -- LOGIC: HELPERS ---------------------------------------------------------

  const loadHighScores = async () => {
    let scores: HighScore[] = [];
    if (db) {
      try {
        const q = query(collection(db, "highscores"), orderBy("score", "desc"), limit(10));
        const s = await getDocs(q);
        s.forEach((doc) => scores.push(doc.data() as HighScore));
      } catch (e) {}
    }
    if (scores.length === 0) {
      const local = localStorage.getItem('sbe_highscores');
      if (local) scores = JSON.parse(local);
    }
    return scores.length ? scores : [
      { name: "Han S.", score: 5000000000, days: 35, date: "20XX" },
      { name: "Jean-Luc", score: 2500000000, days: 35, date: "2364" },
      { name: "Ellen Ripley", score: 1000000000, days: 35, date: "2122" },
      { name: "Starbuck", score: 500000000, days: 35, date: "2003" },
      { name: "Mal Reynolds", score: 250000000, days: 35, date: "2517" },
      { name: "Korben Dallas", score: 100000000, days: 30, date: "2263" },
      { name: "Dave Bowman", score: 50000000, days: 20, date: "2001" },
      { name: "Sarah Connor", score: 10000000, days: 15, date: "1984" },
      { name: "Rick Deckard", score: 5000000, days: 10, date: "2019" },
      { name: "Arthur Dent", score: 42000, days: 4, date: "1979" }
    ];
  };

  const getInitialState = (startingCash: number, startIdx: number, markets: Market[], initialLoan: any, initialCargo: any, cargoWeight: number) => {
    return {
        day: 1,
        cash: startingCash,
        currentVenueIndex: startIdx,
        cargo: initialCargo,
        warehouse: {},
        cargoWeight,
        cargoCapacity: INITIAL_CARGO_CAPACITY,
        markets,
        shipHealth: 100,
        laserHealth: 100,
        equipment: {}, 
        activeLoans: [initialLoan],
        investments: [],
        loanOffers: [], 
        activeContracts: [],
        availableContracts: [], 
        loanTakenToday: false,
        venueTradeBans: {},
        messages: [
          { id: 1, message: `System Init v5.9.4 (Senior Analyst Patch)... Welcome aboard, Captain.`, type: 'info' },
          { id: 2, message: `Widow's Gift Sent: ${formatCurrencyLog(30000)}. Loan secured from ${initialLoan.firmName}.`, type: 'debt' },
          { id: 3, message: `System Status: S.H.A.N.E. Online.`, type: 'info' }
        ],
        gameOver: false,
        gamePhase: 1,
        stats: { largestSingleWin: 0, largestSingleLoss: 0 },
        highScores: [], 
        tutorialActive: true,
        tutorialFlags: { asked_intro: true },
        dailyTransactions: {},
        fomoDailyUse: { mesh: false, stims: false }, // Fixed 'boolean' syntax error
        warrantLevel: 0,
        sectorPasses: []
    } as GameState;
  };

  const initGame = async (checkSave: boolean = true) => {
    const markets: Market[] = VENUES.map((_, idx) => generateMarket(true, idx === 0));
    const startIdx = Math.floor(Math.random() * VENUES.length);
    markets[startIdx] = generateMarket(true, true);
    
    const initialCargo: Record<string, CargoItem> = {};
    let cargoWeight = 0;
    
    const startingCash = -5000; 
    const randomBank = LOAN_FIRMS[Math.floor(Math.random() * LOAN_FIRMS.length)];
    const initialLoan = { id: Date.now(), firmName: randomBank.name, principal: 30000, currentDebt: 30000, interestRate: randomBank.baseRate, daysRemaining: LOAN_REPAYMENT_DAYS, originalDay: 1 };
    
    const baseState = getInitialState(startingCash, startIdx, markets, initialLoan, initialCargo, cargoWeight);
    baseState.loanOffers = generateLoanOffers(baseState.gamePhase);
    baseState.availableContracts = generateContracts(baseState.currentVenueIndex, baseState.day, baseState.gamePhase, {}, [], []);

    baseState.tutorialActive = true;
    baseState.tutorialFlags = { asked_intro: true };

    const scores = await loadHighScores();
    baseState.highScores = scores;

    // Check for save existence to update indicator
    const saveString = localStorage.getItem('sbe_savegame');
    setHasSave(!!saveString);

    if (checkSave && saveString) {
        try {
            const savedData = JSON.parse(saveString);
            const mergedState = {
                ...baseState,
                ...savedData,
                tutorialFlags: savedData.tutorialFlags || { asked_intro: true },
                fomoDailyUse: savedData.fomoDailyUse || { mesh: false, stims: false },
                equipment: savedData.equipment || {},
                warrantLevel: savedData.warrantLevel || 0,
                sectorPasses: savedData.sectorPasses || []
            };
            setState(mergedState);
            setModal({ type: 'load_save', data: null });
            return;
        } catch(e) {
            console.error("Save load failed", e);
        }
    }

    setState(baseState);
    setModal({ type: 'welcome', data: null });
  };

  useEffect(() => { 
      initGame(true); 
  }, []);
  
  useEffect(() => { runTutorialCheck(); }, [state?.day, modal.type]);

  // -- LOGIC: PERSISTENCE & TUTORIAL ------------------------------------------

  const saveAndExit = (e?: React.MouseEvent) => {
      if (e) {
          e.preventDefault();
          e.stopPropagation();
      }
      if (state) {
          try {
              localStorage.setItem('sbe_savegame', JSON.stringify(state));
              setHasSave(true);
              SFX.play('success');
              setModal({ type: 'save_confirm', data: null });
          } catch (e) {
              console.error("Save failed", e);
              SFX.play('error');
              setModal({type:'message', data: "Neural Uplink Failed: Local Storage limit exceeded."});
          }
      }
  };

  const loadSavedGame = () => {
      SFX.init(); 
      setModal({ type: 'none', data: null });
      log('System: Save game loaded successfully.', 'info');
      SFX.play('success');
  };

  const startNewGame = () => {
      setPriorityAcknowledged(false);
      SFX.init();
  };

  const runTutorialCheck = () => {
     if (!state) return;
     
     if (state.day === 5 && !state.tutorialFlags['day5_save_msg'] && modal.type === 'none') {
         setTimeout(() => {
             setState(prev => prev ? ({...prev, tutorialFlags: {...prev.tutorialFlags, day5_save_msg: true}}) : null);
             setModal({type:'message', data: "Captain, we have added an option to save and continue your progress. Select the Save icon in the HUD.", color: 'text-yellow-400'});
         }, 1000);
     }
     if (!state.tutorialActive) return;
     if (state.day === 2 && !state.tutorialFlags['day2_mining'] && modal.type === 'none') {
         setTimeout(() => {
             setState(prev => prev ? ({...prev, tutorialFlags: {...prev.tutorialFlags, day2_mining: true}}) : null);
             setModal({type:'message', data: `Reminder: Free resources are floating in space! Buy a Mining Laser (Upgrades Deck) and enable 'Mining Run' in C.A.T. Station. Mine, mine, mine!`, color: 'text-yellow-400'});
         }, 1000);
     }
  };

  const handleFeatureClick = (feature: string, callback: () => void) => {
      SFX.play('click');
      if (state && state.tutorialActive && !state.tutorialFlags[feature]) {
          let title = "", text = "";
          if (feature === 'shop') { title = "Fixathing'u'ma Jig Deck"; text = "Buy, install, and upgrade the Mining Laser. \nRepair your Ship Hull and Laser.\nAcquire: Shields, Cannon and scanner. \nAnd expand your cargo Bay to the Max using Z@onflex Weave Mesh (to be bought at the market) before expanding.\n\nPro tip: Captain, you can increase the Cargo Bay even further every time you reach a new phase."; }
          else if (feature === 'banking') { title = "I.B.A.N.K. Hub"; text = "The Hub to manage all your Starbucks Financial needs. Take advantage of a new loan , 1 per institution and 1 new one per day for a total of 3, (Giving out further credit at that point would be irresponsible).\n\nYou can also invest idle cash in Term Deposits for safe returns with very favourable interest rates, but only if you are debt-free.\n\nPro tip: Captain, please avoid defaults! and rather take another loan if possible, as landing yourself in the negative will incur a 15% per day charge."; }
          else if (feature === 'travel') { title = "C.A.T. Station"; text = "Chart and Travel. Check 'Risk' levels. High risk = Pirates/Hazards. Ensure you have Fuel, Cash if you want to insure your commodities in transit, and please take advantage of our \"Before you Jump\" offer of depositing 95% of your $tarBucks in the bank at 5% per day (only available if debt fee, those are the terms and they always apply).\n\nPro-Tip: Captain, fuel costs increase significantly with Phase advancement and heavy cargo loads (1 Fuel per 1000T)."; }
          else if (feature === 'shipping') { title = "Void-Ex Logistics"; text = "Take advantage of Corporate Contracts and fulfil them by shipping the goods within the term limit. Only shipped goods allowed, delivered within or before the term expires, will be accepted so long as they are the exact quantities requested. Use the Fulfil option to ensure you comply; no in-person or further correspondence is needed. \nFailure to meet these terms will result in a 3 day ban to the market associated with that request. \nWe offer high-paying rewards for those who comply. \n\nPro-Tip: Captain, if your bay is too small to hold a large load, you can always use the 'Private Shipping' to move goods to a warehouse at any venue; no one else needs to know. However, any goods left unmoved for 3 days will be sold to defray storage costs."; }
          else if (feature === 'comms') { title = "G.I.G.O. Panel"; text = "Review daily logs, market intel, and previous event reports. Garbage In, Garbage Out... usually."; }
          else if (feature === 'fomo') { title = "F.O.M.O. Engineering Deck"; text = "Fabricate Output Management Operations. Craft valuable Z@onflex Weave Mesh and Stim-Packs from resources. Fabrication is limited to one batch per day per item type. Maximize your output!\n\nPro-Tip: Remember what happened to your Partner when he asked the Mutant Leader about the possibility of doing more Batches."; }
          else if (feature === 'highscores') { title = "Galactic Legends Registry"; text = "Behold the titans of industry. These captains turned oxidation into empire."; }
          else if (feature === 'wiki') { title = "Sector Codex Explorer"; text = "Gain deeper insight into the lore, mechanics, and survival tactics of the StarBucks Sector. Knowledge is the most valuable cargo of all."; }
          setModal({ type: 'tutorial_popup', data: { title, text, feature, callback } });
      } else {
          callback();
      }
  };

  // -- LOGIC: MARKETS & GENERATION --------------------------------------------

  const generateMarket = (isInitial: boolean, isLocal: boolean): Market => {
    const market: Market = {};
    COMMODITIES.forEach(c => {
      const rarity = 1 - c.rarity;
      const base = Math.floor(100 + 1000 * rarity);
      let qty = isLocal ? Math.floor(base * (1 + (Math.random()*0.4 - 0.1))) : Math.floor(base * (1 + (Math.random()-0.5)));
      qty = Math.max(1, qty);
      const ratio = qty / base;
      const mid = (c.minPrice + c.maxPrice) / 2;
      let price = mid / Math.sqrt(ratio);
      price = Math.round(Math.min(c.maxPrice, Math.max(c.minPrice, price)));
      market[c.name] = { price, quantity: qty, standardQuantity: base, depletionDays: 0 };
    });
    return market;
  };

  const evolveMarkets = (s: GameState): Market[] => {
    const phaseMult = 1 + ((s.gamePhase - 1) * 0.25); 
    const stockMult = s.gamePhase === 1 ? 1 : (s.gamePhase === 2 ? 5 : (s.gamePhase === 3 ? 10 : 20));
    const globalIncreasePct = 0.10 + Math.random() * 0.15;
    const h2oPasteMinMult = Math.pow(1.05, s.day);
    const h2oPasteMaxMult = Math.pow(1.10, s.day);

    const globalStocks: Record<string, number> = {};
    COMMODITIES.forEach(c => {
        let total = 0;
        s.markets.forEach(m => total += m[c.name].quantity);
        globalStocks[c.name] = total / s.markets.length;
    });

    return s.markets.map(m => {
      const newM: Market = {};
      Object.keys(m).forEach(key => {
        const item = m[key];
        const c = COMMODITIES.find(x => x.name === key)!;
        const adjustedStdQty = item.standardQuantity * stockMult; 
        let newQty = Math.floor(item.quantity * (1 + (Math.random()-0.5))); 
        if (Math.random() < 0.2) {
             const boost = Math.ceil(adjustedStdQty * globalIncreasePct);
             newQty += boost;
        }
        let dDays = item.quantity <= 0 ? item.depletionDays + 1 : 0;
        if (dDays > 2) {
           newQty = Math.floor(adjustedStdQty * 0.5); 
           dDays = 0;
        }
        newQty = Math.max(0, newQty);
        const effectiveRatio = (newQty+1) / adjustedStdQty; 
        let rangeMin = c.minPrice * phaseMultiplier;
        let rangeMax = c.maxPrice * phaseMultiplier;
        if (key === H2O_NAME || key === NUTRI_PASTE_NAME) {
            rangeMin = c.minPrice * h2oPasteMinMult;
            rangeMax = c.maxPrice * h2oPasteMaxMult;
        }
        if (key === FUEL_NAME) {
            const fluct = 1 + (Math.random() * 0.3 - 0.15);
            rangeMax *= fluct;
        }
        let price = 0;
        if (key === 'Spacetime Tea') {
             const logMin = Math.log(rangeMin);
             const logMax = Math.log(rangeMax);
             const scale = logMin + (logMax - logMin) * Math.random();
             price = Math.round(Math.exp(scale));
             const avgStock = globalStocks[key] || 1;
             const relativeRatio = avgStock / (newQty + 1);
             const swing = Math.min(1.25, Math.max(0.75, relativeRatio));
             price = Math.round(price * swing);
             price = Math.round(Math.min(rangeMax, Math.max(rangeMin, price)));
        } else {
             const mid = (rangeMin + rangeMax) / 2;
             price = mid / Math.sqrt(effectiveRatio);
             price = Math.round(Math.min(rangeMax, Math.max(rangeMin, price)));
        }
        newM[key] = { price, quantity: newQty, standardQuantity: item.standardQuantity, depletionDays: dDays };
      });
      return newM;
    });
  };

  // -- LOGIC: CONTRACTS & LOANS -----------------------------------------------

  const generateContracts = (currentVenue: number, day: number, phase: number, bans: Record<number, number>, existingAvailable: Contract[], active: Contract[]): Contract[] => {
    const kept = existingAvailable.filter(c => c.daysRemaining > 0);
    kept.forEach(c => { if(c.daysRemaining > 0) c.daysRemaining--; }); 
    const keptActive = kept.filter(c => c.daysRemaining > 0);
    
    const contracts: Contract[] = [...keptActive];
    const limitCount = phase === 1 ? CONTRACT_LIMIT_P1 : (phase === 2 ? CONTRACT_LIMIT_P2 : CONTRACT_LIMIT_P3);
    const phaseMult = 1 + ((phase - 1) * 0.5); 
    const qtyMult = phase === 1 ? 1 : (phase === 2 ? 10 : (phase === 3 ? 50 : 100));

    if (contracts.length < limitCount) { 
        for (let i = 0; i < 3; i++) {
            const dest = Math.floor(Math.random() * VENUES.length);
            if (dest === currentVenue || (bans[dest] && bans[dest] > 0)) continue; 
            const firm = CONTRACT_FIRMS[Math.floor(Math.random() * CONTRACT_FIRMS.length)];
            const commod = COMMODITIES[Math.floor(Math.random() * COMMODITIES.length)];
            const alreadyExists = [...active, ...contracts].some(c => c.commodity === commod.name && c.status === 'active');
            if (alreadyExists) continue;
            const baseQty = Math.floor(Math.random() * 50) + 10;
            const qty = Math.floor(baseQty * qtyMult); 
            const reward = Math.round(commod.maxPrice * qty * (1.5 + Math.random() * 0.5) * phaseMult);
            const penalty = Math.round(reward * 0.5);
            const time = Math.floor(Math.random() * 3) + 1; 
            contracts.push({
                id: Date.now() + Math.random(), firm, commodity: commod.name, quantity: qty, destinationIndex: dest, reward, daysRemaining: time, penalty, status: 'active'
            });
        }
    }
    return contracts;
  };

  const generateLoanOffers = (phase: number): LoanOffer[] => {
    const goalAmt = phase === 1 ? GOAL_PHASE_1_AMOUNT : (phase === 2 ? GOAL_PHASE_2_AMOUNT : GOAL_PHASE_3_AMOUNT);
    const maxLoan = goalAmt * 0.10; 
    const offers = [];
    for(let i=0; i<5; i++) {
        const firm = LOAN_FIRMS[i % LOAN_FIRMS.length];
        const minAmt = Math.max(5000, maxLoan * 0.05); 
        offers.push({
            firmName: firm.name,
            amount: Math.ceil((Math.random() * (maxLoan - minAmt) + minAmt) / 1000) * 1000,
            interestRate: Math.max(1, Math.min(15, firm.baseRate + Math.random() * 5))
        });
    }
    return offers;
  };

  // -- LOGIC: TRADING ---------------------------------------------------------

  const executeTrade = (pt: PendingTrade) => {
      if (!state) return;
      const { action, commodity: c, marketItem: mItem, ownedItem: owned, quantity: qty, tax } = pt;
      const txKey = `${state.currentVenueIndex}_${c.name}`;
      const txCount = state.dailyTransactions[txKey] || 0;

      if (action === 'buy') {
          let cost = qty * mItem.price + tax;
          const weight = qty * c.unitWeight;
          if (state.cash < cost && state.cash - cost < -10000) return setModal({type:'message', data:`Overdraft limit exceeded. Cannot buy.`});
          const newM = [...state.markets];
          newM[state.currentVenueIndex][c.name].quantity = Math.max(0, newM[state.currentVenueIndex][c.name].quantity - qty);
          const cur = state.cargo[c.name] || { quantity: 0, averageCost: 0 };
          const newTotal = cur.quantity + qty;
          const newAvg = ((cur.quantity * cur.averageCost) + (qty * mItem.price)) / newTotal;
          setState(prev => prev ? ({ 
              ...prev, 
              cash: prev.cash - cost, 
              cargoWeight: prev.cargoWeight + weight, 
              markets: newM, 
              cargo: { ...prev.cargo, [c.name]: { quantity: newTotal, averageCost: newAvg } },
              dailyTransactions: { ...prev.dailyTransactions, [txKey]: txCount + 1 }
          }) : null);
          if (tax > 0) log(`TAX: Paid ${formatCurrencyLog(tax)} for frequent trading.`, 'overdraft');
          setBuyQuantities(prev => ({...prev, [c.name]: ''}));
          SFX.play('coin');
      } else {
          let rev = qty * mItem.price - tax;
          const weight = qty * c.unitWeight;
          if (owned.quantity < qty) return;
          const newM = [...state.markets];
          newM[state.currentVenueIndex][c.name].quantity += qty;
          const newC = { ...state.cargo };
          newC[c.name].quantity = Math.max(0, newC[c.name].quantity - qty);
          if (newC[c.name].quantity <= 0) delete newC[c.name];
          const profit = rev - (qty * owned.averageCost);
          const isProfitable = profit > 0;
          setState(prev => prev ? ({ 
              ...prev, 
              cash: prev.cash + rev, 
              cargoWeight: prev.cargoWeight - weight, 
              markets: newM, 
              cargo: newC, 
              stats: { ...prev.stats, largestSingleWin: Math.max(prev.stats.largestSingleWin, rev) },
              dailyTransactions: { ...prev.dailyTransactions, [txKey]: txCount + 1 }
          }) : null);
          if (tax > 0) log(`TAX: Paid ${formatCurrencyLog(tax)} for frequent trading.`, 'overdraft');
          log(isProfitable ? `PROFIT: Made ${formatCurrencyLog(profit)} selling ${c.name}` : `LOSS: Lost ${formatCurrencyLog(Math.abs(profit))} selling ${c.name}`, isProfitable ? 'profit' : 'danger');
          setSellQuantities(prev => ({...prev, [c.name]: ''}));
          SFX.play('coin');
      }
      setModal({type:'none', data:null});
  };

  const handleTrade = (action: 'buy' | 'sell', c: Commodity, mItem: any, owned: any) => {
    if (!state) return;
    const rawQ = action === 'buy' ? buyQuantities[c.name] : sellQuantities[c.name];
    let qty = parseInt(rawQ || '0');
    if (qty <= 0) return;
    if (action === 'buy' && qty > mItem.quantity) {
        const pending: PendingTrade = { action, commodity: c, marketItem: mItem, ownedItem: owned, quantity: qty, tax: 0 };
        setModal({ type: 'stock_limit_confirm', data: { ...pending, actualStock: mItem.quantity } });
        return;
    }
    const txKey = `${state.currentVenueIndex}_${c.name}`;
    const txCount = state.dailyTransactions[txKey] || 0;
    let tax = 0;
    if (txCount > 0) {
        const val = qty * mItem.price;
        tax = Math.floor(val * 0.05);
        const pending: PendingTrade = { action, commodity: c, marketItem: mItem, ownedItem: owned, quantity: qty, tax };
        setModal({ type: 'tax_confirm', data: pending });
        return;
    }
    const pending: PendingTrade = { action, commodity: c, marketItem: mItem, ownedItem: owned, quantity: qty, tax: 0 };
    executeTrade(pending);
  };

  // -- LOGIC: UPGRADES & REPAIRS ----------------------------------------------

  const buyEquipment = (item: EquipmentItem) => {
     if (!state) return;
     const scaledCost = (item.type === 'defense') ? item.cost * state.gamePhase : item.cost;
     if (state.cash < scaledCost) return setModal({type:'message', data:"Insufficient Funds."});
     let newLaserHealth = state.laserHealth;
     if (item.type === 'laser') newLaserHealth = 100;
     setState(prev => prev ? ({ ...prev, cash: prev.cash - scaledCost, laserHealth: newLaserHealth, equipment: { ...prev.equipment, [item.id]: true } }) : null);
     log(`UPGRADES: Purchased ${item.name}`, 'buy');
     SFX.play('success');
  };
  
  const performRepair = (type: 'hull' | 'laser' | 'full_hull' | 'full_laser') => {
      if (!state) return;
      const MAX_LASER_HEALTH = 100;
      if (type === 'full_hull') {
          if (state.shipHealth >= MAX_REPAIR_HEALTH) return setModal({type:'message', data:"Hull integrity at maximum."});
          const needed = Math.ceil((MAX_REPAIR_HEALTH - state.shipHealth) / REPAIR_INCREMENT);
          const cost = needed * REPAIR_COST;
          if (state.cash < cost) return setModal({type:'message', data:`Insufficient funds. Need ${formatCurrencyLog(cost)}.`});
          setState(prev => prev ? ({...prev, cash: prev.cash - cost, shipHealth: MAX_REPAIR_HEALTH}) : null);
          log(`REPAIR: Hull fully restored.`, 'repair');
          SFX.play('success');
          return;
      }
      if (type === 'full_laser' || type === 'laser') {
          if (!hasLaser(state)) return;
          if (state.laserHealth >= MAX_LASER_HEALTH) return setModal({type:'message', data:"Laser operational."});
          const needed = Math.ceil((MAX_LASER_HEALTH - state.laserHealth) / REPAIR_INCREMENT);
          const cost = needed * LASER_REPAIR_COST;
          if (state.cash < cost) return setModal({type:'message', data:`Insufficient funds. Need ${formatCurrencyLog(cost)}.`});
          setState(prev => prev ? ({...prev, cash: prev.cash - cost, laserHealth: MAX_LASER_HEALTH}) : null);
          log(`REPAIR: Laser fully realigned.`, 'repair');
          SFX.play('success');
          return;
      }
  };

  // -- LOGIC: TRAVEL & ENCOUNTERS ---------------------------------------------

  const calculateCargoLoss = (s: GameState, hullHealth: number, hasInsurance: boolean): { lostItems: Record<string, number>, payout: number } => {
      const results = { lostItems: {} as Record<string, number>, payout: 0 };
      if (hullHealth >= 100) return results;

      const lossRatio = (100 - hullHealth) / 100;
      const totalWeight = s.cargoWeight;
      const targetWeightToLose = totalWeight * lossRatio;
      
      let weightLostSoFar = 0;
      let totalValueLost = 0;
      const cargoNames = Object.keys(s.cargo);
      const currentMarket = s.markets[s.currentVenueIndex];

      while (weightLostSoFar < targetWeightToLose && cargoNames.length > 0) {
          const randomIndex = Math.floor(Math.random() * cargoNames.length);
          const name = cargoNames[randomIndex];
          const item = s.cargo[name];
          const cData = COMMODITIES.find(c => c.name === name)!;
          
          const maxLossQty = Math.min(item.quantity, Math.ceil((targetWeightToLose - weightLostSoFar) / cData.unitWeight));
          const lossQty = Math.max(1, Math.floor(Math.random() * maxLossQty) + 1);

          s.cargo[name].quantity -= lossQty;
          weightLostSoFar += lossQty * cData.unitWeight;
          totalValueLost += lossQty * (currentMarket[name]?.price || 0);
          results.lostItems[name] = (results.lostItems[name] || 0) + lossQty;

          if (s.cargo[name].quantity <= 0) {
              delete s.cargo[name];
              cargoNames.splice(randomIndex, 1);
          }
      }
      
      s.cargoWeight = Math.max(0, s.cargoWeight - weightLostSoFar);
      
      if (hasInsurance) {
          results.payout = Math.floor(totalValueLost * 0.95);
          s.cash += results.payout;
      }

      return results;
  };

  const handleTravel = (destIdx: number, fuelCost: number, ins: boolean, mine: boolean, overload: boolean, invest95: boolean) => {
     if (!state) return;
     const s = { ...state };
     const report: DailyReport = { events: [], totalHullDamage: 0, totalLaserDamage: 0, fuelUsed: fuelCost, lostItems: {}, gainedItems: {}, insuranceBought: ins };
     
     if (destIdx === s.currentVenueIndex) {
         s.day++;
         processDay(s, report);
         const curGoal = s.gamePhase === 1 ? GOAL_PHASE_1_AMOUNT : (s.gamePhase === 2 ? GOAL_PHASE_2_AMOUNT : GOAL_PHASE_3_AMOUNT);
         const deadlineLimit = s.gamePhase === 1 ? GOAL_PHASE_1_DAYS : (state.gamePhase === 2 ? GOAL_PHASE_2_DAYS : (state.gamePhase === 3 ? GOAL_PHASE_3_DAYS : GOAL_OVERTIME_DAYS));
         const nw = getNetWorth(s);

         if (s.day > GOAL_OVERTIME_DAYS) {
             s.gameOver = true;
             const isHS = s.highScores.length < 10 || nw > s.highScores[s.highScores.length - 1].score;
             setModal({ type: 'endgame', data: { reason: "Retirement Day: Trade License Expired Successfully", netWorth: nw, stats: s.stats, isHighScore: isHS, days: GOAL_OVERTIME_DAYS } });
             SFX.play('success');
             return;
         }

         if (s.day > deadlineLimit && nw < curGoal) {
             s.gameOver = true;
             const isHS = s.highScores.length < 10 || nw > s.highScores[s.highScores.length - 1].score;
             setModal({ type: 'endgame', data: { reason: "Phase Deadline Missed. License Revoked.", netWorth: nw, stats: s.stats, isHighScore: isHS, days: s.day - 1 } });
             SFX.play('error');
             return;
         }
         
         if (s.day === deadlineLimit) {
             setModal({type:'message', data: "URGENT WARNING: Today is the Phase Deadline. Meet the goal or face license revocation!", color: 'text-red-500'});
             SFX.play('alarm');
         } else if (!s.gameOver) {
            setModal({ type: 'report', data: { events: report.events, day: s.day, tips: getMarketTips(s), quirky: report.quirkyMessage } });
            if (report.quirkyMessage) speakRetro(report.quirkyMessage.text);
            setState(s);
         }
         return;
     }

     SFX.play('warp');
     if (invest95 && s.activeLoans.length === 0) {
         const investAmt = Math.floor(s.cash * 0.95);
         if (investAmt > 0) {
             s.cash -= investAmt;
             s.investments.push({
                 id: Date.now(),
                 amount: investAmt,
                 daysRemaining: 1,
                 maturityValue: Math.floor(investAmt * 1.05),
                 interestRate: 0.05
             });
             report.events.push(`PROTECTION: Invested ${formatCurrencyLog(investAmt)} (95%) in 1-Day CD.`);
         }
     }
     
     const currentMarketLocal = s.markets[s.currentVenueIndex];
     const insuranceCost = Math.round(getCargoValue(s.cargo, currentMarketLocal) * 0.02); 
     if (ins) {
         s.cash -= insuranceCost;
         if (s.cash < 0) report.events.push(`OVERDRAFT: Insurance payment pushed account into negative.`);
     }
     
     const f = COMMODITIES.find(c=>c.name===FUEL_NAME)!;
     s.cargo[FUEL_NAME].quantity -= fuelCost;
     s.cargoWeight -= fuelCost * f.unitWeight;
     if (s.cargo[FUEL_NAME].quantity <= 0) delete s.cargo[FUEL_NAME];
     
     let encounterChance = 0.65;
     if (s.warrantLevel > 0) encounterChance += 0.15;
     if (s.sectorPasses.includes(VENUES[destIdx])) encounterChance -= 0.20;

     if (Math.random() < encounterChance) {
        const types: Encounter['type'][] = ['visa_audit', 'scam_customs', 'god_license', 'cargo_tax', 'pirate', 'fuel_breach', 'accident', 'structural', 'rust_rats', 'derelict', 'mutiny'];
        const typeEncounter = types[Math.floor(Math.random()*types.length)];
        let encounter: Encounter = { type: typeEncounter, title: '', description: '', riskDamage: 0 };
        let riskMult = ins ? 1.5 : 4.0; 
        const shieldLv = s.equipment['shield_gen_mk3'] ? 3 : (s.equipment['shield_gen_mk2'] ? 2 : (s.equipment['shield_gen_mk1'] ? 1 : 0));
        
        switch(typeEncounter) {
            case 'visa_audit':
                encounter.title = 'V.I.S.A. Safety Audit (Code 22-V)';
                encounter.description = `Enforcers flag your 60% oxidation as a "Public Hazard." They demand a "Refurbishment Waiver" payment.`;
                encounter.demandAmount = Math.floor(s.cash * 0.22);
                break;
            case 'scam_customs':
                encounter.title = 'S.C.A.M. Customs Inspection';
                encounter.description = `Galactic Police perform a "Surprise Scan" for unregulated goods. They suggest a "Processing Fee" to look the other way.`;
                encounter.demandAmount = Math.floor(s.cash * 0.25);
                break;
            case 'god_license':
                encounter.title = 'The G.O.D. License Check';
                encounter.description = `The Galactic Overlord Department checks your operating license and ship compliance data.`;
                encounter.demandAmount = 5000 * s.gamePhase;
                break;
            case 'cargo_tax':
                encounter.title = 'Sector Cargo Tax';
                encounter.description = `A surprise checkpoint levies a transit tax based on total cargo weight. Efficiency is expensive.`;
                encounter.demandAmount = Math.ceil(s.cargoWeight * 15);
                break;
            case 'pirate':
                encounter.title = 'Crimson Fleet Interdiction';
                encounter.description = `A pirate frigate cornered you in the jump-lane. "Give us the credits, and we'll let your rust-bucket drift."`;
                encounter.demandAmount = Math.floor(s.cash * 0.30);
                encounter.riskDamage = 45 * riskMult * (1 - (shieldLv * 0.15));
                break;
            case 'fuel_breach':
                encounter.title = 'Spice-Fuel Tank Breach';
                encounter.description = `60% oxidation causes a fuel seam to split! High risk of fire near the Hot Isotope Hummers.`;
                encounter.riskDamage = 10;
                break;
            case 'accident':
                encounter.title = 'Navigational Hazard: Debris Field';
                encounter.description = `You drifted into space junk. The Firefox 22's sensors only beeped AFTER the first impact.`;
                encounter.riskDamage = 30 * (1 - (shieldLv * 0.25));
                break;
            case 'structural':
                encounter.title = 'Structural Failure';
                encounter.description = `Warp stress causes cargo bay beams to buckle. Permanent loss of 100T storage capacity detected.`;
                encounter.capacityLoss = 100;
                break;
            case 'rust_rats':
                encounter.title = 'Rust Rat Infestation';
                encounter.description = `Vermin attracted to the warmth of the Hummers have chewed through critical Logic-Slates.`;
                encounter.targetItem = Math.random() > 0.5 ? 'PC Chips' : POWER_CELL_NAME;
                break;
            case 'derelict':
                encounter.title = 'Echoing Distress Signal';
                encounter.description = `An abandoned freighter drifts in the void. "The RR Firefox 22 RustyRedeemer" groans as you approach.`;
                break;
            case 'mutiny':
                encounter.title = 'Crew Mutiny';
                encounter.description = `Morale is low. The crew demands a "Profit Share" bonus to keep the engines running.`;
                encounter.demandAmount = Math.floor(s.cash * 0.15);
                break;
        }

        setModal({ type: 'event_encounter', data: { state: s, report, encounter, destIdx, mine, overload } });
        SFX.play('alarm');
        return; 
     }
     finalizeJump(s, report, destIdx, mine, overload);
  };

  const resolveEncounterOutcome = (decision: 'check' | 'leave' | 'pay' | 'fight' | 'evade' | 'ignore') => {
      if (!modal.data) return;
      const { state: stateData, report: reportData, encounter, destIdx, mine, overload } = modal.data;
      let outcomeMsg = "";
      let outcomeType: 'info' | 'profit' | 'danger' = 'info';
      
      const s = { ...stateData } as GameState;
      const r = { ...reportData } as DailyReport;

      switch(encounter.type) {
          case 'visa_audit':
              if (decision === 'pay') {
                  s.cash -= encounter.demandAmount;
                  outcomeMsg = `BRIBE ACCEPTED: You paid the 22% "Refurbishment Waiver." The enforcers ignored the rust. Lost ${formatCurrencyLog(encounter.demandAmount)}.`;
                  r.events.push(`ENCOUNTER: Paid V.I.S.A. bribe of ${formatCurrencyLog(encounter.demandAmount)}.`);
              } else {
                  s.laserHealth = Math.max(0, s.laserHealth - 50);
                  outcomeMsg = `AUDIT FAILURE: You refused to pay. They remotely "shorted" your Hot Isotope Hummers. Laser integrity halved.`;
                  outcomeType = 'danger';
                  r.events.push(`ENCOUNTER: V.I.S.A. audit failed. Hummers shorted.`);
              }
              break;
          case 'scam_customs':
              if (decision === 'pay') {
                  s.cash -= encounter.demandAmount;
                  outcomeMsg = `CLEARED: The 25% "Processing Fee" was accepted. No cargo was scanned. Lost ${formatCurrencyLog(encounter.demandAmount)}.`;
                  r.events.push(`ENCOUNTER: Paid S.C.A.M. fees.`);
              } else {
                  const confiscated = ['Antimatter Rod', 'G.I.G.O (Lite) Matter', 'Spacetime Tea'];
                  let itemLost = '';
                  confiscated.forEach(name => {
                      if (!itemLost && s.cargo[name]) {
                          itemLost = name;
                          const lostQty = s.cargo[name].quantity;
                          const cData = COMMODITIES.find(c => c.name === name)!;
                          s.cargoWeight -= lostQty * cData.unitWeight;
                          delete s.cargo[name];
                          r.events.push(`SEIZURE: S.C.A.M. confiscated all ${name}.`);
                      }
                  });
                  outcomeMsg = itemLost ? `CONFISCATED: They found ${itemLost} and seized the entire lot.` : `LUCKY: They scanned, but your cargo was too worthless for them to bother with a seizure.`;
                  outcomeType = 'danger';
              }
              break;
          case 'pirate':
              if (decision === 'pay') {
                  s.cash -= encounter.demandAmount;
                  outcomeMsg = `SAFE PASSAGE: The Crimson Fleet took their 30% cut. Lost ${formatCurrencyLog(encounter.demandAmount)}.`;
                  r.events.push(`ENCOUNTER: Paid Crimson Fleet tribute.`);
              } else if (decision === 'fight') {
                  const hasCannon = s.equipment['plasma_cannon_mk3'] ? 3 : (s.equipment['plasma_cannon_mk2'] ? 2 : (s.equipment['plasma_cannon_mk1'] ? 1 : 0));
                  if (hasCannon > 0) {
                      const scrapReward = 5000 * hasCannon;
                      s.cash += scrapReward;
                      outcomeMsg = `VICTORY: Your Plasma Cannons shredded the pirate frigate. Salvaged ${formatCurrencyLog(scrapReward)} in scrap.`;
                      outcomeType = 'profit';
                      r.events.push(`COMBAT: Defeated pirates. Salvaged ${formatCurrencyLog(scrapReward)}.`);
                      if (Math.random() < 0.2) {
                          s.sectorPasses.push(VENUES[destIdx]);
                          outcomeMsg += ` Word spread - you have free passage in this sector!`;
                      }
                  } else {
                      s.shipHealth -= 60;
                      outcomeMsg = `DEFEAT: Without cannons, the pirates mauled your hull. Sustained 60% damage.`;
                      outcomeType = 'danger';
                      r.events.push(`COMBAT: Hull mauled by pirates.`);
                  }
              }
              break;
          case 'fuel_breach':
              const fuelLoss = Math.floor((s.cargo[FUEL_NAME]?.quantity || 0) * 0.4);
              if (s.cargo[FUEL_NAME]) {
                  s.cargo[FUEL_NAME].quantity -= fuelLoss;
                  const fData = COMMODITIES.find(c => c.name === FUEL_NAME)!;
                  s.cargoWeight -= fuelLoss * fData.unitWeight;
                  if (s.cargo[FUEL_NAME].quantity <= 0) delete s.cargo[FUEL_NAME];
              }
              outcomeMsg = `BREACH: ${fuelLoss} units of Spice-Fuel leaked into the void before the seal held.`;
              outcomeType = 'danger';
              r.events.push(`ENCOUNTER: Fuel tank breach. Lost ${fuelLoss} Fuel.`);
              break;
          case 'structural':
              s.cargoCapacity = Math.max(100, s.cargoCapacity - 100);
              outcomeMsg = `CRACKED: The Firefox 22's spine groaned. 100T of storage is now inaccessible due to structural warping.`;
              outcomeType = 'danger';
              r.events.push(`ENCOUNTER: Structural failure. -100T Capacity.`);
              break;
          case 'rust_rats':
              if (encounter.targetItem && s.cargo[encounter.targetItem]) {
                  const amt = Math.floor(s.cargo[encounter.targetItem].quantity * 0.5);
                  s.cargo[encounter.targetItem].quantity -= amt;
                  const cData = COMMODITIES.find(c => c.name === encounter.targetItem)!;
                  s.cargoWeight -= amt * cData.unitWeight;
                  if (s.cargo[encounter.targetItem].quantity <= 0) delete s.cargo[encounter.targetItem];
                  outcomeMsg = `INFESTATION: Rust Rats ate ${amt} units of ${encounter.targetItem}. Squeaky little monsters.`;
                  r.events.push(`ENCOUNTER: Rust Rats ate ${amt} ${encounter.targetItem}.`);
              } else {
                  outcomeMsg = `INFESTATION: Rats found nothing tasty, so they just chewed the pilot's left boot.`;
              }
              outcomeType = 'danger';
              break;
          case 'derelict':
              if (decision === 'check') {
                  if (Math.random() < 0.5) {
                      const reward = Math.floor(Math.random() * 5) + 2;
                      const cData = COMMODITIES.find(c => c.name === POWER_CELL_NAME)!;
                      const cur = s.cargo[POWER_CELL_NAME] || { quantity: 0, averageCost: 0 };
                      s.cargo[POWER_CELL_NAME] = { quantity: cur.quantity + reward, averageCost: cur.averageCost };
                      s.cargoWeight += reward * cData.unitWeight;
                      outcomeMsg = `SALVAGE: Found ${reward} abandoned Hot Isotope Hummers! Today is a good day.`;
                      outcomeType = 'profit';
                      r.events.push(`ENCOUNTER: Salvaged ${reward} Hummers.`);
                  } else {
                      s.shipHealth -= 20;
                      outcomeMsg = `TRAP: The derelict was an explosive decoy. Sustained 20% hull damage.`;
                      outcomeType = 'danger';
                      r.events.push(`ENCOUNTER: Derelict explosion trap.`);
                  }
              } else {
                  outcomeMsg = `BYPASS: You left the ghost ship to the void. Safety first.`;
              }
              break;
          default:
              if (decision === 'ignore') {
                 s.shipHealth -= encounter.riskDamage;
                 outcomeMsg = `Impact reported! Sustained ${Math.round(encounter.riskDamage)}% Hull Damage.`;
                 outcomeType = 'danger';
                 r.events.push(`ENCOUNTER: ${encounter.title} impact: ${Math.round(encounter.riskDamage)}% damage.`);
              }
      }

      setModal({ type: 'encounter_resolution', data: { state: s, report: r, outcomeMsg, outcomeType, destIdx, mine, overload } });
  };

  const finalizeJump = (s: GameState, report: DailyReport, destIdx: number, mine: boolean, overload: boolean) => {
     if (s.shipHealth < 100) {
        const lossResults = calculateCargoLoss(s, s.shipHealth, report.insuranceBought);
        if (Object.keys(lossResults.lostItems).length > 0) {
            const lostStr = Object.entries(lossResults.lostItems).map(([n,q]) => `${q} ${n}`).join(', ');
            report.events.push(`HULL BREACH LOSS: Structural damage caused loss of cargo: ${lostStr}.`);
            if (report.insuranceBought) {
                report.events.push(`INSURANCE (E.X.C.E.S.S.): 95% value replacement credited: ${formatCurrencyLog(lossResults.payout)}.`);
                report.insurancePayout = lossResults.payout;
            } else {
                report.events.push(`WARNING: No insurance active. Total cargo value loss sustained.`);
            }
        }
     }

     if (mine && hasLaser(s)) {
        const pc = s.cargo[POWER_CELL_NAME];
        
        // v5.9.4 Mining Rework: Cost strictly scales Phase * 3^(Level-1)
        const laserLevel = s.equipment['laser_mk3'] ? 3 : (s.equipment['laser_mk2'] ? 2 : 1);
        const cellsNeeded = s.gamePhase * Math.pow(3, (laserLevel - 1));

        if (pc && pc.quantity >= cellsNeeded) {
            s.cargo[POWER_CELL_NAME].quantity -= cellsNeeded;
            s.cargoWeight -= cellsNeeded * COMMODITIES.find(c=>c.name===POWER_CELL_NAME)!.unitWeight;
            if (s.cargo[POWER_CELL_NAME].quantity <= 0) delete s.cargo[POWER_CELL_NAME];
            
            // v5.9.4 Yield Balancing: yield is scaled strictly by laser health %
            const healthYieldMult = s.laserHealth / 100;
            const phaseYieldMult = s.gamePhase === 1 ? 1 : (s.gamePhase === 2 ? 5 : (s.gamePhase === 3 ? 10 : 20));
            const equipmentMult = (laserLevel === 3 ? 5 : (laserLevel === 2 ? 2 : 1)) * (overload ? MINING_OVERLOAD_YIELD_MULT : 1); 
            
            const baseYield = Math.floor(Math.random() * 10) + 5; 
            const finalYieldScale = equipmentMult * phaseYieldMult * healthYieldMult;
            const amt = Math.max(1, Math.round(baseYield * finalYieldScale)); 

            const minedItems: {name: string, amt: number}[] = [];
            if (laserLevel >= 1) minedItems.push({name: 'Titanium Ore', amt: amt});
            if (laserLevel >= 2 && Math.random() > 0.4) minedItems.push({name: 'Antimatter Rod', amt: Math.ceil(amt * 0.2)});
            if (laserLevel >= 3 && Math.random() > 0.7) minedItems.push({name: 'Dark Matter', amt: Math.ceil(amt * 0.05)});

            // v5.9.4 Overload Risk: 5x damage amount/risk
            if (overload && Math.random() < 0.6) { 
                const baseDmg = Math.floor(Math.random() * 8) + 4;
                const selfDmg = baseDmg * MINING_OVERLOAD_RISK_MULT; 
                s.laserHealth = Math.max(0, s.laserHealth - selfDmg); 
                report.totalLaserDamage += selfDmg;
                report.events.push(`Laser Overload: Massive resonance backfire! Sustained -${selfDmg}% Laser Damage.`);
            } else if (!overload && Math.random() < 0.1) {
                const selfDmg = Math.floor(Math.random() * 5) + 1;
                s.laserHealth = Math.max(0, s.laserHealth - selfDmg);
                report.events.push(`Mining Maintenance: Minor focal burn. Sustained -${selfDmg}% Laser Damage.`);
            }

            minedItems.forEach(item => {
                const cData = COMMODITIES.find(c=>c.name===item.name)!;
                const cur = s.cargo[item.name] || { quantity: 0, averageCost: 0 };
                const newTotal = cur.quantity + item.amt;
                const newAvg = ((cur.quantity * cur.averageCost) + (item.amt * 0)) / newTotal;
                s.cargo[item.name] = { quantity: newTotal, averageCost: newAvg }; 
                s.cargoWeight += item.amt*cData.unitWeight;
                report.gainedItems[item.name] = (report.gainedItems[item.name]||0) + item.amt;
            });
            report.events.push(`MINING: Extraction cycle complete. Used ${cellsNeeded} ${POWER_CELL_NAME}. Efficiency: ${Math.round(healthYieldMult*100)}%. Yield: ${minedItems.map(i=>`${i.amt} ${i.name}`).join(', ')}`);
        } else {
             report.events.push(`MINING FAILED: Insufficient ${POWER_CELL_NAME} (Need ${cellsNeeded}).`);
        }
     }
     s.day++;
     s.currentVenueIndex = destIdx;
     
     const arrivedItems = s.warehouse[destIdx];
     const claimed: string[] = [];
     if (arrivedItems) {
         Object.keys(arrivedItems).forEach(key => {
             const item = arrivedItems[key];
             if (item.arrivalDay <= s.day && !item.isContractReserved) {
                 const c = COMMODITIES.find(x => x.name === key)!;
                 const cur = s.cargo[key] || { quantity: 0, averageCost: 0 };
                 const newTotal = cur.quantity + item.quantity;
                 const newAvg = ((cur.quantity * cur.averageCost) + (item.quantity * item.originalAvgCost)) / newTotal;
                 s.cargo[key] = { quantity: newTotal, averageCost: newAvg };
                 s.cargoWeight += item.quantity * c.unitWeight;
                 claimed.push(`${item.quantity} ${key}`);
                 delete s.warehouse[destIdx][key];
             }
         });
         if (Object.keys(s.warehouse[destIdx]).length === 0) delete s.warehouse[destIdx];
     }
     
     if (claimed.length > 0) {
         report.events.unshift(`ARRIVAL LOGISTICS: Shipment automatically transferred to cargo: ${claimed.join(', ')}`);
     }

     processDay(s, report);
     const nw = getNetWorth(s);

     if (s.day > GOAL_OVERTIME_DAYS) {
        s.gameOver = true;
        const isHS = s.highScores.length < 10 || nw > s.highScores[s.highScores.length - 1].score;
        setModal({ type: 'endgame', data: { reason: "Retirement Day: Trade License Expired Successfully", netWorth: nw, stats: s.stats, isHighScore: isHS, days: GOAL_OVERTIME_DAYS } });
        SFX.play('success');
        return;
     }

     const curGoal = s.gamePhase === 1 ? GOAL_PHASE_1_AMOUNT : (s.gamePhase === 2 ? GOAL_PHASE_2_AMOUNT : (s.gamePhase === 3 ? GOAL_PHASE_3_AMOUNT : 0));
     if (nw >= curGoal && s.gamePhase < 3) {
         const daysCurrent = s.gamePhase === 1 ? GOAL_PHASE_1_DAYS : GOAL_PHASE_2_DAYS;
         const daysNext = s.gamePhase === 1 ? GOAL_PHASE_2_DAYS : GOAL_PHASE_3_DAYS;
         const daysExt = daysNext - daysCurrent; 
         setModal({ type: 'goal_achieved', data: { phase: s.gamePhase, nextPhase: s.gamePhase + 1, state: s, report, daysExtended: daysExt } });
         SFX.play('success');
         return; 
     }
     if (nw >= curGoal && s.gamePhase === 3) {
         const daysExt = GOAL_OVERTIME_DAYS - GOAL_PHASE_3_DAYS;
         setModal({ type: 'goal_achieved', data: { phase: 3, nextPhase: 4, state: s, report, daysExtended: daysExt } });
         SFX.play('success');
         return;
     }
     const deadlineLimit = s.gamePhase === 1 ? GOAL_PHASE_1_DAYS : (s.gamePhase === 2 ? GOAL_PHASE_2_DAYS : (s.gamePhase === 3 ? GOAL_PHASE_3_DAYS : GOAL_OVERTIME_DAYS));
     if (s.gamePhase <= 4 && s.day > deadlineLimit && nw < curGoal) s.gameOver = true;
     
     if (!s.gameOver) {
        if (s.day === deadlineLimit) {
             setModal({type:'message', data: "URGENT WARNING: Today is the Phase Deadline. Meet the goal or face license revocation!", color: 'text-red-500'});
             setTimeout(() => {
                setModal({ type: 'report', data: { events: report.events, day: s.day, tips: getMarketTips(s), quirky: report.quirkyMessage } });
                if (report.quirkyMessage) speakRetro(report.quirkyMessage.text);
             }, 2000);
             setState(s);
             SFX.play('alarm');
             return;
        }
        setModal({ type: 'report', data: { events: report.events, day: s.day, tips: getMarketTips(s), quirky: report.quirkyMessage } });
        if (report.quirkyMessage) speakRetro(report.quirkyMessage.text);
        setState(s);
     } else {
        const isHS = s.highScores.length < 10 || nw > s.highScores[s.highScores.length - 1].score;
        setModal({ type: 'endgame', data: { reason: "Deadline Missed. License Revoked.", netWorth: nw, stats: s.stats, isHighScore: isHS, days: s.day - 1 } });
        SFX.play('error');
     }
  };

  // -- LOGIC: DAILY CYCLING & CORE SYSTEMS ------------------------------------

  const processDay = (s: GameState, report: DailyReport) => {
    s.dailyTransactions = {};
    s.fomoDailyUse = { mesh: false, stims: false };
    
    s.activeContracts = s.activeContracts.filter(c => c.status === 'active' || c.dayCompleted === s.day);

    COMMODITIES.forEach(c => {
        let total = 0;
        s.markets.forEach(m => total += m[c.name].quantity);
        const injection = Math.ceil(total * 0.10);
        let remaining = injection;
        while(remaining > 0) {
             const chunk = Math.min(remaining, Math.ceil(injection/10));
             const vIdx = Math.floor(Math.random() * VENUES.length);
             s.markets[vIdx][c.name].quantity += chunk;
             remaining -= chunk;
        }
    });
    if (s.day > 1) {
        const themes = Object.keys(QUIRKY_MESSAGES_DB);
        const theme = themes[Math.floor(Math.random() * themes.length)];
        const msgs = QUIRKY_MESSAGES_DB[theme as keyof typeof QUIRKY_MESSAGES_DB];
        report.quirkyMessage = { text: msgs[Math.floor(Math.random() * msgs.length)], theme };
    }
    if (s.cash < 0) {
       const interest = Math.abs(s.cash) * 0.15;
       s.cash -= interest;
       report.events.push(`OVERDRAFT: Charged ${formatCurrencyLog(interest)} interest (15%).`);
    }
    const girlMatter = s.cargo['G.I.R.L (Lite) Matter'];
    if (girlMatter && Math.random() < 0.33) {
        const pct = 0.05 + Math.random() * 0.10; 
        const loss = Math.ceil(girlMatter.quantity * pct);
        s.cargo['G.I.R.L (Lite) Matter'].quantity = Math.max(0, s.cargo['G.I.R.L (Lite) Matter'].quantity - loss);
        const cData = COMMODITIES.find(c => c.name === 'G.I.R.L (Lite) Matter')!;
        s.cargoWeight -= loss * cData.unitWeight;
        if (s.cargo['G.I.R.L (Lite) Matter'].quantity <= 0) delete s.cargo['G.I.R.L (Lite) Matter'];
        report.events.push(`WARNING: G.I.R.L Matter instability detected! ${loss} units evaporated/exploded.`);
    }
    const powerCells = s.cargo[POWER_CELL_NAME];
    if (powerCells && Math.random() < 0.25) {
        const loss = Math.ceil(powerCells.quantity * 0.02);
        s.cargo[POWER_CELL_NAME].quantity = Math.max(0, s.cargo[POWER_CELL_NAME].quantity - loss);
        const cData = COMMODITIES.find(c => c.name === POWER_CELL_NAME)!;
        s.cargoWeight -= loss * cData.unitWeight;
        if (s.cargo[POWER_CELL_NAME].quantity <= 0) delete s.cargo[POWER_CELL_NAME];
        report.events.push(`MAINTENANCE: ${loss} ${POWER_CELL_NAME} found dead and were discarded.`);
    }

    let keepLoans: any[] = [];
    s.activeLoans.forEach(l => {
       l.daysRemaining--;
       l.currentDebt += Math.round(l.currentDebt * (l.interestRate/100));
       if (l.daysRemaining <= 0) {
          s.cash -= l.currentDebt;
          report.events.push(`LOAN MATURITY: ${l.firmName} collected ${formatCurrencyLog(l.currentDebt)}. Account debited.`);
       } else {
          keepLoans.push(l);
       }
    });
    s.activeLoans = keepLoans;
    let keepInv: any[] = [];
    s.investments.forEach(i => {
       i.daysRemaining--;
       if (i.daysRemaining <= 0) {
          s.cash += i.maturityValue;
          report.events.push(`INVESTMENT MATURED: Received ${formatCurrencyLog(i.maturityValue)}.`);
       } else {
          keepInv.push(i);
       }
    });
    s.investments = keepInv;
    Object.keys(s.warehouse).forEach(vIdxKey => {
        const vIdx = parseInt(vIdxKey);
        const venueItems = s.warehouse[vIdx];
        const keptItems: Record<string, WarehouseItem> = {};
        Object.entries(venueItems).forEach(([name, item]) => {
             const relevantContracts = s.activeContracts.filter(c => c.commodity === name && c.destinationIndex === vIdx && c.status === 'active');
             let consumed = false;
             relevantContracts.forEach(c => {
                 if (!consumed && item.quantity >= c.quantity && item.arrivalDay <= s.day) {
                     item.quantity -= c.quantity;
                     s.cash += c.reward;
                     s.stats.largestSingleWin = Math.max(s.stats.largestSingleWin, c.reward);
                     report.events.push(`CONTRACT FULFILLED: ${c.firm} received shipment at ${VENUES[c.destinationIndex]}. Reward: ${formatCurrencyLog(c.reward)}`);
                     c.status = 'completed';
                     c.dayCompleted = s.day;
                     if (item.quantity <= 0) consumed = true;
                 }
             });
             if (consumed) {
             } else if (item.quantity > 0) {
                 if (item.arrivalDay > s.day) {
                     if (Math.random() < 0.1) {
                         item.arrivalDay++;
                         report.events.push(`DELAY: Shipment of ${name} to ${VENUES[vIdx]} delayed 1 day due to logistics hiccups.`);
                     }
                     keptItems[name] = item;
                 } else {
                     if (s.day > item.arrivalDay + 3) {
                         report.events.push(`SEIZURE: ${item.quantity} ${name} at ${VENUES[vIdx]} sold to defray storage costs.`);
                     } else {
                         keptItems[name] = item;
                     }
                 }
             }
        });
        s.warehouse[vIdx] = keptItems;
        if (Object.keys(s.warehouse[vIdx]).length === 0) delete s.warehouse[vIdx];
    });
    Object.keys(s.venueTradeBans).forEach(idxKey => {
        const idxVal = parseInt(idxKey);
        if (s.venueTradeBans[idxVal] > 0) s.venueTradeBans[idxVal]--;
        if (s.venueTradeBans[idxVal] <= 0) delete s.venueTradeBans[idxVal];
    });

    s.activeContracts.forEach(c => {
        if (c.status === 'active') {
            c.daysRemaining--;
            if (c.daysRemaining <= 0) {
                s.cash -= c.penalty;
                s.venueTradeBans[c.destinationIndex] = TRADE_BAN_DURATION;
                report.events.push(`BREACH OF CONTRACT: ${c.firm} order failed. Penalty: ${formatCurrencyLog(c.penalty)} & P.I.G.S. trade restriction (3 days).`);
                c.status = 'failed';
                c.dayCompleted = s.day;
            } else if (c.daysRemaining === 1) {
                report.events.push(`WARNING: Contract for ${c.firm} due TOMORROW.`);
            }
        }
    });

    s.markets = evolveMarkets(s);
    s.loanOffers = generateLoanOffers(s.gamePhase);
    s.availableContracts = generateContracts(s.currentVenueIndex, s.day, s.gamePhase, s.venueTradeBans, s.availableContracts, s.activeContracts);
    s.loanTakenToday = false;
  };

  const advancePhase = (s: GameState, nextPhase: 1|2|3|4, report: DailyReport) => {
    s.gamePhase = nextPhase;
    const multiplier = nextPhase === 1 ? 1 : (nextPhase === 2 ? 5 : (nextPhase === 3 ? 10 : 20));
    const glutFactor = 2.0; 
    s.markets = s.markets.map(m => {
      const newM: Market = {};
      Object.entries(m).forEach(([k, v]) => {
          newM[k] = { 
              ...v, 
              quantity: Math.floor(v.quantity * multiplier * glutFactor), 
              standardQuantity: v.standardQuantity * multiplier 
          };
      });
      return newM;
    });
    setModal({ type: 'report', data: { events: [...report.events, `PHASE ${nextPhase} STARTED. Markets expanded. Stock Levels Multiplied by ${multiplier}x. Supply Glut detected!`], day: s.day, tips: getMarketTips(s) } });
    setState(s);
  };

  const getMarketTips = (s: GameState) => {
    if (!s) return [];
    const tips: any[] = [];
    const currentMarketLocal = s.markets[s.currentVenueIndex];
    COMMODITIES.forEach(c => {
      const cp = currentMarketLocal[c.name].price;
      let minP = Infinity, maxP = 0, maxV = '';
      s.markets.forEach((m, i) => {
        const p = m[c.name].price;
        if (p < minP) minP = p;
        if (p > maxP) { maxP = p; maxV = VENUES[i]; }
      });
      if (cp <= minP * 1.1) tips.push({ type: 'buy', text: `BUY ${c.name}: Low (${formatCurrencyLog(cp)}). Sell at ${maxV} (~${formatCurrencyLog(maxP)}).`, score: maxP/cp });
      if (cp >= maxP * 0.9) tips.push({ type: 'sell', text: `SELL ${c.name}: High (${formatCurrencyLog(cp)}).`, score: cp });
    });
    return tips.sort((a,b) => b.score - a.score).slice(0, 3);
  };

  const log = (msg: string, type: LogEntry['type']) => {
    setState(prev => {
        if (!prev) return null;
        const entry: LogEntry = { id: Date.now() + Math.random(), message: `[D${prev.day}] ${msg}`, type };
        const filtered = prev.messages.slice(-49);
        return { ...prev, messages: [...filtered, entry] };
    });
  };

  const getNetWorth = (s: GameState) => {
    const debt = s.activeLoans.reduce((a,b) => a + b.currentDebt, 0);
    const cargoVal = Object.entries(s.cargo).reduce((sum, [name, item]) => sum + (item.quantity * (s.markets[s.currentVenueIndex][name]?.price || 0)), 0);
    const invVal = s.investments.reduce((a,b) => a + b.amount, 0);
    return s.cash + cargoVal + invVal - debt;
  };

  const saveHighScore = async (name: string, score: number, days: number) => {
    const newScore = { name, score, days, date: new Date().toLocaleDateString() };
    const currentScores = await loadHighScores();
    const updated = [...currentScores, newScore].sort((a,b) => b.score - a.score).slice(0, 10);
    localStorage.setItem('sbe_highscores', JSON.stringify(updated));
    if (db) {
        try {
            await addDoc(collection(db, "highscores"), newScore);
        } catch(e) {}
    }
    return updated;
  };

  const getMaxCargo = (phase: number) => {
    if (phase === 1) return BASE_MAX_CARGO_CAPACITY; 
    if (phase === 2) return BASE_MAX_CARGO_CAPACITY * 10; 
    if (phase === 3) return 250000; 
    return 500000; 
  };
  
  const attemptVoluntaryRestart = async () => {
      if (!state) return;
      const currentNetWorth = getNetWorth(state);
      const scores = state.highScores;
      const threshold = scores.length < 10 ? 0 : scores[scores.length-1].score;
      const isHighScore = currentNetWorth > threshold;
      if (isHighScore) {
          setModal({ type: 'endgame', data: { reason: "Legendary Status Achieved (Voluntary Retirement)", netWorth: currentNetWorth, stats: state.stats, isHighScore: true, days: state.day } });
      } else {
          setModal({ type: 'endgame', data: { reason: "Retirement", netWorth: currentNetWorth, stats: state.stats, isHighScore: false, days: state.day } });
      }
  };

  const toggleSound = () => {
      const muted = SFX.toggleMute();
      setIsMuted(muted);
  };

  const hasLaser = (s: GameState) => s.equipment['laser_mk1'] || s.equipment['laser_mk2'] || s.equipment['laser_mk3'];
  const hasScanner = (s: GameState) => s.equipment['scanner'];
  const isContractCovered = (s: GameState, c: Contract) => {
      const wh = s.warehouse[c.destinationIndex];
      if (wh && wh[c.commodity] && wh[c.commodity].quantity >= c.quantity) return true;
      return false;
  };

  const acceptContract = (c: Contract) => {
    if (!state) return;
    const activeOnly = state.activeContracts.filter(ac => ac.status === 'active');
    const limitAmt = state.gamePhase === 1 ? CONTRACT_LIMIT_P1 : (state.gamePhase === 2 ? CONTRACT_LIMIT_P2 : CONTRACT_LIMIT_P3);
    if (activeOnly.length >= limitAmt) { SFX.play('error'); return setModal({type:'message', data: `Contract limit reached (${limitAmt}).`}); }
    
    const newAvail = state.availableContracts.filter(con => con.id !== c.id);
    const newActive = [...state.activeContracts, { ...c, status: 'active' as const }];
    
    setState(prev => prev ? ({ ...prev, availableContracts: newAvail, activeContracts: newActive }) : null);
    log(`CONTRACT: Accepted ${c.firm} contract.`, 'contract');
    SFX.play('click');
  };

  const handleFulfill = (c: Contract) => {
      setModal({type:'shipping', data:null});
      setLogisticsTab('shipping');
      setShippingQuantities({ [c.commodity]: c.quantity.toString() });
      setShippingDestinations({ [c.commodity]: c.destinationIndex.toString() });
      setHighlightShippingItem(c.commodity);
      setStagedContract(c);
      SFX.play('click');
  };

  const settleContract = (c: Contract) => {
      if (!state) return;
      const wh = state.warehouse[c.destinationIndex];
      if (wh && wh[c.commodity] && wh[c.commodity].quantity >= c.quantity && wh[c.commodity].arrivalDay <= state.day) {
          const newW = { ...state.warehouse };
          newW[c.destinationIndex][c.commodity].quantity -= c.quantity;
          if (newW[c.destinationIndex][c.commodity].quantity <= 0) delete newW[c.destinationIndex][c.commodity];
          if (Object.keys(newW[c.destinationIndex]).length === 0) delete newW[c.destinationIndex];
          
          const newActive = state.activeContracts.map(ac => {
              if (ac.id === c.id) return { ...ac, status: 'completed' as const, dayCompleted: state.day };
              return ac;
          });

          setState(prev => prev ? ({
              ...prev,
              cash: prev.cash + c.reward,
              warehouse: newW,
              activeContracts: newActive,
              stats: { ...prev.stats, largestSingleWin: Math.max(prev.stats.largestSingleWin, c.reward) }
          }) : null);
          log(`CONTRACT: Manual fulfillment of ${c.firm} contract. Reward: ${formatCurrencyLog(c.reward)}`, 'profit');
          SFX.play('success');
      }
  };

  const showCommodityIntel = (name: string) => {
      if (!state) return;
      setModal({ type: 'commodity_intel', data: { name } });
      SFX.play('click');
  };

  const fabricateItem = (q: number) => {
    if (!state) return;
    const meshCost = 2000;
    const totalCost = q * meshCost;
    const h2oNeeded = q;
    const oreNeeded = q;
    const clothNeeded = q;
    const h2o = state.cargo[H2O_NAME]?.quantity || 0;
    const ore = state.cargo['Titanium Ore']?.quantity || 0;
    const cloth = state.cargo['Synthetic Cloth']?.quantity || 0;

    if (state.cash < totalCost) return setModal({type:'message', data: "Insufficient funds."});
    if (h2o < h2oNeeded || ore < oreNeeded || cloth < clothNeeded) return setModal({type:'message', data: "Insufficient resources."});

    const newCargo = { ...state.cargo };
    newCargo[H2O_NAME].quantity -= h2oNeeded;
    if (newCargo[H2O_NAME].quantity <= 0) delete newCargo[H2O_NAME];
    newCargo['Titanium Ore'].quantity -= oreNeeded;
    if (newCargo['Titanium Ore'].quantity <= 0) delete newCargo['Titanium Ore'];
    newCargo['Synthetic Cloth'].quantity -= clothNeeded;
    if (newCargo['Synthetic Cloth'].quantity <= 0) delete newCargo['Synthetic Cloth'];

    const cData = COMMODITIES.find(c => c.name === MESH_NAME)!;
    const cur = newCargo[MESH_NAME] || { quantity: 0, averageCost: 0 };
    const newTotal = cur.quantity + q;
    const newAvg = ((cur.quantity * cur.averageCost) + (q * 0)) / newTotal;
    newCargo[MESH_NAME] = { quantity: newTotal, averageCost: newAvg };

    const weightDelta = (q * cData.unitWeight) - (h2oNeeded * 1.0) - (oreNeeded * 5.0) - (clothNeeded * 0.25);

    setState(prev => prev ? ({
      ...prev,
      cash: prev.cash - totalCost,
      cargo: newCargo,
      cargoWeight: prev.cargoWeight + weightDelta,
      fomoDailyUse: { ...prev.fomoDailyUse, mesh: true }
    }) : null);

    log(`FABRICATION: Created ${q} ${MESH_NAME}`, 'mining');
    setFomoQty('');
    SFX.play('success');
  };

  const fabricateStimPacks = (q: number) => {
    if (!state) return;
    const processFee = 200;
    const totalCost = q * processFee;
    const h2oNeeded = q;
    const pasteNeeded = q * 2;
    const medKitsNeeded = q;
    
    const h2o = state.cargo[H2O_NAME]?.quantity || 0;
    const paste = state.cargo[NUTRI_PASTE_NAME]?.quantity || 0;
    const medKits = state.cargo['Medical Kits']?.quantity || 0;

    if (state.cash < totalCost) return setModal({type:'message', data: "Insufficient funds."});
    if (h2o < h2oNeeded || paste < pasteNeeded || medKits < medKitsNeeded) return setModal({type:'message', data: "Insufficient resources."});

    const newCargo = { ...state.cargo };
    newCargo[H2O_NAME].quantity -= h2oNeeded;
    if (newCargo[H2O_NAME].quantity <= 0) delete newCargo[H2O_NAME];
    newCargo[NUTRI_PASTE_NAME].quantity -= pasteNeeded;
    if (newCargo[NUTRI_PASTE_NAME].quantity <= 0) delete newCargo[NUTRI_PASTE_NAME];
    newCargo['Medical Kits'].quantity -= medKitsNeeded;
    if (newCargo['Medical Kits'].quantity <= 0) delete newCargo['Medical Kits'];

    const cData = COMMODITIES.find(c => c.name === 'Stim-Packs')!;
    const cur = newCargo['Stim-Packs'] || { quantity: 0, averageCost: 0 };
    const newTotal = cur.quantity + q;
    const newAvg = ((cur.quantity * cur.averageCost) + (q * 0)) / newTotal;
    newCargo['Stim-Packs'] = { quantity: newTotal, averageCost: newAvg };

    const weightDelta = (q * cData.unitWeight) - (h2oNeeded * 1.0) - (pasteNeeded * 0.5) - (medKitsNeeded * 0.01);

    setState(prev => prev ? ({
      ...prev,
      cash: prev.cash - totalCost,
      cargo: newCargo,
      cargoWeight: prev.cargoWeight + weightDelta,
      fomoDailyUse: { ...prev.fomoDailyUse, stims: true }
    }) : null);

    log(`FABRICATION: Synthesized ${q} Stim-Packs`, 'mining');
    setFomoStimQty('');
    SFX.play('success');
  };

  const sellWarehouseItem = (vIdx: number, name: string, q: number) => {
      if (!state) return;
      const whItem = state.warehouse[vIdx]?.[name];
      if (!whItem || whItem.quantity < q) return;

      const price = state.markets[vIdx][name].price;
      const revenue = q * price;
      const profit = revenue - (q * whItem.originalAvgCost);

      const newW = { ...state.warehouse };
      newW[vIdx][name].quantity -= q;
      if (newW[vIdx][name].quantity <= 0) delete newW[vIdx][name];
      if (Object.keys(newW[vIdx]).length === 0) delete newW[vIdx];

      setState(prev => prev ? ({
          ...prev,
          cash: prev.cash + revenue,
          warehouse: newW,
          stats: { ...prev.stats, largestSingleWin: Math.max(prev.stats.largestSingleWin, revenue) }
      }) : null);

      log(`REMOTE SELL: Sold ${q} ${name} at ${VENUES[vIdx]} for ${formatCurrencyLog(revenue)}.`, profit > 0 ? 'profit' : 'danger');
      SFX.play('coin');
      setModal({type: 'comms', data: null});
  };

  const claimWarehouseItem = (vIdx: number, name: string, q: number) => {
      if (!state) return;
      const whItem = state.warehouse[vIdx]?.[name];
      if (!whItem || whItem.quantity < q) return;

      const c = COMMODITIES.find(x => x.name === name)!;
      const weight = q * c.unitWeight;

      if (state.cargoWeight + weight > state.cargoCapacity) {
          SFX.play('error');
          return setModal({type:'message', data: "Insufficient cargo capacity to claim items."});
      }

      const newW = { ...state.warehouse };
      newW[vIdx][name].quantity -= q;
      if (newW[vIdx][name].quantity <= 0) delete newW[vIdx][name];
      if (Object.keys(newW[vIdx]).length === 0) delete newW[vIdx];

      const newCargo = { ...state.cargo };
      const cur = newCargo[name] || { quantity: 0, averageCost: 0 };
      const newTotal = cur.quantity + q;
      const newAvg = ((cur.quantity * cur.averageCost) + (q * whItem.originalAvgCost)) / newTotal;
      newCargo[name] = { quantity: newTotal, averageCost: newAvg };

      setState(prev => prev ? ({
          ...prev,
          cargo: newCargo,
          warehouse: newW,
          cargoWeight: prev.cargoWeight + weight
      }) : null);

      log(`LOGISTICS: Claimed ${q} ${name} from ${VENUES[vIdx]} storage.`, 'buy');
      setClaimQuantities(prev => ({...prev, [name]: ''}));
      SFX.play('success');
  };

  const forwardWarehouseItem = (vIdx: number, name: string) => {
      if (!state) return;
      setLogisticsTab('shipping');
      setShippingSource({ [name]: { type: 'warehouse', venueIdx: vIdx } });
      const whItem = state.warehouse[vIdx]?.[name];
      if (whItem) {
          setShippingQuantities({ [name]: whItem.quantity.toString() });
      }
      setHighlightShippingItem(name);
      SFX.play('click');
  };

  const setMaxBuy = (c: Commodity, mItem: any) => {
    SFX.play('click');
    if (!state) return;
    const cashMax = Math.floor(state.cash / mItem.price);
    const val = Math.max(0, Math.min(cashMax, mItem.quantity));
    setBuyQuantities(prev => ({...prev, [c.name]: val.toString()}));
  };

  const calculateFullRepairCost = () => {
    if (!state) return 0;
    if (state.shipHealth >= MAX_REPAIR_HEALTH) return 0;
    const needed = Math.ceil((MAX_REPAIR_HEALTH - state.shipHealth) / REPAIR_INCREMENT);
    return needed * REPAIR_COST;
  };

  const calculateFullLaserRepairCost = () => {
    if (!state) return 0;
    if (state.laserHealth >= 100) return 0;
    const needed = Math.ceil((100 - state.laserHealth) / REPAIR_INCREMENT);
    return needed * LASER_REPAIR_COST;
  };

  // --- BLOCK 5: UI RENDER ----------------------------------------------------

  if (!state) return <div className="text-center text-white p-10 font-scifi">Loading <span className="bg-yellow-400 text-black px-1">v5.9.4</span>...</div>;

  const currentMarketLocal = state.markets[state.currentVenueIndex];
  const phaseMultiplier = 1 + ((state.gamePhase - 1) * 0.25);
  const netWorth = getNetWorth(state);
  const goalAmt = state.gamePhase===1 ? GOAL_PHASE_1_AMOUNT : (state.gamePhase===2 ? GOAL_PHASE_2_AMOUNT : (state.gamePhase === 3 ? GOAL_PHASE_3_AMOUNT : 0)); 
  const deadlineLimit = state.gamePhase===1 ? GOAL_PHASE_1_DAYS : (state.gamePhase === 2 ? GOAL_PHASE_2_DAYS : (state.gamePhase === 3 ? GOAL_PHASE_3_DAYS : GOAL_OVERTIME_DAYS));
  const totalDebt = state.activeLoans.reduce((a,b)=>a+b.currentDebt,0);
  const totalInv = state.investments.reduce((a,b)=>a+b.amount,0);
  const isOverfilled = state.cargoWeight > state.cargoCapacity;

  const renderTerminalContent = () => {
      if (!state) return null;

      if (modal.type === 'tutorial_popup') {
          return (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center max-w-3xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-300">
                   <div className="bg-yellow-500 text-black px-4 py-1 font-bold text-sm rounded-full mb-2 uppercase">Neural Link Established</div>
                   <h2 className="text-3xl font-bold text-white tracking-tight">{modal.data.title}</h2>
                   <p className="text-gray-300 text-lg leading-relaxed whitespace-pre-wrap">{modal.data.text}</p>
                   {TUTORIAL_QUOTES[modal.data.feature] && (<div className={`p-4 bg-slate-800/50 rounded-xl italic text-sm ${TUTORIAL_QUOTES[modal.data.feature].color} border-l-4 ${TUTORIAL_QUOTES[modal.data.feature].color.replace('text-', 'border-')}`}>"{TUTORIAL_QUOTES[modal.data.feature].text}" <br/> - {TUTORIAL_QUOTES[modal.data.feature].author}</div>)}
                   <button onClick={()=>{ 
                       setState(prev => { 
                           if(!prev) return null; 
                           const newFlags = {...prev.tutorialFlags, [modal.data.feature]: true}; 
                           return {...prev, tutorialFlags: newFlags}; 
                       }); 
                       modal.data.callback(); 
                   }} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 px-12 rounded-xl text-2xl shadow-xl action-btn uppercase">INITIATE SYSTEM</button>
              </div>
          );
      }

      if (modal.type === 'report') {
        return (
            <div className="flex flex-col h-full bg-black/40 p-4 md:p-8 animate-in fade-in duration-500">
                 <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                     <h2 className="text-3xl font-scifi text-yellow-500 uppercase tracking-widest">Daily Cycle Summary</h2>
                     <div className="text-xs text-white font-mono uppercase font-bold">CYCLE_D{state.day}_STATUS</div>
                 </div>
                 <div className="flex-grow overflow-y-auto custom-scrollbar space-y-4 mb-8">
                     {modal.data.quirky && (
                         <div className="bg-blue-900/20 border-l-4 border-blue-500 p-4 italic text-blue-100 text-lg font-mono">
                             "{modal.data.quirky.text}"
                         </div>
                     )}
                     <div className="space-y-2">
                         {modal.data.events.map((e: string, i: number) => (
                             <div key={i} className={`p-3 bg-slate-800/40 rounded-lg border border-gray-800 flex items-center ${getReportEventColorClass(e)}`}>
                                 <span className="mr-3 font-black opacity-20">[{i+1}]</span>
                                 <span className="text-sm md:text-base">{renderLogMessage(e)}</span>
                             </div>
                         ))}
                     </div>
                 </div>
                 <button onClick={() => { setModal({type:'none', data:null}); SFX.play('click'); window.speechSynthesis.cancel(); }} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl text-2xl shadow-xl action-btn uppercase">Proceed to Operations</button>
            </div>
        );
      }

      if (modal.type === 'venue_intel') {
        return (
            <div className="flex flex-col h-full p-4 md:p-8 bg-black/40 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <h2 className="text-3xl font-scifi text-blue-400 uppercase">{VENUES[modal.data.venueIdx]} Market Intel</h2>
                    <button onClick={()=>setModal({type:'travel', data:null})} className="text-red-500 hover:text-red-400"><XCircle size={32}/></button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar">
                    <table className="w-full text-left">
                        <thead className="bg-gray-800/90 text-gray-400 uppercase text-xs sticky top-0">
                            <tr><th className="p-4">Commodity</th><th className="p-4 text-right">Local Price</th><th className="p-4 text-right">Available Stock</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {COMMODITIES.map(c => {
                                const item = modal.data.market[c.name];
                                return (
                                    <tr key={c.name} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-bold text-white flex items-center gap-3"><span className="text-2xl">{c.icon === 'metal-lump' ? '🌑' : c.icon}</span>{c.name}</td>
                                        <td className="p-4 text-right"><PriceDisplay value={item.price} size="text-lg" compact /></td>
                                        <td className="p-4 text-right font-mono text-gray-400">{item.quantity}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
      }

      if (modal.type === 'commodity_intel') {
        const name = modal.data.name;
        const c = COMMODITIES.find(x=>x.name === name)!;
        return (
            <div className="flex flex-col h-full p-4 md:p-8 bg-black/40 animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <h2 className="text-3xl font-scifi text-cyan-400 uppercase">{name} Neural Intel</h2>
                    <button onClick={()=>{setModal({type:'shipping', data:null}); setLogisticsTab('shipping');}} className="text-red-500 hover:text-red-400"><XCircle size={32}/></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-grow overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                        <div className="bg-slate-800/50 p-6 rounded-3xl border border-cyan-500/20">
                            <h3 className="text-gray-400 uppercase text-[10px] font-black tracking-[0.3em] mb-4">Neural Profile</h3>
                            <div className="flex items-center gap-6 mb-4">
                                <div className="text-6xl p-4 bg-black/40 rounded-2xl border border-cyan-500/30">{c.icon === 'metal-lump' ? '🌑' : c.icon}</div>
                                <div>
                                    <div className="text-white font-black text-2xl uppercase">{c.name}</div>
                                    <div className="text-cyan-500 font-mono text-sm uppercase">Sector Rarity: {Math.round(c.rarity * 100)}%</div>
                                </div>
                            </div>
                            <div className="text-gray-300 text-sm italic leading-relaxed">System Analysis: A core commodity within the current sector cycle. Volatility remains locked within predictable neural thresholds.</div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-white font-bold uppercase tracking-widest text-sm border-l-2 border-cyan-500 pl-4">Sector Market Spreads</h3>
                        <div className="flex justify-between text-[10px] text-gray-500 uppercase font-black px-4">
                            <span>Venue</span>
                            <span>Local Stock / Price</span>
                        </div>
                        {state.markets.map((m, i) => {
                            const price = m[name].price;
                            const stock = m[name].quantity;
                            const isStored = state.warehouse[i]?.[name] !== undefined;

                            const h2oPasteMinMult = Math.pow(1.05, state.day);
                            const h2oPasteMaxMult = Math.pow(1.10, state.day);
                            let dMin = Math.round(c.minPrice * phaseMultiplier);
                            let dMax = Math.round(c.maxPrice * phaseMultiplier);
                            if (c.name === H2O_NAME || c.name === NUTRI_PASTE_NAME) {
                                dMin = Math.round(c.minPrice * h2oPasteMinMult);
                                dMax = Math.round(c.maxPrice * h2oPasteMaxMult);
                            }
                            const priceRangeAmt = dMax - dMin;
                            const relativePrice = (price - dMin) / priceRangeAmt;
                            let priceColorClass = 'text-yellow-400';
                            if (relativePrice <= 0.33) priceColorClass = 'text-green-400';
                            if (relativePrice >= 0.66) priceColorClass = 'text-red-400';

                            return (
                                <div key={i} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-gray-800 hover:border-cyan-500/20 transition-all">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-400 font-bold">{VENUES[i]}</span>
                                        {isStored && <span className="bg-blue-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded animate-pulse">STORED</span>}
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="text-xs text-gray-500 font-mono">Stock: <span className="text-white">{stock}</span></span>
                                        <div className={priceColorClass}><PriceDisplay value={price} size="text-md" compact /></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
      }

      if (modal.type === 'wiki') {
        const sections = [
            { title: "The Rusty Redeemer", icon: Anchor, content: "The RR Firefox 22 'RustyRedeemer' is a decommissioned cargo frigate of the 60/40 class. It consists of 60% oxidation and 40% hope. Originally designed for short-range hauling, its isotope hummers have been modified to handle the stress of phase-shifting market dynamics." },
            { title: "S.H.A.N.E. Protocols", icon: Shield, content: "Sector Health, Allocation, & Network Enforcement (S.H.A.N.E.) governs all trade lanes. They enforce the Galactic Overlord Decree (G.O.D.), which dictates that any trader failing to meet net-worth thresholds within specific time cycles will have their license revoked and their vessel reclaimed by the state." },
            { title: "Extraction Logic", icon: Zap, content: "Mining lasers (Upgrades Deck) allow for the harvesting of resources from asteroid belts during transit. Higher-tier lasers and 'Overload' toggles increase yield but drastically spike the risk of structural realignment failures or laser burnout. Yield is directly proportional to laser focal integrity." },
            { title: "F.O.M.O. Engineering", icon: Factory, content: "Fabricate Output Management Operations allows captains to synthesize raw materials into high-value commodities. Z@onflex Weave Mesh is critical for cargo bay expansions, while Stim-Packs are in high demand by biological colonies throughout the sector." },
            { title: "Void-Ex Logistics", icon: Truck, content: "Shipping goods across the void via Private or Corporate contracts is the most reliable way to secure multi-million credit payouts. Beware of auto-seizure policies: goods left in third-party warehouses for more than 3 cycles are sold to defray storage costs." }
        ];

        return (
            <div className="flex flex-col h-full bg-slate-900/40 p-4 md:p-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <h2 className="text-3xl font-scifi text-orange-400 uppercase tracking-widest">Sector Codex v5.9</h2>
                    <div className="text-[10px] text-gray-500 font-mono text-right uppercase leading-tight">Neural Reference System <br/>Database: UNRESTRICTED</div>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-6">
                    {sections.map((sec, i) => {
                        const SecIcon = sec.icon;
                        return (
                            <div key={i} className="bg-black/30 p-6 rounded-2xl border border-gray-800 group hover:border-orange-500/30 transition-all">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-orange-900/20 rounded-xl text-orange-400"><SecIcon size={24}/></div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tighter">{sec.title}</h3>
                                </div>
                                <p className="text-gray-400 font-mono text-sm leading-relaxed">{sec.content}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
      }
      
      if (modal.type === 'none') {
          if (!priorityAcknowledged) {
              return (
                  <div className="flex flex-col h-full bg-slate-900/80 p-8 space-y-6 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex justify-between items-start border-b border-cyan-900 pb-4">
                        <h2 className="text-4xl font-scifi text-cyan-400 tracking-tighter">Things to do First</h2>
                        <span className="text-[10px] text-cyan-800 font-mono uppercase mt-2">Directive: 098-ALPHA</span>
                      </div>
                      
                      <div className="space-y-6 text-xl md:text-2xl font-bold text-gray-200 leading-snug max-w-4xl">
                          <div className="flex items-start"><span className="text-cyan-500 mr-4 font-black">1.)</span> Take out another loan from I.B.A.N.K. Hub to continue trading.</div>
                          <div className="flex items-start"><span className="text-cyan-500 mr-4 font-black">2.)</span> Do some fabricating in the F.O.M.O deck.</div>
                          <div className="flex items-start"><span className="text-cyan-500 mr-4 font-black">3.)</span> Buy some commodities Low and stock up on fuel (Space Spice) and cells (Hot Isotope Hummers) to mine asteroids.</div>
                          <div className="flex items-start"><span className="text-cyan-500 mr-4 font-black">4.)</span> Buy a mining laser and protection for the ship from the upgrade deck.</div>
                          
                          <div className="bg-cyan-950/20 border-l-4 border-cyan-500 p-6 space-y-4">
                              <p className="text-yellow-400 font-black uppercase tracking-widest text-sm">Most important: Keep your Trading license for as many days as possible.</p>
                              <p className="text-emerald-400 font-black italic">Don't forget to buy commodities low and sell high.</p>
                          </div>
                      </div>

                      <div className="mt-auto pt-10 border-t border-cyan-900/30 flex flex-col items-center">
                          <div className="text-gray-500 font-mono text-[10px] uppercase tracking-[0.5em] mb-4">By order</div>
                          <div className="text-cyan-600 font-scifi text-lg md:text-2xl tracking-[0.2em] font-black uppercase text-center mb-8">Sector Health, Allocation, & Network Enforcement (S.H.A.N.E.).</div>
                          <button onClick={() => { setPriorityAcknowledged(true); SFX.play('success'); }} className="w-full md:w-1/2 bg-cyan-600 hover:bg-cyan-500 text-white font-black py-5 rounded-xl text-2xl shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all action-btn">ACKNOWLEDGE DIRECTIVE</button>
                      </div>
                  </div>
              );
          }

          return (
              <>
                <div className="flex justify-between items-center p-3 border-b border-gray-700 bg-gray-900/90 sticky top-0 z-20">
                    <h2 className="font-scifi text-blue-500 text-lg md:text-2xl w-1/3 text-left truncate">{VENUES[state.currentVenueIndex]}</h2>
                    <div className={`text-lg md:text-2xl font-scifi font-bold w-1/3 text-center flex justify-center items-center ${state.cash >= 0 ? 'text-green-500' : 'text-red-500'}`}><PriceDisplay value={state.cash} size="text-lg md:text-2xl" /></div>
                    <span className={`${isOverfilled ? 'text-red-500' : 'text-yellow-400'} text-sm md:text-xl font-bold font-mono w-1/3 text-right`}>{Math.round(state.cargoWeight)}/{state.cargoCapacity}T</span>
                </div>
                
                <div className="overflow-y-auto custom-scrollbar flex-grow p-2">
                    <table className="w-full border-collapse hidden md:table">
                        <thead className="bg-gray-800/90 text-gray-400 sticky top-0 z-10 text-base">
                            <tr>
                                <th className="p-2 text-left w-[20%]">Commodity</th>
                                <th className="p-2 text-left w-[20%]">Intel (Contract/Price)</th>
                                <th className="p-2 text-right w-[10%]">Price</th>
                                <th className="p-2 text-center w-[10%]">Stock</th>
                                <th className="p-2 text-center w-[10%]">Owned</th>
                                <th className="p-2 text-center w-[30%]">Action (Buy / Sell)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {COMMODITIES.map(c => {
                                const mItem = currentMarketLocal[c.name];
                                const owned = state.cargo[c.name] || {quantity:0, averageCost:0};
                                const activeContract = state.activeContracts.find(con => con.commodity === c.name && con.status === 'active');
                                const isCovered = activeContract ? isContractCovered(state, activeContract) : false;
                                const availableContract = !activeContract ? state.availableContracts.find(con => con.commodity === c.name) : null;
                                let minP=Infinity, maxP=0, minV='', maxV='';
                                state.markets.forEach((m, i) => {
                                    if(m[c.name].price < minP) { minP=m[c.name].price; minV=VENUES[i]; }
                                    if(m[c.name].price > maxP) { maxP=m[c.name].price; maxV=VENUES[i]; }
                                });
                                const h2oPasteMinMult = Math.pow(1.05, state.day);
                                const h2oPasteMaxMult = Math.pow(1.10, state.day);
                                let dMin = Math.round(c.minPrice * phaseMultiplier);
                                let dMax = Math.round(c.maxPrice * phaseMultiplier);
                                if (c.name === H2O_NAME || c.name === NUTRI_PASTE_NAME) {
                                    dMin = Math.round(c.minPrice * h2oPasteMinMult);
                                    dMax = Math.round(c.maxPrice * h2oPasteMaxMult);
                                }
                                const priceRangeAmt = dMax - dMin;
                                const relativePrice = (mItem.price - dMin) / priceRangeAmt;
                                let priceColorClass = 'text-yellow-400';
                                if (relativePrice <= 0.33) priceColorClass = 'text-green-400';
                                if (relativePrice >= 0.66) priceColorClass = 'text-red-400';

                                return (
                                    <tr key={c.name} className="hover:bg-gray-800/50 transition-colors">
                                        <td className="p-2">
                                            <div className="font-bold text-gray-200 flex items-center text-lg"><span className="mr-2 text-2xl">{c.icon === 'metal-lump' ? '🌑' : c.icon}</span> {c.name}</div>
                                            <div className="text-sm text-gray-500 mt-1 flex items-center">{c.unitWeight} T | Range: <PriceDisplay value={dMin} size="text-sm ml-1" compact /> - <PriceDisplay value={dMax} size="text-sm" compact /></div>
                                        </td>
                                        <td className="p-2 text-sm text-gray-500 align-top pt-3 text-left">
                                            {activeContract ? (
                                                isCovered ? (
                                                    <><div className="text-green-400 font-bold mb-1 flex items-center">READY TO FULFILL <span className="text-lg ml-1">✓</span></div><div className="text-green-400 flex items-center text-xs opacity-70">Low: <PriceDisplay value={minP} size="text-xs mx-1" compact /> @ {minV}</div><div className="text-red-400 flex items-center text-xs opacity-70">High: <PriceDisplay value={maxP} size="text-xs mx-1" compact /> @ {maxV}</div></>
                                                ) : (
                                                    <div className="text-yellow-400 font-bold">ACTIVE CONTRACT: Ship {activeContract.quantity} to {VENUES[activeContract.destinationIndex]}</div>
                                                )
                                            ) : (
                                                availableContract ? (
                                                    <div className="text-blue-400 font-bold">CONTRACT AVAIL: {availableContract.quantity} → {VENUES[availableContract.destinationIndex]} (<PriceDisplay value={availableContract.reward} size="text-sm" compact/>)</div>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="text-green-400 flex items-center">Low: <PriceDisplay value={minP} size="text-sm mx-1" compact /> @ {minV}</div>
                                                        <div className="text-red-400 flex items-center">High: <PriceDisplay value={maxP} size="text-sm mx-1" compact /> @ {maxV}</div>
                                                        {hasScanner(state) && (<div className="text-cyan-600 text-[10px] uppercase font-mono tracking-tighter">VOLATILITY: {Math.round(relativePrice*100)}% DETECTED</div>)}
                                                    </div>
                                                )
                                            )}
                                        </td>
                                        <td className={`p-2 text-right align-middle`}>
                                            <div className={`flex justify-end font-bold text-xl ${priceColorClass}`}>{Math.round(mItem.price).toLocaleString()} <StarCoin size={20} /></div>
                                        </td>
                                        <td className="p-2 text-center text-gray-400 text-lg align-middle">{mItem.quantity}</td>
                                        <td className="p-2 text-center align-middle">
                                            {owned.quantity > 0 ? (
                                                <div className="leading-tight flex flex-col items-center"><div className="text-white font-bold text-lg">{owned.quantity}</div><PriceDisplay value={(mItem.price-owned.averageCost)*owned.quantity} colored={true} size="text-sm" compact /></div>
                                            ) : <span className="text-gray-700">-</span>}
                                        </td>
                                        <td className="p-2 align-middle">
                                            <div className="flex flex-col space-y-2">
                                                <div className="flex space-x-1 items-center bg-gray-900/50 p-1 rounded"><input type="number" min="0" placeholder="Qty" className="w-20 bg-gray-800 text-white text-center rounded border border-gray-600 text-sm p-1.5" value={buyQuantities[c.name]||''} onChange={e=>setBuyQuantities({...buyQuantities, [c.name]: e.target.value})} /><button onClick={()=>setMaxBuy(c, mItem)} className="w-auto px-4 bg-gray-700 hover:bg-gray-600 text-sm text-white rounded py-1 action-btn">MAX</button><button onClick={()=>handleTrade('buy', c, mItem, owned)} className="w-auto px-4 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded font-bold py-1 action-btn">BUY</button>{availableContract && (<button onClick={() => acceptContract(availableContract)} className="w-auto px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded font-bold py-1 action-btn">ACCEPT</button>)}</div>
                                                <div className="flex space-x-1 items-center bg-gray-900/50 p-1 rounded"><input type="number" min="0" placeholder="Qty" className="w-20 bg-gray-800 text-white text-center rounded border border-gray-600 text-sm p-1.5" value={sellQuantities[c.name]||''} onChange={e=>setSellQuantities({...sellQuantities, [c.name]: e.target.value})} /><button onClick={()=>setSellQuantities({...sellQuantities, [c.name]: owned.quantity.toString()})} disabled={owned.quantity===0} className="w-auto px-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-sm text-white rounded py-1 action-btn">ALL</button><button onClick={()=>handleTrade('sell', c, mItem, owned)} disabled={owned.quantity===0} className="w-auto px-4 bg-green-700 hover:bg-green-600 disabled:opacity-30 text-white text-sm rounded font-bold py-1 action-btn">SELL</button>{activeContract && !isCovered && (<button onClick={() => handleFulfill(activeContract)} disabled={owned.quantity < activeContract.quantity} className="w-auto px-4 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:opacity-50 text-white text-sm rounded font-bold py-1 action-btn">FULFILL</button>)}</div>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
              </>
          );
      }

      if (modal.type === 'travel') {
          const currentMarketLocalMarket = state.markets[state.currentVenueIndex];
          const insuranceCost = Math.round(getCargoValue(state.cargo, currentMarketLocalMarket) * 0.02);
          const currentCells = state.cargo[POWER_CELL_NAME]?.quantity || 0;
          const currentFuel = state.cargo[FUEL_NAME]?.quantity || 0;
          const laserRepairCostVal = calculateFullLaserRepairCost();

          return (
              <div className="flex flex-col h-full bg-slate-900/60 p-4 md:p-6 space-y-4">
                  <div className="flex flex-col md:flex-row justify-start items-center mb-2 gap-3">
                      <h2 className="text-2xl font-scifi text-emerald-400 whitespace-nowrap">C.A.T. Station</h2>
                      
                      <div className="flex space-x-2 bg-black/40 px-3 py-1.5 rounded-full border border-emerald-500/30">
                          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">Cells : <span className="text-white font-mono text-xs">{currentCells}</span></div>
                          <div className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Fuel : <span className="text-white font-mono text-xs">{currentFuel}</span></div>
                      </div>

                      <div className="flex items-center gap-3 flex-grow ml-2">
                        {state.laserHealth === 100 ? (
                           <span className="text-emerald-400 font-bold text-[10px] uppercase animate-pulse">Optional Laser at 100%</span>
                        ) : (
                           <div className="flex items-center gap-3">
                             <span className="text-red-500 font-black text-[10px] uppercase animate-[shake_0.5s_infinite]">Warning !!! Laser at {state.laserHealth}% repair</span>
                             <button onClick={() => performRepair('laser')} className="bg-red-600 hover:bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded shadow-lg border-b-2 border-red-900 transition-all uppercase whitespace-nowrap">Repair Laser (<PriceDisplay value={laserRepairCostVal} size="text-[9px]" compact/>)</button>
                           </div>
                        )}
                      </div>

                      <button onClick={()=>{setModal({type:'none', data:null}); SFX.play('click');}} className="text-red-500 font-bold hover:text-red-400 ml-auto"><XCircle /></button>
                  </div>

                  <div className="bg-black/40 p-4 rounded border border-gray-700 mb-2 shrink-0">
                      <div className="text-emerald-400 font-bold text-sm mb-4 uppercase tracking-wider flex items-center"><Cpu size={16} className="mr-1"/> Flight Configuration Matrix</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <VerticalToggle label="Hull Insurance" checked={travelConfig.insurance} onChange={(e)=>setTravelConfig({...travelConfig, insurance: e.target.checked})} rightContent={<PriceDisplay value={insuranceCost} size="text-[10px]" compact />} />
                          
                          <VerticalToggle 
                            label="Mining Laser" 
                            disabled={!hasLaser(state)} 
                            checked={travelConfig.mining} 
                            onChange={(e)=>{
                                const isChecked = e.target.checked;
                                setTravelConfig(prev => ({
                                    ...prev, 
                                    mining: isChecked,
                                    overload: isChecked ? prev.overload : false 
                                }));
                            }} 
                          />
                          
                          <VerticalToggle 
                            label="Laser Overload" 
                            disabled={!hasLaser(state) || !travelConfig.mining} 
                            checked={travelConfig.overload} 
                            onChange={(e)=>setTravelConfig({...travelConfig, overload: e.target.checked})} 
                          />
                          
                          <VerticalToggle label="Deposit 95% of capital" disabled={state.activeLoans.length > 0} checked={travelConfig.invest95} onChange={(e)=>setTravelConfig({...travelConfig, invest95: e.target.checked})} />
                      </div>
                  </div>
                  <button onClick={() => handleTravel(state.currentVenueIndex, 0, false, false, false, false)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded mb-2 shrink-0 flex items-center justify-center border border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"><Hourglass size={20} className="mr-2 animate-pulse"/> Stay at {VENUES[state.currentVenueIndex]} & trade (advance day)</button>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto custom-scrollbar flex-grow p-1">
                      {VENUES.map((v, i) => {
                          if (i === state.currentVenueIndex) return null;
                          const dist = BASE_DISTANCE_MATRIX[state.currentVenueIndex][i];
                          const fuel = getFuelCost(state.currentVenueIndex, i, state.cargoWeight, state.gamePhase);
                          const missingFuel = Math.max(0, fuel - (state.cargo[FUEL_NAME]?.quantity||0));
                          
                          const laserLevel = state.equipment['laser_mk3'] ? 3 : (state.equipment['laser_mk2'] ? 2 : 1);
                          const cellsNeeded = travelConfig.mining ? (state.gamePhase * Math.pow(3, (laserLevel - 1))) : 0;
                          const missingCells = Math.max(0, cellsNeeded - (state.cargo[POWER_CELL_NAME]?.quantity||0));
                          
                          const autoBuyCost = (missingFuel * (state.markets[state.currentVenueIndex][FUEL_NAME]?.price||0)) + (missingCells * (state.markets[state.currentVenueIndex][POWER_CELL_NAME]?.price||0));
                          const risk = dist > 8 ? 'High' : (dist > 4 ? 'Med' : 'Low');
                          const riskColor = risk === 'High' ? 'text-red-500' : (risk === 'Med' ? 'text-yellow-500' : 'text-green-500');
                          const isBanned = state.venueTradeBans[i] > 0;
                          return (
                              <div key={i} className={`bg-slate-800 p-4 rounded-xl border-2 border-slate-700 flex flex-col justify-between hover:border-emerald-500/50 transition-all ${isBanned?'opacity-50 grayscale':''}`}>
                                  <div className="mb-4">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                              <div className="text-white font-bold text-lg leading-tight truncate">{v}</div>
                                              <button onClick={() => setModal({ type: 'venue_intel', data: { venueIdx: i, market: state.markets[i] } })} className="text-[10px] bg-blue-900 hover:bg-blue-800 border border-blue-500 text-blue-300 px-2 py-1 rounded font-black shrink-0">INTEL</button>
                                          </div>
                                          <div className={`text-[10px] font-bold px-2 py-1 rounded bg-black shrink-0 ${riskColor}`}>{risk} RISK {travelConfig.overload ? ' (CRITICAL)' : ''}</div>
                                      </div>
                                      <div className="text-gray-400 text-xs font-mono mb-2">{dist} Parsecs distance.</div>
                                      {isBanned && <div className="text-red-500 text-xs font-bold uppercase animate-pulse">TRADE BAN ACTIVE: {state.venueTradeBans[i]} DAYS</div>}
                                  </div>
                                  <div className="mt-auto space-y-3">
                                      <div className="flex justify-between text-xs bg-slate-900 p-2 rounded-lg border border-slate-700">
                                          <span className={missingFuel > 0 ? 'text-red-400 font-bold' : 'text-gray-300'}><Fuel size={14} className="inline mr-1"/>{fuel} Fuel</span>
                                          <span className={missingCells > 0 ? 'text-red-400 font-bold' : 'text-gray-300'}><Zap size={14} className="inline mr-1"/>{cellsNeeded} Cells</span>
                                      </div>
                                      <button onClick={()=>{
                                          if (isBanned) return;
                                          if (missingFuel > 0 || missingCells > 0) {
                                              const currentM = state.markets[state.currentVenueIndex];
                                              const fuelPrice = currentM[FUEL_NAME]?.price||0;
                                              const cellPrice = currentM[POWER_CELL_NAME]?.price||0;
                                              const cost = (missingFuel * fuelPrice) + (missingCells * cellPrice);
                                              if (state.cash < cost) { SFX.play('error'); return setModal({type:'message', data:"Insufficient funds for resources."}); }
                                              const newCargo = {...state.cargo};
                                              if(missingFuel > 0) { const curF = newCargo[FUEL_NAME] || {quantity:0, averageCost:0}; newCargo[FUEL_NAME] = { quantity: curF.quantity + missingFuel, averageCost: ((curF.quantity*curF.averageCost)+(missingFuel*fuelPrice))/(curF.quantity+missingFuel)}; }
                                              if(missingCells > 0) { const curC = newCargo[POWER_CELL_NAME] || {quantity:0, averageCost:0}; newCargo[POWER_CELL_NAME] = { quantity: curC.quantity + missingCells, averageCost: ((curC.quantity*curC.averageCost)+(missingCells*cellPrice))/(curC.quantity+missingCells)}; }
                                              setState(prev => prev ? ({ ...prev, cash: prev.cash - cost, cargo: newCargo, cargoWeight: prev.cargoWeight + (missingFuel*COMMODITIES.find(c=>c.name===FUEL_NAME)!.unitWeight) + (missingCells*COMMODITIES.find(c=>c.name===POWER_CELL_NAME)!.unitWeight) }) : null); SFX.play('coin');
                                          } else { handleTravel(i, fuel, travelConfig.insurance, travelConfig.mining, travelConfig.overload, travelConfig.invest95); }
                                      }} disabled={isBanned} className={`w-full font-bold py-3 rounded-xl text-sm transition-all border-b-4 ${(missingFuel > 0 || missingCells > 0) ? 'bg-red-700 hover:bg-red-600 text-red-100 border-red-900' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-900 shadow-lg'}`}>
                                          {(missingFuel > 0 || missingCells > 0) ? (
                                              <span className="flex items-center justify-center">BUY RESOURCES (<PriceDisplay value={autoBuyCost} size="text-[10px]" compact/>)</span>
                                          ) : `JUMP TO ${v.toUpperCase()}`}
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          );
      }

      if (modal.type === 'shop') {
          const groups = [
            { id: 'laser', name: 'Mining Laser Systems', icon: Zap, color: 'text-orange-400', items: ['laser_mk1', 'laser_mk2', 'laser_mk3'] },
            { id: 'scanner', name: 'Market Intelligence Scanners', icon: Radar, color: 'text-cyan-400', items: ['scanner'] },
            { id: 'shield', name: 'Hull Protection Arrays', icon: Shield, color: 'text-emerald-400', items: ['shield_gen_mk1', 'shield_gen_mk2', 'shield_gen_mk3'] },
            { id: 'cannon', name: 'Offensive Deterrent Systems', icon: Swords, color: 'text-red-400', items: ['plasma_cannon_mk1', 'plasma_cannon_mk2', 'plasma_cannon_mk3'] }
          ];

          return (
              <div className="p-4 md:p-6 custom-scrollbar overflow-y-auto h-full">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-2xl font-scifi text-purple-400">Fixathing'u'ma Jig Deck</h2>
                   <div className="flex-grow flex justify-center"><PriceDisplay value={state.cash} size="text-2xl" colored /></div>
                   <span className="text-xs text-gray-500 font-mono">MODULE: SHIP_REPAIR_v5.8.0</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                   <div className="bg-slate-800/80 p-4 rounded-xl border border-lime-700/50 shadow-lg">
                      <h3 className="text-lime-400 font-bold mb-4 flex items-center text-lg"><Wrench size={20} className="mr-2"/> Dockyard Repairs</h3>
                      <div className="space-y-4">
                          <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                             <span className="text-gray-300">Hull Integrity ({state.shipHealth}%)</span>
                             <button onClick={()=>performRepair('full_hull')} className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition-all ${state.shipHealth >= MAX_REPAIR_HEALTH ? 'bg-green-700/50 cursor-default' : 'bg-red-700 hover:bg-red-600 shadow-md border-b-4 border-red-900'}`}>{state.shipHealth >= MAX_REPAIR_HEALTH ? 'NOMINAL' : `Repair MAX (${formatCompactNumber(calculateFullRepairCost())})`}</button>
                          </div>
                          <div className="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5">
                             <span className="text-gray-300">Laser Realignment ({state.laserHealth}%)</span>
                             <button onClick={()=>performRepair('full_laser')} disabled={!hasLaser(state)} className={`px-4 py-2 rounded-lg text-white text-xs font-bold transition-all ${state.laserHealth >= 100 ? 'bg-green-700/50 cursor-default' : 'bg-red-700 hover:bg-red-600 shadow-md disabled:opacity-20 border-b-4 border-red-900'}`}>
                                {state.laserHealth >= 100 ? 'NOMINAL' : `Repair MAX (${formatCompactNumber(calculateFullLaserRepairCost())})`}
                            </button>
                          </div>
                          {state.warrantLevel > 0 && (
                            <div className="flex justify-between items-center bg-red-900/30 p-3 rounded-lg border border-red-500/30 animate-pulse">
                                <span className="text-red-400 font-bold flex items-center"><Skull size={14} className="mr-1"/> Warrant Bounty</span>
                                <button onClick={() => {
                                    const fee = state.warrantLevel * 25000;
                                    if (state.cash < fee) return setModal({type:'message', data: `Insufficient funds to clear bounty. Need ${formatCurrencyLog(fee)}.`});
                                    setState(prev => prev ? ({ ...prev, cash: prev.cash - fee, warrantLevel: 0 }) : null);
                                    SFX.play('success');
                                    log(`LEGAL: Warrants cleared via high-level bribe.`, 'profit');
                                }} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-black text-[10px] shadow-md uppercase">Clear: {formatCompactNumber(state.warrantLevel * 25000)}</button>
                            </div>
                          )}
                      </div>
                   </div>

                   <div className="bg-slate-800/80 p-4 rounded-xl border border-blue-700/50 shadow-lg">
                      <div className="flex justify-between items-start mb-4">
                          <div className="text-white font-bold text-lg flex items-center"><Box size={20} className="mr-2 text-blue-400"/>Cargo Expansion</div>
                          <div className="text-[10px] text-gray-400 font-mono text-right">CURRENT: {state.cargoCapacity}T<br/>MAX: {getMaxCargo(state.gamePhase)}T</div>
                      </div>
                      <div className="text-xs text-gray-400 mb-4 bg-black/20 p-2 rounded border border-white/5">
                          {state.cargoCapacity < 5000 && <p className="text-blue-300">Tier 1: <PriceDisplay value={2000} size="text-xs"/> + 1 {MESH_NAME} / 100T</p>}
                          {state.cargoCapacity >= 5000 && state.cargoCapacity < 50000 && <p className="text-purple-300">Tier 2: <PriceDisplay value={5000} size="text-xs"/> + 3 {MESH_NAME} / 100T</p>}
                          {state.cargoCapacity >= 50000 && state.cargoCapacity < 250000 && <p className="text-orange-300">Tier 3: <PriceDisplay value={10000} size="text-xs"/> + 5 {MESH_NAME} / 100T</p>}
                          {state.cargoCapacity >= 250000 && <p className="text-yellow-400 font-bold animate-pulse">Tier 4: <PriceDisplay value={15000} size="text-xs"/> + 5 {MESH_NAME} / 100T</p>}
                      </div>
                      <div className="flex gap-3 items-center">
                          <input type="number" min="1" className="w-20 bg-gray-900 text-white text-center rounded-lg border border-gray-700 text-lg p-2" value={cargoUpgradeQty || ''} onChange={e=>setCargoUpgradeQty(e.target.value)} />
                          <button onClick={() => {
                              let upgradeCostAmt = 2000; let meshReqAmt = 1;
                              if (state.cargoCapacity >= 250000) { upgradeCostAmt = 15000; meshReqAmt = 5; }
                              else if (state.cargoCapacity >= 50000) { upgradeCostAmt = 10000; meshReqAmt = 5; }
                              else if (state.cargoCapacity >= 5000) { upgradeCostAmt = 5000; meshReqAmt = 3; }
                              const meshOwned = state.cargo[MESH_NAME]?.quantity || 0;
                              const cashMaxUpgrade = Math.floor(state.cash / upgradeCostAmt);
                              const capMaxUpgrade = (getMaxCargo(state.gamePhase) - state.cargoCapacity) / 100;
                              const meshMaxUpgrade = Math.floor(meshOwned / meshReqAmt);
                              const maxPossibleUpgrade = Math.max(0, Math.floor(Math.min(meshMaxUpgrade, cashMaxUpgrade, capMaxUpgrade)));
                              setCargoUpgradeQty(maxPossibleUpgrade.toString());
                          }} className="bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-lg text-white text-xs font-bold transition-colors">MAX</button>
                          <button onClick={() => {
                              const qtyVal = parseInt(cargoUpgradeQty);
                              if (isNaN(qtyVal) || qtyVal <= 0) return;
                              let costPerAmt = 2000; let meshPerAmt = 1;
                              if (state.cargoCapacity >= 250000) { costPerAmt = 15000; meshPerAmt = 5; }
                              else if (state.cargoCapacity >= 50000) { costPerAmt = 10000; meshPerAmt = 5; }
                              else if (state.cargoCapacity >= 5000) { costPerAmt = 5000; meshPerAmt = 3; }
                              const totalUpgradeCost = qtyVal * costPerAmt;
                              const totalMeshReq = qtyVal * meshPerAmt;
                              const newCapacityAmt = state.cargoCapacity + (qtyVal * 100);
                              if (newCapacityAmt > getMaxCargo(state.gamePhase)) { SFX.play('error'); return setModal({type:'message', data: "Exceeds Max Capacity."}); }
                              if (state.cash < totalUpgradeCost) { SFX.play('error'); return setModal({type:'message', data: "Insufficient Cash."}); }
                              if ((state.cargo[MESH_NAME]?.quantity||0) < totalMeshReq) { SFX.play('error'); return setModal({type:'message', data: `Insufficient ${MESH_NAME}. Need ${totalMeshReq}.`}); }
                              const newCargoDict = {...state.cargo};
                              newCargoDict[MESH_NAME].quantity = Math.max(0, newCargoDict[MESH_NAME].quantity - totalMeshReq);
                              if (newCargoDict[MESH_NAME].quantity <= 0) delete newCargoDict[MESH_NAME];
                              setState(prev => prev ? ({...prev, cash: prev.cash - totalUpgradeCost, cargo: newCargoDict, cargoCapacity: newCapacityAmt, cargoWeight: prev.cargoWeight - (totalMeshReq * 2.5)}) : null);
                              setCargoUpgradeQty('1'); SFX.play('success'); log(`UPGRADES: Expanded Cargo Bay by ${qtyVal*100}T.`, 'buy');
                          }} className="flex-grow bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded-xl text-white font-bold shadow-lg action-btn border-b-4 border-blue-900">INSTALL EXPANSION</button>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {groups.map(group => {
                        const GroupIcon = group.icon;
                        const ownedItemsIds = group.items.filter(id => state.equipment[id]);
                        const nextUpgradeId = group.items.find(id => !state.equipment[id]);
                        const nextUpgradeItem = nextUpgradeId ? SHOP_ITEMS.find(s => s.id === nextUpgradeId) : null;
                        const highestOwnedUpgrade = ownedItemsIds.length > 0 ? SHOP_ITEMS.find(s => s.id === ownedItemsIds[ownedItemsIds.length-1]) : null;

                        return (
                            <div key={group.id} className="bg-slate-800/60 p-5 rounded-2xl border border-slate-700 flex flex-col justify-between hover:border-purple-500/30 transition-all shadow-md">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className={`flex items-center font-bold text-lg ${group.color}`}><GroupIcon className="mr-2" size={24}/> {group.name}</div>
                                        <div className="flex gap-1">
                                            {group.items.map((id) => (
                                                <Circle key={id} size={12} fill={state.equipment[id] ? '#10b981' : '#334155'} className={state.equipment[id] ? 'text-emerald-500' : 'text-slate-700'} />
                                            ))}
                                        </div>
                                    </div>

                                    {highestOwnedUpgrade ? (
                                        <div className="mb-4 p-3 bg-black/30 rounded-xl border border-white/5">
                                            <div className="text-white font-bold text-sm uppercase tracking-widest mb-1">Active: {highestOwnedUpgrade.name}</div>
                                            <div className="text-xs text-gray-400 italic">Level {highestOwnedUpgrade.level} System Operational. {highestOwnedUpgrade.description}</div>
                                        </div>
                                    ) : (
                                        <div className="mb-4 p-3 bg-red-900/10 rounded-xl border border-red-500/20 text-red-300 text-xs italic">No system installed. Vessel vulnerable.</div>
                                    )}

                                    {nextUpgradeItem ? (
                                        <div className="p-4 bg-slate-900/50 rounded-xl border border-purple-500/20">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="text-purple-300 font-bold text-sm">UPGRADE: {nextUpgradeItem.name}</div>
                                                <PriceDisplay value={nextUpgradeItem.cost * (nextUpgradeItem.type === 'defense' ? state.gamePhase : 1)} size="text-sm" compact />
                                            </div>
                                            <div className="text-xs text-gray-500 mb-4">{nextUpgradeItem.description}</div>
                                            <button 
                                                onClick={() => buyEquipment(nextUpgradeItem)}
                                                disabled={state.cash < (nextUpgradeItem.cost * (nextUpgradeItem.type === 'defense' ? state.gamePhase : 1))}
                                                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-md border-b-4 border-purple-900 action-btn"
                                            >
                                                INITIATE UPGRADE
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-emerald-900/10 rounded-xl border border-emerald-500/20 text-center">
                                            <div className="text-emerald-400 font-bold text-sm uppercase tracking-tighter">MAXIMUM LEVEL ACHIEVED</div>
                                            <div className="text-[10px] text-emerald-600 mt-1 uppercase font-mono">System Optimized for Phase {state.gamePhase}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
              </div>
          );
      }

      if (modal.type === 'fomo') {
          const availResources = [H2O_NAME, NUTRI_PASTE_NAME, "Medical Kits", "Titanium Ore", "Synthetic Cloth"];
          return (
              <div className="p-4 md:p-8 flex h-full gap-8 max-w-full overflow-hidden">
                   <div className="w-56 flex flex-col shrink-0 overflow-y-auto custom-scrollbar bg-black/20 p-4 rounded-3xl border border-orange-500/20">
                        <h3 className="text-orange-400 font-scifi text-lg mb-6 uppercase border-b border-orange-500/40 pb-2">Commodities</h3>
                        <div className="space-y-4">
                            {availResources.map(name => {
                                const qtyOwned = state.cargo[name]?.quantity || 0;
                                return (
                                    <div key={name} className="bg-slate-900/60 p-3 rounded-xl border border-gray-700 shadow-inner flex flex-col">
                                        <span className="text-gray-400 text-[10px] uppercase font-bold mb-1 tracking-widest">{name}</span>
                                        <span className="text-white font-mono text-xl">{qtyOwned}</span>
                                    </div>
                                );
                            })}
                        </div>
                   </div>

                   <div className="flex-grow flex flex-col overflow-y-auto custom-scrollbar relative pt-10">
                        <div className="absolute top-0 right-0 w-72 text-[10px] text-orange-600 font-mono text-right italic leading-tight uppercase opacity-70">
                            SYSTEM LOG: FABRICATION MATRIX v5.9 ACTIVE
                        </div>

                        <div className="text-center space-y-2 mb-10">
                            <h2 className="text-5xl font-scifi text-orange-400 uppercase tracking-tighter">F.O.M.O. Fabrication</h2>
                            <p className="text-orange-600 font-mono text-sm tracking-widest uppercase italic">Sector Efficiency Matrix</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                            <div className="bg-slate-800/80 p-8 rounded-3xl border border-orange-500/30 flex flex-col justify-between hover:border-orange-500/60 transition-all shadow-xl min-h-[380px]">
                                <div className="space-y-4 mb-8">
                                    <h3 className="text-2xl font-bold text-white flex items-center"><Box className="mr-3 text-orange-400"/> {MESH_NAME}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">Advanced structural weaving for cargo expansion modules. Essential for ship upgrades.</p>
                                    <div className="bg-black/40 p-4 rounded-2xl border border-orange-500/10 space-y-1.5">
                                        <div className="flex justify-between text-xs"><span className="text-gray-500 uppercase font-bold">Input A:</span><span className="text-white font-bold">1x {H2O_NAME}</span></div>
                                        <div className="flex justify-between text-xs"><span className="text-gray-500 uppercase font-bold">Input B:</span><span className="text-white font-bold">1x Titanium Ore</span></div>
                                        <div className="flex justify-between text-xs"><span className="text-gray-500 uppercase font-bold">Input C:</span><span className="text-white font-bold">1x Synthetic Cloth</span></div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-900 mt-2"><span className="text-gray-500 uppercase font-bold">Power Charge:</span><PriceDisplay value={2000} size="text-sm"/></div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <input type="number" placeholder="Qty" className="w-32 bg-gray-900 text-white text-center rounded-xl border border-gray-700 text-2xl font-bold p-3" value={fomoQty || ''} onChange={e=>setFomoQty(e.target.value)} />
                                    <button onClick={()=>{ 
                                        const h2oAmt = state.cargo[H2O_NAME]?.quantity || 0;
                                        const oreAmt = state.cargo['Titanium Ore']?.quantity || 0; 
                                        const clothAmt = state.cargo['Synthetic Cloth']?.quantity || 0; 
                                        const cashMaxAmt = Math.floor(state.cash / 2000); 
                                        const maxFab = Math.max(0, Math.min(h2oAmt, oreAmt, clothAmt, cashMaxAmt)); 
                                        setFomoQty(maxFab.toString()); 
                                    }} className="bg-gray-700 hover:bg-gray-600 px-4 rounded-xl text-white font-bold text-sm uppercase transition-colors">MAX</button>
                                    <button onClick={()=>{ const qVal = parseInt(fomoQty); if(!isNaN(qVal) && qVal>0) fabricateItem(qVal); }} disabled={state.fomoDailyUse.mesh} className="flex-grow bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-black rounded-xl text-xl shadow-lg action-btn uppercase">{state.fomoDailyUse.mesh ? 'LOCKOUT' : 'FABRICATE'}</button>
                                </div>
                            </div>

                            <div className="bg-slate-800/80 p-8 rounded-3xl border border-orange-500/30 flex flex-col justify-between hover:border-orange-500/60 transition-all shadow-xl min-h-[380px]">
                                <div className="space-y-4 mb-8">
                                    <h3 className="text-2xl font-bold text-white flex items-center"><Pill className="mr-3 text-orange-400"/> Stim-Packs</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">Medical Grade adrenaline synthesizers. Highly valuable for biological trade hubs.</p>
                                    <div className="bg-black/40 p-4 rounded-2xl border border-orange-500/10 space-y-1.5">
                                        <div className="flex justify-between text-xs"><span className="text-gray-500 uppercase font-bold">Input A:</span><span className="text-white font-bold">1x {H2O_NAME}</span></div>
                                        <div className="flex justify-between text-xs"><span className="text-gray-500 uppercase font-bold">Input B:</span><span className="text-white font-bold">2x {NUTRI_PASTE_NAME}</span></div>
                                        <div className="flex justify-between text-xs"><span className="text-gray-500 uppercase font-bold">Input C:</span><span className="text-white font-bold">1x Medical Kits</span></div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-gray-900 mt-2"><span className="text-gray-500 uppercase font-bold">Process Fee:</span><PriceDisplay value={200} size="text-sm"/></div>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <input type="number" placeholder="Qty" className="w-32 bg-gray-900 text-white text-center rounded-xl border border-gray-700 text-2xl font-bold p-3" value={fomoStimQty || ''} onChange={e=>setFomoStimQty(e.target.value)} />
                                    <button onClick={()=>{ 
                                        const h2oAmt = state.cargo[H2O_NAME]?.quantity || 0; 
                                        const pasteAmt = state.cargo[NUTRI_PASTE_NAME]?.quantity || 0; 
                                        const kitsAmt = state.cargo['Medical Kits']?.quantity || 0;
                                        const cashMaxAmt = Math.floor(state.cash / 200); 
                                        const maxFab = Math.max(0, Math.min(h2oAmt, Math.floor(pasteAmt/2), kitsAmt, cashMaxAmt)); 
                                        setFomoStimQty(maxFab.toString()); 
                                    }} className="bg-gray-700 hover:bg-gray-600 px-4 rounded-xl text-white font-bold text-sm uppercase transition-colors">MAX</button>
                                    <button onClick={()=>{ const qVal = parseInt(fomoStimQty); if(!isNaN(qVal) && qVal>0) fabricateStimPacks(qVal); }} disabled={state.fomoDailyUse.stims} className="flex-grow bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 text-white font-black rounded-xl text-xl shadow-lg action-btn uppercase">{state.fomoDailyUse.stims ? 'LOCKOUT' : 'SYNTHESIZE'}</button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-12 text-center">
                            <span className="text-xl md:text-2xl text-orange-900 font-black uppercase tracking-[0.3em] animate-pulse">WARNING: Batch Limit Policy Enforced.</span>
                        </div>
                   </div>
              </div>
          );
      }

      if (modal.type === 'banking') {
          return (
              <div className="p-4 md:p-8 h-full flex flex-col animate-in fade-in duration-300">
                  <div className="grid grid-cols-3 items-center mb-6 border-b border-gray-700 pb-4">
                    <h2 className="text-3xl font-scifi text-yellow-500 tracking-tighter">I.B.A.N.K. Hub</h2>
                    <div className="flex justify-center"><PriceDisplay value={state.cash} size="text-2xl" colored /></div>
                    <div className="text-right">
                        <div className="text-[10px] text-yellow-600 font-mono uppercase tracking-widest font-black">Node: Star-Bank-TX-34</div>
                        <div className="text-[10px] text-yellow-600 font-mono uppercase font-black">Status: Connected</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-grow overflow-y-auto custom-scrollbar">
                       <div className="space-y-6">
                           <h3 className="text-xl font-bold text-white flex items-center border-l-4 border-red-500 pl-4 uppercase tracking-widest">Liabilities</h3>
                           {state.activeLoans.length === 0 && <div className="p-8 border border-dashed border-gray-700 rounded-2xl text-gray-500 text-center italic">No outstanding credit.</div>}
                           {state.activeLoans.map((l, i) => {
                               const feeAmt = Math.round(l.principal * 0.02 * l.daysRemaining);
                               const totalRepayAmt = l.currentDebt + feeAmt;
                               return (
                                   <div key={l.id} className="bg-red-900/10 p-5 rounded-2xl border border-red-500/30 shadow-inner">
                                       <div className="flex justify-between items-center mb-4"><span className="text-white font-black text-xl">{l.firmName}</span><PriceDisplay value={l.currentDebt} size="text-xl" /></div>
                                       <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                           <div className="text-gray-400 uppercase tracking-widest text-[10px]">Time Remaining: <span className="text-white block text-sm font-bold">{l.daysRemaining} days</span></div>
                                           <div className="text-gray-400 uppercase tracking-widest text-[10px]">Early Settlement: <span className="text-orange-400 block text-sm font-bold"><PriceDisplay value={feeAmt} size="text-sm" compact/></span></div>
                                       </div>
                                       <button onClick={()=>{ if(state.cash < totalRepayAmt) { SFX.play('error'); return setModal({type:'message', data:`Insufficient funds. Need ${formatCurrencyLog(totalRepayAmt)}`}); } const newLoans=[...state.activeLoans]; newLoans.splice(i,1); setState(prev=>prev?({...prev, cash:prev.cash-totalRepayAmt, activeLoans:newLoans}):null); SFX.play('coin'); log(`LOAN: Repaid ${l.firmName} (${formatCurrencyLog(l.currentDebt)} + ${formatCurrencyLog(feeAmt)} fee)`, 'buy'); }} className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl transition-all shadow-md uppercase">SETTLE DEBT (<PriceDisplay value={totalRepayAmt} size="text-sm" compact/>)</button>
                                   </div>
                               );
                           })}
                           <div className="pt-6 border-t border-gray-800">
                               <h4 className="text-blue-400 font-bold mb-4 flex items-center text-lg uppercase"><Shield className="mr-2" size={20}/> Available Credit</h4>
                               <div className="space-y-3">
                                   {state.activeLoans.length >= 3 ? <div className="p-4 bg-red-900/20 rounded-xl text-red-400 italic text-center">Regulatory credit block: Maximum loan limit (3) reached.</div> : state.loanOffers.map((o,i)=>{ const alreadyOwe = state.activeLoans.some(l=>l.firmName===o.firmName); const dailyLimitHit = state.loanTakenToday; return (<div key={i} className={`bg-slate-800/50 p-4 rounded-xl flex justify-between items-center border border-transparent transition-all ${(alreadyOwe || dailyLimitHit) ? 'opacity-30' : 'hover:border-blue-500/50'}`}><div><div className="text-white font-bold text-lg">{o.firmName}</div><div className="text-gray-400 text-xs flex items-center"><PriceDisplay value={o.amount} size="text-xs mr-2"/> @ {o.interestRate.toFixed(1)}% APR</div></div><button onClick={()=>{ if(state.activeLoans.length>=3 || alreadyOwe || state.loanTakenToday) return; 
                                   // Fix: Corrected assignment of o.firmName (string) to loanEntry.firmName instead of o.amount (number)
                                   const loanEntry = {id:Date.now(), firmName:o.firmName, principal:o.amount, currentDebt:o.amount, interestRate:o.interestRate, daysRemaining:5, originalDay:state.day}; setState(prev=>prev?({...prev, cash:prev.cash+o.amount, activeLoans:[...prev.activeLoans, loanEntry], loanTakenToday:true}):null); SFX.play('coin'); log(`LOAN: Secured ${formatCurrencyLog(o.amount)} from ${o.firmName}`, 'buy'); }} disabled={alreadyOwe || dailyLimitHit} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-6 py-2 rounded-xl font-black uppercase text-xs transition-all">DRAW FUNDS</button></div>);})}
                               </div>
                           </div>
                       </div>
                       <div className="space-y-6">
                           <h3 className="text-xl font-bold text-white flex items-center border-l-4 border-green-500 pl-4 uppercase tracking-widest">Capital Growth</h3>
                           {state.investments.length > 0 && (<div className="space-y-3">{state.investments.map(inv => (<div key={inv.id} className="bg-green-900/10 border border-green-500/30 p-5 rounded-2xl flex justify-between items-center shadow-inner animate-pulse"><div className="text-sm"><span className="text-gray-400 block uppercase text-[9px] tracking-widest font-black">Mature In</span><span className="text-green-400 font-black text-xl">{inv.daysRemaining} Days</span></div><div className="text-right"><span className="text-gray-400 block uppercase text-[9px] tracking-widest font-black">Value</span><PriceDisplay value={inv.maturityValue} size="text-xl"/></div></div>))}</div>)}
                           <div className="bg-slate-800/80 p-8 rounded-3xl border border-green-500/20 shadow-xl">
                               <h4 className="text-green-400 font-bold mb-6 text-lg uppercase tracking-tighter">New Term Deposit (CD)</h4>
                               <div className="flex flex-col gap-6 mb-8">
                                   <div className="space-y-2">
                                       <label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Principal Investment</label>
                                       <div className="flex gap-3">
                                           <input type="number" value={bankInvestAmount || ''} onChange={(e) => setBankInvestAmount(e.target.value)} min="1" placeholder="Amount..." className="flex-grow bg-gray-900 text-white p-4 rounded-xl border border-gray-700 focus:border-green-500 outline-none transition-all text-xl font-mono" />
                                           <button onClick={() => setBankInvestAmount(Math.floor(Math.max(0, state.cash)).toString())} className="bg-gray-700 hover:bg-gray-600 px-6 rounded-xl text-white font-black text-xs uppercase border border-gray-600 transition-all shadow-md">MAX</button>
                                       </div>
                                   </div>
                                   <div className="space-y-2">
                                       <label className="text-[10px] text-gray-500 uppercase tracking-widest ml-1 font-black">Maturity Window</label>
                                       <select value={bankInvestTerm || '1'} onChange={(e) => setBankInvestTerm(e.target.value)} className="w-full bg-gray-900 text-white p-4 rounded-xl border border-gray-700 focus:border-green-500 outline-none transition-all text-lg font-mono">
                                           <option value="1">1 Day (5% Yield)</option>
                                           <option value="2">2 Days (20% Yield)</option>
                                           <option value="3">3 Days (50% Yield)</option>
                                       </select>
                                   </div>
                               </div>
                               <button onClick={()=>{ if(state.activeLoans.length > 0) { SFX.play('error'); return setModal({type:'message', data:"Regulatory Block: Capital deposits are prohibited while holding active liabilities."}); } const amtVal = parseInt(bankInvestAmount); const termVal = parseInt(bankInvestTerm); if(isNaN(amtVal) || amtVal<=0 || state.cash<amtVal) { SFX.play('error'); return; } const ratesDict: any = {1:0.05, 2:0.20, 3:0.50}; const rateVal = ratesDict[termVal]; const matVal = Math.floor(amtVal * (1 + rateVal)); const invEntry = {id:Date.now(), amount:amtVal, daysRemaining:termVal, maturityValue:matVal, interestRate:rateVal}; setState(prev=>prev?({...prev, cash:prev.cash-amtVal, investments:[...prev.investments, invEntry]}):null); setBankInvestAmount(''); SFX.play('coin'); log(`INVESTMENT: Locked ${formatCurrencyLog(amtVal)} for ${termVal} days.`, 'investment'); }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-2xl text-2xl transition-all shadow-lg shadow-green-900/20 action-btn uppercase">INITIATE LOCKUP</button>
                               <p className="text-[9px] text-gray-500 text-center mt-4 italic uppercase tracking-widest opacity-60">All fixed-term investments are non-liquid until settlement day.</p>
                           </div>
                       </div>
                  </div>
              </div>
          );
      }

      if (modal.type === 'comms') {
          return (
              <div className="flex flex-col h-full bg-black/40 animate-in fade-in duration-300">
                  <div className="p-4 border-b border-gray-700 flex justify-between items-center"><h2 className="text-xl font-scifi text-cyan-400">G.I.G.O. Comms Array</h2><span className="text-[10px] text-cyan-800 font-mono uppercase animate-pulse">Signal: Strong</span></div>
                  <div className="flex-grow overflow-y-auto p-6 font-mono text-base md:text-lg custom-scrollbar space-y-2" ref={commsContainerRef}>
                      {state.messages.slice().reverse().map((msg) => (<div key={msg.id} className={`p-2 border-b border-gray-800/30 ${getLogColorClass(msg.type)}`}><span className="opacity-30 mr-4 font-black">[{new Date(msg.id).toLocaleTimeString()}]</span>{renderLogMessage(msg.message)}</div>))}
                      {state.messages.length === 0 && <div className="text-gray-700 italic text-center py-20">Monitoring frequencies...</div>}
                  </div>
              </div>
          );
      }

      if (modal.type === 'shipping') {
          return (
              <div className="flex flex-col h-full p-4 md:p-6 space-y-4 overflow-hidden animate-in slide-in-from-right-4 duration-300">
                   <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-700 pb-4">
                       <h2 className="text-2xl font-scifi text-blue-500 uppercase tracking-widest">Void-Ex Logistics</h2>
                       <div className="flex-grow flex justify-center"><PriceDisplay value={state.cash} size="text-2xl" colored /></div>
                       <div className="flex bg-slate-800/50 p-1 rounded-xl">
                           <button onClick={()=>{setLogisticsTab('contracts'); SFX.play('click');}} className={`px-6 py-2 rounded-lg font-bold text-xs uppercase transition-all ${logisticsTab==='contracts'?'bg-blue-600 text-white shadow-md':'text-gray-400 hover:bg-slate-700'}`}>Contracts</button>
                           <button onClick={()=>{setLogisticsTab('shipping'); SFX.play('click');}} className={`px-6 py-2 rounded-lg font-bold text-xs uppercase transition-all ${logisticsTab==='shipping'?'bg-blue-600 text-white shadow-md':'text-gray-400 hover:bg-slate-700'}`}>Shipping</button>
                           <button onClick={()=>{setLogisticsTab('warehouse'); SFX.play('click');}} className={`px-6 py-2 rounded-lg font-bold text-xs uppercase transition-all ${logisticsTab==='warehouse'?'bg-blue-600 text-white shadow-md':'text-gray-400 hover:bg-slate-700'}`}>Storage</button>
                       </div>
                   </div>

                   <div className="flex-grow overflow-y-auto custom-scrollbar pr-2">
                       {logisticsTab === 'contracts' && (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                               <div>
                                   <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-sm border-l-2 border-blue-500 pl-4">Sector Board</h3>
                                   {state.availableContracts.length === 0 && <div className="p-10 border border-dashed border-gray-700 rounded-3xl text-gray-500 text-center italic">No tenders found.</div>}
                                   {state.availableContracts.map(c => {
                                       const isBanned = state.venueTradeBans[c.destinationIndex] > 0;
                                       return (
                                           <div key={c.id} className={`bg-slate-800/60 p-5 rounded-2xl mb-3 border border-slate-700 transition-all hover:border-blue-500/50 ${isBanned?'opacity-30' : ''}`}>
                                               <div className="flex justify-between items-start mb-2"><span className="text-white font-black text-lg">{c.firm}</span><PriceDisplay value={c.reward} size="text-lg"/></div>
                                               <div className="text-sm text-gray-400 mb-4">Deliver <span className="text-white font-black">{c.quantity} {c.commodity}</span> to <span className="text-blue-300 font-bold">{VENUES[c.destinationIndex]}</span>. <br/>Window: <span className="text-white">{c.daysRemaining} Days</span>.</div>
                                               <div className="flex justify-between items-center"><span className="text-[10px] text-red-400 font-mono uppercase font-bold">Penalty: <PriceDisplay value={c.penalty} size="text-[10px]"/></span><button onClick={() => acceptContract(c)} disabled={isBanned} className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white px-8 py-2 rounded-lg font-bold shadow-md transition-all">SIGN</button></div>
                                           </div>
                                       );
                                   })}
                               </div>
                               <div>
                                   <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-sm border-l-2 border-blue-500 pl-4">Active Operations</h3>
                                   {state.activeContracts.length === 0 && <div className="p-10 border border-dashed border-gray-700 rounded-3xl text-gray-500 text-center italic">No active contracts.</div>}
                                   {state.activeContracts.map(c => {
                                       const wh = state.warehouse[c.destinationIndex];
                                       const hasItems = wh && wh[c.commodity] && wh[c.commodity].quantity >= c.quantity;
                                       const isReady = c.status === 'active' && hasItems && wh[c.commodity].arrivalDay <= state.day;
                                       
                                       return (
                                           <div key={c.id} className={`p-5 rounded-2xl mb-3 border shadow-inner transition-all ${c.status === 'completed' ? 'bg-emerald-900/40 border-emerald-500' : (c.status === 'failed' ? 'bg-red-900/40 border-red-500' : (isReady ? 'bg-purple-900/40 border-purple-500 animate-in fade-in zoom-in-95' : 'bg-blue-900/10 border-blue-500/50'))}`}>
                                               <div className="flex justify-between items-center mb-2">
                                                   <span className="text-white font-black">{c.firm}</span>
                                                   <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-tighter ${c.status === 'completed' ? 'bg-emerald-600 text-white' : (c.status === 'failed' ? 'bg-red-600 text-white' : (isReady ? 'bg-purple-600 text-white animate-pulse' : 'bg-blue-500 text-white'))}`}>
                                                       {c.status === 'completed' ? 'COMPLETED' : (c.status === 'failed' ? 'FAILED' : `${c.daysRemaining} Left`)}
                                                   </span>
                                               </div>
                                               <div className="text-sm text-gray-300">Deliver {c.quantity} {c.commodity} to {VENUES[c.destinationIndex]}</div>
                                               <div className={`mt-4 p-3 rounded-xl text-xs font-mono ${isReady ? 'bg-purple-950/40 border border-purple-500/30' : 'bg-black/40'}`}>
                                                   {c.status === 'completed' ? (
                                                       <span className="text-emerald-400 font-black">SETTLEMENT FINALIZED: {formatCurrencyLog(c.reward)} REWARD CREDITED</span>
                                                   ) : c.status === 'failed' ? (
                                                       <span className="text-red-400 font-black">BREACH: {formatCurrencyLog(c.penalty)} PENALTY</span>
                                                   ) : isReady ? (
                                                       <div className="flex justify-between items-center">
                                                           <span className="text-purple-300 font-black">READY TO FULFILL</span>
                                                           <button onClick={() => settleContract(c)} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded font-black text-[10px] uppercase">SETTLE</button>
                                                       </div>
                                                   ) : (hasItems ? <span className="text-yellow-400">STATUS: Transit...</span> : <span className="text-red-400">STATUS: Pending arrival...</span>)}
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                       )}

                       {logisticsTab === 'shipping' && (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                               <div>
                                   <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-sm border-l-2 border-blue-500 pl-4">Local Assets</h3>
                                   <div className="space-y-3">
                                       {Object.entries(state.cargo).map(([name, item]: [string, CargoItem]) => {
                                           const isSelected = highlightShippingItem === name && !shippingSource[name]?.type;
                                           const qtyValStr = shippingQuantities[name] || '';
                                           const destValStr = shippingDestinations[name] || '';
                                           const methodValStr = shippingTiers[name] || 'fast'; 

                                           return (
                                               <div key={name} className={`p-5 rounded-2xl border transition-all ${isSelected ? 'border-blue-500 bg-blue-900/20 shadow-2xl' : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'}`}>
                                                   <div className="flex justify-between items-center mb-4"><span className="text-white font-black text-lg">{name}</span><span className="text-[10px] text-gray-500 font-mono uppercase">Avail: {item.quantity}</span></div>
                                                   <div className="grid grid-cols-3 gap-3 mb-4">
                                                       <input type="number" placeholder="Qty" className="bg-gray-900 text-white p-3 rounded-xl border border-gray-700 text-lg font-bold outline-none col-span-1" value={qtyValStr || ''} onChange={e=>setShippingQuantities({...shippingQuantities, [name]:e.target.value})} />
                                                       <button onClick={()=>setShippingQuantities({...shippingQuantities, [name]: item.quantity.toString()})} className="bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors">ALL</button>
                                                       <select className="bg-gray-900 text-white p-3 rounded-xl border border-gray-700 font-bold outline-none col-span-1" value={destValStr || ''} onChange={e=>setShippingDestinations({...shippingDestinations, [name]:e.target.value})}>
                                                           <option value="">Dest...</option>
                                                           {VENUES.map((v,i)=>(i!==state.currentVenueIndex ? <option key={i} value={i}>{v}</option> : null))}
                                                       </select>
                                                   </div>
                                                   <div className="flex gap-3 mb-4">
                                                       <select className="flex-grow bg-gray-900 text-white p-3 rounded-xl border border-gray-700 font-bold outline-none text-sm" value={methodValStr} onChange={e=>setShippingTiers({...shippingTiers, [name]:e.target.value})}>
                                                           <option value="fast">EXPRESS (1 Day, 100/T)</option>
                                                           <option value="standard">STANDARD (2 Days, 50/T)</option>
                                                           <option value="slow">FREIGHT (3 Days, 20/T)</option>
                                                       </select>
                                                   </div>
                                                   <button onClick={() => {
                                                       const qtyInt = parseInt(qtyValStr);
                                                       const destInt = parseInt(destValStr);
                                                       if (isNaN(qtyInt) || qtyInt <= 0 || isNaN(destInt)) return;
                                                       const unitCostAmt = methodValStr === 'fast' ? 100 : (methodValStr === 'standard' ? 50 : 20);
                                                       const durationDays = methodValStr === 'fast' ? 1 : (methodValStr === 'standard' ? 2 : 3);
                                                       const cData = COMMODITIES.find(x=>x.name===name)!;
                                                       const totalWeightVal = qtyInt * cData.unitWeight;
                                                       const costVal = Math.ceil(totalWeightVal * unitCostAmt);
                                                       if (item.quantity < qtyInt) return;
                                                       if (state.cash < costVal) { SFX.play('error'); return setModal({type:'message', data: "Insufficient funds for logistics."}); }
                                                       const newCargoDict = {...state.cargo};
                                                       newCargoDict[name].quantity -= qtyInt;
                                                       if(newCargoDict[name].quantity<=0) delete newCargoDict[name];
                                                       const newWarehouseDict: Warehouse = {...state.warehouse};
                                                       if(!newWarehouseDict[destInt]) newWarehouseDict[destInt] = {};
                                                       const existingWare = newWarehouseDict[destInt][name];
                                                       let newArrivalDay = state.day + durationDays;
                                                       let newAvgCostVal = item.averageCost;
                                                       let newQtyVal = qtyInt;
                                                       if (existingWare) { newArrivalDay = Math.max(existingWare.arrivalDay, newArrivalDay); newAvgCostVal = ((existingWare.quantity * existingWare.originalAvgCost) + (qtyInt * item.averageCost)) / (existingWare.quantity + qtyInt); newQtyVal += existingWare.quantity; }
                                                       newWarehouseDict[destInt][name] = { quantity: newQtyVal, originalAvgCost: newAvgCostVal, arrivalDay: newArrivalDay };
                                                       setState(prev => prev ? ({ ...prev, cash: prev.cash - costVal, cargo: newCargoDict, cargoWeight: prev.cargoWeight - totalWeightVal, warehouse: newWarehouseDict }) : null);
                                                       setShippingQuantities({...shippingQuantities, [name]: ''}); setHighlightShippingItem(null); SFX.play('warp');
                                                   }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg action-btn uppercase font-scifi">SHIP</button>
                                               </div>
                                           );
                                       })}
                                   </div>
                               </div>
                               <div>
                                   <h3 className="text-white font-bold mb-4 uppercase tracking-widest text-sm border-l-2 border-purple-500 pl-4">Queue</h3>
                                   <div className="space-y-4">
                                       {Object.values(shippingSource)[0]?.type === 'warehouse' && (() => {
                                           const name = Object.keys(shippingSource)[0];
                                           const vIdx = Object.values(shippingSource)[0].venueIdx;
                                           const whItem = state.warehouse[vIdx]?.[name];
                                           if (!whItem) return null;
                                           return (
                                               <div className="p-5 rounded-2xl border-2 border-purple-500 bg-purple-900/60 shadow-xl animate-in zoom-in-95">
                                                   <div className="flex justify-between items-center mb-2">
                                                       <span className="text-white font-black text-lg uppercase">Remote Hub Op</span>
                                                       <button onClick={() => setShippingSource({})} className="text-red-400 hover:text-red-300"><XCircle size={18}/></button>
                                                   </div>
                                                    <div className="text-xs text-purple-100 mb-6 bg-purple-950/40 p-4 rounded-xl border border-purple-400/30 font-mono leading-relaxed">
                                                      Staged: <span className="font-black text-white">{whItem.quantity} {name}</span> from <span className="font-black text-white">{VENUES[vIdx]}</span>.
                                                   </div>
                                                   <div className="grid grid-cols-2 gap-4">
                                                        <button onClick={() => {
                                                          const destValStr = shippingDestinations[name] || '';
                                                          const destInt = parseInt(destValStr);
                                                          if (isNaN(destInt)) return;
                                                          const qtyInt = whItem.quantity;
                                                          const cData = COMMODITIES.find(x=>x.name===name)!;
                                                          const totalWeightVal = qtyInt * cData.unitWeight;
                                                          const costVal = Math.ceil(totalWeightVal * 100);
                                                          if (state.cash < costVal) return setModal({type:'message', data: `Insufficient funds: ${formatCurrencyLog(costVal)}`});
                                                          const newW = { ...state.warehouse };
                                                          delete newW[vIdx][name];
                                                          if (Object.keys(newW[vIdx]).length === 0) delete newW[vIdx];
                                                          if (!newW[destInt]) newW[destInt] = {};
                                                          newW[destInt][name] = { ...whItem, arrivalDay: state.day + 1 };

                                                          setState(prev => prev ? ({ ...prev, cash: prev.cash - costVal, warehouse: newW }) : null);
                                                          setShippingSource({});
                                                          SFX.play('warp');
                                                          log(`REMOTE FORWARD: Shipped ${qtyInt} ${name} from ${VENUES[vIdx]} to ${VENUES[destInt]}.`, 'buy');
                                                        }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl shadow-lg uppercase action-btn">FORWARD</button>
                                                        <button onClick={() => {
                                                          sellWarehouseItem(vIdx, name, whItem.quantity);
                                                          setShippingSource({});
                                                        }} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-3 rounded-xl shadow-lg uppercase action-btn">SELL</button>
                                                   </div>
                                                   <div className="mt-4">
                                                      <button onClick={() => showCommodityIntel(name)} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black py-3 rounded-xl shadow-lg uppercase action-btn">INTEL REGISTRY</button>
                                                   </div>
                                               </div>
                                           );
                                       })()}
                                       {stagedContract && (
                                           <div className="p-5 rounded-2xl border-2 border-purple-500 bg-purple-900/60 shadow-xl animate-in zoom-in-95">
                                               <div className="flex justify-between items-center mb-2">
                                                   <span className="text-white font-black text-lg uppercase">Staged Fulfillment</span>
                                                   <button onClick={() => setStagedContract(null)} className="text-red-400 hover:text-red-300"><XCircle size={18}/></button>
                                               </div>
                                               <div className="text-xs text-purple-100 mb-6 bg-purple-950/40 p-4 rounded-xl border border-purple-400/30 font-mono leading-relaxed">
                                                   Deliver <span className="font-black text-white">{stagedContract.quantity} {stagedContract.commodity}</span> to <span className="font-black text-white">{VENUES[stagedContract.destinationIndex]}</span>.
                                               </div>
                                               <button onClick={() => {
                                                   const nameVal = stagedContract.commodity;
                                                   const qtyInt = stagedContract.quantity;
                                                   const destInt = stagedContract.destinationIndex;
                                                   const itemOwned = state.cargo[nameVal];
                                                   if (!itemOwned || itemOwned.quantity < qtyInt) return setModal({type:'message', data: `Insufficient ${nameVal}.`});
                                                   
                                                   const cData = COMMODITIES.find(x=>x.name===nameVal)!;
                                                   const totalWeightVal = qtyInt * cData.unitWeight;
                                                   const costVal = Math.ceil(totalWeightVal * 100); 
                                                   if (state.cash < costVal) return setModal({type:'message', data: `Insufficient funds: ${formatCurrencyLog(costVal)}`});

                                                   const newCargoDict = {...state.cargo};
                                                   newCargoDict[nameVal].quantity -= qtyInt;
                                                   if(newCargoDict[nameVal].quantity<=0) delete newCargoDict[nameVal];
                                                   const newWarehouseDict: Warehouse = {...state.warehouse};
                                                   if(!newWarehouseDict[destInt]) newWarehouseDict[destInt] = {};
                                                   const existingWare = newWarehouseDict[destInt][nameVal];
                                                   let newArrivalDay = state.day + 1; 
                                                   let newAvgCostVal = itemOwned.averageCost;
                                                   let newQtyVal = qtyInt;
                                                   if (existingWare) { newArrivalDay = Math.max(existingWare.arrivalDay, newArrivalDay); newAvgCostVal = ((existingWare.quantity * existingWare.originalAvgCost) + (qtyInt * itemOwned.averageCost)) / (existingWare.quantity + qtyInt); newQtyVal += existingWare.quantity; }
                                                   newWarehouseDict[destInt][nameVal] = { quantity: newQtyVal, originalAvgCost: newAvgCostVal, arrivalDay: newArrivalDay, isContractReserved: true };
                                                   
                                                   setState(prev => prev ? ({ ...prev, cash: prev.cash - costVal, cargo: newCargoDict, cargoWeight: prev.cargoWeight - totalWeightVal, warehouse: newWarehouseDict }) : null);
                                                   setStagedContract(null); setHighlightShippingItem(null); SFX.play('warp');
                                               }} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black py-5 rounded-2xl shadow-xl uppercase action-btn">Fulfill contract</button>
                                           </div>
                                       )}
                                   </div>
                               </div>
                           </div>
                       )}

                       {logisticsTab === 'warehouse' && (
                           <div className="max-w-4xl mx-auto py-4 animate-in fade-in duration-300">
                               <h3 className="text-2xl font-black text-white mb-8 text-center uppercase tracking-widest">Registry</h3>
                               {Object.keys(state.warehouse).length === 0 && <div className="py-20 border-2 border-dashed border-gray-800 rounded-3xl text-gray-600 text-center italic text-xl">Empty.</div>}
                               <div className="grid grid-cols-1 gap-6">
                                   {Object.entries(state.warehouse).map(([vIdxStr, items]) => {
                                       const vIdxInt = parseInt(vIdxStr);
                                       return (
                                           <div key={vIdxInt} className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700 shadow-xl">
                                               <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4"><h4 className="text-xl font-black text-blue-400 tracking-tighter uppercase">{VENUES[vIdxInt]} HUB</h4>{vIdxInt === state.currentVenueIndex ? <span className="bg-emerald-600 text-white px-3 py-1 rounded-full text-[10px] font-black tracking-widest animate-pulse">LOCAL</span> : <span className="text-gray-500 text-[10px] font-mono">REMOTE</span>}</div>
                                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                   {Object.entries(items).map(([name, item]) => {
                                                       const daysUntil = item.arrivalDay - state.day;
                                                       const isHere = vIdxInt === state.currentVenueIndex;
                                                       const arrived = daysUntil <= 0;
                                                       const seizureDays = (item.arrivalDay + 3) - state.day;
                                                       return (
                                                           <div key={name} className="flex justify-between items-center bg-black/40 p-5 rounded-2xl border border-white/5 group hover:border-white/10 transition-all">
                                                               <div className="space-y-1">
                                                                   <div className="text-white text-lg font-black">{name} <span className="text-blue-500">x{item.quantity}</span></div>
                                                                   <div className="text-xs font-mono uppercase tracking-tighter">
                                                                       {item.isContractReserved && <span className="text-purple-400 font-bold block mb-1">CONTRACT RESERVED</span>}
                                                                       {arrived ? (<><span className="text-green-400 font-bold block mb-1">ARRIVED</span><span className="text-red-400/60 block uppercase">SEIZURE IN {seizureDays}D</span></>) : <span className="text-yellow-400 font-bold">ETA: {daysUntil}D</span>}
                                                                   </div>
                                                               </div>
                                                               <div className="flex flex-col gap-2">
                                                                   {arrived && isHere && !item.isContractReserved && (<div className="flex gap-2"><input type="number" placeholder="Qty" className="w-16 bg-gray-900 text-white text-center text-xs rounded-lg border border-gray-700 font-bold" value={claimQuantities[name]||''} onChange={e=>setClaimQuantities({...claimQuantities, [name]:e.target.value})} /><button onClick={()=>{ const qVal = parseInt(claimQuantities[name]); if(!isNaN(qVal) && qVal>0) claimWarehouseItem(vIdxInt, name, qVal); }} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase transition-all shadow-md">CLAIM</button></div>)}
                                                                   {arrived && !isHere && (<button onClick={()=>forwardWarehouseItem(vIdxInt, name)} className="bg-purple-700 hover:bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase transition-all shadow-lg">MANAGE</button>)}
                                                               </div>
                                                           </div>
                                                       );
                                                   })}
                                               </div>
                                           </div>
                                       );
                                   })}
                               </div>
                           </div>
                       )}
                   </div>
              </div>
          );
      }

      if (modal.type === 'highscores') {
          return (
              <div className="flex flex-col h-full bg-slate-900/40 p-4 md:p-8 animate-in fade-in duration-300">
                  <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                      <h2 className="text-3xl font-scifi text-yellow-500 uppercase tracking-widest">Galactic Legends</h2>
                      <div className="text-[10px] text-gray-500 font-mono text-right uppercase">Neural Archives</div>
                  </div>
                  <div className="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-3 mb-8">
                      {state.highScores.map((s, i) => (
                          <div key={i} className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-gray-800 group hover:border-yellow-500/50 transition-all">
                              <div className="flex items-center gap-6">
                                  <span className={`font-mono text-xl w-8 text-center ${i < 3 ? 'text-yellow-400 font-black animate-pulse' : 'text-gray-600'}`}>{i + 1}</span>
                                  <div className="flex flex-col">
                                      <span className="text-white font-bold text-lg uppercase tracking-tighter">{s.name}</span>
                                      <span className="text-[10px] text-gray-500 font-mono">{s.date}</span>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="text-yellow-400 font-mono font-bold text-xl"><PriceDisplay value={s.score} size="text-xl" compact /></div>
                                  <div className="text-[10px] text-gray-400 uppercase font-black">{s.days} Days</div>
                              </div>
                          </div>
                      ))}
                      {state.highScores.length === 0 && <div className="py-20 text-center text-gray-600 italic">No legends recorded.</div>}
                  </div>
                  <button onClick={attemptVoluntaryRestart} className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-900 text-red-400 font-black py-4 rounded-xl text-sm uppercase tracking-widest transition-all">Relinquish Command</button>
              </div>
          );
      }

      return null;
  };

  return (
    <div className="app-viewport flex flex-col p-2 md:p-4 space-y-4 no-scrollbar custom-scrollbar overflow-y-auto">
       
       {modal.type !== 'welcome' && (
         <>
           <header className="flex flex-col md:flex-row justify-between items-center px-4 py-2 gap-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-30 sci-fi-box">
              <div className="flex flex-col items-start md:w-1/4">
                 <div className="flex items-baseline space-x-2 whitespace-nowrap overflow-visible">
                    <h1 className="font-scifi text-2xl md:text-3xl font-bold text-white tracking-widest shrink-0 uppercase">$tar Bucks</h1>
                    <span className="text-xs text-yellow-500 font-mono bg-yellow-400/10 px-1 border border-yellow-500/20 font-bold shrink-0">v5.9.4</span>
                    
                    <div className="flex items-center space-x-2 ml-4 border-l border-gray-700 pl-4 shrink-0 relative z-50">
                        {/* Audio Toggle */}
                        <button onClick={toggleSound} 
                                className="w-9 h-9 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg text-white hover:text-cyan-400" 
                                title="Toggle Audio">
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>
                        
                        {/* Legends Toggle */}
                        <button onClick={()=>handleFeatureClick('highscores', ()=>setModal({type:'highscores', data:null}))} 
                                className="w-9 h-9 rounded-full bg-gray-800/80 border border-gray-700 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg text-yellow-500 hover:text-yellow-400" 
                                title="Galactic Legends">
                            <Trophy size={18} />
                        </button>
                        
                        {/* Save Game */}
                        <button onClick={(e)=>saveAndExit(e)} 
                                className={`w-9 h-9 rounded-full bg-gray-800/80 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-lg border ${hasSave ? 'border-green-900/50 text-green-500 hover:border-green-500' : 'border-red-900/50 text-red-500 hover:border-red-500'}`} 
                                title="Save Neural State">
                            <Save size={18} />
                        </button>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col items-center flex-grow md:w-2/4">
                 <div className="flex flex-wrap justify-center items-center gap-3 md:gap-6 text-cyan-300 font-mono text-sm md:text-lg">
                    <div className="flex flex-col items-center"><span className={state.day >= deadlineLimit ? 'text-red-400 animate-pulse' : 'text-cyan-400'}>Day {state.day}/{deadlineLimit}</span><span className="text-[8px] text-white uppercase font-bold">Cycle Status</span></div>
                    <div className="flex flex-col items-center"><span className="text-purple-400 font-bold">{state.gamePhase === 4 ? "Final Phase" : `Phase ${state.gamePhase}`}</span><span className="text-[8px] text-white uppercase font-bold">Global Phase</span></div>
                    <div className="flex flex-col items-center border-x border-gray-800 px-4"><div className="flex items-center">{state.gamePhase === 4 ? (<>Goal: <span className="text-xl md:text-2xl font-bold mx-1">&infin;</span></>) : (<PriceDisplay value={goalAmt} size="text-sm md:text-lg" compact={state.gamePhase>=2} />)}</div><span className="text-[8px] text-white uppercase font-bold">Phase Goal</span></div>
                    <div className="flex flex-col items-center"><div className="text-yellow-400 font-bold flex items-center"><PriceDisplay value={netWorth} size="text-sm md:text-lg" compact={state.gamePhase>=2} /></div><span className="text-[8px] text-white uppercase font-bold">Net Worth</span></div>
                 </div>
              </div>

              <div className="flex items-center justify-center md:justify-end md:w-1/4 space-x-1">
                 <StatusDial value={Math.round(state.shipHealth)} max={150} icon={Heart} color="text-green-500" label="Hull" isPercent />
                 <StatusDial value={(state.cargo[FUEL_NAME]?.quantity||0)} max={200} icon={Fuel} color="text-blue-500" label="Fuel" />
                 <StatusDial value={hasLaser(state) ? Math.round(state.laserHealth || 0) : 0} max={100} icon={Crosshair} color={hasLaser(state)?'text-red-500':'text-gray-600'} label={hasLaser(state)?'Laser':'Off'} isPercent />
              </div>
           </header>

           <div className="flex flex-col items-stretch">
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-1 px-1">
                 <button onClick={()=>handleFeatureClick('shop', ()=>setModal({type:'shop', data:null}))} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-purple-600/50 ${modal.type==='shop'?'bg-purple-900/60 text-white shadow-[0_-5px_15px_rgba(147,51,234,0.3)]':'bg-purple-900/20 text-purple-300 hover:bg-purple-900/40'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <Zap className="mb-1" size={14}/> Upgrades
                 </button>
                 <button onClick={()=>handleFeatureClick('banking', ()=>setModal({type:'banking', data:null}))} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-yellow-600/50 ${modal.type==='banking'?'bg-yellow-900/60 text-white shadow-[0_-5px_15px_rgba(234,179,8,0.3)]':'bg-yellow-900/20 text-yellow-500 hover:bg-yellow-900/40'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <Building2 className="mb-1" size={14}/> I.B.A.N.K.
                    <span className={`text-[8px] flex items-center font-bold ${totalDebt > 0 ? 'text-red-500' : (totalInv > 0 ? 'text-green-500' : 'text-yellow-600')}`}>{totalDebt > 0 ? formatCompactNumber(totalDebt) : (totalInv > 0 ? formatCompactNumber(totalInv) : '')}</span>
                 </button>
                 <button onClick={()=>{setModal({type:'none', data:null}); SFX.play('click');}} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-blue-500/50 ${modal.type==='none'?'bg-blue-900/60 text-white shadow-[0_-5px_15px_rgba(37,99,235,0.3)]':'bg-blue-900/20 text-blue-400 hover:bg-blue-900/40'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <LineChart className="mb-1" size={14}/> Console
                 </button>
                 <button onClick={()=>handleFeatureClick('fomo', ()=>setModal({type:'fomo', data:null}))} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-orange-600/50 ${modal.type==='fomo'?'bg-orange-900/60 text-white shadow-[0_-5px_15px_rgba(234,88,12,0.3)]':'bg-orange-900/20 text-orange-300 hover:bg-orange-900/40'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <Factory className="mb-1" size={14}/> F.O.M.O.
                 </button>
                 <button onClick={()=>handleFeatureClick('travel', ()=>setModal({type:'travel', data:null}))} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-emerald-600/50 ${modal.type==='travel' || modal.type==='venue_intel' ?'bg-emerald-900/60 text-white shadow-[0_-5px_15px_rgba(16,185,129,0.3)]':'bg-emerald-900/20 text-emerald-300 hover:bg-emerald-900/40'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <Rocket className="mb-1" size={14}/> Travel
                 </button>
                 <button onClick={()=>handleFeatureClick('shipping', ()=>setModal({type:'shipping', data:null}))} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-blue-600/50 ${modal.type==='shipping'?'bg-blue-800/60 text-white shadow-[0_-5px_15px_rgba(37,99,235,0.3)]':'bg-blue-900/20 text-blue-300 hover:bg-blue-900/40'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <Truck className="mb-1" size={14}/> Logistics
                 </button>
                 <button onClick={()=>handleFeatureClick('comms', ()=>setModal({type:'comms', data:null}))} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-cyan-500/50 ${modal.type==='comms'?'bg-cyan-900/60 text-white shadow-[0_-5px_15px_rgba(6,182,212,0.3)]':'bg-cyan-900/20 text-cyan-300 hover:bg-cyan-900/40'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <Radio className="mb-1" size={14}/> G.I.G.O.
                 </button>
                 <button onClick={()=>handleFeatureClick('wiki', ()=>setModal({type:'wiki', data:null}))} 
                         className={`tab-btn flex flex-col items-center justify-center p-2 rounded-t-xl border-x border-t border-orange-600/50 ${modal.type==='wiki'?'bg-orange-800/60 text-white shadow-[0_-5px_15px_rgba(234,88,12,0.3)]':'bg-orange-900/20 text-orange-400 hover:bg-orange-800/60'} font-scifi text-[10px] md:text-xs transition-all`}>
                    <BookOpen className="mb-1" size={14}/> Codex
                 </button>
              </div>
           </div>

           <div className="card sci-fi-box rounded-b-xl rounded-t-none p-0 flex-grow flex flex-col bg-gray-900/80 overflow-hidden min-h-0 border-t-2 border-t-blue-500/30">
              {renderTerminalContent()}
           </div>
         </>
       )}
       
       {modal.type === 'event_encounter' && (
           <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
               <div className="bg-slate-900 border border-red-600 p-8 rounded-2xl max-w-2xl w-full sci-fi-box animate-[shake_0.5s_ease-in-out]">
                   <h2 className="text-3xl font-scifi text-red-500 mb-4 animate-pulse uppercase">Alert: {modal.data.encounter.title}</h2>
                   <p className="text-white text-xl mb-8 leading-relaxed italic font-mono">"{modal.data.encounter.description}"</p>
                   
                   <div className="flex flex-col gap-4">
                       {modal.data.encounter.type === 'derelict' ? (
                           <>
                               <button onClick={() => resolveEncounterOutcome('check')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-xl shadow-[0_0_15px_rgba(16,185,129,0.4)] action-btn uppercase">Salvage Freighter</button>
                               <button onClick={() => resolveEncounterOutcome('leave')} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-3 rounded-xl text-lg uppercase">Maintain Course</button>
                           </>
                       ) : modal.data.encounter.type === 'pirate' ? (
                           <>
                               <button onClick={() => resolveEncounterOutcome('pay')} className="bg-yellow-600 hover:bg-yellow-500 text-white font-black py-4 rounded-xl text-xl shadow-[0_0_15px_rgba(234,179,8,0.4)] action-btn uppercase">Pay Tribute ({formatCurrencyLog(modal.data.encounter.demandAmount)})</button>
                               <button onClick={() => resolveEncounterOutcome('fight')} className="bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl text-xl shadow-[0_0_15px_rgba(220,38,38,0.4)] action-btn uppercase">Engage (Battle Reward)</button>
                           </>
                       ) : modal.data.encounter.demandAmount ? (
                           <>
                               <button onClick={() => resolveEncounterOutcome('pay')} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl text-xl action-btn uppercase">Pay Settlement ({formatCurrencyLog(modal.data.encounter.demandAmount)})</button>
                               <button onClick={() => resolveEncounterOutcome('ignore')} className="bg-red-700 hover:bg-red-600 text-white font-black py-4 rounded-xl text-xl action-btn uppercase">Refuse (Code Breach)</button>
                           </>
                       ) : (
                           <button onClick={() => resolveEncounterOutcome('ignore')} className="bg-gray-700 hover:bg-gray-600 text-white font-black py-5 rounded-xl text-2xl action-btn uppercase">Acknowledge Status</button>
                       )}
                   </div>
               </div>
           </div>
       )}

       {modal.type === 'encounter_resolution' && (
           <div className="absolute inset-0 bg-black/98 flex items-center justify-center z-50 p-4">
               <div className={`bg-slate-900 border-2 ${modal.data.outcomeType === 'danger' ? 'border-red-500' : (modal.data.outcomeType === 'profit' ? 'border-green-500' : 'border-blue-500')} p-10 rounded-2xl max-xl w-full sci-fi-box text-center shadow-2xl`}>
                   <div className="flex justify-center mb-6">
                       {modal.data.outcomeType === 'danger' ? <Skull size={64} className="text-red-500" /> : (modal.data.outcomeType === 'profit' ? <Zap size={64} className="text-green-500" /> : <Radar size={64} className="text-blue-500" />)}
                   </div>
                   <h2 className={`text-2xl font-black mb-6 uppercase tracking-tighter ${modal.data.outcomeType === 'danger' ? 'text-red-400' : (modal.data.outcomeType === 'profit' ? 'text-green-400' : 'text-blue-400')}`}>Comm-Log Update</h2>
                   <p className="text-white text-xl mb-10 leading-relaxed font-mono">"{modal.data.outcomeMsg}"</p>
                   
                   <button onClick={() => {
                        const { state: sData, report: rData, destIdx, mine, overload } = modal.data;
                        if (sData.shipHealth <= 0) {
                            sData.gameOver = true;
                            setModal({ type: 'endgame', data: { reason: "Structural Integrity Failure: Ship Destroyed", netWorth: getNetWorth(sData), stats: sData.stats, isHighScore: false, days: sData.day } });
                        } else {
                            finalizeJump(sData, rData, destIdx, mine, overload);
                        }
                   }} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-xl text-2xl shadow-xl action-btn uppercase">Acknowledged</button>
               </div>
           </div>
       )}

       {modal.type === 'save_confirm' && (
           <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
               <div className="bg-slate-900 border border-blue-500 p-10 rounded-2xl max-sm w-full sci-fi-box text-center shadow-2xl">
                   <div className="flex justify-center mb-6 text-green-400 animate-pulse"><Save size={64} /></div>
                   <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Save Successful</h2>
                   <p className="text-gray-200 mb-10 font-bold text-lg uppercase tracking-widest animate-pulse">See you soon, captain.</p>
                   <button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-xl text-2xl shadow-lg action-btn uppercase">Disconnecting Neural Link...</button>
               </div>
           </div>
       )}

       {modal.type === 'goal_achieved' && (
           <div className="absolute inset-0 bg-black/95 flex items-center justify-center z-50 p-4"><div className="text-center max-w-2xl px-4"><h1 className="text-4xl md:text-6xl font-scifi text-yellow-400 mb-4">PHASE {modal.data.phase} COMPLETE!</h1><div className="text-2xl text-white mb-6 font-bold tracking-widest uppercase">Target Net Worth Achieved</div><div className="space-y-2 mb-10"><div className="text-lg md:text-xl text-cyan-300 italic opacity-95 leading-relaxed">BY Decree (G.O.D):</div><div className="text-2xl md:text-4xl text-green-400 font-bold animate-pulse uppercase tracking-tight">License extended +{modal.data.daysExtended} Days!</div><div className="text-xs text-white font-mono opacity-80 mt-4 uppercase">Neural verification complete. Advance to next threshold.</div></div><button onClick={()=>{ const { state: sData, nextPhase, report: rData } = modal.data; advancePhase(sData, nextPhase, rData); }} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-10 rounded-xl text-2xl shadow-[0_0_30px_rgba(16,185,129,0.6)] uppercase tracking-widest">Advance to Phase {modal.data.nextPhase}</button></div></div>
       )}

       {modal.type === 'endgame' && (
           <div className="absolute inset-0 bg-black z-50 flex flex-col items-center justify-center p-4"><h1 className="text-5xl md:text-7xl font-scifi text-red-600 mb-4 uppercase">{modal.data.isHighScore ? "Legendary Status" : "Neural Link Severed"}</h1><div className="text-2xl text-white mb-2 uppercase font-black">{modal.data.reason}</div><div className="text-4xl text-yellow-400 font-bold mb-8 font-mono"><PriceDisplay value={modal.data.netWorth} size="text-4xl" /></div>{modal.data.isHighScore && (<div className="mb-8 w-full max-w-md"><input type="text" placeholder="Hall of Fame Alias" className="w-full p-4 bg-gray-900 border border-yellow-500 text-white text-xl rounded-xl text-center mb-3 outline-none" value={highScoreName || ''} onChange={e=>setHighScoreName(e.target.value)} maxLength={15} /><button onClick={async ()=>{ if(!highScoreName) return; const updated = await saveHighScore(highScoreName, modal.data.netWorth, modal.data.days); setState(prev => prev ? ({...prev, highScores: updated}) : null); setModal({type:'highscores', data:null}); }} className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-black py-3 rounded-xl text-lg uppercase shadow-xl">Submit Legacy</button></div>)}<div className="grid grid-cols-2 gap-8 text-center mb-8 text-gray-400"><div><div className="text-[10px] uppercase font-bold tracking-widest mb-1">Days Survived</div><div className="text-3xl text-white font-mono">{modal.data.days}</div></div><div><div className="text-[10px] uppercase font-bold tracking-widest mb-1">Single Win Record</div><div className="text-3xl text-green-400 font-mono"><PriceDisplay value={modal.data.stats.largestSingleWin} size="text-3xl" compact/></div></div></div><div className="flex gap-4"><button onClick={() => { localStorage.removeItem('sbe_savegame'); initGame(false); }} className="bg-emerald-700 hover:bg-emerald-600 text-white font-black py-4 px-10 rounded-xl text-xl uppercase tracking-widest shadow-lg">New License</button><button onClick={() => window.location.reload()} className="bg-red-700 hover:bg-red-600 text-white font-black py-4 px-10 rounded-xl text-xl uppercase tracking-widest shadow-lg">Sever Link</button></div></div>
       )}

       {modal.type === 'welcome' && (
           <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-50 overflow-hidden backdrop-blur-sm">
               <div className="crawl-container h-[70%]">
                  <div className="crawl-content space-y-12">
                     <h1 className="text-7xl md:text-9xl font-scifi text-white font-black text-center tracking-[0.2em] mb-20 uppercase whitespace-nowrap">$TAR BUCKS</h1>
                     <div className="text-yellow-500 text-4xl md:text-6xl font-bold leading-relaxed font-mono">
                        <p className="mb-10">Welcome, Captain.</p>
                        <p className="mb-10">Your former business partner has passed, leaving his debts... and his dreams... to you.</p>
                        <p className="mb-10">We have secured a <StarCoin size={48}/> 30,000 loan to buy out his Widow and reinstate our trading license, but your ship has been stripped down by mutiny.</p>
                        <p className="mb-10">Prepare to board the RR Firefox 22 RustyRedeemer: She’s 60% oxidation and 40% hope, but she’ll get your cargo across the sector if you treat her right.</p>
                     </div>
                  </div>
               </div>
               <div className="h-[30%] w-full flex flex-col items-center justify-center bg-gradient-to-t from-black via-black/80 to-transparent z-[100]">
                  <div className="flex justify-center gap-8 px-4 w-full max-w-4xl">
                    <button onClick={()=>{setModal({type:'none', data:null}); startNewGame();}} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-6 px-4 md:px-16 rounded-xl text-2xl md:text-4xl shadow-[0_0_40px_rgba(16,185,129,0.5)] action-btn border-4 border-emerald-400 uppercase tracking-widest">Board Ship</button>
                  </div>
                  <p className="text-gray-500 font-mono text-[10px] mt-6 uppercase tracking-[0.4em]">Neural Link Interface v5.9.4</p>
               </div>
           </div>
       )}

       {modal.type === 'load_save' && (
           <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50 p-4"><div className="bg-slate-900 border border-blue-500 p-8 rounded-3xl max-sm w-full sci-fi-box text-center relative shadow-2xl animate-in zoom-in-95 duration-300"><h2 className="text-2xl font-black text-blue-400 mb-4 uppercase tracking-tighter">Backup Detected</h2><p className="text-gray-300 mb-8 font-mono text-sm uppercase">Neural backup detected from local cache. Resume active cycle?</p><div className="flex gap-4 justify-center"><button onClick={()=>loadSavedGame()} className="bg-blue-600 hover:bg-blue-500 text-white font-black py-3 px-8 rounded-xl uppercase shadow-xl">Resume</button><button onClick={()=>{ localStorage.removeItem('sbe_savegame'); initGame(false); }} className="bg-gray-700 hover:bg-gray-600 text-white py-3 px-8 rounded-xl uppercase">New Game</button></div></div></div>
       )}

       {modal.type === 'message' && (
           <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-slate-900 border border-gray-500 p-8 rounded-2xl max-w-lg w-full sci-fi-box text-center relative shadow-2xl"><p className={`text-xl font-black mb-8 whitespace-pre-wrap leading-tight uppercase ${modal.color || 'text-white'}`}>{modal.data}</p><button onClick={()=>{setModal({type:'none', data:null}); SFX.play('click');}} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl text-xl shadow-lg action-btn uppercase">Acknowledge</button></div></div>
       )}

       {modal.type === 'stock_limit_confirm' && (
           <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-slate-900 border border-yellow-500 p-6 rounded-xl max-w-sm w-full sci-fi-box relative shadow-2xl"><h3 className="text-yellow-400 font-bold mb-2 uppercase tracking-widest">Insufficient Stock</h3><p className="text-gray-300 mb-4 text-sm font-bold uppercase">Requested: {modal.data.quantity} <br/>Available: {modal.data.actualStock}</p><div className="flex gap-2"><button onClick={()=>{ executeTrade({...modal.data, quantity: modal.data.actualStock}); }} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-xl font-black shadow-md uppercase">Buy Available</button><button onClick={()=>{setModal({type:'none', data:null}); SFX.play('click');}} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl uppercase">Cancel</button></div></div></div>
       )}

       {modal.type === 'tax_confirm' && (
           <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4"><div className="bg-slate-900 border border-red-500 p-6 rounded-xl max-sm w-full sci-fi-box relative shadow-2xl"><h3 className="text-red-400 font-bold mb-2 uppercase tracking-widest">Trade Tax</h3><p className="text-gray-300 mb-4 text-sm font-bold uppercase leading-relaxed">Multiple transactions on this commodity today. A 5% tax (<PriceDisplay value={modal.data.tax} size="text-sm"/>) applied.</p><div className="flex gap-2"><button onClick={()=>{ executeTrade(modal.data); }} className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl font-black shadow-md uppercase">Trade</button><button onClick={()=>{setModal({type:'none', data:null}); SFX.play('click');}} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-xl uppercase">Cancel</button></div></div></div>
       )}

    </div>
  );
}