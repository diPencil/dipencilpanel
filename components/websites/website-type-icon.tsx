'use client';

import { cn } from '@/lib/utils';
import { getWebsiteTypeOption } from '@/lib/website-type-options';

type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, { box: string; img: string }> = {
  sm: { box: 'h-9 w-9 p-1', img: 'h-6 w-6' },
  md: { box: 'h-10 w-10 p-1.5', img: 'h-7 w-7' },
  lg: { box: 'h-12 w-12 p-2', img: 'h-8 w-8' },
};

export function WebsiteTypeIcon({
  type,
  size = 'md',
  className,
}: {
  type: string;
  size?: Size;
  className?: string;
}) {
  const opt = getWebsiteTypeOption(type);
  const s = sizeMap[size];
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg border border-border/80 bg-card shadow-sm',
        s.box,
        className,
      )}
      title={opt.label}
    >
      <img
        src={opt.iconSrc}
        alt=""
        className={cn(s.img, 'object-contain')}
        width={32}
        height={32}
        loading="lazy"
      />
    </div>
  );
}
