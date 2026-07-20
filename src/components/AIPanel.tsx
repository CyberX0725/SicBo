import { useState, useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getFullAnalysis } from '@/engine/AIEngine';
import { nnAnalyze, NN_CATEGORIES } from '@/engine/NeuralEngine';

export default function AIPanel() {
  const lastResults = useGameStore(s => s.lastResults);
  const phase = useGameStore(s => s.phase);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);

  const suggestions = useMemo(
    () => getFullAnalysis(lastResults),
    [lastResults, phase]
  );

  const nnDecision = useMemo(
    () => nnAnalyze(lastResults),
    [lastResults, phase]
  );

  return (
    <div className="ai-panel">
      <div className="ai-panel-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="ai-panel-title">🧠 AI 神经网络决策</span>
        <span className="ai-panel-toggle">{collapsed ? '展开' : '收起'}</span>
      </div>

      {!collapsed && (
        <div className="ai-panel-body">
          {/* 神经网络状态栏 */}
          <div className="nn-status">
            <div className="nn-status-row">
              <span className="nn-badge">MLP 24→16→12→6</span>
              <span className="nn-stat">训练{nnDecision.trainCount}轮</span>
              <span className="nn-stat">Loss:{nnDecision.lastLoss.toFixed(3)}</span>
            </div>
            {/* 概率分布条 */}
            <div className="nn-probs">
              {nnDecision.probs.map((p, i) => (
                <div key={i} className={`nn-prob-item ${i === nnDecision.topCategory ? 'active' : ''}`}>
                  <div className="nn-prob-bar-bg">
                    <div className="nn-prob-bar-fill" style={{ width: `${p * 100}%` }} />
                  </div>
                  <span className="nn-prob-label">{NN_CATEGORIES[i]}</span>
                  <span className="nn-prob-val">{(p * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* 分析建议列表 */}
          {suggestions.map((s, i) => (
            <div key={i} className={`ai-suggestion ${expandedIdx === i ? 'expanded' : ''}`}>
              <div
                className="ai-suggestion-top"
                onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              >
                <span className="ai-suggestion-label">{s.label}</span>
                <span className="ai-suggestion-conf">{s.confidence}%</span>
              </div>
              <div className="ai-confidence-bar">
                <div
                  className="ai-confidence-fill"
                  style={{ width: `${s.confidence}%` }}
                />
              </div>
              <p className="ai-suggestion-reason">{s.reason}</p>

              {expandedIdx === i && (
                <div className="ai-suggestion-details">
                  <div className="ai-details-title">📊 详细分析</div>
                  <ul className="ai-details-list">
                    {s.details.map((d, j) => (
                      <li key={j}>{d}</li>
                    ))}
                  </ul>
                  <div className="ai-suggestion-action">
                    <span className="ai-action-icon">💡</span>
                    <span>{s.suggestion}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
          <p className="ai-disclaimer">* 神经网络在线学习，仅供参考，不构成投注建议</p>
        </div>
      )}
    </div>
  );
}
