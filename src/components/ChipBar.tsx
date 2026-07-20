import { CHIP_VALUES } from '@/constants/payouts';
import { ChipValue } from '@/types';
import { useGameStore } from '@/store/gameStore';

const CHIP_STYLES: Record<number, { main: string; light: string; dark: string; glow: string }> = {
  1: { main: '#8B8B8B', light: '#B8B8B8', dark: '#5A5A5A', glow: 'rgba(139, 139, 139, 0.5)' },
  5: { main: '#E53935', light: '#FF6B6B', dark: '#8B0000', glow: 'rgba(229, 57, 53, 0.5)' },
  10: { main: '#1565C0', light: '#42A5F5', dark: '#0D47A1', glow: 'rgba(21, 101, 192, 0.5)' },
  25: { main: '#43A047', light: '#66BB6A', dark: '#1B5E20', glow: 'rgba(67, 160, 71, 0.5)' },
  50: { main: '#F57C00', light: '#FFB74D', dark: '#E65100', glow: 'rgba(245, 124, 0, 0.5)' },
  100: { main: '#1A1A1A', light: '#4A4A4A', dark: '#000', glow: 'rgba(74, 74, 74, 0.5)' },
  200: { main: '#00838F', light: '#4DD0E1', dark: '#006064', glow: 'rgba(0, 131, 143, 0.5)' },
  500: { main: '#9C27B0', light: '#CE93D8', dark: '#4A148C', glow: 'rgba(156, 39, 176, 0.5)' },
  1000: { main: '#C62828', light: '#EF5350', dark: '#7F0000', glow: 'rgba(198, 40, 40, 0.5)' },
  5000: { main: '#B8860B', light: '#FFD700', dark: '#8B6914', glow: 'rgba(184, 134, 11, 0.6)' },
};

export default function ChipBar() {
  const selectedChipValue = useGameStore(s => s.selectedChipValue);
  const selectChip = useGameStore(s => s.selectChip);
  const players = useGameStore(s => s.players);
  const activePlayerIndex = useGameStore(s => s.activePlayerIndex);
  const phase = useGameStore(s => s.phase);

  const balance = players[activePlayerIndex]?.balance ?? 0;

  return (
    <div className="chip-bar">
      <div className="chip-bar-inner">
        {CHIP_VALUES.map((value) => {
          const isSelected = selectedChipValue === value;
          const canAfford = balance >= value;
          const colors = CHIP_STYLES[value];
          return (
            <button
              key={value}
              className={`chip ${isSelected ? 'chip-selected' : ''}`}
              onClick={() =>
                canAfford && phase === 'betting' && selectChip(value as ChipValue)
              }
              disabled={!canAfford || phase !== 'betting'}
              style={{
                '--chip-main': colors.main,
                '--chip-light': colors.light,
                '--chip-dark': colors.dark,
                '--chip-glow': colors.glow,
              } as React.CSSProperties}
            >
              <div className="chip-outer">
                <div className="chip-inner">
                  <span className="chip-value">{value}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
