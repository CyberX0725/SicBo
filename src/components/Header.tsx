import { useGameStore } from '@/store/gameStore';
import { DiceValue } from '@/types';
import DiceDisplay from './DiceDisplay';

interface HeaderProps {
  diceResult: [DiceValue, DiceValue, DiceValue] | null;
  phase: 'betting' | 'rolling' | 'result' | 'lobby';
}

export default function Header({ diceResult, phase }: HeaderProps) {
  const players = useGameStore(s => s.players);
  const activePlayerIndex = useGameStore(s => s.activePlayerIndex);
  const finishCurrentPlayer = useGameStore(s => s.finishCurrentPlayer);
  const clearBets = useGameStore(s => s.clearBets);
  const resetForNextRound = useGameStore(s => s.resetForNextRound);
  const backToLobby = useGameStore(s => s.backToLobby);
  const gameConfig = useGameStore(s => s.gameConfig);
  const speedMultiplier = useGameStore(s => s.speedMultiplier);
  const setSpeedMultiplier = useGameStore(s => s.setSpeedMultiplier);

  const activePlayer = players[activePlayerIndex];
  const balance = activePlayer?.balance ?? 0;
  const currentBets = activePlayer?.currentBets ?? [];
  const winAmount = activePlayer?.winAmount ?? 0;

  const totalBet = currentBets.reduce((sum, b) => sum + b.amount, 0);
  const sum = diceResult ? diceResult[0] + diceResult[1] + diceResult[2] : 0;
  const isTriple = diceResult && diceResult[0] === diceResult[1] && diceResult[1] === diceResult[2];
  const isTrainingMode = gameConfig?.trainingMode;

  return (
    <div className="casino-header">
      <div className="casino-logo">
        <div className="logo-icon">骰</div>
        <div className="logo-text-block">
          <div className="logo-text">骰宝</div>
          <div className="logo-subtitle">SIC BO</div>
        </div>
      </div>

      <div className="header-stats">
        {/* 当前玩家信息 */}
        {activePlayer && phase === 'betting' && (
          <div className="header-stat">
            <div className="header-stat-label">当前玩家</div>
            <div className="header-stat-value" style={{ color: activePlayer.color }}>
              {activePlayer.name}
            </div>
          </div>
        )}
        <div className="header-stat">
          <div className="header-stat-label">余额 / Balance</div>
          <div className="header-stat-value">${balance.toLocaleString()}</div>
        </div>
        <div className="header-stat">
          <div className="header-stat-label">本局下注 / Bet</div>
          <div className="header-stat-value">${totalBet.toLocaleString()}</div>
        </div>
        {phase === 'result' && (
          <div className="header-stat">
            <div className="header-stat-label">
              {winAmount > 0 ? '赢得 / Win' : '结果 / Result'}
            </div>
            <div className={`header-stat-value ${winAmount > 0 ? 'win' : 'lose'}`}>
              {winAmount > 0 ? `+$${winAmount.toLocaleString()}` : `$0`}
            </div>
          </div>
        )}

        <div className="dice-shaker-container">
          <div className="dice-shaker-dice">
            <DiceDisplay
              result={diceResult}
              rolling={phase === 'rolling'}
              size="big"
            />
          </div>
          <div className="dice-shaker-info">
            <div className="dice-shaker-label">点数 / Sum</div>
            <div className="dice-shaker-sum">{diceResult ? sum : '—'}</div>
            <div className={`dice-shaker-status ${phase === 'rolling' ? 'rolling' : ''}`}>
              {phase === 'rolling' && '摇骰中...'}
              {phase === 'result' && isTriple && '围骰!'}
              {phase === 'result' && !isTriple && '已开骰'}
              {phase === 'betting' && '请下注'}
            </div>
          </div>
        </div>
      </div>

      <div className="header-actions">
        {/* 训练场倍速控制 */}
        {isTrainingMode && (
          <div className="speed-control">
            <label className="speed-label">倍速</label>
            <input
              type="range"
              className="speed-slider"
              min={1}
              max={10}
              step={1}
              value={speedMultiplier}
              onChange={e => setSpeedMultiplier(Number(e.target.value))}
            />
            <span className="speed-value">{speedMultiplier}x</span>
          </div>
        )}
        
        {phase === 'betting' && activePlayer?.type === 'human' && (
          <>
            <button
              className="action-btn btn-roll"
              onClick={finishCurrentPlayer}
            >
              完成下注
            </button>
            <button
              className="action-btn btn-clear"
              onClick={clearBets}
              disabled={currentBets.length === 0}
            >
              清 除
            </button>
          </>
        )}
        {phase === 'result' && !isTrainingMode && (
          <>
            <button className="action-btn btn-next" onClick={resetForNextRound}>
              下一局
            </button>
            <button className="action-btn btn-clear" onClick={backToLobby}>
              返回大厅
            </button>
          </>
        )}
        {phase === 'result' && isTrainingMode && (
          <button className="action-btn btn-clear" onClick={backToLobby}>
            返回大厅
          </button>
        )}
      </div>
    </div>
  );
}
