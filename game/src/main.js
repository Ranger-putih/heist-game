// The Quiet Vault — the game loop and the rules of the heist.
// Wires input, guards, cameras, alarm, loot, tools and the win/caught
// screens together. The arena, the cones and the HUD are all live from the
// first frame: there is no title screen covering the room.

import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SNEAK_SPEED,
  PICKUP_RADIUS,
  CATCH_DISTANCE,
  ALARM_RISE_GUARD,
  ALARM_RISE_CAMERA,
  ALARM_FALL,
  ALARM_MAX,
  NOISE_MAKER_COUNT,
  EMP_COUNT,
  EMP_DURATION_SECONDS,
} from './config.js';
import { createInput } from './input.js';
import { createWorld, moveCircle } from './world.js';
import { createGuard, updateGuard } from './guards.js';
import { createCamera, updateCamera, cameraSpotsPlayer, disableCameras } from './cameras.js';
import { createVaultAudio } from './audio.js';
import { renderGame } from './render.js';

function freshState(world) {
  return {
    world,
    phase: 'playing', // playing | won | caught
    caughtReason: '',
    elapsedSeconds: 0,
    alarm: 0,
    lootTaken: 0,
    noiseMakers: NOISE_MAKER_COUNT,
    emps: EMP_COUNT,
    noisePing: null,
    player: {
      x: world.playerStart.x,
      y: world.playerStart.y,
      radius: PLAYER_RADIUS,
      facing: -Math.PI / 2,
      sneaking: false,
      state: 'playing',
    },
    loot: world.lootSpots.map((spot) => ({ ...spot, taken: false })),
    guards: world.guardRoutes.map((route, i) => createGuard(route, i)),
    cameras: world.cameraMounts.map((mount) => createCamera(mount)),
  };
}

function throwNoiseMaker(state, x, y, audio) {
  if (state.noiseMakers <= 0 || state.phase !== 'playing') return;
  state.noiseMakers -= 1;
  state.noisePing = { x, y, born: performance.now() };
  audio.noiseThrow();
}

function fireEmp(state, audio) {
  if (state.emps <= 0 || state.phase !== 'playing') return;
  state.emps -= 1;
  disableCameras(state.cameras, EMP_DURATION_SECONDS);
  audio.emp();
}

function tryGrabLoot(state, audio) {
  if (state.phase !== 'playing') return;
  for (const loot of state.loot) {
    if (loot.taken) continue;
    const dist = Math.hypot(loot.x - state.player.x, loot.y - state.player.y);
    if (dist <= PICKUP_RADIUS) {
      loot.taken = true;
      state.lootTaken += 1;
      audio.pickup();
      return;
    }
  }
}

function playerInExit(state) {
  const zone = state.world.exitZone;
  const p = state.player;
  return (
    p.x >= zone.x && p.x <= zone.x + zone.w &&
    p.y >= zone.y - 4 && p.y <= zone.y + zone.h
  );
}

function updatePlaying(state, dt, input, audio, now) {
  const player = state.player;
  player.state = 'playing';
  state.elapsedSeconds += dt;

  // Movement.
  const move = input.moveVector();
  player.sneaking = input.sneaking();
  const speed = player.sneaking ? SNEAK_SPEED : PLAYER_SPEED;
  if (move.x !== 0 || move.y !== 0) {
    player.facing = Math.atan2(move.y, move.x);
    const moved = moveCircle(
      state.world,
      player.x,
      player.y,
      player.radius,
      move.x * speed * dt,
      move.y * speed * dt,
    );
    player.x = moved.x;
    player.y = moved.y;
  }

  // Tools: Q or a click throws a noise-maker at the mouse; F fires the EMP.
  if (input.justPressed('q')) {
    const target = input.mouse.inside
      ? { x: input.mouse.x, y: input.mouse.y }
      : { x: player.x + Math.cos(player.facing) * 120, y: player.y + Math.sin(player.facing) * 120 };
    throwNoiseMaker(state, target.x, target.y, audio);
  }
  for (const click of input.clicks) {
    throwNoiseMaker(state, click.x, click.y, audio);
  }
  if (input.justPressed('f')) fireEmp(state, audio);
  if (input.justPressed('e')) tryGrabLoot(state, audio);

  // The noise ping only needs to live long enough for every guard to hear it.
  if (state.noisePing && now - state.noisePing.born > 400) state.noisePing = null;

  // Guards and cameras.
  let spottedByGuard = false;
  let guardTouching = false;
  for (const guard of state.guards) {
    const result = updateGuard(guard, dt, player, state.world, state.noisePing);
    if (result.seen && guard.suspicion > 0.6) spottedByGuard = true;
    if (guard.state === 'chase') spottedByGuard = true;
    if (result.distToPlayer <= CATCH_DISTANCE) guardTouching = true;
  }
  let spottedByCamera = false;
  for (const camera of state.cameras) {
    updateCamera(camera, dt);
    if (cameraSpotsPlayer(camera, player, state.world)) spottedByCamera = true;
  }

  // The alarm climbs while anyone can see the thief, and drains in hiding.
  if (spottedByGuard) state.alarm += ALARM_RISE_GUARD * dt;
  if (spottedByCamera) state.alarm += ALARM_RISE_CAMERA * dt;
  if (!spottedByGuard && !spottedByCamera) state.alarm -= ALARM_FALL * dt;
  state.alarm = Math.max(0, Math.min(ALARM_MAX, state.alarm));
  audio.setTension(state.alarm / ALARM_MAX + (spottedByGuard ? 0.25 : 0));

  // Caught, or clean away.
  if (guardTouching) {
    state.phase = 'caught';
    state.caughtReason = 'A guard laid hands on the thief in the hall.';
    audio.caught();
  } else if (state.alarm >= ALARM_MAX) {
    state.phase = 'caught';
    state.caughtReason = 'The alarm hit 100% — the bank locked down with the thief inside.';
    audio.caught();
  } else if (state.lootTaken >= 3 && playerInExit(state)) {
    state.phase = 'won';
    audio.getaway();
  }
}

export function startQuietVault() {
  const canvas = document.getElementById('game');
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const audio = createVaultAudio();
  const world = createWorld();
  let state = freshState(world);

  window.addEventListener('keydown', () => audio.unlock());
  canvas.addEventListener('click', () => audio.unlock());

  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;

    if (state.phase === 'playing') {
      updatePlaying(state, dt, input, audio, now);
    } else if (input.justPressed('r')) {
      state = freshState(world);
    }
    input.endFrame();

    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    renderGame(ctx, state, now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

startQuietVault();
