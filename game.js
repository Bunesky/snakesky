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

  let swipeStart = null;

  // =========================
  // 🟦 ATPROTO STATE
  // =========================
  let remoteStartLength = START_LENGTH;
  let lastPostUrl = "";
  let lastAuthor = "";

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setStats() {
    lengthEl.textContent = String(snake.length);
    applesEl.textContent = String(score);
  }

  // =========================
  // 🟦 ATPROTO: FETCH LAST #snakesky POST
  // =========================
  async function loadRemoteState() {
    try {
      const res = await fetch(
        "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=%23snakesky&limit=10"
      );

      const data = await res.json();
      const posts = data.posts || [];

      if (!posts.length) return;

      const last = posts[0];
      const text = last.record?.text || "";

      lastAuthor = last.author?.handle || "";
      lastPostUrl = `https://bsky.app/profile/${last.author.handle}/post/${last.uri.split("/").pop()}`;

      // extract length
      const match = text.match(/length:\s*(\d+)/i);
      if (match) {
        remoteStartLength = Math.max(3, parseInt(match[1], 10));
      }

      setStatus(`Loaded world state from @${lastAuthor}`);
    } catch (e) {
      console.log("ATProto load failed", e);
    }
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
    const len = running ? snake.length : remoteStartLength;

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

    setStatus("Game over. Share your run!");
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

    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      endGame();
      return;
    }

    snake.unshift(head);

    if (head.x === apple.x && head.y === apple.y) {
      score += 1;
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
  // 🟦 SHARE (UPDATED FOR ATPROTO FORMAT)
  // =========================
  function buildShareText() {
    const apples = snake.length - remoteStartLength;

    return `🐍 I played #snakesky
🔗 ${lastPostUrl || window.location.href}
📏 Final snake length: ${snake.length}`;
  }

  async function shareRun() {
    const text = buildShareText();

    if (navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text);
    }

    setStatus("Run shared.");
  }

  function drawFrame() {
    const size = lastRenderSize;
    if (!size) return;

    ctx.clearRect(0, 0, size, size);

    drawSnake();
    drawApple();
  }

  function drawSnake() {
    const size = lastRenderSize / TILE_COUNT;

    ctx.fillStyle = "#3ea6ff";
    snake.forEach(s => {
      ctx.fillRect(s.x * size, s.y * size, size - 2, size - 2);
    });
  }

  function drawApple() {
    const size = lastRenderSize / TILE_COUNT;

    ctx.fillStyle = "#ff5c7a";
    ctx.fillRect(apple.x * size, apple.y * size, size - 2, size - 2);
  }

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

    // ATPROTO LOAD
    await loadRemoteState();

    setStats();
    setStatus("Ready.");
  }

  init();
})();
