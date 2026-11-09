interface Props {
  value: number;
  delta: number;
}

export default function ScoreWithDelta({ value, delta }: Props) {
  const deltaText = delta > 0 ? `+${delta}` : `${delta}`;

  const colorClass =
    delta > 0
      ? 'text-green-400'
      : delta < 0
      ? 'text-red-400'
      : 'text-gray-300';

  return (
    <span className={`font-bold whitespace-nowrap inline-flex items-center gap-1 ${colorClass}`}>
      <span>{value}</span>
      <span className="text-sm">({deltaText})</span>
    </span>
  );
}