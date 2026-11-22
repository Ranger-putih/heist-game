// The Quiet Vault — the CCTV cameras.
// A camera never moves: it sweeps its cone back and forth and raises the
// alarm the moment the thief is inside it, unless an EMP has shut it down.

import {
  CAMERA_VIEW_RANGE,
  CAMERA_VIEW_HALF_ANGLE,
  CAMERA_SWEEP_SPEED,
} from './config.js';
import { canSpot, pointInShadow } from './world.js';

export function createCamera(mount) {
  return {
    name: mount.name,
    x: mount.x,
    y: mount.y,
    baseAngle: mount.baseAngle,
    sweep: mount.sweep,
    angle: mount.baseAngle,
    sweepPhase: mount.baseAngle === Math.PI / 2 ? 0 : 1.3,
    disabledSeconds: 0,
  };
}

export function updateCamera(camera, dt) {
  if (camera.disabledSeconds > 0) {
    camera.disabledSeconds = Math.max(0, camera.disabledSeconds - dt);
    return { seen: false };
  }
  camera.sweepPhase += CAMERA_SWEEP_SPEED * dt;
  camera.angle = camera.baseAngle + Math.sin(camera.sweepPhase) * camera.sweep;
  return { seen: false };
}

export function cameraSpotsPlayer(camera, player, world) {
  if (camera.disabledSeconds > 0 || player.state !== 'playing') return false;
  const hidden = pointInShadow(world, player.x, player.y);
  const range = hidden ? CAMERA_VIEW_RANGE * 0.55 : CAMERA_VIEW_RANGE;
  return canSpot(
    world,
    camera.x,
    camera.y,
    camera.angle,
    CAMERA_VIEW_HALF_ANGLE,
    range,
    player.x,
    player.y,
  );
}

export function disableCameras(cameras, seconds) {
  for (const camera of cameras) camera.disabledSeconds = seconds;
}
