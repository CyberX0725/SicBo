export type DiceValue = 1 | 2 | 3 | 4 | 5 | 6;

export interface DiceResult {
  dice: [DiceValue, DiceValue, DiceValue];
  sum: number;
  isTriple: boolean;
  tripleValue: number | null;
}

export enum BetType {
  BIG = 'big',
  SMALL = 'small',
  ODD = 'odd',
  EVEN = 'even',
  SPECIFIC_SUM = 'specific_sum',
  DOUBLE = 'double',
  TRIPLE = 'triple',
  SPECIFIC_TRIPLE = 'specific_triple',
  SINGLE_NUMBER = 'single_number',
  COMBINATION = 'combination',
}

export interface Bet {
  id: string;
  type: BetType;
  amount: number;
  target?: number;
  subTarget?: number[];
  label: string;
}

export type BetRenderType =
  | 'text'
  | 'dice_single'
  | 'dice_pair'
  | 'dice_triple'
  | 'dice_sum'
  | 'custom'
  | 'small_label'
  | 'big_label'
  | 'any_triple'
  | 'sum_cell'
  | 'combo_cell'
  | 'single_dice'
  | 'group_label'
  | 'grouped_doubles'
  | 'grouped_triples';

export interface BetOption {
  type: BetType;
  label: string;
  target?: number;
  subTarget?: number[];
  payout: number | { [key: number]: number };
  /** Section index in the mat layout (0 = top, 4 = bottom labels) */
  section: number;
  /** Column index inside the section */
  col: number;
  /** Optional column span within the section */
  colSpan?: number;
  /** Row index inside the section (used by section 0 top grid) */
  row?: number;
  /** Row span inside the section (used by section 0 top grid) */
  rowSpan?: number;
  renderType?: BetRenderType;
  dicePattern?: number[];
}

export type GamePhase = 'lobby' | 'betting' | 'rolling' | 'result';

export type AIPersonality =
  | 'classic'      // 经典（可调激进度）
  | 'madman'       // 狂徒 - 马丁格尔
  | 'gambler'      // 赌命徒 - All-in
  | 'hunter'       // 猎人 - 反马丁格尔
  | 'reaper'       // 收割者 - 1-3-2-6
  | 'turtle'       // 龟甲 - 奥斯卡磨盘
  | 'blunt_sword'  // 钝剑 - 达朗贝尔
  | 'ascetic'      // 苦行僧 - 固定比例
  | 'mathematician'// 数学家 - 斐波那契
  | 'schemer'      // 阴谋家 - 拉布歇尔
  | 'occultist';   // 迷信术士 - 组合对冲

export interface Player {
  id: string;
  name: string;
  type: 'human' | 'ai';
  balance: number;
  color: string;
  currentBets: Bet[];
  winAmount: number;
  aggressiveness?: number; // AI经典模式专用: 0-100
  personality?: AIPersonality; // AI人格
  // 人格策略内部状态
  personalityState?: Record<string, number | number[]>;
}

export interface GameConfig {
  players: Player[];
  initialBalance: number;
  aiAssistEnabled: boolean;
  trainingMode?: boolean; // AI训练场模式：自动摇骰
}

export interface AISuggestion {
  betType: string;
  target?: number;
  subTarget?: number[];
  label: string;
  confidence: number;
  reason: string;
  details: string[];      // 详细分析要点
  suggestion: string;     // 具体操作建议
}

export interface GameState {
  balance: number;
  currentBets: Bet[];
  selectedChipValue: number;
  diceResult: DiceResult | null;
  phase: GamePhase;
  lastResults: DiceResult[];
  winAmount: number;
  isProcessing: boolean;
  message: string | null;
}

export type ChipValue = 1 | 5 | 10 | 25 | 50 | 100 | 200 | 500 | 1000 | 5000;