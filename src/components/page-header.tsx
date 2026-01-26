import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  logo?: ReactNode;
}

export function PageHeader({ title, subtitle, logo }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        {logo}
        <div>
          {logo ? (
            <h1 className="sr-only">{title}</h1>
          ) : (
            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          )}
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
