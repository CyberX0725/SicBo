/**
 * AI 人格策略引擎
 * 所有AI共享NN预测结果，但每个人格根据自己的策略偏好独立解读
 */

import { BetType, DiceResult } from '@/types';
import { AIPersonalityId, AI_PERSONALITIES, StrategyPreferences } from '@/constants/aiPersonalities';
import { nnAnalyze, NN_CATEGORIES } from './NeuralEngine';

export interface BetDecision {
  type: BetType;
  target?: number;
  subTarget?: number[];
  label: string;
  amount: number;
}

/** 玩家状态：追踪个人历史 */
interface PlayerState {
  winStreak: number;
  loseStreak: number;
  totalWins: number;
  totalLosses: number;
  lastResults: ('win' | 'lose')[];
  baseBet: number;
  // 人格特定状态
  fibStep: number;
  reaperStep: number;
  labouchereSequence: number[];
  lastBetAmount: number;
  lastWasWin: boolean;
  oscarTarget: number;
  consecutiveLosses: number;
}

const playerStates: Map<string, PlayerState> = new Map();

const FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

function getState(playerId: string): PlayerState {
  if (!playerStates.has(playerId)) {
    playerStates.set(playerId, {
      winStreak: 0,
      loseStreak: 0,
      totalWins: 0,
      totalLosses: 0,
      lastResults: [],
      baseBet: 10,
      fibStep: 0,
      reaperStep: 0,
      labouchereSequence: [1, 2, 3, 4],
      lastBetAmount: 10,
      lastWasWin: false,
      oscarTarget: 1,
      consecutiveLosses: 0,
    });
  }
  return playerStates.get(playerId)!;
}

export function resetPersonalityState(playerId: string): void {
  playerStates.delete(playerId);
}

/**
 * 计算期望收益
 * @param probability 中奖概率
 * @param payout 赔率（1赔几）
 * @returns 期望收益（每单位投注）
 */
function expectedValue(probability: number, payout: number): number {
  return probability * payout - (1 - probability) * 1;
}

/**
 * 根据激进程度动态生成策略偏好（经典人格专用）
 * 激进程度 0-100 映射到不同的风险偏好
 */
function getDynamicPreferences(aggressiveness: number): StrategyPreferences {
  // 激进度系数 0-1
  const agg = aggressiveness / 100;

  return {
    // 激进时更容易下注（阈值更低）
    confidenceThreshold: 0.5 - agg * 0.3,  // 0.5 → 0.2
    // 激进时更偏好高赔率
    highPayoutWeight: 0.1 + agg * 0.5,     // 0.1 → 0.6
    // 激进时更少偏好大小
    lowRiskWeight: 0.8 - agg * 0.5,        // 0.8 → 0.3
    // 激进时更少对冲
    hedgeProb: 0.05 - agg * 0.03,          // 0.05 → 0.02
    // 激进时连胜加注更多
    winStreakMultiplier: 1.1 + agg * 0.9,  // 1.1 → 2.0
    // 激进时连输不减注（赌徒心理）
    loseStreakReduction: 0.2 - agg * 0.15, // 0.2 → 0.05
    // 激进时接受负期望
    expectedValueThreshold: 0.02 - agg * 0.12, // 0.02 → -0.10
    // 激进时更可能押特殊下注（围骰、对子）
    exoticBetProb: agg * 0.15,             // 0 → 0.15
  };
}

/**
 * 根据人格策略偏好解读NN预测，生成差异化下注决策
 */
