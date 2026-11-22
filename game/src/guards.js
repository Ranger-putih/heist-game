// The Quiet Vault — the three night guards.
// Each guard walks a patrol route, grows suspicious when the thief crosses
// their vision cone, gives chase when sure, and investigates a noise-maker
// ping. A "?" floats over a suspicious guard, a "!" over a chasing one.

import {
  GUARD_PATROL_SPEED,
  GUARD_CHASE_SPEED,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  GUARD_SUSPICION_RATE,
  GUARD_SUSPICION_DECAY,
} from './config.js';
import { canSpot, moveCircle, pointInShadow } from './world.js';

export function createGuard(route, index) {
  const first = route.waypoints[0];
  const second = route.waypoints[1];
  return {
    name: route.name,
    route,
    x: first.x,
    y: first.y,
    facing: Math.atan2(second.y - first.y, second.x - first.x),
    waypointIndex: 1,
    state: 'patrol', // patrol | suspicious | chase | investigate | return
    suspicion: 0,
    lostSightSeconds: 0,
    investigateTarget: null,
    investigateSeconds: 0,
    pauseSeconds: 0,
    radius: 14,
    index,
  };
}

function stepToward(guard, targetX, targetY, speed, dt, world) {
  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const moved = moveCircle(world, guard.x, guard.y, guard.radius, (dx / dist) * step, (dy / dist) * step);
  guard.x = moved.x;
  guard.y = moved.y;
  guard.facing = Math.atan2(dy, dx);
  return dist <= step + 1;
}

export function updateGuard(guard, dt, player, world, noisePing) {
  const distToPlayer = Math.hypot(player.x - guard.x, player.y - guard.y);
  const hidden = pointInShadow(world, player.x, player.y);
  const seenRange = hidden ? GUARD_VIEW_RANGE * 0.55 : GUARD_VIEW_RANGE;
  const seen = canSpot(
    world,
    guard.x,
    guard.y,
    guard.facing,
    GUARD_VIEW_HALF_ANGLE,
    seenRange,
    player.x,
    player.y,
  );

  // A fresh noise ping pulls every guard in earshot toward it.
  if (noisePing && guard.state !== 'chase') {
    const pingDist = Math.hypot(noisePing.x - guard.x, noisePing.y - guard.y);
    if (pingDist < 360) {
      guard.state = 'investigate';
      guard.investigateTarget = { x: noisePing.x, y: noisePing.y };
      guard.investigateSeconds = 0;
      guard.suspicion = Math.max(guard.suspicion, 0.35);
    }
  }

  if (seen && player.state === 'playing') {
    // Nearer, running and lit: spotted fast. Sneaking in shadow: barely.
    let rate = GUARD_SUSPICION_RATE;
    if (distToPlayer < 90) rate *= 1.6;
    if (player.sneaking) rate *= 0.45;
    if (hidden) rate *= 0.5;
    guard.suspicion = Math.min(1, guard.suspicion + rate * dt);
    guard.lostSightSeconds = 0;
    if (guard.suspicion >= 1) {
      guard.state = 'chase';
    } else if (guard.state === 'patrol' || guard.state === 'return') {
      guard.state = 'suspicious';
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD_SUSPICION_DECAY * dt);
    if (guard.state === 'suspicious' && guard.suspicion <= 0.05) {
      guard.state = 'patrol';
    }
  }

  switch (guard.state) {
    case 'patrol': {
      const target = guard.route.waypoints[guard.waypointIndex];
      if (stepToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt, world)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.route.waypoints.length;
      }
      break;
    }
    case 'suspicious': {
      // Freeze and stare at where the thief was glimpsed.
      guard.facing = Math.atan2(player.y - guard.y, player.x - guard.x);
      break;
    }
    case 'chase': {
      if (seen) {
        guard.lostSightSeconds = 0;
      } else {
        guard.lostSightSeconds += dt;
        if (guard.lostSightSeconds > 2.5) {
          guard.state = 'return';
          guard.suspicion = 0.5;
        }
      }
      stepToward(guard, player.x, player.y, GUARD_CHASE_SPEED, dt, world);
      break;
    }
    case 'investigate': {
      guard.investigateSeconds += dt;
      const arrived = stepToward(
        guard,
        guard.investigateTarget.x,
        guard.investigateTarget.y,
        GUARD_PATROL_SPEED * 1.35,
        dt,
        world,
      );
      if (arrived || guard.investigateSeconds > 4) {
        guard.pauseSeconds = 1.2;
        guard.state = 'return';
        guard.investigateTarget = null;
      }
      break;
    }
    case 'return': {
      if (guard.pauseSeconds > 0) {
        guard.pauseSeconds -= dt;
        break;
      }
      // Walk back to the nearest waypoint, then resume the route.
      let nearest = 0;
      let nearestDist = Infinity;
      guard.route.waypoints.forEach((point, i) => {
        const d = Math.hypot(point.x - guard.x, point.y - guard.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = i;
        }
      });
      const target = guard.route.waypoints[nearest];
      if (stepToward(guard, target.x, target.y, GUARD_PATROL_SPEED, dt, world)) {
        guard.waypointIndex = (nearest + 1) % guard.route.waypoints.length;
        guard.state = 'patrol';
      }
      break;
    }
    default:
      break;
  }

  return { seen, distToPlayer };
}

// A camera never moves: it sweeps its cone back and forth and raises the
// alarm the moment the thief is inside it, unless an EMP has shut it down.
