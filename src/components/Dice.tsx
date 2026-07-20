import { DiceValue } from '@/types';
import { getDiceFaceDots } from '@/engine/DiceLogic';

interface DiceProps {
  value: DiceValue;
  rolling?: boolean;
  size?: 'sm' | 'md' | 'big';
}

const SIZE_MAP = {
  sm: { px: 2.0, dot: 0.3, padding: 0.2, gap: 0.1, border: 0.1 },
  md: { px: 3.0, dot: 0.5, padding: 0.3, gap: 0.1, border: 0.1 },
  big: { px: 6.0, dot: 1.1, padding: 0.5, gap: 0.3, border: 0.2 },
};

/** 将倍数转为 calc(var(--u) * N) 表达式 */
function u(n: number): string {
  return `calc(var(--u) * ${n})`;
}

/**
 * 骰子点数颜色规则（中国传统骰子）：
 * - 1 点和 4 点：红色
 * - 2、3、5、6 点：黑色
 */
function isRedDot(value: number): boolean {
  return value === 1 || value === 4;
}

export default function Dice({ value, rolling, size = 'md' }: DiceProps) {
  const dots = getDiceFaceDots(value);
  const { px, dot, padding, gap, border } = SIZE_MAP[size];
  const red = isRedDot(value);

  return (
    <div
      className={`dice-face ${size === 'big' ? 'large' : ''} ${red ? 'dice-face-red' : 'dice-face-black'} ${rolling ? 'rolling' : ''}`}
      style={{
        width: u(px),
        height: u(px),
        padding: u(padding),
        borderWidth: u(border),
      }}
    >
      <div
        className="dice-face-inner"
        style={{ gap: u(gap) }}
      >
        {dots.map((pos, i) => (
          <div
            key={i}
            className={`${size === 'big' ? 'dice-big-dot' : 'dice-face-dot'} ${red ? 'dot-red' : 'dot-black'}`}
            style={{
              width: u(dot),
              height: u(dot),
              gridRow: pos[0] + 1,
              gridColumn: pos[1] + 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
