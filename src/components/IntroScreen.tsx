import introImage from '@/assets/主界面.svg';

interface IntroScreenProps {
  onStart: () => void;
  onTraining: () => void;
}

export default function IntroScreen({ onStart, onTraining }: IntroScreenProps) {
  return (
    <div className="intro-screen">
      <div className="intro-content">
        {/* 标题区 */}
        <div className="intro-header">
          <div className="intro-logo">骰</div>
          <h1 className="intro-title">骰 宝</h1>
          <p className="intro-title-en">SIC BO</p>
          <p className="intro-tagline">澳门赌场 · 完美复刻</p>
        </div>

        {/* 主界面图片 */}
        <div className="intro-image-container">
          <img
            src={introImage}
            alt="骰宝游戏主界面"
            className="intro-image"
          />
        </div>

        {/* 游戏介绍 */}
        <div className="intro-section">
          <h2 className="intro-section-title">游戏简介</h2>
          <div className="intro-text">
            <p>
              <strong>骰宝</strong>是一种流行于中国及东南亚地区的传统赌博游戏，玩家通过预测三颗骰子的结果来进行投注。
              本游戏完美复刻<strong>澳门赌场</strong>的骰宝玩法，包含完整的投注类型和赔率设置。
            </p>
            <p>
              游戏支持<strong>真人玩家</strong>和<strong>AI智能对手</strong>混合对战，并配备<strong>神经网络预测系统</strong>
              辅助决策。AI拥有10种不同的人格策略，从保守到激进，各有特色。
            </p>
          </div>
        </div>

        {/* 玩法规则 */}
        <div className="intro-section">
          <h2 className="intro-section-title">玩法规则</h2>
          <div className="intro-rules">
            <div className="intro-rule-card">
              <div className="intro-rule-icon">🎲</div>
              <h3>摇骰开奖</h3>
              <p>三颗骰子同时摇出，结果决定各投注区域的中奖情况</p>
            </div>
            <div className="intro-rule-card">
              <div className="intro-rule-icon">📊</div>
              <h3>大小投注</h3>
              <p>总和11-17为「大」，4-10为「小」，1赔1</p>
            </div>
            <div className="intro-rule-card">
              <div className="intro-rule-icon">🎯</div>
              <h3>围骰投注</h3>
              <p>三颗骰子点数相同，指定围骰1赔150，全围骰1赔24</p>
            </div>
            <div className="intro-rule-card">
              <div className="intro-rule-icon">🔢</div>
              <h3>点数投注</h3>
              <p>预测总和点数（4-17），不同点数有不同赔率</p>
            </div>
            <div className="intro-rule-card">
              <div className="intro-rule-icon">✌️</div>
              <h3>对子投注</h3>
              <p>任意两颗骰子点数相同，指定对子1赔8</p>
            </div>
            <div className="intro-rule-card">
              <div className="intro-rule-icon">🤖</div>
              <h3>AI对战</h3>
              <p>10种AI人格，每种都有独特的资金管理策略</p>
            </div>
          </div>
        </div>

        {/* 赔率表 */}
        <div className="intro-section">
          <h2 className="intro-section-title">赔率速览</h2>
          <div className="intro-payout-table">
            <div className="intro-payout-row intro-payout-header">
              <span>投注类型</span>
              <span>中奖条件</span>
              <span>赔率</span>
            </div>
            <div className="intro-payout-row">
              <span>大 / 小</span>
              <span>总和11-17 / 4-10</span>
              <span className="payout-value">1:1</span>
            </div>
            <div className="intro-payout-row">
              <span>单 / 双</span>
              <span>总和单数 / 双数</span>
              <span className="payout-value">1:1</span>
            </div>
            <div className="intro-payout-row">
              <span>围骰（指定）</span>
              <span>三颗骰子相同</span>
              <span className="payout-value highlight">150:1</span>
            </div>
            <div className="intro-payout-row">
              <span>全围骰</span>
              <span>任意围骰</span>
              <span className="payout-value">24:1</span>
            </div>
            <div className="intro-payout-row">
              <span>对子（指定）</span>
              <span>任意两颗相同</span>
              <span className="payout-value">8:1</span>
            </div>
            <div className="intro-payout-row">
              <span>总和点数</span>
              <span>预测总和4-17</span>
              <span className="payout-value">50:1~6:1</span>
            </div>
          </div>
        </div>

        {/* AI人格介绍 */}
        <div className="intro-section">
          <h2 className="intro-section-title">AI人格系统</h2>
          <div className="intro-personalities">
            <div className="intro-personality-group">
              <span className="group-label">爆发流</span>
              <div className="intro-personality-items">
                <span>狂徒 · 马丁格尔</span>
                <span>赌命徒 · 翻本策略</span>
              </div>
            </div>
            <div className="intro-personality-group">
              <span className="group-label">收割流</span>
              <div className="intro-personality-items">
                <span>猎人 · 反马丁格尔</span>
                <span>收割者 · 1-3-2-6系统</span>
              </div>
            </div>
            <div className="intro-personality-group">
              <span className="group-label">防御流</span>
              <div className="intro-personality-items">
                <span>龟甲 · 奥斯卡磨盘</span>
                <span>钝剑 · 达朗贝尔</span>
                <span>苦行僧 · 固定比例</span>
              </div>
            </div>
            <div className="intro-personality-group">
              <span className="group-label">诡异流</span>
              <div className="intro-personality-items">
                <span>数学家 · 斐波那契</span>
                <span>阴谋家 · 拉布歇尔</span>
                <span>迷信术士 · 组合对冲</span>
              </div>
            </div>
          </div>
          <p className="intro-personality-note">
            每种AI人格都基于<strong>神经网络预测</strong>进行投注决策，但拥有独特的<strong>资金管理策略</strong>和<strong>风险偏好</strong>。
            所有AI都以<strong>利益最大化</strong>为目标，但实现方式各不相同。
          </p>
        </div>

        {/* 按钮区 */}
        <div className="intro-actions">
          <button className="intro-btn intro-btn-primary" onClick={onStart}>
            开始游戏
          </button>
          <button className="intro-btn intro-btn-secondary" onClick={onTraining}>
            AI训练场
          </button>
        </div>
      </div>
    </div>
  );
}