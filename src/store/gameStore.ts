import { create } from 'zustand';
import { Bet, DiceResult, GamePhase, ChipValue, Player, GameConfig, BetType } from '@/types';
import { rollDice } from '@/engine/DiceLogic';
import { calculateAllPayouts, calculateWinAmount, getWinningBets } from '@/engine/BettingLogic';
import { aiDecideBets } from '@/engine/AIEngine';
import { interpretNNByPersonality, recordLastResult as recordPersonalityResult, resetPersonalityState, BetDecision } from '@/engine/AIPersonalityEngine';
import { nnTrainOnResult, resetNeuralNetwork } from '@/engine/NeuralEngine';
import { CHIP_VALUES } from '@/constants/payouts';

interface GameStore {
  // 配置
  gameConfig: GameConfig | null;
  // 玩家
  players: Player[];
  activePlayerIndex: number;
  // 游戏状态
  selectedChipValue: ChipValue;
  diceResult: DiceResult | null;
  phase: GamePhase;
  lastResults: DiceResult[];
  message: string | null;
  winningBetIds: string[];
  speedMultiplier: number; // 训练场倍速 1-10

  // 操作
  startGame: (config: GameConfig) => void;
  backToLobby: () => void;
  selectChip: (value: ChipValue) => void;
  placeBet: (bet: Omit<Bet, 'id' | 'amount'>) => boolean;
  removeBet: (betId: string) => void;
  clearBets: () => void;
  finishCurrentPlayer: () => void;
  roll: () => void;
  resetForNextRound: () => void;
  setSpeedMultiplier: (speed: number) => void;
}

let betCounter = 0;

/**
 * AI下注决策：根据人格策略偏好独立解读NN预测
 */
function getAIBets(
  player: Player,
  lastResults: DiceResult[],
  chipValues: readonly number[]
): BetDecision[] {
  const personalityId = player.personality || 'classic';
  const aggressiveness = player.aggressiveness ?? 50;

  // 使用人格策略引擎进行差异化决策
  return interpretNNByPersonality(
    personalityId,
    player.id,
    lastResults,
    player.balance,
    aggressiveness
  );
}

