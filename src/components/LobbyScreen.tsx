import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { PLAYER_COLORS } from '@/engine/AIEngine';
import { Player, GameConfig, AIPersonality } from '@/types';
import { AI_PERSONALITIES, AIPersonalityId } from '@/constants/aiPersonalities';

interface PlayerSetup {
  name: string;
  type: 'human' | 'ai';
  personality: AIPersonality;
  aggressiveness: number;
  nameManuallyEdited: boolean;
  balance: number;
}

function createDefaultPlayerSetup(index: number): PlayerSetup {
  return {
    name: `玩家 ${index + 1}`,
    type: 'human',
    personality: 'classic',
    aggressiveness: 50,
    nameManuallyEdited: false,
    balance: 10000,
  };
}

export default function LobbyScreen() {
  const startGame = useGameStore(s => s.startGame);
  const [playerCount, setPlayerCount] = useState(1);
  const [initialBalance, setInitialBalance] = useState(10000);
  const [useIndividualBalance, setUseIndividualBalance] = useState(false);
  const [aiAssist, setAiAssist] = useState(true);
  const [playerSetups, setPlayerSetups] = useState<PlayerSetup[]>(() => {
    const setups: PlayerSetup[] = [];
    for (let i = 0; i < 10; i++) {
      setups.push(createDefaultPlayerSetup(i));
    }
    return setups;
  });

  const updatePlayerCount = (count: number) => {
    setPlayerCount(count);
  };

  const updatePlayer = (idx: number, field: keyof PlayerSetup, value: string | number | AIPersonality) => {
    const updated = [...playerSetups];
    if (field === 'name') {
      updated[idx] = { ...updated[idx], name: value as string, nameManuallyEdited: true };
    } else if (field === 'type') {
      const newType = value as 'human' | 'ai';
      let newName = updated[idx].name;
      if (!updated[idx].nameManuallyEdited) {
        newName = newType === 'human' 
          ? `玩家 ${idx + 1}` 
          : `${AI_PERSONALITIES[updated[idx].personality].name}AI${countAIByPersonality(updated, updated[idx].personality)}`;
      }
      updated[idx] = { ...updated[idx], type: newType, name: newName };
    } else if (field === 'personality') {
      const newPersonality = value as AIPersonality;
      let newName = updated[idx].name;
      if (updated[idx].type === 'ai' && !updated[idx].nameManuallyEdited) {
        newName = `${AI_PERSONALITIES[newPersonality].name}AI${countAIByPersonality(updated, newPersonality, idx)}`;
      }
      updated[idx] = { ...updated[idx], personality: newPersonality, name: newName };
    } else if (field === 'balance') {
      updated[idx] = { ...updated[idx], balance: Math.max(100, Math.min(1000000, value as number)) };
    } else {
      updated[idx] = { ...updated[idx], aggressiveness: value as number };
    }
    setPlayerSetups(updated);
  };

  const countAIByPersonality = (
    setups: PlayerSetup[], 
    personality: AIPersonality, 
    excludeIdx?: number
  ): number => {
    let count = 0;
    for (let i = 0; i < setups.length; i++) {
      if (excludeIdx !== undefined && i === excludeIdx) continue;
      if (setups[i].type === 'ai' && setups[i].personality === personality) {
        count++;
      }
    }
    return count + 1;
  };

  const handleStart = () => {
    const players: Player[] = [];
    for (let i = 0; i < playerCount; i++) {
      const setup = playerSetups[i];
      players.push({
        id: `player_${i}`,
        name: setup.name || `玩家 ${i + 1}`,
        type: setup.type,
        balance: useIndividualBalance ? setup.balance : initialBalance,
        color: PLAYER_COLORS[i],
        currentBets: [],
        winAmount: 0,
        aggressiveness: setup.type === 'ai' && setup.personality === 'classic' ? setup.aggressiveness : undefined,
        personality: setup.type === 'ai' ? setup.personality : undefined,
      });
    }

    const config: GameConfig = {
      players,
      initialBalance,
      aiAssistEnabled: aiAssist,
    };
    startGame(config);
  };

  const riskColors: Record<string, string> = {
    extreme: '#E53935',
    high: '#FF7043',
    medium: '#FFC107',
    low: '#4CAF50',
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-card">
        <h1 className="lobby-title">骰 宝</h1>
        <p className="lobby-subtitle">SIC BO - 设置对局</p>

        {/* 玩家数量 */}
        <div className="lobby-section">
          <label className="lobby-label">玩家数量</label>
          <div className="lobby-player-count">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <button
                key={n}
                className={`count-btn ${playerCount === n ? 'active' : ''}`}
                onClick={() => updatePlayerCount(n)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* 玩家设置 */}
        <div className="lobby-section">
          <label className="lobby-label">玩家设置</label>
          <div className="lobby-players">
            {Array.from({ length: playerCount }).map((_, i) => (
              <div key={i} className="lobby-player-block">
                <div className="lobby-player-row">
                  <span className="player-color-dot" style={{ background: PLAYER_COLORS[i] }} />
                  <input
                    className="player-name-input"
                    value={playerSetups[i].name}
                    onChange={e => updatePlayer(i, 'name', e.target.value)}
                    placeholder={playerSetups[i].type === 'human' ? `玩家 ${i + 1}` : 'AI名称'}
                  />
                  <select
                    className="player-type-select"
                    value={playerSetups[i].type}
                    onChange={e => updatePlayer(i, 'type', e.target.value)}
                  >
                    <option value="human">真人</option>
                    <option value="ai">AI</option>
                  </select>
                </div>
                {/* AI人格选择 */}
                {playerSetups[i].type === 'ai' && (
                  <div className="lobby-ai-personality">
                    <div className="personality-label">选择 AI 人格（资金管理策略）</div>
                    <div className="personality-options">
                      {Object.values(AI_PERSONALITIES).map((p) => (
                        <div
                          key={p.id}
                          className={`personality-option ${playerSetups[i].personality === p.id ? 'selected' : ''}`}
                          onClick={() => updatePlayer(i, 'personality', p.id as AIPersonality)}
                          title={`${p.description}\n\n策略：${p.strategy}${p.example ? `\n\n示例：${p.example}` : ''}`}
                        >
                          <span className="personality-option-name">{p.name}</span>
                          <span
                            className="personality-option-risk"
                            style={{ color: riskColors[p.riskLevel] }}
                          >
                            {p.riskLevel === 'extreme' ? '极' : p.riskLevel === 'high' ? '高' : p.riskLevel === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      ))}
                    </div>
                    {playerSetups[i].personality === 'classic' && (
                      <div className="lobby-ai-slider">
                        <span className="slider-label-left">保守</span>
                        <input
                          type="range"
                          className="lobby-slider"
                          min={0}
                          max={100}
                          value={playerSetups[i].aggressiveness}
                          onChange={e => updatePlayer(i, 'aggressiveness', Number(e.target.value))}
                        />
                        <span className="slider-label-right">激进</span>
                        <span className="slider-value">{playerSetups[i].aggressiveness}</span>
                      </div>
                    )}
                    {playerSetups[i].personality !== 'classic' && (() => {
                      const p = AI_PERSONALITIES[playerSetups[i].personality as AIPersonalityId];
                      return (
                        <div className="personality-detail">
                          <div className="personality-detail-desc">{p.description}</div>
                          <div className="personality-detail-strategy">
                            <span className="strategy-label">策略：</span>
                            {p.strategy}
                          </div>
                          {p.example && (
                            <div className="personality-detail-example">
                              <span className="example-label">示例：</span>
                              {p.example}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* 各自资金 */}
                {useIndividualBalance && (
                  <div className="lobby-player-balance">
                    <label>初始资金</label>
                    <input
                      type="number"
                      value={playerSetups[i].balance}
                      min={100}
                      max={1000000}
                      step={1000}
                      onChange={e => updatePlayer(i, 'balance', Number(e.target.value))}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 统一初始本金 */}
        <div className="lobby-section">
          <div className="lobby-toggle-row">
            <label className="lobby-label">统一初始本金</label>
            <button
              className={`toggle-btn ${!useIndividualBalance ? 'on' : ''}`}
              onClick={() => setUseIndividualBalance(false)}
            >
              统一
            </button>
            <button
              className={`toggle-btn ${useIndividualBalance ? 'on' : ''}`}
              onClick={() => setUseIndividualBalance(true)}
            >
              各自
            </button>
          </div>
          {!useIndividualBalance && (
            <input
              type="number"
              className="balance-input"
              value={initialBalance}
              min={1000}
              max={1000000}
              step={1000}
              onChange={e => setInitialBalance(Math.max(1000, Math.min(1000000, Number(e.target.value) || 10000)))}
            />
          )}
        </div>

        {/* AI辅助 */}
        <div className="lobby-section lobby-toggle-row">
          <label className="lobby-label">AI 辅助决策</label>
          <button
            className={`toggle-btn ${aiAssist ? 'on' : ''}`}
            onClick={() => setAiAssist(!aiAssist)}
          >
            {aiAssist ? '开启' : '关闭'}
          </button>
        </div>

        <button className="lobby-start-btn" onClick={handleStart}>
          开始游戏
        </button>
      </div>
    </div>
  );
}