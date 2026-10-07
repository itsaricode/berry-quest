const game = document.getElementById("game");
const player = document.getElementById("player");
const playerSprite = document.getElementById("playerSprite");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");

const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const soundBtn = document.getElementById("soundBtn");

// =========================================
// GAME VARIABLES
// =========================================

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

// =========================================
// CHARACTER ANIMATIONS
// =========================================

const animations = {

  idle: {
    frames: [
      "assets/character/idle-1.png",
      "assets/character/idle-2.png"
    ],
    frameDuration: 0.45,
    loop: true
  },

  run: {
    frames: [
      "assets/character/run-1.png",
      "assets/character/run-2.png",
      "assets/character/run-3.png",
      "assets/character/run-4.png"
    ],
    frameDuration: 0.07,
    loop: true
  },

  jump: {
    frames: [
      "assets/character/jump-1.png",
      "assets/character/jump-2.png"
    ],
    frameDuration: 0.12,
    loop: false
  },

  hurt: {
    frames: [
      "assets/character/hurt.png"
    ],
    frameDuration: 0.3,
    loop: false
  },

  happy: {
    frames: [
      "assets/character/happy-1.png",
      "assets/character/happy-2.png"
    ],
    frameDuration: 0.18,
    loop: false
  }

};

// =========================================
// CHARACTER ANIMATION STATE
// =========================================

let currentState = "idle";

let animationFrame = 0;

let animationTimer = 0;


// =========================================
// CHANGE PLAYER STATE
// =========================================

function setPlayerState(newState) {

  if (!animations[newState]) return;

  if (currentState === newState) return;

  currentState = newState;

  animationFrame = 0;

  animationTimer = 0;

  playerSprite.src =
    animations[newState].frames[0];
}

// =========================================
// INITIAL HUD
// =========================================

bestEl.textContent = best;

// =========================================
// GAME SIZE
// =========================================

const GAME_HEIGHT = () => game.clientHeight;

const GROUND_HEIGHT = () => game.clientHeight * 0.28;

// =========================================
// SOUND
// =========================================

function beep(freq = 600, duration = 0.07, type = "square") {

if (!soundEnabled) return;

try {

audioCtx ??= new (
  window.AudioContext ||
  window.webkitAudioContext
)();

const osc = audioCtx.createOscillator();
const gain = audioCtx.createGain();

osc.type = type;
osc.frequency.value = freq;

gain.gain.value = 0.035;

osc.connect(gain);
gain.connect(audioCtx.destination);

osc.start();

osc.stop(
  audioCtx.currentTime + duration
);


} catch {}

}

// =========================================
// HUD
// =========================================

function updateHUD() {

scoreEl.textContent = score;

bestEl.textContent = best;

livesEl.textContent = lives;

}

// =========================================
// CHARACTER POSITION
// =========================================

function setPlayerPosition() {

const ground = GROUND_HEIGHT();

const bottom = ground + playerY;

player.style.left = `${playerX}%`;

player.style.bottom = `${bottom}px`;

}

/* =========================================
   CHARACTER ANIMATION SYSTEM
========================================= */

function setSprite(src) {
  if (playerSprite.getAttribute("src") !== src) {
    playerSprite.src = src;
  }
}

function updateRunAnimation(dt) {

  animationTimer += dt;

  if (animationTimer >= 0.07) {

    animationTimer = 0;

    animationFrame++;

    if (animationFrame >= characterSprites.run.length) {
      animationFrame = 0;
    }

    setSprite(
      characterSprites.run[animationFrame]
    );
  }
}

function updateIdleAnimation(dt) {

  animationTimer += dt;

  if (animationTimer >= 0.45) {

    animationTimer = 0;

    animationFrame++;

    if (animationFrame >= characterSprites.idle.length) {
      animationFrame = 0;
    }

    setSprite(
      characterSprites.idle[animationFrame]
    );
  }
}

function updateJumpAnimation() {

  // Going UP
  if (velocityY > 180) {

    setSprite(
      characterSprites.jump[0]
    );

  }

  // Falling DOWN
  else {

    setSprite(
      characterSprites.jump[1]
    );

  }
}

// =========================================
// RESET CHARACTER
// =========================================