export function interpretNNByPersonality(
  personalityId: AIPersonalityId,
  playerId: string,
  history: DiceResult[],
  balance: number,
  aggressiveness: number = 50, // 经典人格的激进程度 0-100
  existingBetsInfo?: { type: BetType; target?: number; subTarget?: number[] }[] // 其他玩家已下注情况
): BetDecision[] {
  const personality = AI_PERSONALITIES[personalityId];

  // 经典人格：根据激进程度动态生成策略偏好
  // 其他人格：使用预设的策略偏好
  const prefs = personalityId === 'classic'
    ? getDynamicPreferences(aggressiveness)
    : personality.strategyPrefs;

  const state = getState(playerId);

  // 获取神经网络预测结果（所有AI共享）
  const nnResult = nnAnalyze(history);
  const nnProbs = nnResult.probs;

  const bets: BetDecision[] = [];
  const total = history.length;

  // ===== 第一步：决定下注方向 =====

  // NN推荐的大/小概率
  const nnBigProb = nnProbs[0];
  const nnSmallProb = nnProbs[1];

  // 连胜/连输调整
  const streakMultiplier = state.winStreak > 0
    ? prefs.winStreakMultiplier
    : state.loseStreak > 0
      ? (1 - prefs.loseStreakReduction)
      : 1;

  // 计算期望收益
  const bigEV = expectedValue(nnBigProb, 1);
  const smallEV = expectedValue(nnSmallProb, 1);

  // ===== 第二步：选择下注类型 =====

  // 构建所有可能的下注选项（包含NN概率）
  interface BetOption {
    type: BetType;
    label: string;
    prob: number;  // NN预测概率
    payout: number;
    target?: number;
    subTarget?: number[];
    baseWeight: number; // 基础权重（考虑人格偏好）
  }

  const allOptions: BetOption[] = [];

  // 1. 大小（NN概率）- 权重降低，避免过度集中
  allOptions.push({
    type: BetType.BIG,
    label: '大',
    prob: nnBigProb,
    payout: 1,
    baseWeight: prefs.lowRiskWeight * 0.5, // 降低权重，让其他类型有机会
  });
  allOptions.push({
    type: BetType.SMALL,
    label: '小',
    prob: nnSmallProb,
    payout: 1,
    baseWeight: prefs.lowRiskWeight * 0.5,
  });

  // 只有历史足够长才押高赔率
  if (total >= 5) {
    // 2. 点数（4-17）- 权重降低
    for (let sum = 4; sum <= 17; sum++) {
      const sumProb = nnProbs[4] || 0.1;
      const sumPayout = sum === 4 || sum === 17 ? 50 :
                        sum === 5 || sum === 16 ? 18 :
                        sum === 6 || sum === 15 ? 14 :
                        sum === 7 || sum === 14 ? 12 :
                        sum === 8 || sum === 13 ? 8 :
                        sum === 9 || sum === 12 ? 6 :
                        sum === 10 || sum === 11 ? 6 : 6;
      allOptions.push({
        type: BetType.SPECIFIC_SUM,
        label: `点数${sum}`,
        prob: sumProb / 14,
        payout: sumPayout,
        target: sum,
        baseWeight: prefs.highPayoutWeight * 0.5, // 降低权重
      });
    }

    // 3. 全围骰 - 提升权重
    allOptions.push({
      type: BetType.TRIPLE,
      label: '全圍骰',
      prob: nnProbs[5] || 0.05,
      payout: 24,
      baseWeight: prefs.highPayoutWeight * 2.0, // 提升权重（赔率高）
    });

    // 4. 特定围骰（1-6）- 提升权重
    for (let num = 1; num <= 6; num++) {
      allOptions.push({
        type: BetType.SPECIFIC_TRIPLE,
        label: `围骰${num}`,
        prob: (nnProbs[5] || 0.05) / 6,
        payout: 150,
        target: num,
        baseWeight: prefs.highPayoutWeight * 3.0, // 大幅提升权重（赔率极高）
      });
    }

    // 5. 对子（1-6）- 提升权重
    for (let num = 1; num <= 6; num++) {
      allOptions.push({
        type: BetType.DOUBLE,
        label: `对子${num}`,
        prob: nnProbs[3] || 0.15,
        payout: 8,
        target: num,
        baseWeight: prefs.highPayoutWeight * 1.5, // 提升权重
      });
    }

    // 6. 单骰（某个骰子出现某数字）
    for (let num = 1; num <= 6; num++) {
      allOptions.push({
        type: BetType.SINGLE_NUMBER,
        label: `单骰${num}`,
        prob: 0.5,
        payout: 1,
        target: num,
        baseWeight: prefs.highPayoutWeight * 0.8,
      });
    }

    // 7. 两个特定骰子组合
    for (let num1 = 1; num1 <= 6; num1++) {
      for (let num2 = num1; num2 <= 6; num2++) {
        allOptions.push({
          type: BetType.COMBINATION,
          label: `组合${num1}${num2}`,
          prob: 0.08,
          payout: 5,
          subTarget: [num1, num2],
          baseWeight: prefs.highPayoutWeight * 1.0,
        });
      }
    }
  }

  // 过滤：放宽置信度要求，让更多类型有机会
  const validOptions = allOptions.filter(opt =>
    opt.prob >= prefs.confidenceThreshold * 0.1 && // 从0.3降到0.1
    expectedValue(opt.prob, opt.payout) >= prefs.expectedValueThreshold * 0.1 // 从0.3降到0.1
  );

  if (validOptions.length > 0) {
    // 统计已有下注的重复次数
    const betCounts: Map<string, number> = new Map();
    if (existingBetsInfo && existingBetsInfo.length > 0) {
      existingBetsInfo.forEach(b => {
        const key = `${b.type}_${b.target || ''}_${(b.subTarget || []).join(',')}`;
        betCounts.set(key, (betCounts.get(key) || 0) + 1);
      });
    }

    // 计算每个选项的最终权重 = NN概率 × 基础权重 × 已有下注惩罚
    const weightedOptions = validOptions.map(opt => {
      const key = `${opt.type}_${opt.target || ''}_${(opt.subTarget || []).join(',')}`;
      const existingCount = betCounts.get(key) || 0;
      // 每个已押的人降低30%权重
      const penalty = Math.max(0.1, 1 - existingCount * 0.3);
      // 最终权重 = NN概率 × 基础权重 × 惩罚
      const finalWeight = opt.prob * opt.baseWeight * penalty;
      return { ...opt, finalWeight, existingCount };
    });

    // 按最终权重从高到低排序（理性选择：优先选择权重最高的）
    weightedOptions.sort((a, b) => b.finalWeight - a.finalWeight);

    // 选择权重最高的选项
    const bestOption = weightedOptions[0];
    if (bestOption) {
      bets.push({
        type: bestOption.type,
        target: bestOption.target,
        subTarget: bestOption.subTarget,
        label: bestOption.label,
        amount: 0,
      });
    }
  }

  // ===== 第三步：对冲策略 =====
  if (prefs.hedgeProb > 0 && Math.random() < prefs.hedgeProb) {
    // 迷信术士：主注押大小，小额追围骰
    if (bets.some(b => b.type === BetType.BIG || b.type === BetType.SMALL)) {
      const tripleTarget = Math.floor(Math.random() * 6) + 1;
      bets.push({
        type: BetType.SPECIFIC_TRIPLE,
        target: tripleTarget,
        label: `围骰 ${tripleTarget}`,
        amount: 0,
      });
    }
  }

  // ===== 第四步：计算下注金额（资金管理） =====

  if (bets.length === 0) {
    // 保底：如果没有任何下注，按NN概率押大小
    const isBig = nnBigProb >= nnSmallProb;
    bets.push({
      type: isBig ? BetType.BIG : BetType.SMALL,
      label: isBig ? '大' : '小',
      amount: 0,
    });
  }

  // 计算总下注金额（根据人格的资金管理策略）
  const baseUnit = Math.max(10, Math.floor(balance * 0.01));
  let totalBetAmount = calculateBetAmountByPersonality(personalityId, playerId, balance, baseUnit);

  // 应用连胜/连输调整
  totalBetAmount = Math.round(totalBetAmount * streakMultiplier);
  totalBetAmount = Math.min(totalBetAmount, balance * 0.3); // 上限30%
  totalBetAmount = Math.max(10, totalBetAmount); // 下限10

  // 分配到各下注项
  if (bets.length === 1) {
    bets[0].amount = totalBetAmount;
  } else if (bets.length > 1) {
    // 对冲策略：主注95%，副注5%
    const mainBet = bets.find(b => b.type === BetType.BIG || b.type === BetType.SMALL);
    if (mainBet && prefs.hedgeProb > 0) {
      mainBet.amount = Math.floor(totalBetAmount * 0.95);
      bets.forEach(b => {
        if (b !== mainBet) {
          b.amount = Math.floor(totalBetAmount * 0.05);
        }
      });
    } else {
      // 平均分配
      const eachAmount = Math.floor(totalBetAmount / bets.length);
      bets.forEach(b => { b.amount = eachAmount; });
    }
  }

  // 确保金额有效
  bets.forEach(b => {
    b.amount = Math.max(10, Math.min(b.amount, balance));
  });

  state.lastBetAmount = bets.reduce((s, b) => s + b.amount, 0);
  return bets;
}

