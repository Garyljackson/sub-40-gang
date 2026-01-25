interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`border-t-brand-primary animate-spin rounded-full border-gray-700 ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
