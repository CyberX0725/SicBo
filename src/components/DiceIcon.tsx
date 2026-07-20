import { getDiceFaceDots } from '@/engine/DiceLogic';

interface DiceIconProps {
  value: number;
  size?: 'xs' | 'sm' | 'sm2' | 'sm3' | 'md' | 'md2' | 'md3' | 'lg' | 'xl';
  className?: string;
}

// 所有尺寸表达为 --u 的倍数，确保随视口等比缩放
const SIZE_MAP = {
  xs:  { wrapper: 1.6,  dot: 0.25,  padding: 0.15,  gap: 0.05,  border: 0.05 },
  sm:  { wrapper: 2.2,  dot: 0.35,  padding: 0.2,   gap: 0.1,   border: 0.1 },
  sm2: { wrapper: 3.3,  dot: 0.525, padding: 0.3,   gap: 0.125, border: 0.125 },
  sm3: { wrapper: 2.7,  dot: 0.43,  padding: 0.24,  gap: 0.1,   border: 0.1 },
  md:  { wrapper: 2.8,  dot: 0.45,  padding: 0.25,  gap: 0.1,   border: 0.1 },
  md2: { wrapper: 4.2,  dot: 0.675, padding: 0.375, gap: 0.15,  border: 0.15 },
  md3: { wrapper: 3.8,  dot: 0.6,   padding: 0.34,  gap: 0.14,  border: 0.14 },
  lg:  { wrapper: 3.8,  dot: 0.65,  padding: 0.35,  gap: 0.15,  border: 0.15 },
  xl:  { wrapper: 5.0,  dot: 0.85,  padding: 0.45,  gap: 0.2,   border: 0.2 },
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

export default function DiceIcon({
  value,
  size = 'md',
  className = '',
}: DiceIconProps) {
  const dots = getDiceFaceDots(value);
  const { wrapper, dot, padding, gap, border } = SIZE_MAP[size];
  const red = isRedDot(value);

  return (
    <div
      className={`dice-face ${red ? 'dice-face-red' : 'dice-face-black'} ${className}`}
      style={{
        width: u(wrapper),
        height: u(wrapper),
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
            className={`dice-face-dot ${red ? 'dot-red' : 'dot-black'}`}
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
