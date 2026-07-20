import { useEffect, useState } from 'react';
import { DiceValue } from '@/types';
import Dice from './Dice';

interface DiceDisplayProps {
  result: [DiceValue, DiceValue, DiceValue] | null;
  rolling: boolean;
  size?: 'sm' | 'md' | 'big';
}

export default function DiceDisplay({ result, rolling, size = 'big' }: DiceDisplayProps) {
  const [displayValues, setDisplayValues] = useState<[DiceValue, DiceValue, DiceValue]>(
    result || [1, 1, 1]
  );

  useEffect(() => {
    if (rolling) {
      const interval = setInterval(() => {
        setDisplayValues([
          (Math.floor(Math.random() * 6) + 1) as DiceValue,
          (Math.floor(Math.random() * 6) + 1) as DiceValue,
          (Math.floor(Math.random() * 6) + 1) as DiceValue,
        ]);
      }, 80);

      return () => clearInterval(interval);
    } else if (result) {
      setDisplayValues(result);
    }
  }, [rolling, result]);

  return (
    <>
      {displayValues.map((d, i) => (
        <Dice key={i} value={d} size={size} rolling={rolling} />
      ))}
    </>
  );
}