function resetPlayer() {

playerX = 8;

playerY = 0;

velocityY = 0;

jumping = false;

currentAnimation = "idle";

animationFrame = 0;

animationTimer = 0;

playerSprite.style.transform = "scaleX(1)";

playerSprite.src =
characterSprites.idle[0];

setPlayerPosition();

}

// =========================================
// START GAME
// =========================================

function startGame() {

objects.forEach(object => {


object.el.remove();


});

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

currentAnimation = "idle";

animationFrame = 0;

animationTimer = 0;

playerSprite.style.transform = "scaleX(1)";

playerSprite.src =
characterSprites.idle[0];

message.classList.add("hidden");

updateHUD();

setPlayerPosition();

beep(700, 0.08);

}

// =========================================
// GAME OVER
// =========================================

function endGame() {

running = false;

// Save best score.
if (score > best) {


best = score;

localStorage.setItem(
  "berryQuestBest",
  best
);


}

updateHUD();

// Happy animation if the player achieved
// a new high score.
if (score > 0 && score >= best) {


playHappyAnimation();


}

message.querySelector("h2").textContent =
"Game Over 💗";

message.querySelector(".big-icon").textContent =
score >= best && score > 0
? "🏆"
: "🍓";

message.querySelector(
".message-box p"
).innerHTML =
`You collected <strong>${score}</strong> points!<br>
     Best score: <strong>${best}</strong>`;

startBtn.textContent =
"PLAY AGAIN ✨";

message.classList.remove("hidden");

beep(180, 0.2, "sawtooth");

}

// =========================================
// HAPPY CELEBRATION
// =========================================

function playHappyAnimation() {

let frame = 0;

const happyFrames =
characterSprites.happy;

playerSprite.src =
happyFrames[0];

const happyTimer =
setInterval(() => {


  frame++;

  if (
    frame >=
    happyFrames.length
  ) {

    frame = 0;

  }

  playerSprite.src =
    happyFrames[frame];

}, 180);


setTimeout(() => {

clearInterval(happyTimer);

playerSprite.src =
  characterSprites.happy[0];


}, 1800);

}

// =========================================
// JUMP
// =========================================

function jump() {

  if (!running) return;

  // No double jump
  if (jumping) return;

  jumping = true;

  // Jump force
  velocityY = 700;

  // Reset animation timer
  animationTimer = 0;

  // Start with jump pose
  currentAnimation = "jump";

  setSprite(
    characterSprites.jump[0]
  );

  beep(850, 0.06);
}

// =========================================
// SPAWN STRAWBERRY
// =========================================

function spawnBerry() {

const el =
document.createElement("div");

const golden =
Math.random() < 0.12;

el.className =
golden
? "golden-berry"
: "berry";

el.textContent =
golden
? "✨🍓"
: "🍓";

const x =
18 + Math.random() * 72;

const y =
35 + Math.random() * 38;

el.style.left =
`${x}%`;

el.style.bottom =
`${GROUND_HEIGHT() + y}px`;

game.appendChild(el);

objects.push({


type:
  golden
    ? "golden"
    : "berry",

el,

x,

y:
  GROUND_HEIGHT() + y,

w: 38,

h: 38


});

}

// =========================================
// SPAWN ENEMY
// =========================================

function spawnEnemy() {

const el =
document.createElement("div");

const bee =
Math.random() < 0.35;

el.className =
`enemy ${bee ? "bee" : "snail"}`;

el.textContent =
bee
? "🐝"
: "🐌";

// Enemy enters from either wall.
const x =
Math.random() > 0.5
? -5
: 101;

const y =
bee
? 85 + Math.random() * 80
: 0;

el.style.left =
`${x}%`;

el.style.bottom =
`${GROUND_HEIGHT() + y}px`;

game.appendChild(el);

objects.push({


type: "enemy",

el,

x,

y:
  GROUND_HEIGHT() + y,

w: 46,

h: 46,

speed:
  (bee ? 18 : 10) +
  Math.random() * 12,

direction:
  x < 0
    ? 1
    : -1,

baseY:
  GROUND_HEIGHT() + y


});

}

// =========================================
// COLLISION
// =========================================

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

// =========================================
// COLLECT STRAWBERRY
// =========================================

function collectObject(obj, index) {

obj.el.remove();

objects.splice(index, 1);

if (obj.type === "golden") {


score += 50;

beep(1100, 0.12);


} else {

score += 10;

beep(760, 0.06);


}

if (score > best) {


best = score;

localStorage.setItem(
  "berryQuestBest",
  best
);


}

updateHUD();

}

