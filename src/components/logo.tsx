import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeConfig = {
  sm: { px: 24, className: 'h-6 w-6' },
  md: { px: 32, className: 'h-8 w-8' },
  lg: { px: 48, className: 'h-12 w-12' },
  xl: { px: 80, className: 'h-20 w-20' },
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const { px, className: sizeClass } = sizeConfig[size];

  return (
    <Image
      src="/icons/icon-192.png"
      alt="S40G - Sub 40 Gang"
      width={px}
      height={px}
      className={`${sizeClass} ${className}`}
      priority={size === 'xl'}
    />
  );
}
