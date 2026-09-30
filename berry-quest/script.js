const game = document.getElementById("game");
const player = document.getElementById("player");
const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");
const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const soundBtn = document.getElementById("soundBtn");

let score = 0;
let lives = 3;
let best = Number(localStorage.getItem("berryQuestBest") || 0);

let running = false;
let playerX = 8;
let playerY = 0;
let velocityY = 0;
let jumping = false;
let keys = {};
let objects = [];
let lastTime = 0;
let spawnTimer = 0;
let enemyTimer = 0;
let hitCooldown = 0;
let soundEnabled = true;
let audioCtx = null;

bestEl.textContent = best;

const GAME_HEIGHT = () => game.clientHeight;
const GROUND_HEIGHT = () => game.clientHeight * 0.28;
const PLAYER_W = 58;
const PLAYER_H = 68;

function beep(freq = 600, duration = 0.07, type = "square") {
  if (!soundEnabled) return;
  try {
    audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.035;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {}
}

function updateHUD() {
  scoreEl.textContent = score;
  bestEl.textContent = best;
  livesEl.textContent = lives;
}

function setPlayerPosition() {
  const ground = GROUND_HEIGHT();
  const bottom = ground + playerY;
  player.style.left = `${playerX}%`;
  player.style.bottom = `${bottom}px`;
}

function resetPlayer() {
  playerX = 8;
  playerY = 0;
  velocityY = 0;
  jumping = false;
  setPlayerPosition();
}

function startGame() {
  objects.forEach(o => o.el.remove());
  objects = [];
  score = 0;
  lives = 3;
  playerX = 8;
  playerY = 0;
  velocityY = 0;
  jumping = false;
  hitCooldown = 0;
  spawnTimer = 0;
  enemyTimer = 0;
  running = true;
  message.classList.add("hidden");
  updateHUD();
  setPlayerPosition();
  beep(700, .08);
}

function endGame() {
  running = false;
  if (score > best) {
    best = score;
    localStorage.setItem("berryQuestBest", best);
  }
  updateHUD();
  message.querySelector("h2").textContent = "Game Over 💗";
  message.querySelector(".big-icon").textContent = score >= best && score > 0 ? "🏆" : "🍓";
  message.querySelector(".message-box p").innerHTML =
    `You collected <strong>${score}</strong> points!<br>Best score: <strong>${best}</strong>`;
  startBtn.textContent = "PLAY AGAIN ✨";
  message.classList.remove("hidden");
  beep(180, .2, "sawtooth");
}

function jump() {
  if (!running || jumping) return;
  jumping = true;
  velocityY = 700;
  beep(850, .06);
}

function spawnBerry() {
  const el = document.createElement("div");
  const golden = Math.random() < 0.12;
  el.className = golden ? "golden-berry" : "berry";
  el.textContent = golden ? "✨🍓" : "🍓";

  const x = 18 + Math.random() * 72;
  const y = 35 + Math.random() * 38;

  el.style.left = `${x}%`;
  el.style.bottom = `${GROUND_HEIGHT() + y}px`;
  game.appendChild(el);

  objects.push({
    type: golden ? "golden" : "berry",
    el,
    x,
    y: GROUND_HEIGHT() + y,
    w: 38,
    h: 38
  });
}

function spawnEnemy() {
  const el = document.createElement("div");
  const bee = Math.random() < 0.35;
  el.className = `enemy ${bee ? "bee" : "snail"}`;
  el.textContent = bee ? "🐝" : "🐌";

  const x = 25 + Math.random() * 65;
  const y = bee ? 85 + Math.random() * 80 : 0;

  el.style.left = `${x}%`;
  el.style.bottom = `${GROUND_HEIGHT() + y}px`;
  game.appendChild(el);

  objects.push({
    type: "enemy",
    el,
    x,
    y: GROUND_HEIGHT() + y,
    w: 46,
    h: 46,
    speed: (bee ? 18 : 10) + Math.random() * 12,
    direction: Math.random() > .5 ? 1 : -1,
    baseY: GROUND_HEIGHT() + y
  });
}

function rectsOverlap(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function playerRect() {
  return player.getBoundingClientRect();
}

function collectObject(obj, index) {
  obj.el.remove();
  objects.splice(index, 1);

  if (obj.type === "golden") {
    score += 50;
    beep(1100, .12);
  } else {
    score += 10;
    beep(760, .06);
  }

  if (score > best) {
    best = score;
    localStorage.setItem("berryQuestBest", best);
  }
  updateHUD();
}

function hurt() {
  if (hitCooldown > 0) return;

  lives--;
  hitCooldown = 1.2;
  player.classList.add("flash");
  setTimeout(() => player.classList.remove("flash"), 650);
  updateHUD();
  beep(220, .12, "sawtooth");

  if (lives <= 0) {
    endGame();
  }
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.033);
  lastTime = timestamp;

  if (running) {
    hitCooldown = Math.max(0, hitCooldown - dt);

    if (keys.ArrowLeft) playerX -= 32 * dt;
    if (keys.ArrowRight) playerX += 32 * dt;
    playerX = Math.max(2, Math.min(93, playerX));

    if (jumping) {
      playerY += velocityY * dt;
      velocityY -= 1750 * dt;

      if (playerY <= 0) {
        playerY = 0;
        velocityY = 0;
        jumping = false;
      }
    }

    setPlayerPosition();

    spawnTimer += dt;
    enemyTimer += dt;

    const berryRate = Math.max(.65, 1.15 - score / 1800);
    const enemyRate = Math.max(.85, 1.8 - score / 1200);

    if (spawnTimer >= berryRate) {
      spawnBerry();
      spawnTimer = 0;
    }

    if (enemyTimer >= enemyRate) {
      spawnEnemy();
      enemyTimer = 0;
    }

    const pRect = playerRect();

    objects.forEach((obj, index) => {
      if (obj.type === "enemy") {
        obj.x += obj.direction * obj.speed * dt;
        if (obj.x < 10 || obj.x > 92) obj.direction *= -1;
        obj.el.style.left = `${obj.x}%`;

        if (obj.baseY > GROUND_HEIGHT() + 40) {
          obj.el.style.bottom = `${obj.baseY}px`;
        }
      }

      const rect = obj.el.getBoundingClientRect();

      if (rectsOverlap(pRect, rect)) {
        if (obj.type === "enemy") {
          obj.el.remove();
          objects.splice(index, 1);
          hurt();
        } else {
          collectObject(obj, index);
        }
      }

      const gameRect = game.getBoundingClientRect();
      if (rect.right < gameRect.left - 50) {
        obj.el.remove();
        objects.splice(index, 1);
      }
    });
  }

  requestAnimationFrame(gameLoop);
}

window.addEventListener("keydown", e => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(e.code) ||
      ["ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
  }

  keys[e.key] = true;
  keys[e.code] = true;

  if (e.key === "ArrowUp" || e.code === "Space") jump();
  if (e.key === "Enter" && !running) startGame();
});

window.addEventListener("keyup", e => {
  keys[e.key] = false;
  keys[e.code] = false;
});

document.querySelectorAll(".mobile-controls button").forEach(btn => {
  const key = btn.dataset.key;

  const press = e => {
    e.preventDefault();
    keys[key] = true;
    if (key === "Space") jump();
  };

  const release = e => {
    e.preventDefault();
    keys[key] = false;
  };

  btn.addEventListener("pointerdown", press);
  btn.addEventListener("pointerup", release);
  btn.addEventListener("pointerleave", release);
});

startBtn.addEventListener("click", startGame);

soundBtn.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? "🔊" : "🔇";
  if (soundEnabled) beep(700, .06);
});

window.addEventListener("resize", setPlayerPosition);

setPlayerPosition();
requestAnimationFrame(gameLoop);
