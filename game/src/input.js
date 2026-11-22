// The Quiet Vault — keyboard and mouse state.
// One small object owns every key and click so the game loop never touches
// the DOM directly: it asks this module what the player is doing.

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: 0, y: 0, inside: false };
  const clicks = [];

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    keys.add(event.key.toLowerCase());
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (event) => {
    const point = canvasPoint(event.clientX, event.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
    mouse.inside = true;
  });
  canvas.addEventListener('mouseleave', () => {
    mouse.inside = false;
  });
  canvas.addEventListener('click', (event) => {
    clicks.push(canvasPoint(event.clientX, event.clientY));
  });

  // A key pressed once this frame: consumed by whoever reads it, so a single
  // press never fires twice.
  const pressedOnce = new Set();
  window.addEventListener('keydown', (event) => {
    if (!event.repeat) pressedOnce.add(event.key.toLowerCase());
  });

  return {
    keys,
    mouse,
    clicks,
    pressed(key) {
      return keys.has(key.toLowerCase());
    },
    justPressed(key) {
      const k = key.toLowerCase();
      if (pressedOnce.has(k)) {
        pressedOnce.delete(k);
        return true;
      }
      return false;
    },
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    sneaking() {
      return keys.has('shift');
    },
    endFrame() {
      pressedOnce.clear();
      clicks.length = 0;
    },
  };
}
