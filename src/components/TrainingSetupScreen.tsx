import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Player, GameConfig } from '@/types';
import { AI_PERSONALITIES, AIPersonalityId } from '@/constants/aiPersonalities';
import { TRAINING_PRESETS, TrainingPreset } from '@/constants/trainingPresets';
import { PLAYER_COLORS } from '@/engine/AIEngine';

interface TrainingSetupScreenProps {
  onBack: () => void;
}

interface AISetup {
  personality: AIPersonalityId;
  aggressiveness: number;
}

export default function TrainingSetupScreen({ onBack }: TrainingSetupScreenProps) {
  const startGame = useGameStore(s => s.startGame);
  const [selectedPreset, setSelectedPreset] = useState<string>('custom');
  const [initialBalance, setInitialBalance] = useState(10000);
  const [aiCount, setAICount] = useState(2);
  const [aiSetups, setAISetups] = useState<AISetup[]>([
    { personality: 'classic', aggressiveness: 50 },
    { personality: 'classic', aggressiveness: 50 },
  ]);

  const presets = TRAINING_PRESETS;

  const updateAICount = (count: number) => {
    setAICount(count);
    const newSetups: AISetup[] = [];
    for (let i = 0; i < count; i++) {
      if (aiSetups[i]) {
        newSetups.push(aiSetups[i]);
      } else {
        newSetups.push({ personality: 'classic', aggressiveness: 50 });
      }
    }
    setAISetups(newSetups);
  };

  const updateAISetup = (idx: number, field: keyof AISetup, value: AIPersonalityId | number) => {
    const updated = [...aiSetups];
    if (field === 'personality') {
      updated[idx] = { ...updated[idx], personality: value as AIPersonalityId };
    } else {
      updated[idx] = { ...updated[idx], aggressiveness: value as number };
    }
    setAISetups(updated);
  };

  const handleStart = () => {
    const preset = presets.find(p => p.id === selectedPreset);

    if (preset?.id === 'custom') {
      // 自定义模式
      const players: Player[] = aiSetups.map((setup, i) => ({
        id: `player_${i}`,
        name: `${AI_PERSONALITIES[setup.personality].name}AI${i + 1}`,
        type: 'ai' as const,
        balance: initialBalance,
        color: PLAYER_COLORS[i],
        currentBets: [],
        winAmount: 0,
        aggressiveness: setup.personality === 'classic' ? setup.aggressiveness : undefined,
        personality: setup.personality,
      }));

      const config: GameConfig = {
        players,
        initialBalance,
        aiAssistEnabled: false,
        trainingMode: true,
      };
      startGame(config);
    } else if (preset) {
      // 预设模式
      const players: Player[] = preset.players.map((p, i) => ({
        id: `player_${i}`,
        name: p.name,
        type: 'ai' as const,
        balance: initialBalance,
        color: PLAYER_COLORS[i],
        currentBets: [],
        winAmount: 0,
        aggressiveness: p.aggressiveness,
        personality: p.personality,
      }));

      const config: GameConfig = {
        players,
        initialBalance,
        aiAssistEnabled: false,
        trainingMode: true,
      };
      startGame(config);
    }
  };

  const riskColors: Record<string, string> = {
    extreme: '#E53935',
    high: '#FF7043',
    medium: '#FFC107',
    low: '#4CAF50',
  };

  return (
    <div className="training-setup-screen">
      <div className="training-setup-card">
        <button className="back-btn" onClick={onBack}>
          ← 返回
        </button>

        <h1 className="training-setup-title">AI 训练场</h1>
        <p className="training-setup-subtitle">全自动对战，观看不同AI策略的实战效果</p>

        {/* 统一初始金额 */}
        <div className="training-setup-section">
          <label className="training-setup-label">统一初始金额</label>
          <div className="training-balance-inputs">
            {[5000, 10000, 20000, 50000].map(val => (
              <button
                key={val}
                className={`balance-preset-btn ${initialBalance === val ? 'active' : ''}`}
                onClick={() => setInitialBalance(val)}
              >
                {val.toLocaleString()}
              </button>
            ))}
            <input
              type="number"
              className="balance-custom-input"
              value={initialBalance}
              min={1000}
              max={1000000}
              step={1000}
              onChange={e => setInitialBalance(Math.max(1000, Math.min(1000000, Number(e.target.value) || 10000)))}
            />
          </div>
        </div>

        {/* 预设选择 */}
        <div className="training-setup-section">
          <label className="training-setup-label">选择模式</label>
          <div className="training-presets-grid">
            {presets.map((preset) => (
              <button
                key={preset.id}
                className={`preset-card ${selectedPreset === preset.id ? 'selected' : ''}`}
                onClick={() => setSelectedPreset(preset.id)}
              >
                <span className="preset-card-name">{preset.name}</span>
                <span className="preset-card-desc">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义AI设置 */}
        {selectedPreset === 'custom' && (
          <div className="training-setup-section">
            <label className="training-setup-label">AI 数量</label>
            <div className="ai-count-buttons">
              {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <button
                  key={n}
                  className={`ai-count-btn ${aiCount === n ? 'active' : ''}`}
                  onClick={() => updateAICount(n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="training-ai-list">
              {aiSetups.map((setup, i) => (
                <div key={i} className="training-ai-item">
                  <span className="training-ai-index" style={{ background: PLAYER_COLORS[i] }}>
                    {i + 1}
                  </span>
                  <select
                    className="training-ai-select"
                    value={setup.personality}
                    onChange={e => updateAISetup(i, 'personality', e.target.value as AIPersonalityId)}
                  >
                    {Object.values(AI_PERSONALITIES).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.categoryLabel})
                      </option>
                    ))}
                  </select>
                  {setup.personality === 'classic' && (
                    <div className="training-ai-slider">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={setup.aggressiveness}
                        onChange={e => updateAISetup(i, 'aggressiveness', Number(e.target.value))}
                      />
                      <span className="slider-value">{setup.aggressiveness}</span>
                    </div>
                  )}
                  {setup.personality !== 'classic' && (
                    <span
                      className="training-ai-risk"
                      style={{ color: riskColors[AI_PERSONALITIES[setup.personality].riskLevel] }}
                    >
                      {AI_PERSONALITIES[setup.personality].riskLevel === 'extreme'
                        ? '极高风险'
                        : AI_PERSONALITIES[setup.personality].riskLevel === 'high'
                          ? '高风险'
                          : AI_PERSONALITIES[setup.personality].riskLevel === 'medium'
                            ? '中等风险'
                            : '低风险'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 预设模式预览 */}
        {selectedPreset !== 'custom' && (
          <div className="training-setup-section">
            <label className="training-setup-label">参赛AI</label>
            <div className="training-preset-preview">
              {presets
                .find(p => p.id === selectedPreset)
                ?.players.map((p, i) => (
                  <div key={i} className="preset-player-chip" style={{ background: PLAYER_COLORS[i] }}>
                    <span className="chip-name">{p.name}</span>
                    <span className="chip-personality">{AI_PERSONALITIES[p.personality].name}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <button className="training-start-btn" onClick={handleStart}>
          开始训练
        </button>
      </div>
    </div>
  );
}