// The Quiet Vault — everything the player sees.
// The whole arena is drawn every frame from the same state the game loop
// updates, so a screenshot is always a true picture of the live game.

import {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  HUD_HEIGHT,
  PALETTE,
  ALARM_MAX,
  GUARD_VIEW_RANGE,
  GUARD_VIEW_HALF_ANGLE,
  CAMERA_VIEW_RANGE,
  CAMERA_VIEW_HALF_ANGLE,
} from './config.js';

function drawCone(ctx, x, y, angle, halfAngle, range, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, world) {
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(0, HUD_HEIGHT, VIEW_WIDTH, VIEW_HEIGHT - HUD_HEIGHT);
  // Tile grid, for scale.
  ctx.strokeStyle = PALETTE.floorTile;
  ctx.lineWidth = 1;
  for (let x = 16; x < VIEW_WIDTH; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_HEIGHT);
    ctx.lineTo(x, VIEW_HEIGHT);
    ctx.stroke();
  }
  for (let y = HUD_HEIGHT; y < VIEW_HEIGHT; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_WIDTH, y);
    ctx.stroke();
  }
  // Room labels, faint, so the space reads as a bank at a glance.
  ctx.fillStyle = 'rgba(232, 226, 212, 0.20)';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RECORDS OFFICE', 218, 82);
  ctx.fillText('GOLD VAULT', 1062, 82);
  ctx.fillText('VAULT HALL', 640, 626);
  ctx.fillText('DIAMOND ROOM', 1132, 626);
  // Shadow zones: standing here makes the thief harder to spot.
  for (const zone of world.shadows) {
    ctx.fillStyle = PALETTE.shadowZone;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.fillStyle = 'rgba(232, 226, 212, 0.18)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('SHADOW', zone.x + zone.w / 2, zone.y + zone.h / 2);
  }
}

function drawBlock(ctx, rect, fill, top) {
  ctx.fillStyle = fill;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = top;
  ctx.fillRect(rect.x, rect.y, rect.w, 4);
}

