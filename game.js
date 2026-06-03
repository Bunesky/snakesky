(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");
  const shareBtn = document.getElementById("share");
  const dirButtons = [...document.querySelectorAll("[data-dir]")];

  const statusEl = document.getElementById("status") || { textContent: "" };
  const worldUserEl = document.getElementById("world-user");
  const worldLengthEl = document.getElementById("world-length");
  const worldLinkEl = document.getElementById("world-link");

  const TILE_COUNT = 20;
  const START_LENGTH = 3;
  const TICK_MS = 110;

  let snake = [];
  let direction = "right";
  let queuedDirection = "right";
  let apple = { x: 10, y: 10 };
  let score = 0;
  let running = false;
  let gameOver = false;
  let paused = false;
  let loopId = null;

  let remoteLength = START_LENGTH;
  let lastPostUrl = "";

  function setStatus(t) {
    if (statusEl) statusEl.textContent = t;
  }

  function resizeCanvas() {
    const size = Math.min(Math.floor(window.innerWidth * 0.92), 560);
    canvas.width = size;
    canvas.height = size;
    drawFrame();
  }

  function setStats() {
    const lengthEl = document.getElementById("length");
    const applesEl = document.getElementById("apples");

    if (lengthEl) lengthEl.textContent = String(snake.length);
    if (applesEl) applesEl.textContent = String(score);
  }

  async function loadRemoteState() {
    try {
      const url =
        "https://raw.githubusercontent.com/Bunesky/perfectsky-post-bot/main/snakesky.json";

      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      remoteLength = Math.max(3, parseInt(data.length, 10) || START_LENGTH);

      if (worldUserEl) worldUserEl.textContent = data.player || "@unknown";
      if (worldLengthEl) worldLengthEl.textContent = `🐍 ${remoteLength}`;

      if (worldLinkEl) {
        lastPostUrl = data.post || "";
        worldLinkEl.href = lastPostUrl || "#";
        worldLinkEl.textContent = lastPostUrl ? "open" : "no post";
      }

      setStatus(`Loaded: ${remoteLength}`);
    } catch (e) {
      console.error(e);
      remoteLength = START_LENGTH;

      if (worldUserEl) worldUserEl.textContent = "@unknown";
      if (worldLengthEl) worldLengthEl.textContent = "🐍 3";
      if (worldLinkEl) {
        worldLinkEl.href = "#";
        worldLinkEl.textContent = "no post";
      }

      setStatus("Failed to load snakesky.json");
    }
  }

  function createSnake(length) {
    const out = [];
    for (let i = 0; i < length; i++) {
      out.push({ x: 5 - i, y: 10 });
    }
    return out;
  }

  function startGame() {
    const len = Math.max(3, remoteLength || START_LENGTH);

    snake = createSnake(len);
    direction = "right";
    queuedDirection = "right";
    score = 0;
    running = true;
    gameOver = false;
    paused = false;

    placeApple();
    setStats();
    setStatus("Running");

    drawFrame();

    if (loopId) clearInterval(loopId);
    loopId = setInterval(tick, TICK_MS);
  }

  function pauseGame() {
    if (!running || gameOver) return;
    paused = true;
    running = false;
    clearInterval(loopId);
    setStatus("Paused — share run");
    drawFrame();
  }

  function endGame() {
    running = false;
    gameOver = true;

    if (loopId) clearInterval(loopId);
    loopId = null;

    setStatus("Game over — share run");
    drawFrame();
  }

  function tick() {
    if (!running) return;

    direction = queuedDirection;

    const head = { ...snake[0] };

    if (direction === "up") head.y--;
    if (direction === "down") head.y++;
    if (direction === "left") head.x--;
    if (direction === "right") head.x++;

    if (
      head.x < 0 ||
      head.y < 0 ||
      head.x >= TILE_COUNT ||
      head.y >= TILE_COUNT
    ) {
      endGame();
      return;
    }

    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (head.x === apple.x && head.y === apple.y) {
      score++;
      placeApple();
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
    } while (snake.some(s => s.x === next.x && s.y === next.y));

    apple = next;
  }

  function drawBoard(size) {
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#07101f";
    ctx.fillRect(0, 0, size, size);

    const cell = size / TILE_COUNT;

    ctx.save();
    ctx.globalAlpha = 0.15;
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

  function drawApple(size) {
    const cell = size / TILE_COUNT;
    ctx.fillStyle = "#ff5c7a";
    ctx.fillRect(apple.x * cell, apple.y * cell, cell - 2, cell - 2);
  }

  function drawSnake(size) {
    const cell = size / TILE_COUNT;
    ctx.fillStyle = "#3ea6ff";

    snake.forEach(s => {
      ctx.fillRect(s.x * cell, s.y * cell, cell - 2, cell - 2);
    });
  }

  function drawOverlay(size) {
    if (running) return;

    ctx.save();
    ctx.fillStyle = "rgba(5, 8, 22, 0.30)";
    ctx.fillRect(0, 0, size, size);

    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = `700 ${Math.max(18, size * 0.055)}px system-ui, sans-serif`;
    ctx.fillText(
      gameOver ? "Game Over" : paused ? "Paused" : "Ready to play",
      size / 2,
      size / 2 - size * 0.04
    );

    ctx.fillStyle = "rgba(244,247,255,0.72)";
    ctx.font = `500 ${Math.max(12, size * 0.03)}px system-ui, sans-serif`;
    ctx.fillText(
      gameOver
        ? "Tap Start Game to try again."
        : paused
        ? "Tap Share Run to publish."
        : "Tap Start Game to begin.",
      size / 2,
      size / 2 + size * 0.03
    );

    ctx.restore();
  }

  function drawFrame() {
    const size = canvas.width;
    if (!size) return;

    drawBoard(size);
    drawApple(size);
    drawSnake(size);
    drawOverlay(size);
  }

  function changeDirection(d) {
    const opposite = {
      up: "down",
      down: "up",
      left: "right",
      right: "left"
    };

    if (d === opposite[direction]) return;
    queuedDirection = d;
  }

  function bindUI() {
    startBtn.onclick = startGame;
    pauseBtn.onclick = pauseGame;

    shareBtn.onclick = () => {
      let lengthToShare = snake.length;

      if (gameOver) lengthToShare = START_LENGTH;

      const text =
`🐍 #snakesky
🎮 bunesky.itch.io/snakesky/
📏 LENGTH: ${lengthToShare}`;

      navigator.clipboard.writeText(text);
      setStatus("Copied");
    };

    dirButtons.forEach(b => {
      b.onclick = () => changeDirection(b.dataset.dir);
    });

    window.addEventListener("keydown", e => {
      if (e.key === "ArrowUp") changeDirection("up");
      if (e.key === "ArrowDown") changeDirection("down");
      if (e.key === "ArrowLeft") changeDirection("left");
      if (e.key === "ArrowRight") changeDirection("right");
    });

    window.addEventListener("resize", resizeCanvas);
  }

  async function init() {
    bindUI();
    resizeCanvas();
    await loadRemoteState();
    setStatus("Ready");
  }

  init();
})();
