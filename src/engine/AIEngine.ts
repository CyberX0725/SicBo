import { DiceResult, AISuggestion, BetType } from '@/types';
import { nnAnalyze, NN_CATEGORIES } from './NeuralEngine';

/**
 * AI决策引擎：结合神经网络深度学习 + 统计规则分析，生成优化下注建议。
 * - 神经网络(MLP)：在线学习历史模式，输出6类投注概率分布
 * - 统计规则引擎：趋势/冷热号/频率分析
 * - 融合策略：NN概率 × 规则置信度 加权决策
 */

// 玩家筹码颜色预设（10种）
export const PLAYER_COLORS = [
  '#E53935', // 红
  '#1E88E5', // 蓝
  '#43A047', // 绿
  '#FB8C00', // 橙
  '#8E24AA', // 紫
  '#00ACC1', // 青
  '#FFB300', // 金黄
  '#D81B60', // 粉红
  '#5E35B1', // 深紫
  '#00897B', // 青绿
];

/** 分析历史记录，返回 AI 建议列表 */
export function analyzeHistory(history: DiceResult[]): AISuggestion[] {
  if (history.length === 0) {
    return [{
      betType: BetType.BIG,
      label: '大',
      confidence: 50,
      reason: '暂无历史数据，无法进行趋势分析。',
      details: [
        '当前为第一局，没有任何历史开奖记录可供参考。',
        '大的理论概率为 48.6%（10.5/216种组合），小同理。',
        '围骰（三颗相同）理论概率仅 2.8%（6/216）。',
      ],
      suggestion: '建议小额试水（1-5筹码），先观察几局走势再加大投注。',
    }];
  }

  const suggestions: AISuggestion[] = [];
  const total = history.length;

  // === 基础统计 ===
  const bigCount = history.filter(r => !r.isTriple && r.sum >= 11).length;
  const smallCount = history.filter(r => !r.isTriple && r.sum <= 10).length;
  const tripleCount = history.filter(r => r.isTriple).length;
  const bigPct = Math.round((bigCount / total) * 100);
  const smallPct = Math.round((smallCount / total) * 100);
  const triplePct = Math.round((tripleCount / total) * 100);

  // 最近5局序列
  const recentSeq = history.slice(0, Math.min(5, total)).map(r =>
    r.isTriple ? '围' : r.sum >= 11 ? '大' : '小'
  ).join(' → ');

  // 检测连续趋势
  const streak = getStreak(history);

  // === 1. 大小趋势分析 ===
  if (streak.type === 'big' && streak.count >= 3) {
    const conf = Math.min(55 + streak.count * 5, 80);
    suggestions.push({
      betType: BetType.SMALL,
      label: '小',
      confidence: conf,
      reason: `最近连续${streak.count}局开大，均值回归效应显著，小的出现概率正在上升。`,
      details: [
        `近${total}局统计：大${bigCount}次(${bigPct}%) / 小${smallCount}次(${smallPct}%) / 围骰${tripleCount}次(${triplePct}%)`,
        `当前连续走势：${recentSeq}`,
        `连续${streak.count}局开大，超过3局即属于偏态分布。`,
        `理论上大小各占约48.6%，当前偏差${Math.abs(bigPct - 48.6).toFixed(1)}个百分点。`,
        `历史经验：连续${streak.count}局后反转概率约${Math.min(60 + streak.count * 8, 90)}%。`,
      ],
      suggestion: `建议投注“小”，金额控制在本金的5-10%。若连续${streak.count + 1}局仍开大可考虑追加。`,
    });
  } else if (streak.type === 'small' && streak.count >= 3) {
    const conf = Math.min(55 + streak.count * 5, 80);
    suggestions.push({
      betType: BetType.BIG,
      label: '大',
      confidence: conf,
      reason: `最近连续${streak.count}局开小，均值回归效应显著，大的出现概率正在上升。`,
      details: [
        `近${total}局统计：大${bigCount}次(${bigPct}%) / 小${smallCount}次(${smallPct}%) / 围骰${tripleCount}次(${triplePct}%)`,
        `当前连续走势：${recentSeq}`,
        `连续${streak.count}局开小，超过3局即属于偏态分布。`,
        `理论上大小各占约48.6%，当前偏差${Math.abs(smallPct - 48.6).toFixed(1)}个百分点。`,
        `历史经验：连续${streak.count}局后反转概率约${Math.min(60 + streak.count * 8, 90)}%。`,
      ],
      suggestion: `建议投注“大”，金额控制在本金的5-10%。若连续${streak.count + 1}局仍开小可考虑追加。`,
    });
  } else if (bigPct < 40 && total >= 5) {
    const conf = 55 + Math.round((50 - bigPct) * 0.5);
    suggestions.push({
      betType: BetType.BIG,
      label: '大',
      confidence: conf,
      reason: `近${total}局中“大”仅出现${bigPct}%，明显低于理论值48.6%，存在回补空间。`,
      details: [
        `近${total}局统计：大${bigCount}次(${bigPct}%) / 小${smallCount}次(${smallPct}%) / 围骰${tripleCount}次(${triplePct}%)`,
        `最近走势：${recentSeq}`,
        `大的理论概率为48.6%，当前仅${bigPct}%，偏差${(48.6 - bigPct).toFixed(1)}个百分点。`,
        `根据大数定律，样本越大越接近理论值，当前偏差有望修正。`,
      ],
      suggestion: `建议中等金额投注“大”，约本金的5%。可配合单骰热号分散风险。`,
    });
  } else if (smallPct < 40 && total >= 5) {
    const conf = 55 + Math.round((50 - smallPct) * 0.5);
    suggestions.push({
      betType: BetType.SMALL,
      label: '小',
      confidence: conf,
      reason: `近${total}局中“小”仅出现${smallPct}%，明显低于理论值48.6%，存在回补空间。`,
      details: [
        `近${total}局统计：大${bigCount}次(${bigPct}%) / 小${smallCount}次(${smallPct}%) / 围骰${tripleCount}次(${triplePct}%)`,
        `最近走势：${recentSeq}`,
        `小的理论概率为48.6%，当前仅${smallPct}%，偏差${(48.6 - smallPct).toFixed(1)}个百分点。`,
        `根据大数定律，样本越大越接近理论值，当前偏差有望修正。`,
      ],
      suggestion: `建议中等金额投注“小”，约本金的5%。可配合单骰热号分散风险。`,
    });
  }

  // === 2. 冷热号分析（单骰） ===
  const numFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  history.forEach(r => r.dice.forEach(d => { numFreq[d]++; }));

  const totalDice = total * 3;
  const expected = totalDice / 6;
  const sorted = Object.entries(numFreq).sort((a, b) => b[1] - a[1]);
  const hotNum = Number(sorted[0][0]);
  const coldNum = Number(sorted[sorted.length - 1][0]);
  const freqStr = sorted.map(([n, c]) => `${n}→${c}次`).join(' ');

  if (numFreq[hotNum] > expected * 1.3 && total >= 5) {
    const ratio = (numFreq[hotNum] / expected).toFixed(2);
    suggestions.push({
      betType: BetType.SINGLE_NUMBER,
      target: hotNum,
      label: `单骰 ${numToChinese(hotNum)}`,
      confidence: Math.min(50 + Math.round((numFreq[hotNum] / expected - 1) * 40), 75),
      reason: `号码${hotNum}近期出现频率显著偏高，属于“热号”，短期可能延续。`,
      details: [
        `各号码出现频次：${freqStr}`,
        `号码${hotNum}出现${numFreq[hotNum]}次，期望值${Math.round(expected)}次，超出${ratio}倍。`,
        `单骰赔率：出现1次赔1:1，2次赔1:2，3次赔1:3。`,
        `热号效应：短期内高频号码往往有惯性，但注意随时可能降温。`,
      ],
      suggestion: `建议小额投注单骰“${numToChinese(hotNum)}”，约本金的2-3%。单骰赔率阶梯式，即使只出1次也不亏。`,
    });
  }

  if (numFreq[coldNum] < expected * 0.5 && total >= 8) {
    suggestions.push({
      betType: BetType.SINGLE_NUMBER,
      target: coldNum,
      label: `单骰 ${numToChinese(coldNum)}`,
      confidence: Math.min(45 + Math.round((1 - numFreq[coldNum] / expected) * 30), 70),
      reason: `号码${coldNum}近期极少出现，属于“冷号”，回补概率正在累积。`,
      details: [
        `各号码出现频次：${freqStr}`,
        `号码${coldNum}仅出现${numFreq[coldNum]}次，期望值${Math.round(expected)}次，偏差显著。`,
        `冷号回补：长期未出的号码在统计上有回补趋势，但时机不确定。`,
        `风险提示：冷号可能继续冷，建议小额持续投注而非一次性重注。`,
      ],
      suggestion: `建议连续多局小额投注单骰“${numToChinese(coldNum)}”，每局1-2筹码，等待回补。`,
    });
  }

  // === 3. 围骰/对子分析 ===
  if (tripleCount === 0 && total >= 10) {
    suggestions.push({
      betType: BetType.TRIPLE,
      label: '全圍骰',
      confidence: 35 + Math.min(total - 10, 10),
      reason: `已连续${total}局未出围骰，超过理论周期，可小额博冷。`,
      details: [
        `围骰理论概率：2.8%（约每36局出现1次）。`,
        `当前已连续${total}局未出，超过理论周期${Math.round(total / 36 * 100)}%。`,
        `全圍骰赔率1:24，即使概率低，一旦命中回报丰厚。`,
        `注意：围骰出现时大小单双通杀，具有对冲价值。`,
      ],
      suggestion: `建议每局固定1筹码投注全圍骰，作为长期策略。不建议重仓，纯属博冷。`,
    });
  }

  // 对子频率
  const doubleFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  history.forEach(r => {
    const counts: Record<number, number> = {};
    r.dice.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
    Object.entries(counts).forEach(([num, cnt]) => {
      if (cnt >= 2) doubleFreq[Number(num)]++;
    });
  });
  const doubleFreqStr = Object.entries(doubleFreq).sort((a, b) => b[1] - a[1])
    .map(([n, c]) => `对${n}→${c}次`).join(' ');
  const hotDouble = Object.entries(doubleFreq).sort((a, b) => b[1] - a[1])[0];
  if (hotDouble && hotDouble[1] >= 3 && total >= 6) {
    suggestions.push({
      betType: BetType.DOUBLE,
      target: Number(hotDouble[0]),
      label: `对 ${hotDouble[0]}`,
      confidence: Math.min(45 + hotDouble[1] * 5, 70),
      reason: `对子${hotDouble[0]}近期出现频率明显偏高，值得关注。`,
      details: [
        `对子出现统计：${doubleFreqStr}`,
        `对${hotDouble[0]}出现${hotDouble[1]}次，在${total}局中属于高频。`,
        `对子赔率1:8，属于中高赔率投注项。`,
        `对子理论概率约7.4%（每对），当前频率明显超出。`,
      ],
      suggestion: `建议小额投注对${hotDouble[0]}，约本金的2-3%。对子赔率1:8，命中回报可观。`,
    });
  }

  // === 4. 点数分析 ===
  const sumFreq: Record<number, number> = {};
  history.forEach(r => { sumFreq[r.sum] = (sumFreq[r.sum] || 0) + 1; });
  const avgSum = history.reduce((s, r) => s + r.sum, 0) / total;
  const recentSums = history.slice(0, 5).map(r => r.sum);
  if (total >= 8) {
    const hotSum = Object.entries(sumFreq).sort((a, b) => b[1] - a[1])[0];
    if (hotSum && hotSum[1] >= 3) {
      const payoutMap: Record<number, number> = { 4: 50, 5: 30, 6: 18, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 18, 16: 30, 17: 50 };
      suggestions.push({
        betType: BetType.SPECIFIC_SUM,
        target: Number(hotSum[0]),
        label: `点数 ${hotSum[0]}`,
        confidence: Math.min(40 + hotSum[1] * 6, 65),
        reason: `点数${hotSum[0]}近期出现${hotSum[1]}次，属于高频点数。`,
        details: [
          `近${total}局平均点数：${avgSum.toFixed(1)}（理论均值10.5）。`,
          `最近5局点数：${recentSums.join(', ')}。`,
          `点数${hotSum[0]}出现${hotSum[1]}次，赔率1:${payoutMap[Number(hotSum[0])] || 6}。`,
          `点数投注属于高赔率项目，建议作为辅助投注。`,
        ],
        suggestion: `建议1筹码投注点数${hotSum[0]}，赔率1:${payoutMap[Number(hotSum[0])] || 6}，作为高风险高回报的补充。`,
      });
    }
  }

  // 确保至少有1条建议
  if (suggestions.length === 0) {
    suggestions.push({
      betType: bigPct >= smallPct ? BetType.BIG : BetType.SMALL,
      label: bigPct >= smallPct ? '大' : '小',
      confidence: 50,
      reason: `近期大小比例较均衡，无明显趋势，建议跟随多数。`,
      details: [
        `近${total}局统计：大${bigCount}次(${bigPct}%) / 小${smallCount}次(${smallPct}%) / 围骰${tripleCount}次(${triplePct}%)`,
        `最近走势：${recentSeq}`,
        `大小比例接近理论值(48.6%:48.6%)，无明显偏差。`,
        `当前无明显规律可利用，建议保守投注。`,
      ],
      suggestion: `建议小额投注“${bigPct >= smallPct ? '大' : '小'}”，约本金的2-3%，保持观望。`,
    });
  }

  // 按置信度排序，返回前3条
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/** 综合分析：返回完整的投注策略建议（神经网络 + 统计规则融合） */
export function getFullAnalysis(history: DiceResult[]): AISuggestion[] {
  const results: AISuggestion[] = [];
  const total = history.length;

  // === 神经网络分析 ===
  const nnDecision = nnAnalyze(history);

  if (total === 0) {
    return [{
      betType: BetType.BIG,
      label: '大/小',
      confidence: 50,
      reason: '暂无历史数据，神经网络尚未训练，无法分析趋势。',
      details: ['第一局无参考数据，大小概率各半(48.6%)。', '神经网络需要至少3-5局数据才能开始学习模式。', '建议先观察几局再加大投注。'],
      suggestion: '小额试水，观察走势。',
    }];
  }

  // === 0. 神经网络综合预测（置顶展示） ===
  const nnProbsStr = nnDecision.probs.map((p, i) => `${NN_CATEGORIES[i]}:${(p * 100).toFixed(1)}%`).join(' / ');
  const nnTopLabel = NN_CATEGORIES[nnDecision.topCategory];
  results.push({
    betType: BetType.BIG,
    label: `🧠 神经网络预测：${nnTopLabel}(${(nnDecision.confidence * 100).toFixed(0)}%)`,
    confidence: Math.round(nnDecision.confidence * 100),
    reason: `三层MLP网络(24→16→12→6)基于${total}局数据在线学习，输出概率分布。`,
    details: [
      `概率分布：${nnProbsStr}`,
      `网络结构：输入24维特征 → 隐藏层16(ReLU) → 隐藏层12(ReLU) → 输出6类(Softmax)`,
      `已训练${nnDecision.trainCount}轮，最近损失${nnDecision.lastLoss.toFixed(4)}`,
      ...nnDecision.featureHighlights.map(h => `特征洞察：${h}`),
    ],
    suggestion: `神经网络推荐"${nnTopLabel}"，置信度${(nnDecision.confidence * 100).toFixed(0)}%。${nnDecision.trainCount < 5 ? '（训练轮次较少，仅供参考）' : '结合下方统计分析综合判断。'}`,
  });

  // === 1. 大小趋势（融合NN概率） ===
  const bigCount = history.filter(r => !r.isTriple && r.sum >= 11).length;
  const smallCount = history.filter(r => !r.isTriple && r.sum <= 10).length;
  const tripleCount = history.filter(r => r.isTriple).length;
  const bigPct = Math.round((bigCount / total) * 100);
  const smallPct = Math.round((smallCount / total) * 100);
  const streak = getStreak(history);
  const recentSeq = history.slice(0, Math.min(5, total)).map(r =>
    r.isTriple ? '围' : r.sum >= 11 ? '大' : '小'
  ).join(' → ');
  
  // NN概率融合：将神经网络的大/小概率与统计规则结合
  const nnBigProb = nnDecision.probs[0];
  const nnSmallProb = nnDecision.probs[1];
  
  let bigSmallLabel = '大';
  let bigSmallConf = 50;
  let bigSmallReason = '';
  let bigSmallDetails: string[] = [];
  let bigSmallSuggestion = '';
  
  if (streak.type === 'big' && streak.count >= 3) {
    bigSmallLabel = '小（反转）';
    bigSmallConf = Math.min(55 + streak.count * 5 + Math.round(nnSmallProb * 20), 85);
    bigSmallReason = `连续${streak.count}局开大，均值回归+神经网络(${(nnSmallProb * 100).toFixed(0)}%)共同指向小。`;
    bigSmallDetails = [`近${total}局：大${bigPct}% / 小${smallPct}% / 围骰${Math.round(tripleCount / total * 100)}%`, `走势：${recentSeq}`, `连续${streak.count}局后反转概率约${Math.min(60 + streak.count * 8, 90)}%`, `神经网络预测小概率：${(nnSmallProb * 100).toFixed(1)}%`];
    bigSmallSuggestion = `投注"小"，本金的5-10%。NN+规则双重验证。`;
  } else if (streak.type === 'small' && streak.count >= 3) {
    bigSmallLabel = '大（反转）';
    bigSmallConf = Math.min(55 + streak.count * 5 + Math.round(nnBigProb * 20), 85);
    bigSmallReason = `连续${streak.count}局开小，均值回归+神经网络(${(nnBigProb * 100).toFixed(0)}%)共同指向大。`;
    bigSmallDetails = [`近${total}局：大${bigPct}% / 小${smallPct}% / 围骰${Math.round(tripleCount / total * 100)}%`, `走势：${recentSeq}`, `连续${streak.count}局后反转概率约${Math.min(60 + streak.count * 8, 90)}%`, `神经网络预测大概率：${(nnBigProb * 100).toFixed(1)}%`];
    bigSmallSuggestion = `投注"大"，本金的5-10%。NN+规则双重验证。`;
  } else {
    // 无连续趋势时，以NN概率为主导
    const nnFavored = nnBigProb >= nnSmallProb ? '大' : '小';
    const nnFavoredProb = Math.max(nnBigProb, nnSmallProb);
    bigSmallLabel = `${nnFavored}（NN推荐）`;
    bigSmallConf = Math.round(45 + nnFavoredProb * 30);
    bigSmallReason = `大小比例${bigPct}%:${smallPct}%，神经网络倾向${nnFavored}(${(nnFavoredProb * 100).toFixed(0)}%)。`;
    bigSmallDetails = [`近${total}局：大${bigPct}% / 小${smallPct}% / 围骰${Math.round(tripleCount / total * 100)}%`, `走势：${recentSeq}`, `NN概率：大${(nnBigProb * 100).toFixed(1)}% / 小${(nnSmallProb * 100).toFixed(1)}%`, `无明显连续趋势，以NN学习模式为主。`];
    bigSmallSuggestion = `跟随NN推荐投"${nnFavored}"，本金的3-5%。`;
  }
  results.push({ betType: BetType.BIG, label: `大小趋势：${bigSmallLabel}`, confidence: bigSmallConf, reason: bigSmallReason, details: bigSmallDetails, suggestion: bigSmallSuggestion });

  // === 2. 号码频率分析（单骰）+ NN单骰概率 ===
  const numFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  history.forEach(r => r.dice.forEach(d => { numFreq[d]++; }));
  const totalDice = total * 3;
  const expected = totalDice / 6;
  const sortedNums = Object.entries(numFreq).sort((a, b) => b[1] - a[1]);
  const hotNum = Number(sortedNums[0][0]);
  const coldNum = Number(sortedNums[sortedNums.length - 1][0]);
  const freqStr = sortedNums.map(([n, c]) => `${n}→${c}次`).join(' ');
  const nnSingleProb = nnDecision.probs[2]; // NN单骰热号概率
  
  results.push({
    betType: BetType.SINGLE_NUMBER,
    label: `单骰分析：热${hotNum} 冷${coldNum}`,
    confidence: Math.min(50 + Math.round((numFreq[hotNum] / expected - 1) * 30 + nnSingleProb * 15), 75),
    reason: `热号${hotNum}出现${numFreq[hotNum]}次(期望${Math.round(expected)})，NN单骰概率${(nnSingleProb * 100).toFixed(0)}%。`,
    details: [`各号码频次：${freqStr}`, `热号${hotNum}超出期望${((numFreq[hotNum] / expected - 1) * 100).toFixed(0)}%，短期可能延续。`, `冷号${coldNum}低于期望${((1 - numFreq[coldNum] / expected) * 100).toFixed(0)}%，回补概率累积。`, `神经网络单骰类别概率：${(nnSingleProb * 100).toFixed(1)}%`, `单骰赔率：1次1:1 / 2次1:2 / 3次1:3`],
    suggestion: `热号"${numToChinese(hotNum)}"跟投(NN支持度${(nnSingleProb * 100).toFixed(0)}%)，冷号"${numToChinese(coldNum)}"小额埋伏。`,
  });

  // === 3. 对子分析 + NN对子概率 ===
  const doubleFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  history.forEach(r => {
    const counts: Record<number, number> = {};
    r.dice.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
    Object.entries(counts).forEach(([n, c]) => { if (c >= 2) doubleFreq[Number(n)]++; });
  });
  const sortedDoubles = Object.entries(doubleFreq).sort((a, b) => b[1] - a[1]);
  const hotDouble = Number(sortedDoubles[0][0]);
  const doubleFreqStr = sortedDoubles.map(([n, c]) => `对${n}→${c}次`).join(' ');
  const nnDoubleProb = nnDecision.probs[3]; // NN对子概率

  results.push({
    betType: BetType.DOUBLE,
    label: `对子分析：热对${hotDouble}`,
    confidence: Math.min(40 + sortedDoubles[0][1] * 6 + Math.round(nnDoubleProb * 15), 70),
    reason: `对${hotDouble}近期出现${sortedDoubles[0][1]}次，NN对子概率${(nnDoubleProb * 100).toFixed(0)}%。`,
    details: [`对子统计：${doubleFreqStr}`, `对子理论概率约7.4%，赔率1:8。`, `神经网络对子类别概率：${(nnDoubleProb * 100).toFixed(1)}%`, sortedDoubles[0][1] >= 3 ? `对${hotDouble}超出理论频率+NN支持，值得关注。` : `当前无明显高频对子，NN概率${nnDoubleProb > 0.2 ? '偏高' : '正常'}。`],
    suggestion: sortedDoubles[0][1] >= 2 || nnDoubleProb > 0.2 ? `投注对${hotDouble}，本金的2-3%。NN支持度${(nnDoubleProb * 100).toFixed(0)}%。` : `对子暂无明显机会，可观望。`,
  });

  // === 4. 组合分析 + NN组合概率 ===
  const combos: [number, number][] = [[1, 2], [1, 3], [1, 5], [2, 3], [2, 4], [2, 6], [3, 4], [3, 5], [4, 5], [4, 6], [5, 6]];
  const recentDice = history.slice(0, Math.min(5, total)).flatMap(r => r.dice);
  const comboScores = combos.map(([a, b]) => ({
    combo: `${a}-${b}`,
    score: recentDice.filter(d => d === a || d === b).length,
  })).sort((a, b) => b.score - a.score);
  const nnComboProb = nnDecision.probs[4]; // NN组合概率

  results.push({
    betType: BetType.COMBINATION,
    label: `组合分析：热${comboScores[0].combo}`,
    confidence: Math.min(35 + comboScores[0].score * 4 + Math.round(nnComboProb * 15), 65),
    reason: `近期${comboScores[0].combo}相关号码出现${comboScores[0].score}次，NN组合概率${(nnComboProb * 100).toFixed(0)}%。`,
    details: [`近5局骰子中，组合相关号码频次：`, `  ${comboScores.slice(0, 3).map(c => `${c.combo}→${c.score}次`).join('  ')}`, `组合赔率1:5，两数同时出现即中奖。`, `神经网络组合类别概率：${(nnComboProb * 100).toFixed(1)}%`],
    suggestion: nnComboProb > 0.18 ? `NN支持组合投注，关注${comboScores[0].combo}，本金的2-3%。` : `组合${comboScores[0].combo}可小额关注，本金的2%。`,
  });

  // === 5. 点数分析 ===
  const sumFreq: Record<number, number> = {};
  history.forEach(r => { sumFreq[r.sum] = (sumFreq[r.sum] || 0) + 1; });
  const avgSum = (history.reduce((s, r) => s + r.sum, 0) / total).toFixed(1);
  const sortedSums = Object.entries(sumFreq).sort((a, b) => b[1] - a[1]);
  const hotSum = sortedSums[0];
  const payoutMap: Record<number, number> = { 4: 50, 5: 30, 6: 18, 7: 12, 8: 8, 9: 6, 10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 18, 16: 30, 17: 50 };

  results.push({
    betType: BetType.SPECIFIC_SUM,
    label: `点数分析：热${hotSum[0]}点(均${avgSum})`,
    confidence: Math.min(35 + hotSum[1] * 5, 55),
    reason: `点数${hotSum[0]}出现${hotSum[1]}次，平均点数${avgSum}(理论10.5)。`,
    details: [`高频点数：${sortedSums.slice(0, 3).map(([s, c]) => `${s}点→${c}次`).join(' ')}`, `点数${hotSum[0]}赔率1:${payoutMap[Number(hotSum[0])] || 6}。`, `平均点数${avgSum}，${Number(avgSum) > 10.5 ? '偏高，大号活跃' : Number(avgSum) < 10.5 ? '偏低，小号活跃' : '均衡'}。`],
    suggestion: `点数属于高赔率项目，建议1筹码博${hotSum[0]}点。`,
  });

  // === 6. 围骰分析 + NN围骰概率 ===
  const nnTripleProb = nnDecision.probs[5]; // NN围骰概率
  results.push({
    betType: BetType.TRIPLE,
    label: `围骰分析：${tripleCount === 0 ? `连续${total}局未出` : `近期出${tripleCount}次`}`,
    confidence: Math.round((tripleCount === 0 && total >= 10 ? 40 : 30) + nnTripleProb * 20),
    reason: tripleCount === 0
      ? `连续${total}局未出围骰，NN围骰概率${(nnTripleProb * 100).toFixed(1)}%。`
      : `近${total}局围骰出现${tripleCount}次，NN概率${(nnTripleProb * 100).toFixed(1)}%。`,
    details: [`围骰理论概率2.8%（约每36局1次）。`, `全圍骰赔率1:24，指定围骰1:150。`, `神经网络围骰类别概率：${(nnTripleProb * 100).toFixed(1)}%`, `围骰出现时大小单双通杀，具有对冲价值。`, tripleCount === 0 && total >= 10 ? `已超过理论周期，NN概率${nnTripleProb > 0.05 ? '上升中' : '仍低'}。` : `当前频率正常，不建议重仓。`],
    suggestion: nnTripleProb > 0.05 ? `NN检测到围骰概率上升，建议2筹码买全圍骰。` : `每局固定1筹码买全圍骰作长期策略。`,
  });

  return results;
}

/** AI玩家自动下注：神经网络概率 + 统计规则融合决策 */
export function aiDecideBets(
  history: DiceResult[],
  balance: number,
  chipValues: readonly number[],
  aggressiveness: number = 50, // 0-100
): { type: BetType; target?: number; subTarget?: number[]; label: string; amount: number }[] {
  const bets: { type: BetType; target?: number; subTarget?: number[]; label: string; amount: number }[] = [];
  const suggestions = analyzeHistory(history);
  const nnDecision = nnAnalyze(history); // 神经网络预测

  // 激进度系数：保守(0)=0.4 均衡(50)=1.0 激进(100)=2.0
  const aggFactor = 0.4 + (aggressiveness / 100) * 1.6;
  // 激进度影响下注上限比例：保守10% 均衡20% 激进35%
  const maxBetRatio = 0.10 + (aggressiveness / 100) * 0.25;
  // 激进度影响高赔率投注概率
  const riskAppetite = aggressiveness / 100; // 0-1

  // 筹码选取工具
  const pickChip = (target: number): number => {
    const chip = chipValues.reduce((prev, curr) =>
      Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
    );
    return Math.min(chip, balance);
  };

  const total = history.length;

  // === 策略1: 神经网络主导投注（基于NN概率分布） ===
  const nnProbs = nnDecision.probs;
  // 找到NN最高概率类别，加大投注
  const nnTop = nnDecision.topCategory;
  const nnConf = nnDecision.confidence;
  if (nnConf > 0.25 && total >= 3) {
    // NN推荐大(0)或小(1)
    if (nnTop === 0 || nnTop === 1) {
      const isBig = nnTop === 0;
      const amount = pickChip(Math.round(balance * 0.06 * (1 + nnConf) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.6) {
        bets.push({
          type: isBig ? BetType.BIG : BetType.SMALL,
          label: isBig ? '大' : '小',
          amount,
        });
      }
    }
    // NN推荐单骰热号(2)
    else if (nnTop === 2) {
      const numFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      history.forEach(r => r.dice.forEach(d => { numFreq[d]++; }));
      const hotNum = Number(Object.entries(numFreq).sort((a, b) => b[1] - a[1])[0][0]);
      const amount = pickChip(Math.round(balance * 0.04 * (1 + nnConf) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.4) {
        bets.push({ type: BetType.SINGLE_NUMBER, target: hotNum, label: `单骰 ${numToChinese(hotNum)}`, amount });
      }
    }
    // NN推荐对子(3)
    else if (nnTop === 3) {
      const doubleFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      history.forEach(r => {
        const counts: Record<number, number> = {};
        r.dice.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
        Object.entries(counts).forEach(([n, c]) => { if (c >= 2) doubleFreq[Number(n)]++; });
      });
      const hotD = Number(Object.entries(doubleFreq).sort((a, b) => b[1] - a[1])[0][0]);
      const amount = pickChip(Math.round(balance * 0.03 * (1 + nnConf) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.3) {
        bets.push({ type: BetType.DOUBLE, target: hotD, label: `对 ${hotD}`, amount });
      }
    }
    // NN推荐组合(4)
    else if (nnTop === 4) {
      const combos: [number, number][] = [[1,2],[1,3],[1,5],[2,3],[2,4],[2,6],[3,4],[3,5],[4,5],[4,6],[5,6]];
      const recentDice = history.slice(0, 5).flatMap(r => r.dice);
      const best = combos.map(([a, b]) => ({ c: [a, b] as [number, number], s: recentDice.filter(d => d === a || d === b).length }))
        .sort((a, b) => b.s - a.s)[0];
      const amount = pickChip(Math.round(balance * 0.03 * (1 + nnConf) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.3) {
        bets.push({ type: BetType.COMBINATION, target: best.c[0], subTarget: best.c, label: `${best.c[0]}-${best.c[1]}`, amount });
      }
    }
    // NN推荐围骰(5)
    else if (nnTop === 5 && nnConf > 0.08) {
      const amount = pickChip(Math.round(balance * 0.02 * (1 + nnConf) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.2) {
        bets.push({ type: BetType.TRIPLE, label: '全圍骰', amount });
      }
    }
  }

  // === 策略2: 统计规则补充投注（基于analyzeHistory建议） ===
  for (const s of suggestions.slice(0, 2)) {
    if (s.confidence < 45) continue;
    if (Math.random() < 0.15) continue;
    // 避免与NN主投注重复
    if (bets.some(b => b.type === s.betType && b.target === s.target)) continue;
    // 避免大小/单双矛盾
    if (s.betType === BetType.BIG && bets.some(b => b.type === BetType.SMALL)) continue;
    if (s.betType === BetType.SMALL && bets.some(b => b.type === BetType.BIG)) continue;
    if (s.betType === BetType.ODD && bets.some(b => b.type === BetType.EVEN)) continue;
    if (s.betType === BetType.EVEN && bets.some(b => b.type === BetType.ODD)) continue;
    // 避免点数与大小矛盾
    if (s.betType === BetType.SPECIFIC_SUM) {
      if (bets.some(b => b.type === BetType.BIG) && s.target! <= 10) continue;
      if (bets.some(b => b.type === BetType.SMALL) && s.target! >= 11) continue;
    }
    const ratio = s.confidence / 100;
    const amount = pickChip(Math.round(balance * 0.05 * ratio * aggFactor));
    if (amount <= 0 || amount > balance * maxBetRatio * 0.5) continue;
    bets.push({ type: s.betType as BetType, target: s.target, subTarget: s.subTarget, label: s.label, amount });
  }

  // === 策略3: 单骰投注（NN概率加权） ===
  if (total >= 3) {
    const numFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    history.forEach(r => r.dice.forEach(d => { numFreq[d]++; }));
    const sorted = Object.entries(numFreq).sort((a, b) => b[1] - a[1]);
    const pickIdx = Math.random() < 0.6 ? 0 : sorted.length - 1;
    const num = Number(sorted[pickIdx][0]);
    const nnSingleWeight = nnProbs[2]; // NN单骰概率作为权重
    if (Math.random() < 0.3 + riskAppetite * 0.4 + nnSingleWeight * 0.3) {
      const amount = pickChip(Math.round(balance * 0.03 * (0.8 + nnSingleWeight) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.25 && !bets.some(b => b.type === BetType.SINGLE_NUMBER && b.target === num)) {
        bets.push({ type: BetType.SINGLE_NUMBER, target: num, label: `单骰 ${numToChinese(num)}`, amount });
      }
    }
  }

  // === 策略4: 对子投注（NN概率加权） ===
  if (total >= 5) {
    const nnDoubleWeight = nnProbs[3];
    if (Math.random() < 0.15 + riskAppetite * 0.3 + nnDoubleWeight * 0.3) {
      const doubleFreq: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      history.forEach(r => {
        const counts: Record<number, number> = {};
        r.dice.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
        Object.entries(counts).forEach(([n, c]) => { if (c >= 2) doubleFreq[Number(n)]++; });
      });
      const sortedDoubles = Object.entries(doubleFreq).sort((a, b) => b[1] - a[1]);
      const target = Number(sortedDoubles[Math.random() < 0.7 ? 0 : Math.floor(Math.random() * 6)][0]);
      const amount = pickChip(Math.round(balance * 0.02 * (0.8 + nnDoubleWeight) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.2 && !bets.some(b => b.type === BetType.DOUBLE && b.target === target)) {
        bets.push({ type: BetType.DOUBLE, target, label: `对 ${target}`, amount });
      }
    }
  }

  // === 策略5: 组合投注（NN概率加权） ===
  if (total >= 4) {
    const nnComboWeight = nnProbs[4];
    if (Math.random() < 0.1 + riskAppetite * 0.3 + nnComboWeight * 0.3) {
      const combos: [number, number][] = [[1,2],[1,3],[1,5],[2,3],[2,4],[2,6],[3,4],[3,5],[4,5],[4,6],[5,6]];
      let bestCombo = combos[Math.floor(Math.random() * combos.length)];
      if (total >= 6) {
        const recentDice = history.slice(0, 5).flatMap(r => r.dice);
        const comboScore = combos.map(([a, b]) => ({ combo: [a, b] as [number, number], score: recentDice.filter(d => d === a || d === b).length }));
        comboScore.sort((a, b) => b.score - a.score);
        bestCombo = comboScore[Math.floor(Math.random() * 3)].combo;
      }
      const amount = pickChip(Math.round(balance * 0.02 * (0.8 + nnComboWeight) * aggFactor));
      if (amount > 0 && amount <= balance * maxBetRatio * 0.2) {
        bets.push({ type: BetType.COMBINATION, target: bestCombo[0], subTarget: bestCombo, label: `${bestCombo[0]}-${bestCombo[1]}`, amount });
      }
    }
  }

  // === 策略6: 点数投注（偶尔博高赔率，与大小一致） ===
  if (total >= 6 && Math.random() < 0.1 + riskAppetite * 0.3) {
    const sumFreq: Record<number, number> = {};
    history.forEach(r => { sumFreq[r.sum] = (sumFreq[r.sum] || 0) + 1; });
    const sortedSums = Object.entries(sumFreq).sort((a, b) => b[1] - a[1]);
    let targetSum = Math.random() < 0.6 ? Number(sortedSums[0][0]) : 4 + Math.floor(Math.random() * 14);
    // 确保点数与大小方向一致
    if (bets.some(b => b.type === BetType.BIG) && targetSum <= 10) targetSum = 11 + Math.floor(Math.random() * 7);
    if (bets.some(b => b.type === BetType.SMALL) && targetSum >= 11) targetSum = 4 + Math.floor(Math.random() * 7);
    const amount = pickChip(Math.round(balance * 0.015 * aggFactor));
    if (amount > 0 && amount <= balance * maxBetRatio * 0.15) {
      bets.push({ type: BetType.SPECIFIC_SUM, target: targetSum, label: `点数 ${targetSum}`, amount });
    }
  }

  // === 策略7: 全圍骰博冷（NN围骰概率加权） ===
  const nnTripleWeight = nnProbs[5];
  if (total >= 8 && Math.random() < 0.05 + riskAppetite * 0.25 + nnTripleWeight * 0.4) {
    const amount = pickChip(Math.round(balance * 0.01 * (1 + nnTripleWeight * 2) * aggFactor));
    if (amount > 0 && amount <= balance * maxBetRatio * 0.15 && !bets.some(b => b.type === BetType.TRIPLE)) {
      bets.push({ type: BetType.TRIPLE, label: '全圍骰', amount });
    }
  }

  // 如果没有任何下注，保底下大小（跟随NN）
  if (bets.length === 0) {
    const isBig = nnProbs[0] >= nnProbs[1];
    const amount = pickChip(Math.round(balance * 0.05));
    if (amount > 0) {
      bets.push({ type: isBig ? BetType.BIG : BetType.SMALL, label: isBig ? '大' : '小', amount });
    }
  }

  // 确保总下注不超过余额的上限（由激进度决定）
  const totalBet = bets.reduce((s, b) => s + b.amount, 0);
  if (totalBet > balance * maxBetRatio) {
    const scale = (balance * maxBetRatio) / totalBet;
    for (const b of bets) {
      b.amount = pickChip(Math.round(b.amount * scale));
    }
  }

  // === 冲突消解：移除矛盾投注 ===
  const hasBig = bets.some(b => b.type === BetType.BIG);
  const hasSmall = bets.some(b => b.type === BetType.SMALL);
  const hasOdd = bets.some(b => b.type === BetType.ODD);
  const hasEven = bets.some(b => b.type === BetType.EVEN);

  // 大小互斥：保留金额较大的，删除另一个
  if (hasBig && hasSmall) {
    const bigBet = bets.find(b => b.type === BetType.BIG)!;
    const smallBet = bets.find(b => b.type === BetType.SMALL)!;
    const removeType = bigBet.amount >= smallBet.amount ? BetType.SMALL : BetType.BIG;
    const idx = bets.findIndex(b => b.type === removeType);
    if (idx >= 0) bets.splice(idx, 1);
  }

  // 单双互斥
  if (hasOdd && hasEven) {
    const oddBet = bets.find(b => b.type === BetType.ODD)!;
    const evenBet = bets.find(b => b.type === BetType.EVEN)!;
    const removeType = oddBet.amount >= evenBet.amount ? BetType.EVEN : BetType.ODD;
    const idx = bets.findIndex(b => b.type === removeType);
    if (idx >= 0) bets.splice(idx, 1);
  }

  // 点数与大小一致性：如果买了大，删除小范围点数(4-10)；反之亦然
  const finalHasBig = bets.some(b => b.type === BetType.BIG);
  const finalHasSmall = bets.some(b => b.type === BetType.SMALL);
  if (finalHasBig) {
    // 删除小范围点数 (4-10)
    for (let i = bets.length - 1; i >= 0; i--) {
      if (bets[i].type === BetType.SPECIFIC_SUM && bets[i].target! <= 10) {
        bets.splice(i, 1);
      }
    }
  } else if (finalHasSmall) {
    // 删除大范围点数 (11-17)
    for (let i = bets.length - 1; i >= 0; i--) {
      if (bets[i].type === BetType.SPECIFIC_SUM && bets[i].target! >= 11) {
        bets.splice(i, 1);
      }
    }
  }

  return bets.filter(b => b.amount > 0);
}

// === 辅助函数 ===

function getStreak(history: DiceResult[]): { type: 'big' | 'small' | 'triple'; count: number } {
  if (history.length === 0) return { type: 'big', count: 0 };
  const first = history[0];
  const type = first.isTriple ? 'triple' : first.sum >= 11 ? 'big' : 'small';
  let count = 0;
  for (const r of history) {
    const t = r.isTriple ? 'triple' : r.sum >= 11 ? 'big' : 'small';
    if (t === type) count++;
    else break;
  }
  return { type, count };
}

function numToChinese(n: number): string {
  return ['一', '二', '三', '四', '五', '六'][n - 1] || String(n);
}
