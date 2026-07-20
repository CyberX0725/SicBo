import React from 'react';
import { useGameStore } from '@/store/gameStore';
import { BetOption, BetType, DiceResult, DiceValue } from '@/types';
import DiceIcon from './DiceIcon';

/** 判断某个投注选项是否中奖（基于骰子结果） */
function isOptionWinner(option: BetOption, result: DiceResult): boolean {
  const { dice, sum, isTriple, tripleValue } = result;
  switch (option.type) {
    case BetType.BIG:
      return !isTriple && sum >= 11 && sum <= 17;
    case BetType.SMALL:
      return !isTriple && sum >= 4 && sum <= 10;
    case BetType.ODD:
      return !isTriple && sum % 2 === 1;
    case BetType.EVEN:
      return !isTriple && sum % 2 === 0;
    case BetType.SPECIFIC_SUM:
      return option.target === sum;
    case BetType.DOUBLE:
      return dice.filter(d => d === option.target).length >= 2;
    case BetType.TRIPLE:
      return isTriple;
    case BetType.SPECIFIC_TRIPLE:
      return isTriple && tripleValue === option.target;
    case BetType.SINGLE_NUMBER:
      return dice.filter(d => d === option.target).length > 0;
    case BetType.COMBINATION:
      return option.subTarget?.every(n => dice.includes(n as DiceValue)) ?? false;
    default:
      return false;
  }
}

interface BettingAreaProps {
  option: BetOption;
  sectionCols: number;
}