// =========================================
// PLAYER HURT
// =========================================

function hurt() {

if (hitCooldown > 0) return;

lives--;

hitCooldown = 1.2;

// Hurt animation.
currentAnimation = "hurt";

animationFrame = 0;

animationTimer = 0;

playerSprite.src =
characterSprites.hurt[0];

player.classList.add("flash");

setTimeout(() => {


player.classList.remove("flash");


if (running) {

  currentAnimation =
    "idle";

  animationFrame = 0;

  animationTimer = 0;

  playerSprite.src =
    characterSprites.idle[0];

}


}, 650);

updateHUD();

beep(
220,
0.12,
"sawtooth"
);

if (lives <= 0) {


endGame();


}

}

// =========================================
// SMASH ENEMY
// =========================================

function smashEnemy(obj, index) {

// Remove enemy.
obj.el.remove();

objects.splice(index, 1);

// Bounce Berry Girl upward.
playerY =
Math.max(playerY, 8);

velocityY = 620;

jumping = true;

// Add bonus points.
score += 25;

if (score > best) {


best = score;

localStorage.setItem(
  "berryQuestBest",
  best
);


}

// Keep jump animation.
currentAnimation =
"jump";

animationFrame = 1;

animationTimer = 0;

playerSprite.src =
characterSprites.jump[1];

updateHUD();

// Cute smash sound.
beep(980, 0.08);

}

// =========================================
// GAME LOOP
// =========================================

function gameLoop(timestamp) {

const dt =
Math.min(
(timestamp - lastTime) / 1000 || 0,
0.033
);

lastTime = timestamp;

if (running) {


hitCooldown =
  Math.max(
    0,
    hitCooldown - dt
  );


// -------------------------------------
// MOVEMENT
// -------------------------------------

const movingLeft =
  keys.ArrowLeft;

const movingRight =
  keys.ArrowRight;


const moving =
  movingLeft ||
  movingRight;


/* =========================================
   PLAYER MOVEMENT
========================================= */

if (movingLeft) {

  playerX -= 45 * dt;

  // Face LEFT
  playerSprite.style.transform = "scaleX(-1)";
}

if (movingRight) {

  playerX += 45 * dt;

  // Face RIGHT
  playerSprite.style.transform = "scaleX(1)";
}


playerX =
  Math.max(
    2,
    Math.min(
      93,
      playerX
    )
  );


// -------------------------------------
// JUMP PHYSICS
// -------------------------------------

if (jumping) {

  playerY +=
    velocityY * dt;


  velocityY -=
    1750 * dt;


if (playerY <= 0) {

  playerY = 0;

  velocityY = 0;

  jumping = false;

  // Back to idle after landing
  currentAnimation = "idle";

  animationFrame = 0;

  animationTimer = 0;

  setSprite(
    characterSprites.idle[0]
  );
}

}


// -------------------------------------
// CHARACTER ANIMATION
// -------------------------------------

/* =========================================
   CHARACTER ANIMATION
========================================= */

if (jumping) {

  // Jump animation
  updateJumpAnimation();

}

else if (moving) {

  // Reset animation when starting to run
  if (currentAnimation !== "run") {

    currentAnimation = "run";
    animationFrame = 0;
    animationTimer = 0;

    setSprite(
      characterSprites.run[0]
    );
  }

  // Play running frames
  updateRunAnimation(dt);

}

else {

  // Reset animation when stopping
  if (currentAnimation !== "idle") {

    currentAnimation = "idle";
    animationFrame = 0;
    animationTimer = 0;

    setSprite(
      characterSprites.idle[0]
    );
  }

  // Play idle frames
  updateIdleAnimation(dt);
}
setPlayerPosition();


// -------------------------------------
// SPAWN TIMERS
// -------------------------------------

spawnTimer += dt;

enemyTimer += dt;


const berryRate =
  Math.max(
    0.65,
    1.15 - score / 1800
  );


const enemyRate =
  Math.max(
    0.85,
    1.8 - score / 1200
  );


if (
  spawnTimer >=
  berryRate
) {

  spawnBerry();

  spawnTimer = 0;

}


if (
  enemyTimer >=
  enemyRate
) {

  spawnEnemy();

  enemyTimer = 0;

}


// -------------------------------------
// COLLISIONS
// -------------------------------------

const pRect =
  playerRect();


const gameRect =
  game.getBoundingClientRect();


// Work backwards so objects can safely
// be removed while looping.
for (
  let index = objects.length - 1;
  index >= 0;
  index--
) {

  const obj =
    objects[index];


  /* =========================================
       ENEMY
========================================= */
  if (
    obj.type === "enemy"
  ) {

    // Move enemy.
    obj.x +=
      obj.direction *
      obj.speed *
      dt;


    obj.el.style.left =
      `${obj.x}%`;


    // Keep flying enemies at their height.
    if (
      obj.baseY >
      GROUND_HEIGHT() + 40
    ) {

      obj.el.style.bottom =
        `${obj.baseY}px`;

    }


    const rect =
      obj.el.getBoundingClientRect();


    // ---------------------------------
    // JUMP ON ENEMY
    // ---------------------------------

    const playerIsFalling =
      velocityY <= 0;


    const playerAboveEnemy =
      pRect.bottom <=
      rect.top + 18;


    if (
      rectsOverlap(
        pRect,
        rect
      ) &&
      jumping &&
      playerIsFalling &&
      playerAboveEnemy
    ) {

      smashEnemy(
        obj,
        index
      );

      continue;

    }


    // ---------------------------------
    // NORMAL ENEMY HIT
    // ---------------------------------

    if (
      rectsOverlap(
        pRect,
        rect
      )
    ) {

      obj.el.remove();

      objects.splice(
        index,
        1
      );


      hurt();

      continue;

    }


    // ---------------------------------
    // ENEMY REACHES WALL
    // ---------------------------------

    const outside =
      rect.right <
        gameRect.left - 10 ||
      rect.left >
        gameRect.right + 10;


    if (outside) {

      obj.el.remove();

      objects.splice(
        index,
        1
      );

    }

  }


  // ===================================
  // STRAWBERRY
  // ===================================

  else {

    const rect =
      obj.el.getBoundingClientRect();


    if (
      rectsOverlap(
        pRect,
        rect
      )
    ) {

      collectObject(
        obj,
        index
      );

      continue;

    }


    if (
      rect.right <
      gameRect.left - 50
    ) {

      obj.el.remove();

      objects.splice(
        index,
        1
      );

    }

  }

}


}

requestAnimationFrame(
gameLoop
);

}

