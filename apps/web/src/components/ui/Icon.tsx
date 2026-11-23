import type { IconName } from './types';
import { cx } from './types';

type Part = ['circle' | 'path' | 'rect', Record<string, number | string>];

const ICONS: Record<IconName, Part[]> = {
  dashboard: [['circle', { cx: 10, cy: 10, r: 7.25 }], ['path', { d: 'M10 3.5 11.6 8.4 16.5 10 11.6 11.6 10 16.5 8.4 11.6 3.5 10 8.4 8.4Z' }]],
  tv: [['rect', { x: 2.75, y: 5.25, width: 14.5, height: 10, rx: 1.5 }], ['path', { d: 'M7 2.75 10 5.25 13 2.75M7 17.75h6' }]],
  film: [['rect', { x: 3.25, y: 2.75, width: 13.5, height: 14.5, rx: 1.5 }], ['path', { d: 'M6.75 2.75v14.5M13.25 2.75v14.5M3.25 6.5h3.5M3.25 10h3.5M3.25 13.5h3.5M13.25 6.5h3.5M13.25 10h3.5M13.25 13.5h3.5' }]],
  star: [['path', { d: 'M10 2.9l2.1 4.4 4.8.6-3.5 3.3.9 4.8L10 13.7 5.7 16l.9-4.8-3.5-3.3 4.8-.6Z' }]],
  settings: [['path', { d: 'M3.5 5.5h7M14.5 5.5h2M3.5 10h2M9.5 10h7M3.5 14.5h8M15.5 14.5h1' }], ['circle', { cx: 12.5, cy: 5.5, r: 2 }], ['circle', { cx: 7.5, cy: 10, r: 2 }], ['circle', { cx: 13.5, cy: 14.5, r: 2 }]],
  search: [['circle', { cx: 8.75, cy: 8.75, r: 5.5 }], ['path', { d: 'M13 13l4 4' }]],
  x: [['path', { d: 'M5.5 5.5l9 9M14.5 5.5l-9 9' }]],
  chevronDown: [['path', { d: 'M5.5 8l4.5 4.5L14.5 8' }]],
  check: [['path', { d: 'M4.5 10.5l3.5 3.5 7.5-8' }]],
  plus: [['path', { d: 'M10 4v12M4 10h12' }]],
  alert: [['path', { d: 'M10 3 17.5 16.5h-15Z' }], ['path', { d: 'M10 8.25v3.5M10 14v.01' }]],
  info: [['circle', { cx: 10, cy: 10, r: 7.25 }], ['path', { d: 'M10 9v5M10 6.25v.01' }]],
  grid: [['rect', { x: 3.25, y: 3.25, width: 5.5, height: 5.5, rx: 1 }], ['rect', { x: 11.25, y: 3.25, width: 5.5, height: 5.5, rx: 1 }], ['rect', { x: 3.25, y: 11.25, width: 5.5, height: 5.5, rx: 1 }], ['rect', { x: 11.25, y: 11.25, width: 5.5, height: 5.5, rx: 1 }]],
  list: [['path', { d: 'M7.5 5.5h9M7.5 10h9M7.5 14.5h9M3.5 5.5h.01M3.5 10h.01M3.5 14.5h.01' }]],
  returning: [['path', { d: 'M15.5 8.5A5.75 5.75 0 0 0 5 6.5M4.5 11.5A5.75 5.75 0 0 0 15 13.5' }], ['path', { d: 'M5 3.5v3h3M15 16.5v-3h-3' }]],
  ended: [['rect', { x: 5.5, y: 5.5, width: 9, height: 9, rx: 1 }]],
  production: [['path', { d: 'M10 3v2.5M10 14.5V17M3 10h2.5M14.5 10H17M5.05 5.05l1.77 1.77M13.18 13.18l1.77 1.77M5.05 14.95l1.77-1.77M13.18 6.82l1.77-1.77' }]],
  undo: [['path', { d: 'M7 5.5 3.5 9 7 12.5' }], ['path', { d: 'M3.5 9h8.25a4.75 4.75 0 0 1 0 9.5H9' }]],
};

export interface IconProps { name: IconName; size?: number; strokeWidth?: number; label?: string; className?: string }

/** 20px line icon, 1.5px stroke, currentColor. Decorative unless `label` is given. */
export function Icon({ name, size = 20, strokeWidth = 1.5, label, className }: IconProps) {
  return (
    <svg
      className={cx('tt-icon', className)}
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      {ICONS[name].map(([tag, attrs], i) => {
        const Tag = tag;
        return <Tag key={i} {...attrs} />;
      })}
    </svg>
  );
}
