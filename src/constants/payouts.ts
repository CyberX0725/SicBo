import { BetType, BetOption } from '@/types';

export const CHIP_VALUES = [1, 5, 10, 25, 50, 100, 200, 500, 1000, 5000] as const;

export const INITIAL_BALANCE = 10000;

export const PAYOUTS: Record<string, number | { [key: number]: number }> = {
  [BetType.BIG]: 1,
  [BetType.SMALL]: 1,
  [BetType.ODD]: 1,
  [BetType.EVEN]: 1,
  [BetType.DOUBLE]: 8,
  [BetType.TRIPLE]: 24,
  [BetType.SPECIFIC_TRIPLE]: 150,
  [BetType.COMBINATION]: 5,
  [BetType.SINGLE_NUMBER]: { 1: 1, 2: 2, 3: 3 },
  [BetType.SPECIFIC_SUM]: {
    4: 50, 5: 30, 6: 18, 7: 12, 8: 8, 9: 6,
    10: 6, 11: 6, 12: 6, 13: 8, 14: 12, 15: 18,
    16: 30, 17: 50,
  },
};

/**
 * Table layout matching the real Macau Sic Bo mat (90cm × 60cm).
 * 5 horizontal sections.
 *
 * Section 0 (top):  11-col × 4-row grid (col/row are 0-indexed):
 *   Row 0:   SMALL | 指定雙骰 1賠8 (cols 1-3) | 指定圍骰 1賠150 (col 4) | ANY TRIPLE | 指定圍骰 1賠150 (col 6) | 指定雙骰 1賠8 (cols 7-9) | BIG
 *   Row 1-3: (SMALL span) | 对1 | 对2 | 对3 | 围骰1 | (ANY span) | 围骰4 | 对4 | 对5 | 对6 | (BIG span)
 * Section 1 (sum):  14 cells (4..17)
 * Section 2 (combo): label + 15 cells
 * Section 3 (single): 6 cells (一..六)
 */
