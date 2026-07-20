import { useState } from 'react';
import { AI_PERSONALITIES, PERSONALITY_CATEGORIES, AIPersonalityId } from '@/constants/aiPersonalities';
import { AIPersonality } from '@/types';

interface AIPersonalitySelectorProps {
  value: AIPersonality;
  aggressiveness: number;
  onChange: (personality: AIPersonality, aggressiveness?: number) => void;
}

export default function AIPersonalitySelector({
  value,
  aggressiveness,
  onChange,
}: AIPersonalitySelectorProps) {
  const [hoveredPersonality, setHoveredPersonality] = useState<AIPersonalityId | null>(null);

  const currentPersonality = AI_PERSONALITIES[value];

  const riskColors: Record<string, string> = {
    extreme: '#E53935',
    high: '#FF7043',
    medium: '#FFC107',
    low: '#4CAF50',
  };

  const riskLabels: Record<string, string> = {
    extreme: '极高',
    high: '高',
    medium: '中',
    low: '低',
  };

  return (
    <div className="ai-personality-selector">
      {/* 分类选择 */}
      {PERSONALITY_CATEGORIES.map((category) => (
        <div key={category.id} className="personality-category">
          <div className="category-header">
            <span className="category-label">{category.label}</span>
            <span className="category-desc">{category.description}</span>
          </div>
          <div className="personalities-grid">
            {Object.values(AI_PERSONALITIES)
              .filter((p) => p.category === category.id)
              .map((p) => (
                <div
                  key={p.id}
                  className={`personality-card ${value === p.id ? 'selected' : ''}`}
                  onMouseEnter={() => setHoveredPersonality(p.id)}
                  onMouseLeave={() => setHoveredPersonality(null)}
                  onClick={() => onChange(p.id as AIPersonality)}
                >
                  <div className="personality-name">{p.name}</div>
                  <div className="personality-name-en">{p.nameEn}</div>
                  <div
                    className="personality-risk"
                    style={{ color: riskColors[p.riskLevel] }}
                  >
                    风险: {riskLabels[p.riskLevel]}
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* 悬停详情面板 */}
      {hoveredPersonality && (
        <div className="personality-detail-panel">
          <div className="detail-header">
            <span className="detail-name">{AI_PERSONALITIES[hoveredPersonality].name}</span>
            <span className="detail-name-en">{AI_PERSONALITIES[hoveredPersonality].nameEn}</span>
          </div>
          <div className="detail-desc">{AI_PERSONALITIES[hoveredPersonality].description}</div>
          <div className="detail-section">
            <div className="detail-section-title">策略核心</div>
            <div className="detail-strategy">{AI_PERSONALITIES[hoveredPersonality].strategy}</div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">性格特征</div>
            <div className="detail-traits">
              {AI_PERSONALITIES[hoveredPersonality].traits.map((trait, i) => (
                <span key={i} className="trait-tag">{trait}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 激进程度调节（仅经典模式） */}
      {value === 'classic' && (
        <div className="aggressiveness-control">
          <div className="aggressiveness-label">
            <span>激进程度</span>
            <span className="aggressiveness-value">{aggressiveness}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={aggressiveness}
            onChange={(e) => onChange('classic', Number(e.target.value))}
            className="aggressiveness-slider"
          />
          <div className="aggressiveness-hints">
            <span>保守</span>
            <span>激进</span>
          </div>
        </div>
      )}
    </div>
  );
}