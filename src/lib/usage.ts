import { isPrivateMode } from "./privateMode";

const USAGE_KEY = "hackmind_usage";
const MAX_DAILY = 1000;

interface UsageData {
  date: string;
  count: number;
}

const todayStr = (): string => new Date().toISOString().slice(0, 10);

const getUsage = (): UsageData => {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { date: todayStr(), count: 0 };
    const data: UsageData = JSON.parse(raw);
    if (data.date !== todayStr()) return { date: todayStr(), count: 0 };
    return data;
  } catch {
    return { date: todayStr(), count: 0 };
  }
};

const setUsage = (data: UsageData): void => {
  if (isPrivateMode()) return;
  localStorage.setItem(USAGE_KEY, JSON.stringify(data));
};

export const getUsageCount = (): number => getUsage().count;

export const incrementUsage = (): number => {
  const usage = getUsage();
  usage.count += 1;
  setUsage(usage);
  return usage.count;
};

export const isOverLimit = (): boolean => getUsage().count >= MAX_DAILY;

export const DAILY_LIMIT = MAX_DAILY;