/**
 * 根据人格计算下注金额（资金管理策略）
 * 所有返回值都确保是整数
 */
function calculateBetAmountByPersonality(
  personalityId: AIPersonalityId,
  playerId: string,
  balance: number,
  baseUnit: number
): number {
  const state = getState(playerId);

  switch (personalityId) {
    case 'classic':
      return Math.floor(Math.min(baseUnit * 2, balance * 0.1));

    case 'madman': // 马丁格尔：输后加倍
      if (state.lastWasWin) {
        state.baseBet = baseUnit;
        state.consecutiveLosses = 0;
      } else {
        state.consecutiveLosses++;
        state.baseBet = Math.floor(Math.min(baseUnit * Math.pow(2, state.consecutiveLosses), balance * 0.3));
      }
      return Math.floor(Math.min(state.baseBet, balance));

    case 'gambler': // 翻本策略
      if (state.lastWasWin) {
        state.baseBet = baseUnit;
      } else {
        const lostAmount = state.lastBetAmount || baseUnit;
        state.baseBet = Math.floor(Math.min(lostAmount, balance * 0.25));
      }
      return Math.floor(Math.min(state.baseBet, balance));

    case 'hunter': // 反马丁格尔：赢后加倍
      if (state.lastWasWin) {
        state.baseBet = Math.floor(Math.min(state.baseBet * 2, balance * 0.2));
      } else {
        state.baseBet = baseUnit;
      }
      return Math.floor(Math.min(state.baseBet, balance));

    case 'reaper': // 1-3-2-6系统
      if (!state.lastWasWin) {
        state.reaperStep = 0;
      } else {
        state.reaperStep = (state.reaperStep + 1) % 4;
      }
      const multipliers = [1, 3, 2, 6];
      return Math.floor(Math.min(baseUnit * multipliers[state.reaperStep], balance));

    case 'turtle': // 奥斯卡磨盘
      if (state.lastWasWin) {
        state.oscarTarget = Math.min(state.oscarTarget + 1, 5);
      }
      return Math.floor(Math.min(baseUnit * state.oscarTarget, balance));

    case 'blunt_sword': // 达朗贝尔
      if (state.lastWasWin) {
        state.baseBet = Math.max(baseUnit, state.baseBet - baseUnit);
      } else {
        state.baseBet = Math.floor(Math.min(state.baseBet + baseUnit, balance * 0.15));
      }
      return Math.floor(Math.min(state.baseBet, balance));

    case 'ascetic': // 固定比例
      return Math.max(10, Math.floor(balance * 0.02));

    case 'mathematician': // 斐波那契
      if (state.lastWasWin) {
        state.fibStep = Math.max(0, state.fibStep - 2);
      } else {
        state.fibStep = Math.min(FIBONACCI.length - 1, state.fibStep + 1);
      }
      return Math.floor(Math.min(baseUnit * FIBONACCI[state.fibStep], balance));

    case 'schemer': // 拉布歇尔
      if (state.labouchereSequence.length < 2) {
        state.labouchereSequence = [1, 2, 3, 4];
      }
      if (state.lastWasWin) {
        state.labouchereSequence.shift();
        state.labouchereSequence.pop();
        if (state.labouchereSequence.length < 2) {
          state.labouchereSequence = [1, 2, 3, 4];
        }
      } else {
        const lastUnits = Math.ceil(state.lastBetAmount / baseUnit) || 1;
        state.labouchereSequence.push(lastUnits);
      }
      const sum = state.labouchereSequence[0] + state.labouchereSequence[state.labouchereSequence.length - 1];
      return Math.floor(Math.min(baseUnit * sum, balance));

    case 'occultist': // 对冲策略
      return Math.max(10, Math.floor(balance * 0.05));

    default:
      return Math.floor(Math.min(baseUnit, balance));
  }
}

/**
 * 记录上一局结果
 */
export function recordLastResult(playerId: string, wasWin: boolean): void {
  const state = getState(playerId);
  state.lastWasWin = wasWin;
  state.lastResults.push(wasWin ? 'win' : 'lose');
  if (state.lastResults.length > 20) {
    state.lastResults.shift();
  }

  if (wasWin) {
    state.winStreak++;
    state.loseStreak = 0;
    state.totalWins++;
  } else {
    state.loseStreak++;
    state.winStreak = 0;
    state.totalLosses++;
  }
}

/**
 * 应用人格策略到神经网络推荐的投注（兼容旧接口）
 */
export function applyPersonalityToBets(
  personalityId: AIPersonalityId,
  playerId: string,
  balance: number,
  nnBets: BetDecision[]
): BetDecision[] {
  // 新逻辑：直接使用 interpretNNByPersonality
  return nnBets;
}