// 辅助函数：根据倍速计算实际延迟时间
function getDelay(baseMs: number, multiplier: number): number {
  return Math.max(50, Math.floor(baseMs / multiplier));
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameConfig: null,
  players: [],
  activePlayerIndex: 0,
  selectedChipValue: CHIP_VALUES[0] as ChipValue,
  diceResult: null,
  phase: 'lobby',
  lastResults: [],
  message: null,
  winningBetIds: [],
  speedMultiplier: 1,

  setSpeedMultiplier: (speed) => set({ speedMultiplier: speed }),

  startGame: (config) => {
    resetNeuralNetwork(); // 新游戏重置神经网络
    // 重置所有玩家的人格状态
    config.players.forEach(p => resetPersonalityState(p.id));
    set({
      gameConfig: config,
      players: config.players,
      activePlayerIndex: 0,
      phase: 'betting',
      diceResult: null,
      message: null,
      winningBetIds: [],
      lastResults: [],
    });
    // 如果第一个玩家是AI，自动下注
    if (config.players[0]?.type === 'ai') {
      const delay1 = getDelay(800, 1);
      setTimeout(() => {
        const s = get();
        const aiPlayer = s.players[s.activePlayerIndex];
        if (aiPlayer.type !== 'ai' || s.phase !== 'betting') return;

        // AI必须下注：余额>=10就必须下注
        if (aiPlayer.balance >= 10) {
          const aiBets = getAIBets(aiPlayer, s.lastResults, CHIP_VALUES);
          const players = [...s.players];
          const p = { ...players[s.activePlayerIndex] };
          const newBets: Bet[] = [];

          for (const ab of aiBets) {
            if (p.balance < ab.amount) continue;
            newBets.push({
              id: `bet_${Date.now()}_${betCounter++}`,
              type: ab.type,
              target: ab.target,
              subTarget: ab.subTarget,
              label: ab.label,
              amount: ab.amount,
            });
            p.balance -= ab.amount;
          }

          // 保底：如果AI没有生成任何下注，强制押大小
          if (newBets.length === 0 && p.balance >= 10) {
            const minBet = Math.min(10, p.balance);
            newBets.push({
              id: `bet_${Date.now()}_${betCounter++}`,
              type: BetType.BIG,
              label: '大',
              amount: minBet,
            });
            p.balance -= minBet;
          }

          p.currentBets = newBets;
          players[s.activePlayerIndex] = p;
          set({ players });
        }

        // AI下注完毕后继续
        const delay2 = getDelay(600, get().speedMultiplier);
        setTimeout(() => get().finishCurrentPlayer(), delay2);
      }, delay1);
    }
  },

  backToLobby: () => {
    set({ phase: 'lobby', gameConfig: null, players: [] });
  },

  selectChip: (value) => set({ selectedChipValue: value }),

  placeBet: (bet) => {
    const state = get();
    if (state.phase !== 'betting') return false;
    const player = state.players[state.activePlayerIndex];
    if (!player || player.type === 'ai') return false;
    if (player.balance < state.selectedChipValue) {
      set({ message: '余额不足！' });
      return false;
    }

    const newBet: Bet = {
      ...bet,
      id: `bet_${Date.now()}_${betCounter++}`,
      amount: state.selectedChipValue,
    };

    const players = [...state.players];
    const p = { ...players[state.activePlayerIndex] };
    const existingIdx = p.currentBets.findIndex(
      b => b.type === bet.type && b.target === bet.target &&
        JSON.stringify(b.subTarget) === JSON.stringify(bet.subTarget)
    );

    if (existingIdx >= 0) {
      const bets = [...p.currentBets];
      bets[existingIdx] = { ...bets[existingIdx], amount: bets[existingIdx].amount + state.selectedChipValue };
      p.currentBets = bets;
    } else {
      p.currentBets = [...p.currentBets, newBet];
    }
    p.balance = p.balance - state.selectedChipValue;
    players[state.activePlayerIndex] = p;

    set({ players, message: null });
    return true;
  },

  removeBet: (betId) => {
    const state = get();
    const players = [...state.players];
    const p = { ...players[state.activePlayerIndex] };
    const bet = p.currentBets.find(b => b.id === betId);
    if (bet) {
      p.balance += bet.amount;
      p.currentBets = p.currentBets.filter(b => b.id !== betId);
      players[state.activePlayerIndex] = p;
      set({ players });
    }
  },

  clearBets: () => {
    const state = get();
    const players = [...state.players];
    const p = { ...players[state.activePlayerIndex] };
    const totalBet = p.currentBets.reduce((sum, b) => sum + b.amount, 0);
    p.balance += totalBet;
    p.currentBets = [];
    players[state.activePlayerIndex] = p;
    set({ players, message: null });
  },

  finishCurrentPlayer: () => {
    const state = get();
    if (state.phase !== 'betting') return;

    const nextIdx = state.activePlayerIndex + 1;

    if (nextIdx >= state.players.length) {
      // 所有玩家下注完毕，开始摇骰
      get().roll();
      return;
    }

    // 切换到下一个玩家
    set({ activePlayerIndex: nextIdx, message: null });

    // 如果下一个是AI，自动下注
    const nextPlayer = state.players[nextIdx];
    if (nextPlayer.type === 'ai') {
      const baseDelay = state.gameConfig?.trainingMode ? 500 : 1000;
      const delay = getDelay(baseDelay, state.speedMultiplier);
      setTimeout(() => {
        const s = get();
        const aiPlayer = s.players[s.activePlayerIndex];
        if (aiPlayer.type !== 'ai') return;

        // AI必须下注：余额>=10就必须下注
        if (aiPlayer.balance >= 10) {
          const aiBets = getAIBets(aiPlayer, s.lastResults, CHIP_VALUES);
          const players = [...s.players];
          const p = { ...players[s.activePlayerIndex] };
          const newBets: Bet[] = [];

          for (const ab of aiBets) {
            if (p.balance < ab.amount) continue;
            newBets.push({
              id: `bet_${Date.now()}_${betCounter++}`,
              type: ab.type,
              target: ab.target,
              subTarget: ab.subTarget,
              label: ab.label,
              amount: ab.amount,
            });
            p.balance -= ab.amount;
          }

          // 保底：如果AI没有生成任何下注，强制押大小
          if (newBets.length === 0 && p.balance >= 10) {
            const minBet = Math.min(10, p.balance);
            newBets.push({
              id: `bet_${Date.now()}_${betCounter++}`,
              type: BetType.BIG,
              label: '大',
              amount: minBet,
            });
            p.balance -= minBet;
          }

          p.currentBets = newBets;
          players[s.activePlayerIndex] = p;
          set({ players });
        }

        // AI下注完毕后继续
        const nextDelay = getDelay(600, s.speedMultiplier);
        setTimeout(() => get().finishCurrentPlayer(), nextDelay);
      }, delay);
    }
  },

  roll: () => {
    set({ phase: 'rolling', message: null, winningBetIds: [] });

    const rollDelay = getDelay(2500, get().speedMultiplier);
    setTimeout(() => {
      const result = rollDice();
      const s = get();

      // 计算每个玩家的输赢
      const players = s.players.map(p => {
        if (p.currentBets.length === 0) return { ...p, winAmount: 0 };
        const totalPayout = calculateAllPayouts(p.currentBets, result);
        const winAmount = calculateWinAmount(p.currentBets, result);

        // 记录人格状态：输赢结果
        const wasWin = totalPayout > 0;
        recordPersonalityResult(p.id, wasWin);

        return {
          ...p,
          balance: p.balance + totalPayout,
          winAmount,
        };
      });

      const allWinningIds = players.flatMap(p =>
        getWinningBets(p.currentBets, result)
      );

      const anyWin = players.some(p => p.winAmount > 0);

      set({
        diceResult: result,
        phase: 'result',
        players,
        winningBetIds: allWinningIds,
        lastResults: [result, ...s.lastResults].slice(0, 20),
        message: anyWin ? '有玩家赢得筹码！' : '本轮无人中奖。',
      });

      // 神经网络在线学习：用当前历史特征训练网络，让它学习实际结果
      nnTrainOnResult(s.lastResults, result);
      
      // 训练场模式：自动进入下一局
      if (s.gameConfig?.trainingMode) {
        const nextRoundDelay = getDelay(2000, s.speedMultiplier);
        setTimeout(() => {
          const currentState = get();
          const allBankrupt = currentState.players.every(p => p.balance < 10);
          if (!allBankrupt) {
            get().resetForNextRound();
          }
        }, nextRoundDelay);
      }
    }, rollDelay);
  },

  resetForNextRound: () => {
    const state = get();
    const players = state.players.map(p => ({
      ...p,
      currentBets: [],
      winAmount: 0,
    }));
    set({
      players,
      activePlayerIndex: 0,
      diceResult: null,
      phase: 'betting',
      message: null,
      winningBetIds: [],
    });
    
    // 训练场模式：自动开始下一局
    const isTrainingMode = state.gameConfig?.trainingMode;
    const allBankrupt = players.every(p => p.balance < 10);
    
    if (allBankrupt) {
      set({ message: '所有玩家已破产！游戏结束。' });
      return;
    }
    
    // 如果第一个玩家是AI
    if (players[0]?.type === 'ai') {
      const baseDelay = isTrainingMode ? 1500 : 800;
      const delay = getDelay(baseDelay, state.speedMultiplier);
      setTimeout(() => {
        const s = get();
        const aiPlayer = s.players[s.activePlayerIndex];
        if (aiPlayer.type !== 'ai' || s.phase !== 'betting') return;
        
        // 跳过已破产的玩家（余额<10）
        if (aiPlayer.balance < 10) {
          get().finishCurrentPlayer();
          return;
        }

        // AI必须下注
        const aiBets = getAIBets(aiPlayer, s.lastResults, CHIP_VALUES);
        const players2 = [...s.players];
        const p = { ...players2[s.activePlayerIndex] };
        const newBets: Bet[] = [];

        for (const ab of aiBets) {
          if (p.balance < ab.amount) continue;
          newBets.push({
            id: `bet_${Date.now()}_${betCounter++}`,
            type: ab.type,
            target: ab.target,
            subTarget: ab.subTarget,
            label: ab.label,
            amount: ab.amount,
          });
          p.balance -= ab.amount;
        }

        // 保底：如果AI没有生成任何下注，强制押大小
        if (newBets.length === 0 && p.balance >= 10) {
          const minBet = Math.min(10, p.balance);
          newBets.push({
            id: `bet_${Date.now()}_${betCounter++}`,
            type: BetType.BIG,
            label: '大',
            amount: minBet,
          });
          p.balance -= minBet;
        }

        p.currentBets = newBets;
        players2[s.activePlayerIndex] = p;
        set({ players: players2 });

        const finishDelay = getDelay(600, s.speedMultiplier);
        setTimeout(() => get().finishCurrentPlayer(), finishDelay);
      }, delay);
    }
  },
}));