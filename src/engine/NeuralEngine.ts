import { DiceResult, BetType } from '@/types';

/**
 * 轻量级神经网络引擎
 * - 多层感知机(MLP)：输入层→隐藏层(ReLU)→输出层(Softmax)
 * - 在线学习：每局结束后根据实际结果反向传播更新权重
 * - 特征工程：从历史数据中提取多维特征向量
 */

// ===== 矩阵运算工具 =====
type Matrix = number[][];
type Vector = number[];

function matVecMul(mat: Matrix, vec: Vector): Vector {
  return mat.map(row => row.reduce((sum, w, i) => sum + w * vec[i], 0));
}

function vecAdd(a: Vector, b: Vector): Vector {
  return a.map((v, i) => v + b[i]);
}

function relu(vec: Vector): Vector {
  return vec.map(v => Math.max(0, v));
}

function reluDerivative(vec: Vector): Vector {
  return vec.map(v => (v > 0 ? 1 : 0));
}

function softmax(vec: Vector): Vector {
  const maxVal = Math.max(...vec);
  const exps = vec.map(v => Math.exp(v - maxVal));
  const sum = exps.reduce((s, e) => s + e, 0);
  return exps.map(e => e / sum);
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-Math.max(-10, Math.min(10, x))));
}

// Xavier 初始化
function initWeight(rows: number, cols: number): Matrix {
  const scale = Math.sqrt(2.0 / (rows + cols));
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => (Math.random() * 2 - 1) * scale)
  );
}

function initBias(size: number): Vector {
  return new Array(size).fill(0);
}

// ===== 特征工程 =====
export const INPUT_SIZE = 24; // 输入特征维度
export const OUTPUT_SIZE = 6; // 输出类别: [大, 小, 单骰热号, 对子, 组合, 围骰]

/** 从历史数据中提取特征向量 */
export function extractFeatures(history: DiceResult[]): Vector {
  const features = new Array(INPUT_SIZE).fill(0);
  const total = history.length;
  if (total === 0) return features;

  const recent = history.slice(0, Math.min(10, total));
  const n = recent.length;

  // [0-4] 最近5局大小编码 (大=1, 小=-1, 围骰=0)
  for (let i = 0; i < 5 && i < n; i++) {
    const r = recent[i];
    features[i] = r.isTriple ? 0 : r.sum >= 11 ? 1 : -1;
  }

  // [5] 大比例
  const bigCount = recent.filter(r => !r.isTriple && r.sum >= 11).length;
  features[5] = bigCount / n;

  // [6] 小比例
  const smallCount = recent.filter(r => !r.isTriple && r.sum <= 10).length;
  features[6] = smallCount / n;

  // [7] 围骰比例
  features[7] = recent.filter(r => r.isTriple).length / n;

  // [8] 连续趋势强度 (连续同方向的长度/5)
  let streak = 0;
  const firstType = recent[0]?.isTriple ? 0 : recent[0]?.sum >= 11 ? 1 : -1;
  for (const r of recent) {
    const t = r.isTriple ? 0 : r.sum >= 11 ? 1 : -1;
    if (t === firstType) streak++;
    else break;
  }
  features[8] = streak / 5;

  // [9] 平均点数归一化 (sum-10.5)/7
  const avgSum = recent.reduce((s, r) => s + r.sum, 0) / n;
  features[9] = (avgSum - 10.5) / 7;

  // [10] 点数标准差归一化
  const variance = recent.reduce((s, r) => s + (r.sum - avgSum) ** 2, 0) / n;
  features[10] = Math.sqrt(variance) / 5;

  // [11-16] 各号码频率归一化 (freq/expected - 1)
  const numFreq = [0, 0, 0, 0, 0, 0];
  recent.forEach(r => r.dice.forEach(d => { numFreq[d - 1]++; }));
  const expectedFreq = (n * 3) / 6;
  for (let i = 0; i < 6; i++) {
    features[11 + i] = expectedFreq > 0 ? (numFreq[i] / expectedFreq) - 1 : 0;
  }

  // [17] 最大号码频率偏差
  features[17] = Math.max(...features.slice(11, 17));

  // [18] 最小号码频率偏差
  features[18] = Math.min(...features.slice(11, 17));

  // [19] 对子出现率
  let doubleCount = 0;
  recent.forEach(r => {
    const counts: Record<number, number> = {};
    r.dice.forEach(d => { counts[d] = (counts[d] || 0) + 1; });
    if (Object.values(counts).some(c => c >= 2)) doubleCount++;
  });
  features[19] = doubleCount / n;

  // [20] 最近点数变化趋势 (线性回归斜率)
  if (n >= 3) {
    const sums = recent.slice(0, 5).map(r => r.sum).reverse();
    const len = sums.length;
    const xMean = (len - 1) / 2;
    const yMean = sums.reduce((s, v) => s + v, 0) / len;
    let num = 0, den = 0;
    sums.forEach((y, x) => { num += (x - xMean) * (y - yMean); den += (x - xMean) ** 2; });
    features[20] = den > 0 ? (num / den) / 5 : 0;
  }

  // [21] 奇偶比例偏差
  const oddCount = recent.filter(r => r.sum % 2 === 1).length;
  features[21] = (oddCount / n) - 0.5;

  // [22] 极端点数比例 (sum<=5 or sum>=16)
  features[22] = recent.filter(r => r.sum <= 5 || r.sum >= 16).length / n;

  // [23] 历史局数对数归一化 (表示数据充足度)
  features[23] = Math.min(Math.log(total + 1) / Math.log(21), 1);

  return features;
}

