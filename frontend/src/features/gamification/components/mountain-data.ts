// Pixel-art volcano mountain data arrays
// Used by MountainMap.tsx to render the gamified volcano

/** Pixel-art volcano silhouette with visible crater depression (bowl at top) */
export const VOLCANO_PATH =
  // Start at right rim peak
  'M 59,5' +
  // Right slope descending (pixel-art staircase, steeper near top)
  ' L 59,8 L 61,8 L 61,11 L 63,11 L 63,15 L 65,15 L 65,19 L 67,19' +
  ' L 67,23 L 69,23 L 69,28 L 71,28 L 71,33 L 73,33 L 73,39 L 75,39' +
  ' L 75,46 L 77,46 L 77,53 L 79,53 L 79,60 L 81,60 L 81,68 L 83,68' +
  ' L 83,76 L 85,76 L 85,83 L 87,83 L 87,89 L 89,89 L 89,96' +
  // Base line
  ' L 11,96' +
  // Left slope ascending (pixel-art staircase)
  ' L 11,89 L 13,89 L 13,83 L 15,83 L 15,76 L 17,76 L 17,68 L 19,68' +
  ' L 19,60 L 21,60 L 21,53 L 23,53 L 23,46 L 25,46 L 25,39 L 27,39' +
  ' L 27,33 L 29,33 L 29,28 L 31,28 L 31,23 L 33,23 L 33,19 L 35,19' +
  ' L 35,15 L 37,15 L 37,11 L 39,11 L 39,8 L 41,8 L 41,5' +
  // Crater depression (left rim → bowl → right rim)
  ' L 41,7 L 43,7 L 43,9 L 45,9 L 45,10 L 47,10 L 47,11 L 53,11' +
  ' L 53,10 L 55,10 L 55,9 L 57,9 L 57,7 L 59,7 L 59,5 Z';

/** Crater interior path (bowl shape, drawn behind mountain to show through cutout) */
export const CRATER_PATH =
  'M 41,5 L 41,7 L 43,7 L 43,9 L 45,9 L 45,10 L 47,10 L 47,11' +
  ' L 53,11 L 53,10 L 55,10 L 55,9 L 57,9 L 57,7 L 59,7 L 59,5 Z';

/** Sky stars (small pixel rects) */
export const STARS: { x: number; y: number; size: number; opacity: number; twinkle?: boolean }[] = [
  { x: 5, y: 3, size: 0.6, opacity: 0.9, twinkle: true },
  { x: 12, y: 7, size: 0.4, opacity: 0.6 },
  { x: 3, y: 15, size: 0.5, opacity: 0.7, twinkle: true },
  { x: 8, y: 22, size: 0.4, opacity: 0.5 },
  { x: 15, y: 10, size: 0.5, opacity: 0.8 },
  { x: 20, y: 4, size: 0.6, opacity: 0.7, twinkle: true },
  { x: 28, y: 8, size: 0.4, opacity: 0.6 },
  { x: 35, y: 2, size: 0.5, opacity: 0.9 },
  { x: 42, y: 1, size: 0.4, opacity: 0.5, twinkle: true },
  { x: 58, y: 1, size: 0.5, opacity: 0.7 },
  { x: 65, y: 2, size: 0.6, opacity: 0.8, twinkle: true },
  { x: 72, y: 8, size: 0.4, opacity: 0.6 },
  { x: 80, y: 4, size: 0.5, opacity: 0.9, twinkle: true },
  { x: 85, y: 10, size: 0.4, opacity: 0.5 },
  { x: 88, y: 7, size: 0.5, opacity: 0.7 },
  { x: 92, y: 3, size: 0.6, opacity: 0.8, twinkle: true },
  { x: 95, y: 15, size: 0.4, opacity: 0.6 },
  { x: 97, y: 6, size: 0.5, opacity: 0.7 },
  { x: 7, y: 30, size: 0.4, opacity: 0.4 },
  { x: 93, y: 25, size: 0.4, opacity: 0.5, twinkle: true },
];

/** Background mountain silhouettes for depth */
export const BG_MOUNTAINS: { points: string; fill: string; opacity: number }[] = [
  {
    points: '0,96 0,70 5,65 10,68 18,58 25,62 30,55 38,60 42,96',
    fill: '#0d0d1a',
    opacity: 0.6,
  },
  {
    points: '58,96 62,60 68,55 75,58 80,50 85,54 90,48 95,55 97,60 100,65 100,96',
    fill: '#0d0d1a',
    opacity: 0.5,
  },
];

