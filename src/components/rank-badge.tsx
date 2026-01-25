interface RankBadgeProps {
  rank: number;
  size?: 'sm' | 'md';
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
};

export function RankBadge({ rank, size = 'md' }: RankBadgeProps) {
  const getRankStyles = () => {
    switch (rank) {
      case 1:
        return 'bg-gold text-white';
      case 2:
        return 'bg-silver text-white';
      case 3:
        return 'bg-bronze text-white';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold ${sizeClasses[size]} ${getRankStyles()}`}
    >
      {rank}
    </div>
  );
}
