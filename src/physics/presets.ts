import { Body } from './types';

function rndColor() {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export const PRESET_2_BODY: Body[] = [
  { id: '1', mass: 1000, radius: 20, position: { x: -100, y: 0 }, velocity: { x: 0, y: 40 }, color: '#3b82f6', trail: [] },
  { id: '2', mass: 1000, radius: 20, position: { x: 100, y: 0 }, velocity: { x: 0, y: -40 }, color: '#ef4444', trail: [] },
];

export const PRESET_SOLAR_SYSTEM: Body[] = [
  { id: 'sun', mass: 10000, radius: 30, position: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, color: '#f59e0b', trail: [] },
  { id: 'earth', mass: 10, radius: 8, position: { x: 200, y: 0 }, velocity: { x: 0, y: 220 }, color: '#3b82f6', trail: [] },
  { id: 'mars', mass: 5, radius: 6, position: { x: 300, y: 0 }, velocity: { x: 0, y: 180 }, color: '#ef4444', trail: [] },
  { id: 'jupiter', mass: 100, radius: 15, position: { x: 500, y: 0 }, velocity: { x: 0, y: 140 }, color: '#f97316', trail: [] },
];

// Figure 8 approx
export const PRESET_3_BODY: Body[] = [
  { id: '1', mass: 1000, radius: 15, position: { x: 97.000436, y: -24.308753 }, velocity: { x: 23.332, y: 21.656 }, color: '#3b82f6', trail: [] },
  { id: '2', mass: 1000, radius: 15, position: { x: -97.000436, y: 24.308753 }, velocity: { x: 23.332, y: 21.656 }, color: '#ef4444', trail: [] },
  { id: '3', mass: 1000, radius: 15, position: { x: 0, y: 0 }, velocity: { x: -46.664, y: -43.312 }, color: '#10b981', trail: [] },
];

export const ALL_PRESETS = [
    { name: 'Binary Star', data: PRESET_2_BODY },
    { name: 'Solar System', data: PRESET_SOLAR_SYSTEM },
    { name: 'Figure 8 (Chaotic)', data: PRESET_3_BODY },
];
