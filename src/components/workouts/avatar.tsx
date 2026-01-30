'use client';

import Image from 'next/image';

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md';
}

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const sizeClass = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  const pixelSize = size === 'sm' ? 32 : 40;

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={pixelSize}
        height={pixelSize}
        className={`${sizeClass} rounded-full object-cover`}
        unoptimized
      />
    );
  }

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-gray-200 font-medium text-gray-600`}
    >
      {initials}
    </div>
  );
}
