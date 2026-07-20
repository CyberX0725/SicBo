interface MessageToastProps {
  message: string;
}

export default function MessageToast({ message }: MessageToastProps) {
  const isWin = message.includes('恭喜') || message.includes('赢');
  return (
    <div className={`message-toast ${isWin ? 'win' : 'lose'}`}>
      {message}
    </div>
  );
}