function drawLoot(ctx, loot, now) {
  const bob = Math.sin(now / 300 + loot.x) * 3;
  const colors = { gold: PALETTE.lootGold, diamond: PALETTE.lootDiamond, documents: PALETTE.lootDocs };
  const color = colors[loot.kind];
  // Glow ring so the target reads from across the room.
  ctx.beginPath();
  ctx.arc(loot.x, loot.y + bob, 22, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.14;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(loot.x, loot.y + bob, 12, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#1c1923';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const glyph = loot.kind === 'gold' ? '$' : loot.kind === 'diamond' ? '◆' : '≡';
  ctx.fillText(glyph, loot.x, loot.y + bob + 0.5);
  ctx.fillStyle = color;
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText(loot.label.toUpperCase(), loot.x, loot.y + bob + 26);
}

function drawExit(ctx, world, lootTaken) {
  const zone = world.exitZone;
  const open = lootTaken >= 3;
  ctx.fillStyle = open ? PALETTE.exit : PALETTE.exitLocked;
  ctx.globalAlpha = open ? 0.9 : 0.55;
  ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  ctx.globalAlpha = 1;
  ctx.fillStyle = open ? '#0d2b18' : '#2b2820';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT — GO!' : 'EXIT LOCKED', zone.x + zone.w / 2, zone.y + zone.h / 2 + 1);
}

function drawGuard(ctx, guard) {
  drawCone(
    ctx,
    guard.x,
    guard.y,
    guard.facing,
    GUARD_VIEW_HALF_ANGLE,
    GUARD_VIEW_RANGE,
    guard.state === 'chase' ? 'rgba(224, 90, 78, 0.30)' : PALETTE.guardCone,
    PALETTE.guardConeEdge,
  );
  // Body: a dark uniform with a red cap.
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, guard.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#2e2a38';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = PALETTE.guard;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.guard;
  ctx.fill();
  // Facing tick.
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(
    guard.x + Math.cos(guard.facing) * (guard.radius + 7),
    guard.y + Math.sin(guard.facing) * (guard.radius + 7),
  );
  ctx.strokeStyle = PALETTE.guard;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Suspicion mark.
  if (guard.state === 'suspicious' || guard.state === 'investigate') {
    ctx.fillStyle = '#ffd94a';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', guard.x, guard.y - guard.radius - 8);
  } else if (guard.state === 'chase') {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', guard.x, guard.y - guard.radius - 8);
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(guard.name.toUpperCase(), guard.x, guard.y + guard.radius + 12);
}

function drawCamera(ctx, camera) {
  const off = camera.disabledSeconds > 0;
  if (!off) {
    drawCone(
      ctx,
      camera.x,
      camera.y,
      camera.angle,
      CAMERA_VIEW_HALF_ANGLE,
      CAMERA_VIEW_RANGE,
      PALETTE.cameraCone,
      PALETTE.cameraConeEdge,
    );
  }
  // Mount + lens.
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = off ? PALETTE.cameraOff : PALETTE.camera;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(camera.x, camera.y);
  ctx.lineTo(
    camera.x + Math.cos(camera.angle) * 16,
    camera.y + Math.sin(camera.angle) * 16,
  );
  ctx.strokeStyle = off ? PALETTE.cameraOff : PALETTE.camera;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = off ? '#8a8578' : PALETTE.camera;
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  const labelY = camera.y < 100 ? camera.y + 26 : camera.y - 16;
  ctx.fillText(off ? `${camera.name} OFF` : camera.name, camera.x, labelY);
}

function drawPlayer(ctx, player, now) {
  const sneaking = player.sneaking;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#1c1923';
  ctx.stroke();
  // Hooded head.
  ctx.beginPath();
  ctx.arc(player.x, player.y, 5.5, 0, Math.PI * 2);
  ctx.fillStyle = '#1c1923';
  ctx.fill();
  // Direction tick.
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(
    player.x + Math.cos(player.facing) * (player.radius + 6),
    player.y + Math.sin(player.facing) * (player.radius + 6),
  );
  ctx.strokeStyle = sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.lineWidth = 2;
  ctx.stroke();
  // Sneak ripple.
  if (sneaking) {
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4 + Math.sin(now / 200) * 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(242, 193, 78, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('THIEF', player.x, player.y + player.radius + 12);
}

function drawNoisePing(ctx, ping, now) {
  if (!ping) return;
  const age = (now - ping.born) / 1000;
  const radius = 12 + age * 90;
  ctx.beginPath();
  ctx.arc(ping.x, ping.y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = PALETTE.noiseRing;
  ctx.globalAlpha = Math.max(0, 0.8 - age * 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function alarmColor(alarm) {
  if (alarm < 40) return PALETTE.alarmLow;
  if (alarm < 70) return PALETTE.alarmMid;
  return PALETTE.alarmHigh;
}

function drawHud(ctx, state) {
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('THE QUIET VAULT', 16, HUD_HEIGHT / 2 + 1);

  // Alarm meter.
  const meterX = 250;
  const meterW = 320;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('ALARM', meterX, HUD_HEIGHT / 2 + 1);
  ctx.fillStyle = '#14101c';
  ctx.fillRect(meterX + 56, 13, meterW, 20);
  ctx.fillStyle = alarmColor(state.alarm);
  ctx.fillRect(meterX + 56, 13, meterW * (state.alarm / ALARM_MAX), 20);
  ctx.strokeStyle = 'rgba(232, 226, 212, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(meterX + 56, 13, meterW, 20);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(`${Math.round(state.alarm)}%`, meterX + 56 + meterW + 10, HUD_HEIGHT / 2 + 1);

  // Loot, tools, timer.
  const right = VIEW_WIDTH - 16;
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.lootGold;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(`◆ LOOT ${state.lootTaken}/3`, right - 330, HUD_HEIGHT / 2 + 1);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(`Noise ×${state.noiseMakers}  [Q]`, right - 210, HUD_HEIGHT / 2 + 1);
  ctx.fillText(`EMP ×${state.emps}  [F]`, right - 110, HUD_HEIGHT / 2 + 1);
  const minutes = Math.floor(state.elapsedSeconds / 60);
  const seconds = Math.floor(state.elapsedSeconds % 60);
  ctx.fillText(`${minutes}:${String(seconds).padStart(2, '0')}`, right, HUD_HEIGHT / 2 + 1);
}

function drawIntroBanner(ctx, state) {
  if (state.elapsedSeconds > 6 || state.phase !== 'playing') return;
  ctx.fillStyle = 'rgba(10, 8, 16, 0.72)';
  ctx.fillRect(340, 140, 600, 64);
  ctx.strokeStyle = 'rgba(232, 226, 212, 0.4)';
  ctx.strokeRect(340, 140, 600, 64);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Grab all 3 loot, then slip out the green exit.', 640, 164);
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.fillText('WASD move · Shift sneak · E grab · Q noise-maker · F EMP · click throws a noise-maker', 640, 186);
}

function drawEndScreen(ctx, state) {
  const won = state.phase === 'won';
  ctx.fillStyle = won ? 'rgba(13, 43, 24, 0.82)' : 'rgba(43, 10, 8, 0.82)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(won ? 'CLEAN GETAWAY' : 'CAUGHT!', VIEW_WIDTH / 2, 300);
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillText(
    won
      ? `All 3 loot in ${Math.floor(state.elapsedSeconds / 60)}:${String(Math.floor(state.elapsedSeconds % 60)).padStart(2, '0')} — the vault never knew you were there.`
      : state.caughtReason,
    VIEW_WIDTH / 2,
    348,
  );
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText('Press R to run it again', VIEW_WIDTH / 2, 392);
}

export function renderGame(ctx, state, now) {
  const { world } = state;
  drawFloor(ctx, world);
  for (const wall of world.walls) drawBlock(ctx, wall, PALETTE.wall, PALETTE.wallTop);
  for (const safe of world.cover) drawBlock(ctx, safe, PALETTE.cover, PALETTE.coverTop);
  drawExit(ctx, world, state.lootTaken);
  for (const loot of state.loot) {
    if (!loot.taken) drawLoot(ctx, loot, now);
  }
  for (const camera of state.cameras) drawCamera(ctx, camera);
  for (const guard of state.guards) drawGuard(ctx, guard);
  drawPlayer(ctx, state.player, now);
  drawNoisePing(ctx, state.noisePing, now);
  drawHud(ctx, state);
  drawIntroBanner(ctx, state);
  if (state.phase === 'won' || state.phase === 'caught') drawEndScreen(ctx, state);
}
