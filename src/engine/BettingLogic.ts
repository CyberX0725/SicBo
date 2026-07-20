import { Bet, BetType, DiceResult, DiceValue } from '@/types';
import { PAYOUTS } from '@/constants/payouts';

export function calculatePayout(bet: Bet, result: DiceResult): number {
  const { dice, sum, isTriple, tripleValue } = result;

  switch (bet.type) {
    case BetType.BIG: {
      if (isTriple) return 0;
      return sum >= 11 && sum <= 17 ? bet.amount * (1 + 1) : 0;
    }
    case BetType.SMALL: {
      if (isTriple) return 0;
      return sum >= 4 && sum <= 10 ? bet.amount * (1 + 1) : 0;
    }
    case BetType.ODD: {
      if (isTriple) return 0;
      return sum % 2 === 1 ? bet.amount * (1 + 1) : 0;
    }
    case BetType.EVEN: {
      if (isTriple) return 0;
      return sum % 2 === 0 ? bet.amount * (1 + 1) : 0;
    }
    case BetType.SPECIFIC_SUM: {
      if (bet.target === sum) {
        const payout = (PAYOUTS[BetType.SPECIFIC_SUM] as { [key: number]: number })[sum];
        return bet.amount * (1 + payout);
      }
      return 0;
    }
    case BetType.DOUBLE: {
      const count = dice.filter(d => d === bet.target).length;
      return count >= 2 ? bet.amount * (1 + 8) : 0;
    }
    case BetType.TRIPLE: {
      return isTriple ? bet.amount * (1 + 24) : 0;
    }
    case BetType.SPECIFIC_TRIPLE: {
      return isTriple && tripleValue === bet.target ? bet.amount * (1 + 150) : 0;
    }
    case BetType.SINGLE_NUMBER: {
      const count = dice.filter(d => d === bet.target).length;
      if (count === 0) return 0;
      const payoutMap = PAYOUTS[BetType.SINGLE_NUMBER] as { [key: number]: number };
      return bet.amount * (1 + payoutMap[count]);
    }
    case BetType.COMBINATION: {
      const hasBoth = bet.subTarget?.every(n => dice.includes(n as DiceValue));
      return hasBoth ? bet.amount * (1 + 5) : 0;
    }
    default:
      return 0;
  }
}

export function calculateAllPayouts(bets: Bet[], result: DiceResult): number {
  let total = 0;
  for (const bet of bets) {
    total += calculatePayout(bet, result);
  }
  return total;
}

export function calculateWinAmount(bets: Bet[], result: DiceResult): number {
  let totalWin = 0;
  for (const bet of bets) {
    const payout = calculatePayout(bet, result);
    if (payout > 0) {
      totalWin += payout - bet.amount;
    }
  }
  return totalWin;
}

export function getWinningBets(bets: Bet[], result: DiceResult): string[] {
  return bets
    .filter(bet => calculatePayout(bet, result) > 0)
    .map(bet => bet.id);
}