export default function BettingArea({ option, sectionCols: _sectionCols }: BettingAreaProps) {
  const placeBet = useGameStore(s => s.placeBet);
  const players = useGameStore(s => s.players);
  const activePlayerIndex = useGameStore(s => s.activePlayerIndex);
  const phase = useGameStore(s => s.phase);
  const diceResult = useGameStore(s => s.diceResult);

  const activePlayer = players[activePlayerIndex];

  // 收集所有玩家在此格子的下注（带颜色）
  const allPlayerBets: { playerId: string; name: string; color: string; amount: number; betIds: string[] }[] = [];
  for (const p of players) {
    const matched = p.currentBets.filter(b => {
      if (b.type !== option.type) return false;
      if (option.type === BetType.COMBINATION) {
        return b.target === option.target &&
          JSON.stringify(b.subTarget) === JSON.stringify(option.subTarget);
      }
      return b.target === option.target;
    });
    if (matched.length > 0) {
      allPlayerBets.push({
        playerId: p.id,
        name: p.name,
        color: p.color,
        amount: matched.reduce((s, b) => s + b.amount, 0),
        betIds: matched.map(b => b.id),
      });
    }
  }

  // 当前玩家的匹配注单（用于右键取消）
  const myBets = activePlayer?.currentBets.filter(b => {
    if (b.type !== option.type) return false;
    if (option.type === BetType.COMBINATION) {
      return b.target === option.target &&
        JSON.stringify(b.subTarget) === JSON.stringify(option.subTarget);
    }
    return b.target === option.target;
  }) ?? [];

  const handleClick = () => {
    if (phase !== 'betting') return;
    if (option.renderType === 'group_label') return;
    placeBet({
      type: option.type,
      target: option.target,
      subTarget: option.subTarget,
      label: option.label,
    });
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (phase !== 'betting' || myBets.length === 0) return;
    if (option.renderType === 'group_label') return;
    useGameStore.getState().removeBet(myBets[myBets.length - 1].id);
  };

  const renderContent = () => {
    const pattern = option.dicePattern || [];
    const payoutValue = typeof option.payout === 'number' ? option.payout : 0;

    switch (option.renderType) {
      case 'group_label': {
        // Merged text header cell (non-interactive), 3-line format
        const parts = option.label.split(' ');
        const cnName = parts[0] || '';
        const payoutText = parts[1] || '';
        const enText = option.type === BetType.DOUBLE
          ? `1 WINS ${payoutValue}`
          : `TRIPLE WINS ${payoutValue}`;
        return (
          <div className="cell-group-label">
            <span className="group-label-cn">{cnName}</span>
            <span className="group-label-pay">{payoutText}</span>
            <span className="group-label-en">{enText}</span>
          </div>
        );
      }

      case 'small_label':
        return (
          <div className="cell-small-big">
            <div className="sbg-title">SMALL</div>
            <div className="sbg-range">4-10</div>
            <div className="sbg-pay">1 WINS 1</div>
            <div className="sbg-warning-line1">LOSE IF ANY TRIPLE</div>
            <div className="sbg-warning-line2">APPEAR</div>
            <div className="sbg-middle-row">
              <div className="sbg-vertical-text">
                <span>逢</span><span>围</span><span>骰</span><span>通</span><span>吃</span>
              </div>
              <div className="sbg-big-char">小</div>
              <div className="sbg-vertical-text">
                <span>一</span><span>赔</span><span>一</span>
              </div>
            </div>
          </div>
        );

      case 'big_label':
        return (
          <div className="cell-small-big">
            <div className="sbg-title">BIG</div>
            <div className="sbg-range">11-17</div>
            <div className="sbg-pay">1 WINS 1</div>
            <div className="sbg-warning-line1">LOSE IF ANY TRIPLE</div>
            <div className="sbg-warning-line2">APPEAR</div>
            <div className="sbg-middle-row">
              <div className="sbg-vertical-text">
                <span>逢</span><span>围</span><span>骰</span><span>通</span><span>吃</span>
              </div>
              <div className="sbg-big-char">大</div>
              <div className="sbg-vertical-text">
                <span>一</span><span>赔</span><span>一</span>
              </div>
            </div>
          </div>
        );

      case 'dice_triple':
        // 3 dice side by side, dice-only (text merged to group_label header)
        return (
          <div className="cell-triple">
            <div className="triple-dice-horizontal">
              <DiceIcon value={pattern[0]} size="md3" />
              <DiceIcon value={pattern[1]} size="md3" />
              <DiceIcon value={pattern[2]} size="md3" />
            </div>
          </div>
        );

      case 'any_triple':
        // 6-row × 3-col grid: each row shows 3 identical dice (one triple), dice-only
        return (
          <div className="cell-any-triple">
            <div className="any-triple-grid">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <React.Fragment key={n}>
                  <DiceIcon value={n} size="sm3" />
                  <DiceIcon value={n} size="sm3" />
                  <DiceIcon value={n} size="sm3" />
                </React.Fragment>
              ))}
            </div>
          </div>
        );

      case 'dice_pair':
        // Doubles row: two identical dice stacked vertically, dice-only
        return (
          <div className="cell-double">
            <div className="double-dice-vertical">
              <DiceIcon value={pattern[0]} size="md2" />
              <DiceIcon value={pattern[1]} size="md2" />
            </div>
          </div>
        );

      case 'sum_cell':
        // No dice, just number and payout. All sum cells use the same white styling.
        return (
          <div className="cell-sum">
            <div className="sum-number">{option.label}</div>
            <div className="sum-payout">1賠{payoutValue}</div>
            <div className="sum-payout-en">1 WINS {payoutValue}</div>
          </div>
        );

      case 'combo_cell':
        // 2 dice stacked vertically
        return (
          <div className="cell-combo">
            <div className="combo-dice-vertical">
              <DiceIcon value={pattern[0]} size="md2" />
              <DiceIcon value={pattern[1]} size="md2" />
            </div>
          </div>
        );

      case 'single_dice':
        return (
          <div className="cell-single">
            <div className="single-char">{option.label}</div>
            <DiceIcon value={pattern[0]} size="lg" />
          </div>
        );

      case 'text':
      default:
        return (
          <div className="cell-text">
            <span className="cell-text-label">{option.label}</span>
            {payoutValue > 0 && (
              <span className="cell-text-payout">1賠{payoutValue}</span>
            )}
          </div>
        );
    }
  };

  // For the top section (11-col × 4-row grid), explicitly place every cell
  // using gridRow + gridColumn so mixed rowSpan/colSpan items align correctly.
  // col/row in BET_OPTIONS are 0-indexed; CSS grid is 1-indexed, so +1.
  const gridPlacement =
    option.section === 0
      ? {
          gridRow: `${(option.row ?? 0) + 1} / span ${option.rowSpan ?? 1}`,
          gridColumn: `${(option.col ?? 0) + 1} / span ${option.colSpan ?? 1}`,
        }
      : undefined;

  const isLabel = option.renderType === 'group_label';

  // 中奖判断：基于骰子结果判断此格子是否中奖（不依赖是否有人下注）
  const isWinner = phase === 'result' && diceResult != null && !isLabel
    && isOptionWinner(option, diceResult);

  return (
    <div
      className={`bet-cell ${isLabel ? 'bet-cell-label' : ''} ${isWinner ? 'bet-cell-winner' : ''} ${
        phase !== 'betting' ? 'bet-cell-disabled' : ''
      }`}
      data-type={option.type}
      data-render={option.renderType}
      style={gridPlacement || undefined}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      title={
        phase === 'betting' && !isLabel
          ? `下注 ${option.label} (左键下注, 右键取消)`
          : undefined
      }
    >
      {renderContent()}
      {allPlayerBets.length > 0 && !isLabel && (
        <div className="bet-chips-container">
          {allPlayerBets.map(pb => (
            <div
              key={pb.playerId}
              className="bet-chip player-chip"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${pb.color}cc, ${pb.color} 60%, ${pb.color}88 100%)`,
                borderColor: pb.color,
              }}
              title={`${pb.name}: $${pb.amount}`}
            >
              {pb.amount >= 1000 ? `${Math.floor(pb.amount / 1000)}k` : pb.amount}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