// ===== 神经网络类 =====
export class NeuralNetwork {
  // 网络结构: INPUT_SIZE → H1 → H2 → OUTPUT_SIZE
  private W1: Matrix; private b1: Vector;
  private W2: Matrix; private b2: Vector;
  private W3: Matrix; private b3: Vector;
  private readonly H1 = 16;
  private readonly H2 = 12;
  private learningRate: number;
  private momentum: number;
  // 动量缓存
  private dW1: Matrix; private db1: Vector;
  private dW2: Matrix; private db2: Vector;
  private dW3: Matrix; private db3: Vector;
  // 训练统计
  public trainCount = 0;
  public lastLoss = 0;

  constructor(learningRate = 0.05, momentum = 0.9) {
    this.learningRate = learningRate;
    this.momentum = momentum;
    this.W1 = initWeight(this.H1, INPUT_SIZE);
    this.b1 = initBias(this.H1);
    this.W2 = initWeight(this.H2, this.H1);
    this.b2 = initBias(this.H2);
    this.W3 = initWeight(OUTPUT_SIZE, this.H2);
    this.b3 = initBias(OUTPUT_SIZE);
    this.dW1 = this.W1.map(r => r.map(() => 0));
    this.db1 = this.b1.map(() => 0);
    this.dW2 = this.W2.map(r => r.map(() => 0));
    this.db2 = this.b2.map(() => 0);
    this.dW3 = this.W3.map(r => r.map(() => 0));
    this.db3 = this.b3.map(() => 0);
  }

  /** 前向传播：输入特征 → 输出概率分布 */
  forward(input: Vector): { probs: Vector; cache: { a1: Vector; z1: Vector; a2: Vector; z2: Vector; z3: Vector } } {
    const z1 = vecAdd(matVecMul(this.W1, input), this.b1);
    const a1 = relu(z1);
    const z2 = vecAdd(matVecMul(this.W2, a1), this.b2);
    const a2 = relu(z2);
    const z3 = vecAdd(matVecMul(this.W3, a2), this.b3);
    const probs = softmax(z3);
    return { probs, cache: { a1, z1, a2, z2, z3 } };
  }

  /** 预测：返回各类别的概率 */
  predict(input: Vector): Vector {
    return this.forward(input).probs;
  }

