import { DiceValue, DiceResult } from '@/types';

/** 使用 Web Crypto API 生成 1-6 的随机数（密码学级随机） */
function cryptoDiceValue(): DiceValue {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return ((arr[0] % 6) + 1) as DiceValue;
}

export function rollDice(): DiceResult {
  const dice: [DiceValue, DiceValue, DiceValue] = [
    cryptoDiceValue(),
    cryptoDiceValue(),
    cryptoDiceValue(),
  ];

  const sum = dice[0] + dice[1] + dice[2];
  const isTriple = dice[0] === dice[1] && dice[1] === dice[2];

  return {
    dice,
    sum,
    isTriple,
    tripleValue: isTriple ? dice[0] : null,
  };
}

export function getDiceFaceDots(value: number): number[][] {
  const dotPositions: Record<number, number[][]> = {
    1: [[1, 1]],
    2: [[0, 2], [2, 0]],
    3: [[0, 2], [1, 1], [2, 0]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]],
  };
  return dotPositions[value] || [];
}