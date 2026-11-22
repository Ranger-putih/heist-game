// The Quiet Vault — shared tuning numbers and palette.
// One file holds every magic number so the rest of the game reads like a
// description of the heist instead of a pile of literals.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HUD_HEIGHT = 46;

export const PLAYER_RADIUS = 13;
export const PLAYER_SPEED = 178;
export const SNEAK_SPEED = 96;
export const PICKUP_RADIUS = 34;
export const CATCH_DISTANCE = 21;

export const GUARD_PATROL_SPEED = 74;
export const GUARD_CHASE_SPEED = 154;
export const GUARD_VIEW_RANGE = 228;
export const GUARD_VIEW_HALF_ANGLE = Math.PI / 5.2;
export const GUARD_SUSPICION_RATE = 1.15;
export const GUARD_SUSPICION_DECAY = 0.45;

export const CAMERA_VIEW_RANGE = 268;
export const CAMERA_VIEW_HALF_ANGLE = Math.PI / 6;
export const CAMERA_SWEEP_SPEED = 0.55;

export const ALARM_RISE_GUARD = 24;
export const ALARM_RISE_CAMERA = 32;
export const ALARM_FALL = 9;
export const ALARM_MAX = 100;

export const NOISE_MAKER_COUNT = 2;
export const NOISE_MAKER_RADIUS = 360;
export const EMP_COUNT = 1;
export const EMP_DURATION_SECONDS = 5;

export const PALETTE = {
  floor: '#23202b',
  floorDark: '#1c1923',
  floorTile: '#2a2733',
  wall: '#4a4457',
  wallTop: '#6b6480',
  cover: '#3d3a4d',
  coverTop: '#57536b',
  shadowZone: 'rgba(8, 6, 14, 0.55)',
  hudBar: 'rgba(10, 8, 16, 0.88)',
  hudText: '#e8e2d4',
  hudDim: '#9a93a8',
  alarmLow: '#7fc97f',
  alarmMid: '#e0b13c',
  alarmHigh: '#e0483c',
  player: '#f2c14e',
  playerSneak: '#c9a13b',
  guard: '#e05a4e',
  guardCone: 'rgba(224, 90, 78, 0.20)',
  guardConeEdge: 'rgba(224, 90, 78, 0.55)',
  camera: '#7fb3e0',
  cameraCone: 'rgba(127, 179, 224, 0.20)',
  cameraConeEdge: 'rgba(127, 179, 224, 0.55)',
  cameraOff: '#5a5f6a',
  lootGold: '#ffd94a',
  lootDiamond: '#8fe3ff',
  lootDocs: '#f5f0dc',
  exit: '#58d68d',
  exitLocked: '#8a8578',
  noiseRing: '#e0b13c',
};
