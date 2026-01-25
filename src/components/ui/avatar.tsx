import Image from 'next/image';

interface AvatarProps {
  src: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-16 w-16 text-xl',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <div className={`relative overflow-hidden rounded-full ${sizeClass} ${className}`}>
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={size === 'lg' ? '64px' : size === 'md' ? '40px' : '32px'}
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gray-700 font-medium text-gray-300 ${sizeClass} ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
