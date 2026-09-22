import { isTouchDevice } from './util';

export type QualityLevel = 'low' | 'medium' | 'high';
export type QualitySetting = 'auto' | QualityLevel;

const KEY = 'lcss.quality';

export function loadQualitySetting(): QualitySetting {
  const v = localStorage.getItem(KEY);
  return v === 'low' || v === 'medium' || v === 'high' || v === 'auto' ? v : 'auto';
}

export function saveQualitySetting(q: QualitySetting) {
  localStorage.setItem(KEY, q);
}

export function initialLevel(setting: QualitySetting): QualityLevel {
  if (setting !== 'auto') return setting;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  if (isTouchDevice()) return mem <= 3 ? 'low' : 'medium';
  return 'high';
}

export interface QualityProfile {
  pixelRatio: number;
  shadows: boolean;
  shadowSize: number;
  bloom: boolean;
}

export function profile(level: QualityLevel): QualityProfile {
  const dpr = window.devicePixelRatio || 1;
  switch (level) {
    case 'low':
      return { pixelRatio: Math.min(dpr, 1), shadows: false, shadowSize: 512, bloom: false };
    case 'medium':
      return { pixelRatio: Math.min(dpr, 1.5), shadows: true, shadowSize: 1024, bloom: false };
    default:
      return { pixelRatio: Math.min(dpr, 2), shadows: true, shadowSize: 2048, bloom: true };
  }
}
