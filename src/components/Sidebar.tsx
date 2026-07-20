import { useGameStore } from '@/store/gameStore';

interface SidebarProps {
  side: 'left' | 'right';
}

export default function Sidebar({ side }: SidebarProps) {
  const lastResults = useGameStore(s => s.lastResults);
  const players = useGameStore(s => s.players);

  // 计算历史大/围骰/小概率
  const total = lastResults.length;
  const tripleCount = lastResults.filter(r => r.isTriple).length;
  const bigCount = lastResults.filter(r => !r.isTriple && r.sum >= 11 && r.sum <= 17).length;
  const smallCount = lastResults.filter(r => !r.isTriple && r.sum >= 4 && r.sum <= 10).length;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  if (side === 'left') {
    return (
      <div className="sidebar sidebar-left">
        {/* 大/围骰/小 概率统计 */}
        <div className="sidebar-section">
          <div className="sidebar-title">大/围骰/小 概率</div>
          <div className="prob-stats">
            <div className="prob-item prob-small">
              <span className="prob-label">小</span>
              <span className="prob-value">{pct(smallCount)}%</span>
              <span className="prob-count">{smallCount}/{total}</span>
            </div>
            <div className="prob-item prob-triple">
              <span className="prob-label">围骰</span>
              <span className="prob-value">{pct(tripleCount)}%</span>
              <span className="prob-count">{tripleCount}/{total}</span>
            </div>
            <div className="prob-item prob-big">
              <span className="prob-label">大</span>
              <span className="prob-value">{pct(bigCount)}%</span>
              <span className="prob-count">{bigCount}/{total}</span>
            </div>
          </div>
        </div>

        <div className="sidebar-section" style={{ flex: 1, minHeight: 0 }}>
          <div className="sidebar-title">历史记录 / History</div>
          {lastResults.length === 0 ? (
            <div className="history-empty">暂无记录</div>
          ) : (
            <div className="history-list">
              {lastResults.slice(0, 30).map((result, idx) => (
                <div key={idx} className="history-item">
                  <div className="history-dice">
                    {result.dice.map((d, i) => (
                      <span key={i} className="history-dot">{d}</span>
                    ))}
                  </div>
                  <span className="history-sum">{result.sum}</span>
                  {result.isTriple && <span className="history-triple">围</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Right side - All players' bets + payouts guide
  const allBets = players.flatMap(p =>
    p.currentBets.map(b => ({ ...b, playerName: p.name, playerColor: p.color }))
  );
  const totalBet = allBets.reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="sidebar sidebar-right">
      <div className="sidebar-section">
        <div className="sidebar-title">当前下注 / Bets</div>
        {allBets.length === 0 ? (
          <div className="history-empty">尚未下注</div>
        ) : (
          <div className="history-list">
            {allBets.map((bet) => (
              <div key={bet.id} className="history-item">
                <span className="bet-player-dot" style={{ background: bet.playerColor }} />
                <span style={{ color: 'var(--cream)', flex: 1 }}>{bet.label}</span>
                <span className="history-sum">${bet.amount}</span>
              </div>
            ))}
            <div className="history-item" style={{ background: 'rgba(212, 168, 67, 0.15)', borderColor: 'var(--gold-dark)' }}>
              <span style={{ color: 'var(--gold)', fontWeight: 700, flex: 1 }}>合计</span>
              <span className="history-sum">${totalBet}</span>
            </div>
          </div>
        )}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-title">赔率 / Payouts</div>
        <div className="payouts-guide">
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">大/小/单/双</span>
            <span className="payouts-guide-value">1 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">对子 (Double)</span>
            <span className="payouts-guide-value">8 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">全骰 (Any Triple)</span>
            <span className="payouts-guide-value">24 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">围骰 (Specific)</span>
            <span className="payouts-guide-value">150 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">长牌 (Combo)</span>
            <span className="payouts-guide-value">5 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">短牌 1个</span>
            <span className="payouts-guide-value">1 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">短牌 2个</span>
            <span className="payouts-guide-value">2 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">短牌 3个</span>
            <span className="payouts-guide-value">3 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">点数 4 / 17</span>
            <span className="payouts-guide-value">50 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">点数 5 / 16</span>
            <span className="payouts-guide-value">30 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">点数 6 / 15</span>
            <span className="payouts-guide-value">18 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">点数 7 / 14</span>
            <span className="payouts-guide-value">12 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">点数 8 / 13</span>
            <span className="payouts-guide-value">8 : 1</span>
          </div>
          <div className="payouts-guide-row">
            <span className="payouts-guide-label">点数 9-12</span>
            <span className="payouts-guide-value">6 : 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
