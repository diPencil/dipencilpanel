import type { Website } from '@/lib/types';

export type WebsiteStackType = Website['type'];

export const WEBSITE_TYPE_OPTIONS: readonly {
  value: WebsiteStackType;
  label: string;
  iconSrc: string;
  wizardCardClass: string;
}[] = [
  {
    value: 'wordpress',
    label: 'WordPress',
    iconSrc: '/wordpress-139-svgrepo-com.svg',
    wizardCardClass:
      'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  },
  {
    value: 'node',
    label: 'Node.js',
    iconSrc: '/node-js-svgrepo-com.svg',
    wizardCardClass:
      'border-green-300 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300',
  },
  {
    value: 'php',
    label: 'PHP',
    iconSrc: '/phplaravel-svgrepo-com.svg',
    wizardCardClass:
      'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  },
  {
    value: 'html',
    label: 'Static HTML',
    iconSrc: '/html5-01-svgrepo-com.svg',
    wizardCardClass:
      'border-orange-300 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  },
] as const;

export function getWebsiteTypeOption(type: string) {
  const found = WEBSITE_TYPE_OPTIONS.find((o) => o.value === type);
  return found ?? WEBSITE_TYPE_OPTIONS[0];
}
