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

  let snake = [];
  let direction = "right";
  let queuedDirection = "right";
  let apple = { x: 10, y: 10 };
  let score = 0;
  let running = false;
  let gameOver = false;
  let loopId = null;
  let lastRenderSize = 0;

  // =========================
  // 🌐 GLOBAL STATE (ATPROTO)
  // =========================
  let remoteStartLength = START_LENGTH;
  let lastPostUrl = "";
  let lastAuthor = "";
  let lastPostText = "";

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setStats() {
    lengthEl.textContent = String(snake.length);
    applesEl.textContent = String(score);
  }

  // =========================
  // 🌐 LOAD LAST #snakesky POST
  // =========================
  async function loadRemoteState() {
    try {
      const res = await fetch(
        "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=%23snakesky&limit=20"
      );

      const data = await res.json();
      const posts = data.posts || [];

      if (!posts.length) {
        setStatus("No remote state found.");
        return;
      }

      // Ensure newest first
      const last = posts[0];

      const text = last.record?.text || "";
      const author = last.author?.handle || "unknown";
      const uri = last.uri || "";

      lastAuthor = author;
      lastPostText = text;

      const postId = uri.split("/").pop();
      lastPostUrl = `https://bsky.app/profile/${author}/post/${postId}`;

      // =========================
      // 🧠 EXTRACT LENGTH
      // =========================
      // supports:
      // 📏 Snake length: 17
      // 📏 Final snake length: 17
      const match = text.match(/length\s*:\s*(\d+)/i);

      if (match && match[1]) {
        remoteStartLength = Math.max(3, parseInt(match[1], 10));
      }

      setStatus(`World loaded from @${author}`);
    } catch (err) {
      console.log("ATProto error:", err);
      setStatus("Offline mode (no remote state).");
    }
  }

  // =========================
  // 🧱 RESIZE
  // =========================
  function resizeCanvas() {
    const size = Math.min(Math.floor(window.innerWidth * 0.92), 560);

    const wrap = canvas.parentElement;
    wrap.style.width = `${size}px`;
    wrap.style.height = `${size}px`;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lastRenderSize = size;

    drawFrame();
  }

  // =========================
  // 🎮 GAME START
  // =========================
  function startGame() {
    const len = remoteStartLength || START_LENGTH;

    snake = [];
    for (let i = 0; i < len; i++) {
      snake.push({ x: 5 - i, y: 10 });
    }

    direction = "right";
    queuedDirection = "right";
    score = 0;
    running = true;
    gameOver = false;

    placeApple();
    setStats();

    startBtn.textContent = "Restart";
    setStatus("Running...");

    clearInterval(loopId);
    loopId = setInterval(tick, TICK_MS);

    drawFrame();
  }

  function endGame() {
    running = false;
    gameOver = true;

    clearInterval(loopId);
    loopId = null;

    setStatus("Game over. Share your run.");
    startBtn.textContent = "Play Again";

    drawFrame();
  }

  // =========================
  // ⏱ GAME LOOP
  // =========================
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
    apple = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT)
    };
  }

  function changeDirection(dir) {
    const opposite = {
      up: "down",
      down: "up",
      left: "right",
      right: "left"
    };

    if (dir === opposite[direction]) return;
    queuedDirection = dir;
  }

  // =========================
  // 📤 SHARE FORMAT (FIXED)
  // =========================
  function buildShareText() {
    return `🐍 I played #snakesky
🔗 ${window.location.href}
📏 Snake length: ${snake.length}`;
  }

  async function shareRun() {
    const text = buildShareText();

    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
      }
      setStatus("Shared.");
    } catch (e) {
      setStatus("Share failed.");
    }
  }

  // =========================
  // 🎨 RENDER
  // =========================
  function drawFrame() {
    const size = lastRenderSize;
    if (!size) return;

    ctx.clearRect(0, 0, size, size);

    const cell = size / TILE_COUNT;

    // snake
    ctx.fillStyle = "#3ea6ff";
    snake.forEach(s => {
      ctx.fillRect(s.x * cell, s.y * cell, cell - 2, cell - 2);
    });

    // apple
    ctx.fillStyle = "#ff5c7a";
    ctx.fillRect(apple.x * cell, apple.y * cell, cell - 2, cell - 2);
  }

  // =========================
  // UI
  // =========================
  function bindUI() {
    startBtn.addEventListener("click", startGame);
    shareBtn.addEventListener("click", shareRun);

    dirButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        changeDirection(btn.dataset.dir);
      });
    });

    window.addEventListener("resize", resizeCanvas);
  }

  async function init() {
    bindUI();
    resizeCanvas();

    setStatus("Loading world...");

    await loadRemoteState();

    setStats();
    setStatus("Ready.");
  }

  init();
})();