  /** 反向传播训练（在线学习，单样本） */
  train(input: Vector, targetIdx: number): number {
    const { probs, cache } = this.forward(input);
    const { a1, z1, a2, z2 } = cache;

    // 交叉熵损失
    const loss = -Math.log(Math.max(probs[targetIdx], 1e-8));
    this.lastLoss = loss;

    // 输出层梯度 (softmax + cross-entropy)
    const dz3 = [...probs];
    dz3[targetIdx] -= 1;

    // 隐藏层2梯度
    const da2 = matVecMul(this.W3[0].map((_, i) => this.W3.map(row => row[i])), dz3);
    const dz2 = da2.map((v, i) => v * reluDerivative(z2)[i]);

    // 隐藏层1梯度
    const da1 = matVecMul(this.W2[0].map((_, i) => this.W2.map(row => row[i])), dz2);
    const dz1 = da1.map((v, i) => v * reluDerivative(z1)[i]);

    // 更新权重（带动量）
    const lr = this.learningRate;
    const mom = this.momentum;

    // W3, b3
    for (let i = 0; i < OUTPUT_SIZE; i++) {
      for (let j = 0; j < this.H2; j++) {
        const grad = dz3[i] * a2[j];
        this.dW3[i][j] = mom * this.dW3[i][j] - lr * grad;
        this.W3[i][j] += this.dW3[i][j];
      }
      this.db3[i] = mom * this.db3[i] - lr * dz3[i];
      this.b3[i] += this.db3[i];
    }

    // W2, b2
    for (let i = 0; i < this.H2; i++) {
      for (let j = 0; j < this.H1; j++) {
        const grad = dz2[i] * a1[j];
        this.dW2[i][j] = mom * this.dW2[i][j] - lr * grad;
        this.W2[i][j] += this.dW2[i][j];
      }
      this.db2[i] = mom * this.db2[i] - lr * dz2[i];
      this.b2[i] += this.db2[i];
    }

    // W1, b1
    for (let i = 0; i < this.H1; i++) {
      for (let j = 0; j < INPUT_SIZE; j++) {
        const grad = dz1[i] * input[j];
        this.dW1[i][j] = mom * this.dW1[i][j] - lr * grad;
        this.W1[i][j] += this.dW1[i][j];
      }
      this.db1[i] = mom * this.db1[i] - lr * dz1[i];
      this.b1[i] += this.db1[i];
    }

    this.trainCount++;
    return loss;
  }

  /** 根据骰子结果确定目标类别索引 */
  static resultToTarget(result: DiceResult): number {
    if (result.isTriple) return 5; // 围骰
    if (result.sum >= 11) return 0; // 大
    return 1; // 小
  }
}

// ===== 全局神经网络实例（跨局持久化） =====
let globalNN: NeuralNetwork | null = null;

export function getNeuralNetwork(): NeuralNetwork {
  if (!globalNN) {
    globalNN = new NeuralNetwork(0.08, 0.85);
  }
  return globalNN;
}

export function resetNeuralNetwork(): void {
  globalNN = new NeuralNetwork(0.08, 0.85);
}

// ===== 神经网络决策接口 =====
export interface NNDecision {
  probs: Vector;           // 6类概率 [大, 小, 单骰, 对子, 组合, 围骰]
  topCategory: number;     // 最高概率类别
  confidence: number;      // 最高概率值
  trainCount: number;      // 已训练轮数
  lastLoss: number;        // 最近损失
  featureHighlights: string[]; // 关键特征解读
}

/** 使用神经网络进行决策分析 */
export function nnAnalyze(history: DiceResult[]): NNDecision {
  const nn = getNeuralNetwork();
  const features = extractFeatures(history);
  const probs = nn.predict(features);

  // 找到最高概率类别
  let topIdx = 0;
  for (let i = 1; i < probs.length; i++) {
    if (probs[i] > probs[topIdx]) topIdx = i;
  }

  // 特征解读
  const highlights: string[] = [];
  if (Math.abs(features[8]) > 0.4) highlights.push(`连续趋势明显(强度${(features[8] * 5).toFixed(0)}局)`);
  if (features[17] > 0.5) highlights.push(`热号偏差显著(+${(features[17] * 100).toFixed(0)}%)`);
  if (features[18] < -0.5) highlights.push(`冷号偏差显著(${(features[18] * 100).toFixed(0)}%)`);
  if (features[19] > 0.3) highlights.push(`对子活跃(出现率${(features[19] * 100).toFixed(0)}%)`);
  if (Math.abs(features[20]) > 0.3) highlights.push(`点数${features[20] > 0 ? '上升' : '下降'}趋势`);
  if (features[23] < 0.5) highlights.push(`数据量不足(仅${history.length}局)，预测置信度有限`);
  if (highlights.length === 0) highlights.push('当前无明显模式，建议保守投注');

  return {
    probs,
    topCategory: topIdx,
    confidence: probs[topIdx],
    trainCount: nn.trainCount,
    lastLoss: nn.lastLoss,
    featureHighlights: highlights,
  };
}

/** 每局结束后训练网络（在线学习） */
export function nnTrainOnResult(history: DiceResult[], result: DiceResult): void {
  const nn = getNeuralNetwork();
  const features = extractFeatures(history);
  const target = NeuralNetwork.resultToTarget(result);
  nn.train(features, target);
}

// 类别名称映射
export const NN_CATEGORIES = ['大', '小', '单骰热号', '对子', '组合', '围骰'];
