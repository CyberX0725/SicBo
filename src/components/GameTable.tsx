import { useGameStore } from '@/store/gameStore';
import { BET_OPTIONS } from '@/constants/payouts';
import BettingArea from './BettingArea';
import ChipBar from './ChipBar';
import Header from './Header';
import Sidebar from './Sidebar';
import MessageToast from './MessageToast';
import AIPanel from './AIPanel';
import { BetOption, DiceValue } from '@/types';
import { useRef, useState, useEffect, useCallback } from 'react';

// 桌布设计尺寸（固定比例，永不重排）
const DESIGN_W = 1400;
const DESIGN_H = 820;

export default function GameTable() {
  const diceResult = useGameStore(s => s.diceResult);
  const phase = useGameStore(s => s.phase);
  const message = useGameStore(s => s.message);
  const players = useGameStore(s => s.players);
  const activePlayerIndex = useGameStore(s => s.activePlayerIndex);
  const gameConfig = useGameStore(s => s.gameConfig);

  // 缩放逻辑：根据容器可用空间等比缩放桌布
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const updateScale = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const availW = el.clientWidth;
    const availH = el.clientHeight;
    const s = Math.min(availW / DESIGN_W, availH / DESIGN_H);
    setScale(s > 0 ? s : 1);
  }, []);

  useEffect(() => {
    updateScale();
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScale]);

  // Group bets by section for the new mat layout
  // Section 0: top (SMALL/BIG + doubles + triples + ANY)
  // Section 1: sums 4-17 (14 cells)
  // Section 2: combinations (15 cells)
  // Section 3: single dice 一-六 (6 cells)
  const sections: BetOption[][] = [[], [], [], []];
  BET_OPTIONS.forEach((opt) => {
    const sec = opt.section ?? 0;
    if (sec < 4 && sections[sec]) sections[sec].push(opt);
  });
  // Sort each section by col (and row for section 0)
  sections.forEach((s) =>
    s.sort((a, b) => (a.row ?? 0) - (b.row ?? 0) || a.col - b.col)
  );

  return (
    <div className="game-container">
      <Header
        diceResult={diceResult ? (diceResult.dice as [DiceValue, DiceValue, DiceValue]) : null}
        phase={phase}
      />

      <div className="game-body">
        <div className="left-panel">
          <Sidebar side="left" />
          {/* AI决策面板 */}
          {gameConfig?.aiAssistEnabled && <AIPanel />}
        </div>

        <div className="table-area">
          {/* 多人模式玩家信息栏 */}
          {players.length > 1 && (
            <div className="players-bar">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className={`player-tag ${i === activePlayerIndex && phase === 'betting' ? 'active' : ''} ${p.balance <= 0 ? 'bankrupt' : ''}`}
                  style={{ borderColor: p.balance <= 0 ? '#666' : p.color }}
                >
                  <span className="player-tag-dot" style={{ background: p.balance <= 0 ? '#666' : p.color }} />
                  <span className="player-tag-name">{p.name}</span>
                  {p.balance <= 0 ? (
                    <span className="player-tag-bankrupt">已破产</span>
                  ) : (
                    <span className="player-tag-balance">${p.balance.toLocaleString()}</span>
                  )}
                  {phase === 'result' && p.winAmount !== 0 && (
                    <span className={`player-tag-win ${p.winAmount > 0 ? 'win' : 'lose'}`}>
                      {p.winAmount > 0 ? `+$${p.winAmount}` : `-$${Math.abs(p.winAmount)}`}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="sic-bo-table-wrapper" ref={wrapperRef}>
            <div
              className="sic-bo-table-frame"
              style={{
                width: DESIGN_W,
                height: DESIGN_H,
                transform: `translate(-50%, -50%) scale(${scale})`,
                transformOrigin: 'center center',
              }}
            >
              <div className="sic-bo-table">
                {/* Section 0: Top - SMALL/BIG + doubles + specific triples + ANY TRIPLE (11-col × 3-row grid) */}
                <div className="table-section section-top">
                  {sections[0].map((opt, idx) => (
                    <BettingArea
                      key={`${opt.type}-${opt.target}-${idx}`}
                      option={opt}
                      sectionCols={11}
                    />
                  ))}
                </div>

                {/* Section 1: Sum numbers 4-17 (14 equal cells, NO DICE) */}
                <div className="table-section section-sums">
                  {sections[1].map((opt, idx) => (
                    <BettingArea
                      key={`${opt.type}-${opt.target}-${idx}`}
                      option={opt}
                      sectionCols={14}
                    />
                  ))}
                </div>

                {/* Section 2: Two-dice combinations (label on left + 15 cells) */}
                <div className="table-section section-combos">
                  <div className="combo-label">
                    <div className="combo-label-en">TWO DICE<br />COMBO</div>
                    <div className="combo-label-cn">二骰組合</div>
                    <div className="combo-label-pay">1賠5</div>
                    <div className="combo-label-en-small">1 WINS 5</div>
                  </div>
                  {sections[2].map((opt, idx) => (
                    <BettingArea
                      key={`${opt.type}-${opt.target}-${idx}`}
                      option={opt}
                      sectionCols={15}
                    />
                  ))}
                </div>

                {/* Section 3: Single dice 一-六 (6 equal cells) */}
                <div className="table-section section-singles">
                  {sections[3].map((opt, idx) => (
                    <BettingArea
                      key={`${opt.type}-${opt.target}-${idx}`}
                      option={opt}
                      sectionCols={6}
                    />
                  ))}
                </div>

                {/* Section 4: Bottom labels - ONE continuous section, no internal divisions */}
                <div className="table-section section-labels">
                  <div className="pay-label-continuous">
                    <span className="pay-cn">單骰1賠1</span>
                    <span className="pay-divider">|</span>
                    <span className="pay-en">1 WINS 1 ON ONE DICE</span>
                    <span className="pay-divider">|</span>
                    <span className="pay-cn">雙骰1賠2</span>
                    <span className="pay-divider">|</span>
                    <span className="pay-en">1 WINS 2 ON TWO DICE</span>
                    <span className="pay-divider">|</span>
                    <span className="pay-cn">三骰1賠3</span>
                    <span className="pay-divider">|</span>
                    <span className="pay-en">1 WINS 3 ON THREE DICE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <ChipBar />
        </div>

        <div className="right-panel">
          <Sidebar side="right" />
        </div>
      </div>

      {message && phase === 'result' && <MessageToast message={message} />}
    </div>
  );
}
