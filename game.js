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

  let remoteLength = START_LENGTH;

  function setStatus(t) {
    statusEl.textContent = t;
  }

  function setStats() {
    lengthEl.textContent = snake.length;
    applesEl.textContent = score;
  }

  // 🟩 ONLY WHAT MATTERS: LENGTH
  function parsePost(text) {
    const match = text.match(/LENGTH:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : START_LENGTH;
  }

  // 🟦 LOAD LAST #snakesky POST
  async function loadRemoteState() {
    try {
      const url =
        "https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=" +
        encodeURIComponent("#snakesky") +
        "&limit=20";

      const res = await fetch(url);
      const data = await res.json();

      const posts = data.posts || data.feed || [];
      if (!Array.isArray(posts) || !posts.length) {
        setStatus("No posts found");
        return;
      }

      const normalized = posts
        .map(p => p.post || p)
        .filter(p => p?.record?.text);

      normalized.sort(
        (a, b) => new Date(b.indexedAt || 0) - new Date(a.indexedAt || 0)
      );

      const last = normalized[0];
      const text = last.record.text;

      remoteLength = parsePost(text);

      setStatus("Loaded world state");
    } catch (e) {
      console.log(e);
      setStatus("Failed loading world");
    }
  }

  function startGame() {
    const len = remoteLength;

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
    setStatus("Running");

    if (loopId) clearInterval(loopId);
    loopId = setInterval(tick, TICK_MS);
  }

  function endGame() {
    running = false;
    gameOver = true;
    clearInterval(loopId);
    setStatus("Game over");
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
    draw();
  }

  function placeApple() {
    apple = {
      x: Math.floor(Math.random() * TILE_COUNT),
      y: Math.floor(Math.random() * TILE_COUNT)
    };
  }

  function draw() {
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    const cell = size / TILE_COUNT;

    ctx.fillStyle = "#ff5c7a";
    ctx.fillRect(apple.x * cell, apple.y * cell, cell - 2, cell - 2);

    ctx.fillStyle = "#3ea6ff";
    snake.forEach(s => {
      ctx.fillRect(s.x * cell, s.y * cell, cell - 2, cell - 2);
    });
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

    // 🟩 YOUR EXACT POST FORMAT
    shareBtn.onclick = () => {
      const text =
`🐍 #snakesky
🎮 https://bunesky.github.io/snakesky/
📏 LENGTH: ${snake.length}`;

      navigator.clipboard.writeText(text);
      setStatus("Copied post");
    };

    dirButtons.forEach(b =>
      b.onclick = () => changeDirection(b.dataset.dir)
    );

    window.addEventListener("keydown", e => {
      if (e.key === "ArrowUp") changeDirection("up");
      if (e.key === "ArrowDown") changeDirection("down");
      if (e.key === "ArrowLeft") changeDirection("left");
      if (e.key === "ArrowRight") changeDirection("right");
    });
  }

  async function init() {
    bindUI();
    await loadRemoteState();
    setStatus("Ready");
  }

  init();
})();
