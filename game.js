(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const lengthEl = document.getElementById("length");
  const applesEl = document.getElementById("apples");
  const statusEl = document.getElementById("status");
  const startBtn = document.getElementById("start");
  const shareBtn = document.getElementById("share");
  const dirButtons = [...document.querySelectorAll("[data-dir]")];

  const TILE_COUNT = 20;
  const START_LENGTH = 3;
  const TICK_MS = 110;
  const LOCAL_BEST_KEY = "snakesky_best_length";

  let snake = [];
  let direction = "right";
  let queuedDirection = "right";
  let apple = { x: 10, y: 10 };
  let score = 0;
  let running = false;
  let gameOver = false;
  let loopId = null;
  let lastRenderSize = 0;
  let best = Number(localStorage.getItem(LOCAL_BEST_KEY) || 0);

  let swipeStart = null;

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setStats() {
    lengthEl.textContent = String(snake.length);
    applesEl.textContent = String(score);
  }

  function resizeCanvas() {
    const size = Math.min(
      Math.floor(window.innerWidth * 0.92),
      560
    );

    const wrap = canvas.parentElement;
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastRenderSize = size;
    render();
  }

  function startGame() {
    snake = [
      { x: 5, y: 10 },
      { x: 4, y: 10 },
      { x: 3, y: 10 }
    ];

    direction = "right";
    queuedDirection = "right";
    score = 0;
    running = true;
    gameOver = false;

    placeApple();
    setStats();
    setStatus("Running. Stay sharp.");

    startBtn.textContent = "Restart";
    drawFrame();

    if (loopId) clearInterval(loopId);
    loopId = setInterval(tick, TICK_MS);
  }

  function endGame() {
    running = false;
    gameOver = true;

    clearInterval(loopId);
    loopId = null;

    if (snake.length > best) {
      best = snake.length;
      localStorage.setItem(LOCAL_BEST_KEY, String(best));
    }

    setStatus(`Game over. Best length: ${best}.`);
    startBtn.textContent = "Play Again";
    drawFrame(true);
  }

  function tick() {
    if (!running) return;

    direction = queuedDirection;

    const head = { ...snake[0] };

    if (direction === "up") head.y -= 1;
    if (direction === "down") head.y += 1;
    if (direction === "left") head.x -= 1;
    if (direction === "right") head.x += 1;

    if (
      head.x < 0 ||
      head.x >= TILE_COUNT ||
      head.y < 0 ||
      head.y >= TILE_COUNT
    ) {
      endGame();
      return;
    }

    const hitsSelf = snake.some(segment => segment.x === head.x && segment.y === head.y);
    if (hitsSelf) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (head.x === apple.x && head.y === apple.y) {
      score += 1;
      placeApple();
      setStatus(score === 1 ? "Nice start." : "Keep going.");
    } else {
      snake.pop();
    }

    setStats();
    drawFrame();
  }

  function placeApple() {
    let next;
    do {
      next = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
      };
    } while (snake.some(segment => segment.x === next.x && segment.y === next.y));

    apple = next;
  }

  function changeDirection(dir) {
    if (!running && !gameOver) return;

    const opposite = {
      up: "down",
      down: "up",
      left: "right",
      right: "left"
    };

    if (dir === opposite[direction]) return;

    queuedDirection = dir;
  }

  function getCellSize() {
    return lastRenderSize / TILE_COUNT;
  }

  function drawBackground(size) {
    ctx.clearRect(0, 0, size, size);

    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, "#07101f");
    bg.addColorStop(1, "#050816");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const cell = size / TILE_COUNT;

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#84bfff";
    ctx.lineWidth = 1;

    for (let i = 1; i < TILE_COUNT; i++) {
      const pos = i * cell;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }
    ctx.restore();
  }

  function roundedRect(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function drawApple(cell) {
    const size = getCellSize();
    const pad = Math.max(2, size * 0.14);
    const x = cell.x * size + pad;
    const y = cell.y * size + pad;
    const w = size - pad * 2;
    const h = size - pad * 2;

    const glow = ctx.createRadialGradient(
      x + w / 2,
      y + h / 2,
      2,
      x + w / 2,
      y + h / 2,
      w
    );
    glow.addColorStop(0, "rgba(255, 92, 122, 0.95)");
    glow.addColorStop(1, "rgba(255, 92, 122, 0.18)");

    ctx.save();
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cell.x * size + size / 2, cell.y * size + size / 2, size * 0.43, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff5c7a";
    ctx.beginPath();
    ctx.arc(cell.x * size + size / 2, cell.y * size + size / 2, size * 0.28, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#ffd2da";
    ctx.lineWidth = Math.max(1, size * 0.06);
    ctx.beginPath();
    ctx.moveTo(cell.x * size + size * 0.55, cell.y * size + size * 0.24);
    ctx.quadraticCurveTo(
      cell.x * size + size * 0.67,
      cell.y * size + size * 0.16,
      cell.x * size + size * 0.76,
      cell.y * size + size * 0.20
    );
    ctx.stroke();

    ctx.fillStyle = "#35d07f";
    ctx.beginPath();
    ctx.ellipse(
      cell.x * size + size * 0.72,
      cell.y * size + size * 0.22,
      size * 0.09,
      size * 0.05,
      -0.45,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }

  function drawSnake() {
    const size = getCellSize();
    const padding = Math.max(2, size * 0.13);

    snake.forEach((segment, index) => {
      const x = segment.x * size + padding;
      const y = segment.y * size + padding;
      const w = size - padding * 2;
      const h = size - padding * 2;

      const alpha = index === 0 ? 1 : Math.max(0.44, 1 - index * 0.03);

      const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
      gradient.addColorStop(0, `rgba(62, 166, 255, ${alpha})`);
      gradient.addColorStop(1, `rgba(124, 92, 255, ${alpha})`);

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.shadowColor = "rgba(62, 166, 255, 0.28)";
      ctx.shadowBlur = index === 0 ? 18 : 10;
      roundedRect(x, y, w, h, size * 0.24);
      ctx.fill();

      if (index === 0) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        const eyeSize = Math.max(1.5, size * 0.06);
        const eyeOffsetX = size * 0.23;
        const eyeOffsetY = size * 0.24;

        if (direction === "right" || direction === "left") {
          const leftEyeY = y + eyeOffsetY;
          const rightEyeY = y + h - eyeOffsetY - eyeSize * 2;
          const eyeX = direction === "right" ? x + w - eyeOffsetX : x + eyeOffsetX - eyeSize * 2;

          ctx.beginPath();
          ctx.arc(eyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
          ctx.arc(eyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const eyeX1 = x + eyeOffsetX;
          const eyeX2 = x + w - eyeOffsetX - eyeSize * 2;
          const eyeY = direction === "down" ? y + h - eyeOffsetY : y + eyeOffsetY - eyeSize * 2;

          ctx.beginPath();
          ctx.arc(eyeX1, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.arc(eyeX2, eyeY, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    });
  }

  function drawOverlay(size) {
    if (running) return;

    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 22, 0.34)";
    ctx.fillRect(0, 0, size, size);

    const centerX = size / 2;
    const centerY = size / 2;

    ctx.textAlign = "center";

    ctx.fillStyle = "rgba(255,255,255,0.96)";
    ctx.font = `700 ${Math.max(18, size * 0.055)}px Inter, system-ui, sans-serif`;
    ctx.fillText(gameOver ? "Game Over" : "Ready to play", centerX, centerY - size * 0.04);

    ctx.fillStyle = "rgba(244,247,255,0.72)";
    ctx.font = `500 ${Math.max(12, size * 0.03)}px Inter, system-ui, sans-serif`;
    ctx.fillText(
      gameOver ? "Tap Start Game to try again." : "Tap Start Game to begin.",
      centerX,
      centerY + size * 0.03
    );

    ctx.restore();
  }

  function drawFrame() {
    const size = lastRenderSize;
    if (!size) return;

    drawBackground(size);
    drawApple(apple);
    drawSnake();
    drawOverlay(size);
  }

  function buildShareText() {
    const apples = Math.max(0, snake.length - START_LENGTH);
    const url = window.location.href;

    return [
      `I ate ${apples} apples in SnakeSky.`,
      `Current length: ${snake.length}.`,
      ``,
      `Play here: ${url}`
    ].join("\n");
  }

  async function shareRun() {
    const text = buildShareText();

    try {
      if (navigator.share) {
        await navigator.share({
          title: "SnakeSky",
          text
        });
        setStatus("Share sheet opened.");
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setStatus("Share text copied to clipboard.");
        return;
      }

      const temp = document.createElement("textarea");
      temp.value = text;
      temp.setAttribute("readonly", "");
      temp.style.position = "absolute";
      temp.style.left = "-9999px";
      document.body.appendChild(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();

      setStatus("Share text copied to clipboard.");
    } catch (err) {
      console.error(err);
      setStatus("Could not share right now.");
    }
  }

  function onKeyDown(event) {
    const key = event.key.toLowerCase();

    if (key === "arrowup" || key === "w") changeDirection("up");
    if (key === "arrowdown" || key === "s") changeDirection("down");
    if (key === "arrowleft" || key === "a") changeDirection("left");
    if (key === "arrowright" || key === "d") changeDirection("right");

    if (key === "enter" && !running) startGame();
  }

  function addTouchControls() {
    canvas.addEventListener("pointerdown", (e) => {
      swipeStart = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener("pointerup", (e) => {
      if (!swipeStart) return;

      const dx = e.clientX - swipeStart.x;
      const dy = e.clientY - swipeStart.y;
      const threshold = 22;

      if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
        swipeStart = null;
        return;
      }

      if (Math.abs(dx) > Math.abs(dy)) {
        changeDirection(dx > 0 ? "right" : "left");
      } else {
        changeDirection(dy > 0 ? "down" : "up");
      }

      swipeStart = null;
    });

    canvas.addEventListener("pointercancel", () => {
      swipeStart = null;
    });
  }

  function bindUI() {
    startBtn.addEventListener("click", startGame);
    shareBtn.addEventListener("click", shareRun);

    dirButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = btn.getAttribute("data-dir");
        changeDirection(dir);
      });
    });

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", resizeCanvas);
  }

  bindUI();
  addTouchControls();
  resizeCanvas();
  setStats();
  setStatus("Ready to play.");
})();