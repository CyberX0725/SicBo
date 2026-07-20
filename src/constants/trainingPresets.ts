/**
 * AI 训练场预设模式
 * 每种预设是一个完整的AI对战配置
 */

import { AIPersonalityId } from './aiPersonalities';

export interface TrainingPreset {
  id: string;
  name: string;
  description: string;
  initialBalance: number;
  players: Array<{
    name: string;
    personality: AIPersonalityId;
    aggressiveness?: number;
  }>;
}

export const TRAINING_PRESETS: TrainingPreset[] = [
  {
    id: 'custom',
    name: '自定义',
    description: '自由选择AI人格和数量',
    initialBalance: 10000,
    players: [],
  },
  {
    id: 'personality_royale',
    name: '人格大乱斗',
    description: '10种人格各1个AI，看谁活到最后',
    initialBalance: 10000,
    players: [
      { name: '狂徒', personality: 'madman' },
      { name: '赌命徒', personality: 'gambler' },
      { name: '猎人', personality: 'hunter' },
      { name: '收割者', personality: 'reaper' },
      { name: '龟甲', personality: 'turtle' },
      { name: '钝剑', personality: 'blunt_sword' },
      { name: '苦行僧', personality: 'ascetic' },
      { name: '数学家', personality: 'mathematician' },
      { name: '阴谋家', personality: 'schemer' },
      { name: '迷信术士', personality: 'occultist' },
    ],
  },
  {
    id: 'classic_ladder',
    name: '经典阶梯战',
    description: '10个经典AI，激进程度从10到100',
    initialBalance: 10000,
    players: [
      { name: '保守者', personality: 'classic', aggressiveness: 10 },
      { name: '稳健者', personality: 'classic', aggressiveness: 20 },
      { name: '温和者', personality: 'classic', aggressiveness: 30 },
      { name: '均衡者', personality: 'classic', aggressiveness: 40 },
      { name: '中立者', personality: 'classic', aggressiveness: 50 },
      { name: '积极者', personality: 'classic', aggressiveness: 60 },
      { name: '进取者', personality: 'classic', aggressiveness: 70 },
      { name: '激进者', personality: 'classic', aggressiveness: 80 },
      { name: '冒险者', personality: 'classic', aggressiveness: 90 },
      { name: '疯狂者', personality: 'classic', aggressiveness: 100 },
    ],
  },
  {
    id: 'burst_vs_defense',
    name: '攻防对决',
    description: '5个爆发流 vs 5个防御流',
    initialBalance: 10000,
    players: [
      { name: '狂徒', personality: 'madman' },
      { name: '赌命徒', personality: 'gambler' },
      { name: '猎人', personality: 'hunter' },
      { name: '收割者', personality: 'reaper' },
      { name: '经典激进', personality: 'classic', aggressiveness: 80 },
      { name: '龟甲', personality: 'turtle' },
      { name: '钝剑', personality: 'blunt_sword' },
      { name: '苦行僧', personality: 'ascetic' },
      { name: '经典保守', personality: 'classic', aggressiveness: 20 },
      { name: '收割者防御', personality: 'reaper' },
    ],
  },
  {
    id: 'harvest_race',
    name: '收割风暴',
    description: '5个收割流AI比赛谁收益最高',
    initialBalance: 15000,
    players: [
      { name: '猎人1', personality: 'hunter' },
      { name: '猎人2', personality: 'hunter' },
      { name: '收割者1', personality: 'reaper' },
      { name: '收割者2', personality: 'reaper' },
      { name: '经典均衡', personality: 'classic', aggressiveness: 50 },
    ],
  },
  {
    id: 'survival_contest',
    name: '长寿大赛',
    description: '5个防御型AI，看谁活得最久',
    initialBalance: 5000,
    players: [
      { name: '龟甲1', personality: 'turtle' },
      { name: '龟甲2', personality: 'turtle' },
      { name: '钝剑', personality: 'blunt_sword' },
      { name: '苦行僧1', personality: 'ascetic' },
      { name: '苦行僧2', personality: 'ascetic' },
    ],
  },
  {
    id: 'quick_death',
    name: '速死争霸',
    description: '5个爆发流AI，看谁最先翻倍或破产',
    initialBalance: 10000,
    players: [
      { name: '狂徒1', personality: 'madman' },
      { name: '狂徒2', personality: 'madman' },
      { name: '赌命徒1', personality: 'gambler' },
      { name: '赌命徒2', personality: 'gambler' },
      { name: '经典疯狂', personality: 'classic', aggressiveness: 100 },
    ],
  },
  {
    id: 'mystery_alliance',
    name: '神秘者联盟',
    description: '5个诡异流AI的神秘对决',
    initialBalance: 12000,
    players: [
      { name: '数学家', personality: 'mathematician' },
      { name: '阴谋家', personality: 'schemer' },
      { name: '迷信术士', personality: 'occultist' },
      { name: '经典中庸', personality: 'classic', aggressiveness: 50 },
      { name: '经典神秘', personality: 'classic', aggressiveness: 60 },
    ],
  },
  {
    id: 'double_burst',
    name: '双雄对决',
    description: '狂徒vs赌命徒，两个最激进的AI单挑',
    initialBalance: 20000,
    players: [
      { name: '狂徒', personality: 'madman' },
      { name: '赌命徒', personality: 'gambler' },
    ],
  },
];