export const BET_OPTIONS: BetOption[] = [
  // ===== Section 0: 11-col × 4-row top grid (0-indexed col/row) =====
  // SMALL — col 0, spans rows 0-3
  { type: BetType.SMALL, label: 'SMALL', payout: 1, section: 0, col: 0, colSpan: 1, row: 0, rowSpan: 4, renderType: 'small_label' },
  // Left doubles label — cols 1-3, row 0
  { type: BetType.DOUBLE, label: '指定雙骰 1賠8', payout: 8, section: 0, col: 1, colSpan: 3, row: 0, rowSpan: 1, renderType: 'group_label' },
  // Left doubles — cols 1-3, each spans rows 1-3
  { type: BetType.DOUBLE, label: '对 1', target: 1, payout: 8, section: 0, col: 1, row: 1, rowSpan: 3, renderType: 'dice_pair', dicePattern: [1, 1] },
  { type: BetType.DOUBLE, label: '对 2', target: 2, payout: 8, section: 0, col: 2, row: 1, rowSpan: 3, renderType: 'dice_pair', dicePattern: [2, 2] },
  { type: BetType.DOUBLE, label: '对 3', target: 3, payout: 8, section: 0, col: 3, row: 1, rowSpan: 3, renderType: 'dice_pair', dicePattern: [3, 3] },
  // Left triples label — col 4, row 0
  { type: BetType.SPECIFIC_TRIPLE, label: '指定圍骰 1賠150', payout: 150, section: 0, col: 4, colSpan: 1, row: 0, rowSpan: 1, renderType: 'group_label' },
  // Left triples (1,1,1 / 2,2,2 / 3,3,3) — col 4, rows 1-3
  { type: BetType.SPECIFIC_TRIPLE, label: '围骰 1', target: 1, payout: 150, section: 0, col: 4, row: 1, renderType: 'dice_triple', dicePattern: [1, 1, 1] },
  { type: BetType.SPECIFIC_TRIPLE, label: '围骰 2', target: 2, payout: 150, section: 0, col: 4, row: 2, renderType: 'dice_triple', dicePattern: [2, 2, 2] },
  { type: BetType.SPECIFIC_TRIPLE, label: '围骰 3', target: 3, payout: 150, section: 0, col: 4, row: 3, renderType: 'dice_triple', dicePattern: [3, 3, 3] },
  // ANY TRIPLE label — col 5, row 0
  { type: BetType.TRIPLE, label: '全圍骰 1賠24', payout: 24, section: 0, col: 5, colSpan: 1, row: 0, rowSpan: 1, renderType: 'group_label' },
  // ANY TRIPLE dice — col 5, spans rows 1-3
  { type: BetType.TRIPLE, label: '全围', payout: 24, section: 0, col: 5, row: 1, rowSpan: 3, renderType: 'any_triple' },
  // Right triples label — col 6, row 0
  { type: BetType.SPECIFIC_TRIPLE, label: '指定圍骰 1賠150', payout: 150, section: 0, col: 6, colSpan: 1, row: 0, rowSpan: 1, renderType: 'group_label' },
  // Right triples (4,4,4 / 5,5,5 / 6,6,6) — col 6, rows 1-3
  { type: BetType.SPECIFIC_TRIPLE, label: '围骰 4', target: 4, payout: 150, section: 0, col: 6, row: 1, renderType: 'dice_triple', dicePattern: [4, 4, 4] },
  { type: BetType.SPECIFIC_TRIPLE, label: '围骰 5', target: 5, payout: 150, section: 0, col: 6, row: 2, renderType: 'dice_triple', dicePattern: [5, 5, 5] },
  { type: BetType.SPECIFIC_TRIPLE, label: '围骰 6', target: 6, payout: 150, section: 0, col: 6, row: 3, renderType: 'dice_triple', dicePattern: [6, 6, 6] },
  // Right doubles label — cols 7-9, row 0
  { type: BetType.DOUBLE, label: '指定雙骰 1賠8', payout: 8, section: 0, col: 7, colSpan: 3, row: 0, rowSpan: 1, renderType: 'group_label' },
  // Right doubles — cols 7-9, rows 1-3
  { type: BetType.DOUBLE, label: '对 4', target: 4, payout: 8, section: 0, col: 7, row: 1, rowSpan: 3, renderType: 'dice_pair', dicePattern: [4, 4] },
  { type: BetType.DOUBLE, label: '对 5', target: 5, payout: 8, section: 0, col: 8, row: 1, rowSpan: 3, renderType: 'dice_pair', dicePattern: [5, 5] },
  { type: BetType.DOUBLE, label: '对 6', target: 6, payout: 8, section: 0, col: 9, row: 1, rowSpan: 3, renderType: 'dice_pair', dicePattern: [6, 6] },
  // BIG — col 10, spans rows 0-3
  { type: BetType.BIG, label: 'BIG', payout: 1, section: 0, col: 10, colSpan: 1, row: 0, rowSpan: 4, renderType: 'big_label' },

  // ===== Section 1: Sum numbers 4-17 (14 equal cells, NO DICE) =====
  { type: BetType.SPECIFIC_SUM, label: '4', target: 4, payout: 50, section: 1, col: 0, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '5', target: 5, payout: 30, section: 1, col: 1, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '6', target: 6, payout: 18, section: 1, col: 2, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '7', target: 7, payout: 12, section: 1, col: 3, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '8', target: 8, payout: 8, section: 1, col: 4, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '9', target: 9, payout: 6, section: 1, col: 5, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '10', target: 10, payout: 6, section: 1, col: 6, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '11', target: 11, payout: 6, section: 1, col: 7, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '12', target: 12, payout: 6, section: 1, col: 8, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '13', target: 13, payout: 8, section: 1, col: 9, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '14', target: 14, payout: 12, section: 1, col: 10, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '15', target: 15, payout: 18, section: 1, col: 11, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '16', target: 16, payout: 30, section: 1, col: 12, renderType: 'sum_cell' },
  { type: BetType.SPECIFIC_SUM, label: '17', target: 17, payout: 50, section: 1, col: 13, renderType: 'sum_cell' },

  // ===== Section 2: Two-dice combinations (15 cells, dice stacked vertically) =====
  { type: BetType.COMBINATION, label: '1-2', target: 1, subTarget: [1, 2], payout: 5, section: 2, col: 0, renderType: 'combo_cell', dicePattern: [1, 2] },
  { type: BetType.COMBINATION, label: '1-3', target: 1, subTarget: [1, 3], payout: 5, section: 2, col: 1, renderType: 'combo_cell', dicePattern: [1, 3] },
  { type: BetType.COMBINATION, label: '1-4', target: 1, subTarget: [1, 4], payout: 5, section: 2, col: 2, renderType: 'combo_cell', dicePattern: [1, 4] },
  { type: BetType.COMBINATION, label: '1-5', target: 1, subTarget: [1, 5], payout: 5, section: 2, col: 3, renderType: 'combo_cell', dicePattern: [1, 5] },
  { type: BetType.COMBINATION, label: '1-6', target: 1, subTarget: [1, 6], payout: 5, section: 2, col: 4, renderType: 'combo_cell', dicePattern: [1, 6] },
  { type: BetType.COMBINATION, label: '2-3', target: 2, subTarget: [2, 3], payout: 5, section: 2, col: 5, renderType: 'combo_cell', dicePattern: [2, 3] },
  { type: BetType.COMBINATION, label: '2-4', target: 2, subTarget: [2, 4], payout: 5, section: 2, col: 6, renderType: 'combo_cell', dicePattern: [2, 4] },
  { type: BetType.COMBINATION, label: '2-5', target: 2, subTarget: [2, 5], payout: 5, section: 2, col: 7, renderType: 'combo_cell', dicePattern: [2, 5] },
  { type: BetType.COMBINATION, label: '2-6', target: 2, subTarget: [2, 6], payout: 5, section: 2, col: 8, renderType: 'combo_cell', dicePattern: [2, 6] },
  { type: BetType.COMBINATION, label: '3-4', target: 3, subTarget: [3, 4], payout: 5, section: 2, col: 9, renderType: 'combo_cell', dicePattern: [3, 4] },
  { type: BetType.COMBINATION, label: '3-5', target: 3, subTarget: [3, 5], payout: 5, section: 2, col: 10, renderType: 'combo_cell', dicePattern: [3, 5] },
  { type: BetType.COMBINATION, label: '3-6', target: 3, subTarget: [3, 6], payout: 5, section: 2, col: 11, renderType: 'combo_cell', dicePattern: [3, 6] },
  { type: BetType.COMBINATION, label: '4-5', target: 4, subTarget: [4, 5], payout: 5, section: 2, col: 12, renderType: 'combo_cell', dicePattern: [4, 5] },
  { type: BetType.COMBINATION, label: '4-6', target: 4, subTarget: [4, 6], payout: 5, section: 2, col: 13, renderType: 'combo_cell', dicePattern: [4, 6] },
  { type: BetType.COMBINATION, label: '5-6', target: 5, subTarget: [5, 6], payout: 5, section: 2, col: 14, renderType: 'combo_cell', dicePattern: [5, 6] },

  // ===== Section 3: Single dice numbers 一-六 (6 equal cells) =====
  { type: BetType.SINGLE_NUMBER, label: '一', target: 1, payout: { 1: 1, 2: 2, 3: 3 }, section: 3, col: 0, renderType: 'single_dice', dicePattern: [1] },
  { type: BetType.SINGLE_NUMBER, label: '二', target: 2, payout: { 1: 1, 2: 2, 3: 3 }, section: 3, col: 1, renderType: 'single_dice', dicePattern: [2] },
  { type: BetType.SINGLE_NUMBER, label: '三', target: 3, payout: { 1: 1, 2: 2, 3: 3 }, section: 3, col: 2, renderType: 'single_dice', dicePattern: [3] },
  { type: BetType.SINGLE_NUMBER, label: '四', target: 4, payout: { 1: 1, 2: 2, 3: 3 }, section: 3, col: 3, renderType: 'single_dice', dicePattern: [4] },
  { type: BetType.SINGLE_NUMBER, label: '五', target: 5, payout: { 1: 1, 2: 2, 3: 3 }, section: 3, col: 4, renderType: 'single_dice', dicePattern: [5] },
  { type: BetType.SINGLE_NUMBER, label: '六', target: 6, payout: { 1: 1, 2: 2, 3: 3 }, section: 3, col: 5, renderType: 'single_dice', dicePattern: [6] },
];

export const CHIP_COLORS: Record<number, string> = {
  1: '#8B8B8B',
  5: '#E53935',
  10: '#1565C0',
  25: '#43A047',
  100: '#000000',
  500: '#E91E63',
};