/** Pixel texture blocks scattered across the mountain body */
export const PIXEL_BLOCKS: { x: number; y: number; w: number; h: number; color: string; opacity: number }[] = [
  // Base zone (dark blue-purple)
  { x: 22, y: 85, w: 2, h: 1, color: '#1e1e3a', opacity: 0.7 },
  { x: 32, y: 82, w: 1.5, h: 1, color: '#252545', opacity: 0.6 },
  { x: 55, y: 86, w: 2, h: 1, color: '#1e1e3a', opacity: 0.7 },
  { x: 70, y: 83, w: 1.5, h: 1, color: '#20204a', opacity: 0.5 },
  { x: 18, y: 78, w: 1, h: 1, color: '#252550', opacity: 0.6 },
  { x: 78, y: 76, w: 1.5, h: 1, color: '#1e1e3a', opacity: 0.6 },
  { x: 40, y: 80, w: 2, h: 1.5, color: '#232348', opacity: 0.5 },
  // Mid zone (transition)
  { x: 26, y: 65, w: 1.5, h: 1, color: '#2a2a50', opacity: 0.6 },
  { x: 45, y: 68, w: 2, h: 1, color: '#2d2d4e', opacity: 0.5 },
  { x: 65, y: 62, w: 1, h: 1.5, color: '#302a48', opacity: 0.6 },
  { x: 35, y: 58, w: 1.5, h: 1, color: '#332840', opacity: 0.5 },
  { x: 55, y: 55, w: 2, h: 1, color: '#352638', opacity: 0.6 },
  { x: 30, y: 50, w: 1, h: 1, color: '#382430', opacity: 0.5 },
  { x: 60, y: 48, w: 1.5, h: 1, color: '#3a2228', opacity: 0.6 },
  // Upper zone (dark red/maroon)
  { x: 40, y: 42, w: 1, h: 1, color: '#3d2020', opacity: 0.6 },
  { x: 55, y: 38, w: 1.5, h: 1, color: '#401a1a', opacity: 0.5 },
  { x: 45, y: 35, w: 1, h: 1.5, color: '#421818', opacity: 0.6 },
  { x: 50, y: 28, w: 1.5, h: 1, color: '#451515', opacity: 0.5 },
  { x: 48, y: 22, w: 1, h: 1, color: '#481212', opacity: 0.6 },
  { x: 52, y: 18, w: 1, h: 1, color: '#4a1010', opacity: 0.5 },
  // Extra scattered
  { x: 20, y: 72, w: 1, h: 1, color: '#222244', opacity: 0.4 },
  { x: 74, y: 68, w: 1, h: 1, color: '#252540', opacity: 0.4 },
  { x: 50, y: 75, w: 2, h: 1, color: '#202042', opacity: 0.5 },
  { x: 38, y: 45, w: 1, h: 1, color: '#3b2228', opacity: 0.4 },
  { x: 62, y: 42, w: 1.5, h: 1, color: '#3e2020', opacity: 0.4 },
  { x: 43, y: 30, w: 1, h: 1, color: '#461414', opacity: 0.5 },
  { x: 57, y: 25, w: 1, h: 1, color: '#471313', opacity: 0.4 },
  { x: 34, y: 72, w: 1.5, h: 1, color: '#282848', opacity: 0.5 },
  { x: 66, y: 58, w: 1, h: 1.5, color: '#322640', opacity: 0.4 },
  { x: 24, y: 55, w: 1, h: 1, color: '#2e2a4a', opacity: 0.5 },
];

/** Horizontal strata/geological layer lines */
export const STRATA: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [
  { x1: 14, y1: 85, x2: 86, y2: 85, color: '#1a1a35' },
  { x1: 18, y1: 75, x2: 82, y2: 75, color: '#1e1e3a' },
  { x1: 20, y1: 65, x2: 80, y2: 65, color: '#222245' },
  { x1: 22, y1: 55, x2: 78, y2: 55, color: '#262640' },
  { x1: 26, y1: 45, x2: 74, y2: 45, color: '#2a2240' },
  { x1: 28, y1: 35, x2: 72, y2: 35, color: '#302035' },
  { x1: 32, y1: 25, x2: 68, y2: 25, color: '#361e2a' },
  { x1: 36, y1: 18, x2: 64, y2: 18, color: '#3e1a22' },
];