// =========================================
// KEYBOARD CONTROLS
// =========================================

window.addEventListener(
"keydown",
e => {


if (
  [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "Space"
  ].includes(e.code) ||
  [
    "ArrowLeft",
    "ArrowRight"
  ].includes(e.key)
) {

  e.preventDefault();

}


keys[e.key] = true;

keys[e.code] = true;


if (
  e.key === "ArrowUp" ||
  e.code === "Space"
) {

  jump();

}


if (
  e.key === "Enter" &&
  !running
) {

  startGame();

}


}
);

// =========================================
// KEY RELEASE
// =========================================

window.addEventListener(
"keyup",
e => {


keys[e.key] = false;

keys[e.code] = false;


}
);

// =========================================
// MOBILE CONTROLS
// =========================================

document
.querySelectorAll(
".mobile-controls button"
)
.forEach(btn => {


const key =
  btn.dataset.key;


const press = e => {

  e.preventDefault();

  keys[key] = true;


  if (
    key === "Space"
  ) {

    jump();

  }

};


const release = e => {

  e.preventDefault();

  keys[key] = false;

};


btn.addEventListener(
  "pointerdown",
  press
);


btn.addEventListener(
  "pointerup",
  release
);


btn.addEventListener(
  "pointerleave",
  release
);


});

// =========================================
// START BUTTON
// =========================================

startBtn.addEventListener(
"click",
startGame
);

// =========================================
// SOUND BUTTON
// =========================================

soundBtn.addEventListener(
"click",
() => {


soundEnabled =
  !soundEnabled;


soundBtn.textContent =
  soundEnabled
    ? "🔊"
    : "🔇";


if (soundEnabled) {

  beep(700, 0.06);

}

}
);

// =========================================
// WINDOW RESIZE
// =========================================

window.addEventListener(
"resize",
setPlayerPosition
);

// =========================================
// INITIALIZE GAME
// =========================================

playerSprite.src =
characterSprites.idle[0];

setPlayerPosition();

requestAnimationFrame(
gameLoop
);
