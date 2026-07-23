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

  // 根据权重决定押大小还是高赔率（理性选择）
  const totalWeight = prefs.highPayoutWeight + prefs.lowRiskWeight;
  const chooseHighPayout = totalWeight > 0 &&
    Math.random() < (prefs.highPayoutWeight / totalWeight);

  if (!chooseHighPayout || total < 5) {
    // 押大小（理性选择：NN概率更高的方向）
    const chooseBig = nnBigProb > nnSmallProb;

    // 检查置信度阈值
    const chosenProb = chooseBig ? nnBigProb : nnSmallProb;
    if (chosenProb >= prefs.confidenceThreshold) {
      // 检查期望收益阈值
      const chosenEV = chooseBig ? bigEV : smallEV;
      if (chosenEV >= prefs.expectedValueThreshold) {
        bets.push({
          type: chooseBig ? BetType.BIG : BetType.SMALL,
          label: chooseBig ? '大' : '小',
          amount: 0, // 金额稍后计算
        });
      }
    }
  } else {
    // 押高赔率（围骰、对子、点数）- 理性博冷
    const highPayoutOptions = [
      { type: BetType.TRIPLE, label: '全圍骰', prob: nnProbs[5], payout: 24 },
      { type: BetType.SPECIFIC_TRIPLE, label: '围骰', prob: nnProbs[5] / 6, payout: 150 },
      { type: BetType.DOUBLE, label: '对子', prob: nnProbs[3], payout: 8 },
    ];

    // 根据NN概率选择，但要符合置信度和期望收益要求
    const validOptions = highPayoutOptions.filter(opt =>
      opt.prob >= prefs.confidenceThreshold * 0.5 &&
      expectedValue(opt.prob, opt.payout) >= prefs.expectedValueThreshold * 0.5
    );

    if (validOptions.length > 0) {
      // 按概率加权随机选择
      const totalProb = validOptions.reduce((s, o) => s + o.prob, 0);
      let rand = Math.random() * totalProb;
      for (const opt of validOptions) {
        rand -= opt.prob;
        if (rand <= 0) {
          let target: number | undefined;
          if (opt.type === BetType.SPECIFIC_TRIPLE) {
            target = Math.floor(Math.random() * 6) + 1;
          } else if (opt.type === BetType.DOUBLE && total >= 5) {
            // 选择热号对子
            const numFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            history.forEach(r => r.dice.forEach(d => { numFreq[d]++; }));
            target = Number(Object.entries(numFreq).sort((a, b) => b[1] - a[1])[0][0]);
          }
          bets.push({
            type: opt.type,
            target,
            label: target ? `${opt.label} ${target}` : opt.label,
            amount: 0,
          });
          break;
        }
      }
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
      return Math.min(baseUnit * 2, balance * 0.1);

    case 'madman': // 马丁格尔：输后加倍
      if (state.lastWasWin) {
        state.baseBet = baseUnit;
        state.consecutiveLosses = 0;
      } else {
        state.consecutiveLosses++;
        state.baseBet = Math.min(baseUnit * Math.pow(2, state.consecutiveLosses), balance * 0.3);
      }
      return Math.min(state.baseBet, balance);

    case 'gambler': // 翻本策略
      if (state.lastWasWin) {
        state.baseBet = baseUnit;
      } else {
        const lostAmount = state.lastBetAmount || baseUnit;
        state.baseBet = Math.min(lostAmount, balance * 0.25);
      }
      return Math.min(state.baseBet, balance);

    case 'hunter': // 反马丁格尔：赢后加倍
      if (state.lastWasWin) {
        state.baseBet = Math.min(state.baseBet * 2, balance * 0.2);
      } else {
        state.baseBet = baseUnit;
      }
      return Math.min(state.baseBet, balance);

    case 'reaper': // 1-3-2-6系统
      if (!state.lastWasWin) {
        state.reaperStep = 0;
      } else {
        state.reaperStep = (state.reaperStep + 1) % 4;
      }
      const multipliers = [1, 3, 2, 6];
      return Math.min(baseUnit * multipliers[state.reaperStep], balance);

    case 'turtle': // 奥斯卡磨盘
      if (state.lastWasWin) {
        state.oscarTarget = Math.min(state.oscarTarget + 1, 5);
      }
      return Math.min(baseUnit * state.oscarTarget, balance);

    case 'blunt_sword': // 达朗贝尔
      if (state.lastWasWin) {
        state.baseBet = Math.max(baseUnit, state.baseBet - baseUnit);
      } else {
        state.baseBet = Math.min(state.baseBet + baseUnit, balance * 0.15);
      }
      return Math.min(state.baseBet, balance);

    case 'ascetic': // 固定比例
      return Math.max(10, Math.floor(balance * 0.02));

    case 'mathematician': // 斐波那契
      if (state.lastWasWin) {
        state.fibStep = Math.max(0, state.fibStep - 2);
      } else {
        state.fibStep = Math.min(FIBONACCI.length - 1, state.fibStep + 1);
      }
      return Math.min(baseUnit * FIBONACCI[state.fibStep], balance);

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
      return Math.min(baseUnit * sum, balance);

    case 'occultist': // 对冲策略
      return Math.max(10, Math.floor(balance * 0.05));

    default:
      return Math.min(baseUnit, balance);
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