/** Left lava stream rects (flowing from crater over left rim and down slope) */
export const LEFT_LAVA: { x: number; y: number; w: number; h: number; delay: number }[] = [
  { x: 43.5, y: 7.5, w: 1.2, h: 2, delay: 0 },
  { x: 41, y: 10, w: 1, h: 1.5, delay: 0.3 },
  { x: 39, y: 13, w: 1, h: 2, delay: 0.5 },
  { x: 37, y: 17, w: 1, h: 2, delay: 0.8 },
  { x: 35, y: 21, w: 0.8, h: 2, delay: 1.0 },
  { x: 33, y: 25, w: 0.8, h: 2, delay: 1.3 },
  { x: 31, y: 29, w: 0.8, h: 2, delay: 1.5 },
  { x: 29, y: 35, w: 0.6, h: 1.5, delay: 1.8 },
  { x: 27, y: 40, w: 0.5, h: 1, delay: 2.0 },
  { x: 25, y: 47, w: 0.5, h: 0.8, delay: 2.2 },
];

/** Right lava stream rects (flowing from crater over right rim and down slope) */
export const RIGHT_LAVA: { x: number; y: number; w: number; h: number; delay: number }[] = [
  { x: 55.5, y: 7.5, w: 1.2, h: 2, delay: 0.2 },
  { x: 59, y: 10, w: 1, h: 1.5, delay: 0.4 },
  { x: 61, y: 13, w: 1, h: 2, delay: 0.7 },
  { x: 63, y: 17, w: 1, h: 2, delay: 0.9 },
  { x: 65, y: 21, w: 0.8, h: 2, delay: 1.1 },
  { x: 67, y: 25, w: 0.8, h: 2, delay: 1.4 },
  { x: 69, y: 29, w: 0.8, h: 2, delay: 1.6 },
  { x: 71, y: 35, w: 0.6, h: 1.5, delay: 1.9 },
  { x: 73, y: 40, w: 0.5, h: 1, delay: 2.1 },
  { x: 75, y: 47, w: 0.5, h: 0.8, delay: 2.3 },
];

/** Ember/spark particles rising from crater */
export const EMBERS: { cx: number; cy: number; r: number; driftX: number; driftY: number; dur: number }[] = [
  { cx: 47, cy: 6, r: 0.4, driftX: -3, driftY: -6, dur: 3 },
  { cx: 49, cy: 5, r: 0.5, driftX: -1, driftY: -7, dur: 3.5 },
  { cx: 50, cy: 7, r: 0.35, driftX: 0, driftY: -8, dur: 4 },
  { cx: 51, cy: 5, r: 0.45, driftX: 1, driftY: -7, dur: 3.2 },
  { cx: 53, cy: 6, r: 0.3, driftX: 3, driftY: -6, dur: 2.8 },
  { cx: 48, cy: 8, r: 0.4, driftX: -2, driftY: -9, dur: 4.2 },
  { cx: 52, cy: 8, r: 0.35, driftX: 2, driftY: -8, dur: 3.8 },
  { cx: 50, cy: 6, r: 0.5, driftX: 0.5, driftY: -10, dur: 4.5 },
];

/** Base rock blocks at the foot of the volcano */
export const BASE_ROCKS: { x: number; y: number; w: number; h: number }[] = [
  { x: 14, y: 93, w: 3, h: 2 },
  { x: 28, y: 94, w: 2, h: 1.5 },
  { x: 42, y: 93.5, w: 2.5, h: 2 },
  { x: 56, y: 94, w: 2, h: 1.5 },
  { x: 72, y: 93, w: 3, h: 2 },
  { x: 84, y: 94, w: 2, h: 1.5 },
];

/** Smoke/ash clouds rising from crater */
export const SMOKE_CLOUDS: { cx: number; cy: number; rx: number; ry: number; opacity: number; dur: number }[] = [
  { cx: 48, cy: 2, rx: 3, ry: 1.5, opacity: 0.12, dur: 6 },
  { cx: 52, cy: 0.5, rx: 4, ry: 2, opacity: 0.10, dur: 7 },
  { cx: 50, cy: -1, rx: 5, ry: 2, opacity: 0.07, dur: 8 },
  { cx: 46, cy: -2, rx: 3.5, ry: 1.5, opacity: 0.05, dur: 9 },
];

/** Glowing volcanic cracks/fissures on upper slopes */
export const VOLCANIC_CRACKS: { d: string; color: string; opacity: number }[] = [
  { d: 'M 42,12 L 40,16 L 39,20', color: '#ff4500', opacity: 0.3 },
  { d: 'M 58,12 L 60,16 L 61,19', color: '#ff4500', opacity: 0.3 },
  { d: 'M 44,14 L 43,18', color: '#ff6b35', opacity: 0.25 },
  { d: 'M 56,14 L 57,17', color: '#ff6b35', opacity: 0.25 },
];
