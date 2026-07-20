import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import GameTable from '@/components/GameTable';
import LobbyScreen from '@/components/LobbyScreen';
import IntroScreen from '@/components/IntroScreen';
import TrainingSetupScreen from '@/components/TrainingSetupScreen';

type Screen = 'intro' | 'lobby' | 'training';

export default function App() {
  const phase = useGameStore(s => s.phase);
  const [screen, setScreen] = useState<Screen>('intro');

  // 游戏已开始，显示游戏界面
  if (phase !== 'lobby') {
    return <GameTable />;
  }

  // 显示介绍/大厅界面
  switch (screen) {
    case 'intro':
      return (
        <IntroScreen
          onStart={() => setScreen('lobby')}
          onTraining={() => setScreen('training')}
        />
      );
    case 'training':
      return <TrainingSetupScreen onBack={() => setScreen('intro')} />;
    default:
      return <LobbyScreen />;
  }
}