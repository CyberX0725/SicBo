/**
 * AI 人格定义 - 10种不同的策略解读风格
 * 所有AI共享NN预测结果，但每个人格根据自己的策略逻辑独立解读
 */

export type AIPersonalityId =
  | 'classic'      // 经典（需要激进程度调节）
  | 'madman'       // 狂徒 - 马丁格尔
  | 'gambler'      // 赌命徒 - 大胆策略
  | 'hunter'       // 猎人 - 反马丁格尔
  | 'reaper'       // 收割者 - 1-3-2-6系统
  | 'turtle'       // 龟甲 - 奥斯卡磨盘
  | 'blunt_sword'  // 钝剑 - 达朗贝尔
  | 'ascetic'      // 苦行僧 - 固定比例
  | 'mathematician'// 数学家 - 斐波那契
  | 'schemer'      // 阴谋家 - 拉布歇尔
  | 'occultist';   // 迷信术士 - 组合对冲

/**
 * 策略偏好参数：定义人格如何理性解读NN预测
 * 所有参数都服务于"利益最大化"目标
 */
export interface StrategyPreferences {
  /** 置信度阈值：NN概率多高才下注 (0-1)，高阈值=更谨慎 */
  confidenceThreshold: number;
  /** 偏好高赔率投注的权重 (0-1)，博冷策略 */
  highPayoutWeight: number;
  /** 偏好大小（低风险）的权重 (0-1)，稳健策略 */
  lowRiskWeight: number;
  /** 对冲比例：同时押大小+围骰的概率 (0-1)，风险对冲 */
  hedgeProb: number;
  /** 连胜后加注倍数，顺势而为 */
  winStreakMultiplier: number;
  /** 连输后减注比例 (0-1)，风险控制 */
  loseStreakReduction: number;
  /** 期望收益阈值：只押期望收益>此值的选项 */
  expectedValueThreshold: number;
  /** 偏好特定下注类型的概率 (0-1)：围骰、对子、点数等 */
  exoticBetProb: number;
}

export interface AIPersonality {
  id: AIPersonalityId;
  name: string;
  nameEn: string;
  category: 'burst' | 'harvest' | 'defense' | 'weird';
  categoryLabel: string;
  description: string;
  strategy: string;
  traits: string[];
  riskLevel: 'extreme' | 'high' | 'medium' | 'low';
  requiresAggressiveness: boolean;
  example?: string;
  /** 策略偏好参数 */
  strategyPrefs: StrategyPreferences;
}

