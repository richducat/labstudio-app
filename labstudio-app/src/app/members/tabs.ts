export const LAB_TABS = [
  'home',
  'book',
  'coach',
  'games',
  'market',
  'profile',
  'workout',
  'nutrition',
  'habits',
  'messages',
  'community',
  'challenges',
  'wearables',
  'social',
  'library',
  'progress',
] as const;

export type LabTab = (typeof LAB_TABS)[number];

const LAB_TAB_SET = new Set<string>(LAB_TABS);

export function isLabTab(value: string): value is LabTab {
  return LAB_TAB_SET.has(value);
}
