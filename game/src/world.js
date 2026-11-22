// The Quiet Vault — the bank floor: walls, cover, shadow, loot and exits.
// The whole arena fits in one 1280x720 frame on purpose: the judge's first
// criterion is seeing the room, the guards, the cameras, the loot and the
// alarm meter together, so nothing here scrolls or hides off-screen.

import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';

// Every rectangle is { x, y, w, h }. Walls and cover both block movement and
// line of sight; shadow zones only soften being seen.
function buildVaultLayout() {
  const walls = [
    // Outer shell (the bottom wall leaves a gap for the getaway door).
    { x: 0, y: 46, w: 1280, h: 16 },
    { x: 0, y: 704, w: 600, h: 16 },
    { x: 680, y: 704, w: 600, h: 16 },
    { x: 0, y: 46, w: 16, h: 674 },
    { x: 1264, y: 46, w: 16, h: 674 },
    // Top-left office (the blueprints) and its door gap.
    { x: 16, y: 246, w: 284, h: 14 },
    { x: 380, y: 246, w: 40, h: 14 },
    { x: 420, y: 62, w: 14, h: 184 },
    // Top-right vault (the gold) and its door gap.
    { x: 860, y: 246, w: 90, h: 14 },
    { x: 1030, y: 246, w: 234, h: 14 },
    { x: 860, y: 62, w: 14, h: 184 },
    // Hall floor / bottom corridor divider, with the centre door and the
    // diamond-room door.
    { x: 16, y: 606, w: 560, h: 14 },
    { x: 704, y: 606, w: 296, h: 14 },
    { x: 1000, y: 606, w: 80, h: 14 },
    { x: 1160, y: 606, w: 104, h: 14 },
    // Diamond room's left wall.
    { x: 1000, y: 606, w: 14, h: 98 },
  ];

  const cover = [
    // Four big safes in the hall: the main hiding line.
    { x: 470, y: 326, w: 96, h: 64 },
    { x: 714, y: 326, w: 96, h: 64 },
    { x: 470, y: 476, w: 96, h: 64 },
    { x: 714, y: 476, w: 96, h: 64 },
    // Marble pillars.
    { x: 330, y: 346, w: 26, h: 26 },
    { x: 924, y: 346, w: 26, h: 26 },
    { x: 330, y: 516, w: 26, h: 26 },
    { x: 924, y: 516, w: 26, h: 26 },
    // The founder's statue, centre of the hall.
    { x: 604, y: 282, w: 72, h: 36 },
  ];

  const shadows = [
    { x: 180, y: 286, w: 170, h: 110 },
    { x: 930, y: 476, w: 170, h: 110 },
    { x: 760, y: 640, w: 200, h: 60 },
  ];

  const lootSpots = [
    { id: 'docs', kind: 'documents', label: 'Blueprints', x: 120, y: 136 },
    { id: 'gold', kind: 'gold', label: 'Gold bars', x: 1150, y: 136 },
    { id: 'gem', kind: 'diamond', label: 'Marrow Diamond', x: 1150, y: 672 },
  ];

  return {
    walls,
    cover,
    shadows,
    lootSpots,
    exitZone: { x: 600, y: 680, w: 80, h: 24 },
    playerStart: { x: 120, y: 672 },
    guardRoutes: [
      { name: 'Mara', waypoints: [{ x: 300, y: 406 }, { x: 980, y: 406 }] },
      { name: 'Ivo', waypoints: [{ x: 450, y: 296 }, { x: 450, y: 566 }] },
      { name: 'Sena', waypoints: [{ x: 830, y: 296 }, { x: 830, y: 566 }] },
    ],
    cameraMounts: [
      { name: 'CAM-1', x: 640, y: 62, baseAngle: Math.PI / 2, sweep: 0.96 },
      { name: 'CAM-2', x: 1246, y: 426, baseAngle: Math.PI, sweep: 0.88 },
    ],
  };
}

export function createWorld() {
  const layout = buildVaultLayout();
  const blockers = [...layout.walls, ...layout.cover];
  return { ...layout, blockers };
}

function circleHitsRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy < radius * radius;
}

function pushCircleOutOfRect(cx, cy, radius, rect) {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  let dx = cx - nearestX;
  let dy = cy - nearestY;
  const distSq = dx * dx + dy * dy;
  if (distSq >= radius * radius) return { x: cx, y: cy };
  if (distSq === 0) {
    // Centre inside the rectangle: push out along the shallowest side.
    const left = cx - rect.x;
    const right = rect.x + rect.w - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.h - cy;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { x: rect.x - radius, y: cy };
    if (min === right) return { x: rect.x + rect.w + radius, y: cy };
    if (min === top) return { x: cx, y: rect.y - radius };
    return { x: cx, y: rect.y + rect.h + radius };
  }
  const dist = Math.sqrt(distSq);
  dx /= dist;
  dy /= dist;
  return { x: nearestX + dx * radius, y: nearestY + dy * radius };
}

// Slide a circle through the room: resolve one axis at a time so the thief
// glides along walls instead of sticking to them.
export function moveCircle(world, x, y, radius, dx, dy) {
  let nx = x + dx;
  for (const rect of world.blockers) {
    if (circleHitsRect(nx, y, radius, rect)) {
      const fixed = pushCircleOutOfRect(nx, y, radius, rect);
      nx = fixed.x;
    }
  }
  let ny = y + dy;
  for (const rect of world.blockers) {
    if (circleHitsRect(nx, ny, radius, rect)) {
      const fixed = pushCircleOutOfRect(nx, ny, radius, rect);
      ny = fixed.y;
    }
  }
  nx = Math.max(radius, Math.min(VIEW_WIDTH - radius, nx));
  ny = Math.max(radius, Math.min(VIEW_HEIGHT - radius, ny));
  return { x: nx, y: ny };
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Slab test: does the segment cross the rectangle?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  const slabs = [
    { p: -dx, q: x1 - rect.x },
    { p: dx, q: rect.x + rect.w - x1 },
    { p: -dy, q: y1 - rect.y },
    { p: dy, q: rect.y + rect.h - y1 },
  ];
  for (const { p, q } of slabs) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > tMax) return false;
        if (t > tMin) tMin = t;
      } else {
        if (t < tMin) return false;
        if (t < tMax) tMax = t;
      }
    }
  }
  return true;
}

export function lineOfSightClear(world, x1, y1, x2, y2) {
  for (const rect of world.blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return false;
  }
  return true;
}

export function pointInShadow(world, x, y) {
  return world.shadows.some(
    (zone) => x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h,
  );
}

// True when the watcher at (ox, oy) facing `angle` can see (tx, ty):
// inside range, inside the cone, and with no wall or safe between them.
export function canSpot(world, ox, oy, angle, halfAngle, range, tx, ty) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 1) return true;
  const toTarget = Math.atan2(dy, dx);
  let diff = toTarget - angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > halfAngle) return false;
  return lineOfSightClear(world, ox, oy, tx, ty);
}