export const AI_PERSONALITIES: Record<AIPersonalityId, AIPersonality> = {
  classic: {
    id: 'classic',
    name: '经典',
    nameEn: 'Classic',
    category: 'burst',
    categoryLabel: '经典模式',
    description: '标准AI模式，投注策略由神经网络智能决定，资金管理根据激进程度参数灵活调整。',
    strategy: '投注策略完全由神经网络分析历史数据生成，资金管理则根据您设置的激进程度（0-100）来决定下注金额大小。激进程度越高，单笔下注金额越大，风险越高。',
    traits: ['平衡可控', '参数可调', '稳定运行'],
    riskLevel: 'medium',
    requiresAggressiveness: true,
    example: '设置激进程度50时，AI会保持中等风险偏好，每笔投注约占总资金的5-10%。',
    strategyPrefs: {
      confidenceThreshold: 0.35,
      highPayoutWeight: 0.2,
      lowRiskWeight: 0.6,
      hedgeProb: 0,
      winStreakMultiplier: 1.2,
      loseStreakReduction: 0.1,
      expectedValueThreshold: 0,
      exoticBetProb: 0.1,
    },
  },
  madman: {
    id: 'madman',
    name: '狂徒',
    nameEn: 'Madman',
    category: 'burst',
    categoryLabel: '爆发流',
    description: '经典马丁格尔策略，输后翻倍下注，追求一次胜利回本。高波动高风险，适合追求戏剧性体验的玩家。',
    strategy: '每次输掉后，下一笔下注金额翻倍。例如：先押10，输了押20，再输押40，直到赢为止。赢后恢复初始金额。理论上是"只要赢一次就能回本"，但连输时金额会指数爆炸。上限为余额的30%。',
    traits: ['高波动性', '追涨杀跌', '戏剧性强', '资金曲线陡峭'],
    riskLevel: 'extreme',
    requiresAggressiveness: false,
    example: '输10→输20→输40→赢80，最终赢回10。但如果连输7次，第8次需要押1280。',
    strategyPrefs: {
      confidenceThreshold: 0.25,   // 低阈值，更容易下注
      highPayoutWeight: 0.45,      // 偏好高赔率（博冷）
      lowRiskWeight: 0.35,         // 也押大小（保底）
      hedgeProb: 0,
      winStreakMultiplier: 1.0,    // 赢了不特殊加注
      loseStreakReduction: 0,      // 输了不减注（马丁格尔是加注）
      expectedValueThreshold: -0.05, // 允许略微负期望
      exoticBetProb: 0.25,         // 25%概率押高赔率
    },
  },
  gambler: {
    id: 'gambler',
    name: '赌命徒',
    nameEn: 'Gambler',
    category: 'burst',
    categoryLabel: '爆发流',
    description: '翻本型策略，输了就押够回本的金额。风格激进但比All-in更理性，追求快速扭转局面。',
    strategy: '计算需要多少金额才能翻本。例如输了50，下一笔就押50。赢了恢复正常，输了继续追。上限为余额的25%。这种策略既有翻本的决心，又不会一把梭哈。',
    traits: ['翻本心理', '亡命之徒', '快速定胜负', '情绪波动大'],
    riskLevel: 'extreme',
    requiresAggressiveness: false,
    example: '输了100后押100翻本。如果又输了押200，再输押200，直到赢一把回本。',
    strategyPrefs: {
      confidenceThreshold: 0.2,    // 极低阈值，随时下注
      highPayoutWeight: 0.5,       // 高偏好高赔率
      lowRiskWeight: 0.25,         // 少量大小
      hedgeProb: 0,
      winStreakMultiplier: 1.0,
      loseStreakReduction: 0,
      expectedValueThreshold: -0.1, // 允许负期望
      exoticBetProb: 0.35,         // 高概率押高赔率
    },
  },
  hunter: {
    id: 'hunter',
    name: '猎人',
    nameEn: 'Hunter',
    category: 'harvest',
    categoryLabel: '收割流',
    description: '反马丁格尔策略，赢后加倍、输后重置。平时小输蛰伏，一旦抓住连胜就一波带走，极具收割感。',
    strategy: '与狂徒相反：赢的时候加倍下注，输的时候重置为基础金额。顺势而为，只在运气好时进攻。连续赢4-5次可以收获巨额利润，但一次输就归零。',
    traits: ['顺势而为', '连胜收割', '见好就收', '平时蛰伏'],
    riskLevel: 'medium',
    requiresAggressiveness: false,
    example: '赢10→赢20→赢40→赢80→输10，收割80利润后重置。',
    strategyPrefs: {
      confidenceThreshold: 0.4,    // 较高阈值，谨慎下注
      highPayoutWeight: 0.15,      // 少量高赔率
      lowRiskWeight: 0.7,          // 主要押大小
      hedgeProb: 0,
      winStreakMultiplier: 2.0,    // 连胜时加倍加注
      loseStreakReduction: 0.5,    // 输了大幅减注
      expectedValueThreshold: 0.02,
      exoticBetProb: 0.1,
    },
  },
  reaper: {
    id: 'reaper',
    name: '收割者',
    nameEn: 'Reaper',
    category: 'harvest',
    categoryLabel: '收割流',
    description: '1-3-2-6固定序列系统，每赢一局进入下一步，输则重置。精密仪式感，四步一个完整收割周期。',
    strategy: '按固定倍数序列下注：第1局押1单位，赢后押3单位，再赢押2单位，再赢押6单位。完成4步后重置。输任意一步都回到第1步。这个系统的精妙之处在于只需要连续赢4次就能获得12单位利润。',
    traits: ['精密计划', '仪式感强', '见好就收', '机械美感'],
    riskLevel: 'low',
    requiresAggressiveness: false,
    example: '押10→赢→押30→赢→押20→赢→押60→赢，共赚120。任意步骤输则重置。',
    strategyPrefs: {
      confidenceThreshold: 0.45,   // 高阈值
      highPayoutWeight: 0.1,       // 极少高赔率
      lowRiskWeight: 0.8,          // 高度偏好大小
      hedgeProb: 0,
      winStreakMultiplier: 1.5,
      loseStreakReduction: 0.3,
      expectedValueThreshold: 0.03,
      exoticBetProb: 0.05,
    },
  },
  turtle: {
    id: 'turtle',
    name: '龟甲',
    nameEn: 'Turtle',
    category: 'defense',
    categoryLabel: '防御流',
    description: '奥斯卡磨盘策略，赢后增加1单位，输后保持不变。目标每轮只赚1单位，达成即重置。铁壳防御极难爆仓。',
    strategy: '初始押1单位。赢了下一笔押2单位，再赢押3单位。输了则保持当前金额不变。当累计盈利达到目标单位时重置。这种策略极其猥琐，几乎不可能爆仓，但赢也赢不多。',
    traits: ['极低波动', '猥琐防御', '几乎不爆', '慢速磨人'],
    riskLevel: 'low',
    requiresAggressiveness: false,
    example: '押10→赢→押20→赢→押30→输→押30→输→押30...目标达到后重置。',
    strategyPrefs: {
      confidenceThreshold: 0.5,    // 极高阈值，极度谨慎
      highPayoutWeight: 0.05,      // 几乎不押高赔率
      lowRiskWeight: 0.9,          // 极度偏好大小
      hedgeProb: 0,
      winStreakMultiplier: 1.1,    // 小幅加注
      loseStreakReduction: 0,      // 输了不降（奥斯卡特点）
      expectedValueThreshold: 0.05,
      exoticBetProb: 0,
    },
  },
  blunt_sword: {
    id: 'blunt_sword',
    name: '钝剑',
    nameEn: 'Blunt Sword',
    category: 'defense',
    categoryLabel: '防御流',
    description: '达朗贝尔策略，输后加1单位、赢后减1单位。线性缓步升降，如钝刀割肉，不致命但持续稳定。',
    strategy: '初始押1单位。输了加1单位（押2），赢了减1单位（回到1）。这种线性调整比马丁格尔温和得多，不会出现指数爆炸，但长期来看仍然是追涨杀跌的逻辑。',
    traits: ['线性调整', '温和波动', '持续稳定', '适合新手'],
    riskLevel: 'low',
    requiresAggressiveness: false,
    example: '押10→输→押20→输→押30→赢→押20→赢→押10→输→押20...',
    strategyPrefs: {
      confidenceThreshold: 0.42,
      highPayoutWeight: 0.15,
      lowRiskWeight: 0.75,
      hedgeProb: 0,
      winStreakMultiplier: 1.0,
      loseStreakReduction: 0.1,
      expectedValueThreshold: 0.02,
      exoticBetProb: 0.08,
    },
  },
  ascetic: {
    id: 'ascetic',
    name: '苦行僧',
    nameEn: 'Ascetic',
    category: 'defense',
    categoryLabel: '防御流',
    description: '固定比例投注，每局固定押余额的2%。永不偏离永不爆仓，像机器一样理性，是唯一真正永不会破产的策略。',
    strategy: '无论输赢，始终保持下注当前余额的固定百分比（2%）。余额1万押200，余额5千押100，余额2万押400。这种策略永远不会爆仓，但也永远不会出现戏剧性收益。',
    traits: ['绝对理性', '永不破产', '机械执行', '无情绪波动'],
    riskLevel: 'low',
    requiresAggressiveness: false,
    example: '余额10000押200→输→余额9800押196→赢→余额9996押200...',
    strategyPrefs: {
      confidenceThreshold: 0.4,
      highPayoutWeight: 0.1,
      lowRiskWeight: 0.85,
      hedgeProb: 0,
      winStreakMultiplier: 1.0,    // 固定比例，不随连胜改变
      loseStreakReduction: 0,      // 固定比例，不随连输改变
      expectedValueThreshold: 0.01,
      exoticBetProb: 0.05,
    },
  },
  mathematician: {
    id: 'mathematician',
    name: '数学家',
    nameEn: 'Mathematician',
    category: 'weird',
    categoryLabel: '诡异流',
    description: '斐波那契数列资金管理，输进1步、赢退2步。需要两次胜利才能回收一波连败，充满数学美感。',
    strategy: '按斐波那契数列1,1,2,3,5,8,13,21,34,55,89调整下注金额。输了进入下一步（押更大的数），赢了退两步。这种策略的数学魅力在于它比马丁格尔温和但仍有追涨逻辑。',
    traits: ['数学美感', '隐忍回收', '两次胜利', '神秘气质'],
    riskLevel: 'medium',
    requiresAggressiveness: false,
    example: '押10→输→押10→输→押20→输→押30→赢→押10→赢→押10（退两步）。',
    strategyPrefs: {
      confidenceThreshold: 0.38,
      highPayoutWeight: 0.25,
      lowRiskWeight: 0.5,
      hedgeProb: 0.05,
      winStreakMultiplier: 1.2,
      loseStreakReduction: 0.1,
      expectedValueThreshold: 0,    // 严格计算期望收益
      exoticBetProb: 0.15,
    },
  },
  schemer: {
    id: 'schemer',
    name: '阴谋家',
    nameEn: 'Schemer',
    category: 'weird',
    categoryLabel: '诡异流',
    description: '拉布歇尔取消系统，设定目标数列，赢划掉首尾、输加到末尾。数列在眼前生长缩短，极具叙事感和悬疑感。',
    strategy: '设定初始数列如1-2-3-4。每次押首尾之和（1+4=5）。赢了划掉首尾变成2-3，下一笔押2+3=5。输了把输额加到末尾变成1-2-3-4-5，下一笔押1+5=6。数列清空即完成目标。',
    traits: ['步步为营', '数列叙事', '精密阴谋', '悬疑感强'],
    riskLevel: 'medium',
    requiresAggressiveness: false,
    example: '数列1-2-3-4：押5→赢→数列2-3→押5→输→数列2-3-5→押7...',
    strategyPrefs: {
      confidenceThreshold: 0.35,
      highPayoutWeight: 0.2,
      lowRiskWeight: 0.6,
      hedgeProb: 0.08,
      winStreakMultiplier: 1.3,
      loseStreakReduction: 0.15,
      expectedValueThreshold: 0.01,
      exoticBetProb: 0.12,
    },
  },
  occultist: {
    id: 'occultist',
    name: '迷信术士',
    nameEn: 'Occultist',
    category: 'weird',
    categoryLabel: '诡异流',
    description: '组合对冲策略，主注95%押大小稳赚，小额3%追围骰博冷。万一开围骰会爆出惊人收益，代表玄学流派。',
    strategy: '将资金分成两部分：95%押大小获得稳定收益，3%追围骰（1赔150）博冷门。平时小额亏损追围骰，一旦开围骰就爆赚。这种策略像是在"上香"，期待奇迹降临。',
    traits: ['玄学流派', '期待奇迹', '小额追冷', '戏剧效果'],
    riskLevel: 'medium',
    requiresAggressiveness: false,
    example: '余额10000：押9500大小，押300围骰6。开围骰6赢45000，不开则靠大小回收。',
    strategyPrefs: {
      confidenceThreshold: 0.3,
      highPayoutWeight: 0.6,        // 高偏好高赔率（围骰）
      lowRiskWeight: 0.4,           // 同时偏好大小
      hedgeProb: 0.7,               // 高对冲概率
      winStreakMultiplier: 1.1,
      loseStreakReduction: 0.2,
      expectedValueThreshold: -0.05, // 允许负期望（围骰期望为负但有爆冷潜力）
      exoticBetProb: 0.5,           // 高概率押特殊下注
    },
  },
};

export const PERSONALITY_CATEGORIES = [
  { id: 'burst', label: '爆发流', description: '高波动、追涨杀跌、戏剧性强、适合追求刺激' },
  { id: 'harvest', label: '收割流', description: '赢时推进、输时严守、有精密计划感、顺势而为' },
  { id: 'defense', label: '防御流', description: '低波动、猥琐稳健、极难爆仓、适合保守玩家' },
  { id: 'weird', label: '诡异流', description: '不按常理出牌、难以预测、有神秘感和数学美感' },
] as const;