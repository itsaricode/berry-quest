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
    frameDuration: 0.09,
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
    loop: true
  }

};


// =========================================
// ANIMATION STATE
// =========================================

let currentState = "idle";
let animationFrame = 0;
let animationTimer = 0;


// Timers are stored so old games cannot
// interfere with a new game.
let hurtTimeout = null;
let happyTimeout = null;


// =========================================
// SET SPRITE
// =========================================

function setSprite(src) {

  if (
    playerSprite.getAttribute("src") !== src
  ) {

    playerSprite.src = src;

  }

}
function testRunSprite() {
  playerSprite.src = "assets/character/run-1.png";
}

// =========================================
// CHANGE PLAYER STATE
// =========================================

function setPlayerState(
  newState,
  force = false
) {

  if (!animations[newState]) {
    return;
  }

  // If already in this state,
  // don't restart the animation.
  if (
    currentState === newState &&
    !force
  ) {

    return;

  }

  currentState = newState;

  animationFrame = 0;
  animationTimer = 0;

  setSprite(
    animations[newState].frames[0]
  );

}


// =========================================
// ANIMATION ENGINE
// =========================================

function updateAnimation(dt) {

  const animation =
    animations[currentState];

  if (!animation) {
    return;
  }


  animationTimer += dt;


  if (
    animationTimer <
    animation.frameDuration
  ) {

    return;

  }


  animationTimer -=
    animation.frameDuration;


  animationFrame++;


  // =======================================
  // LOOPING ANIMATION
  // =======================================

  if (animation.loop) {

    if (
      animationFrame >=
      animation.frames.length
    ) {

      animationFrame = 0;

    }

  }


  // =======================================
  // ONE-TIME ANIMATION
  // =======================================

  else {

    if (
      animationFrame >=
      animation.frames.length
    ) {

      animationFrame =
        animation.frames.length - 1;

    }

  }


  setSprite(
    animation.frames[animationFrame]
  );

}


// =========================================
// INITIAL HUD
// =========================================

bestEl.textContent = best;


// =========================================
// GAME SIZE
// =========================================

const GAME_HEIGHT = () =>
  game.clientHeight;

const GROUND_HEIGHT = () =>
  game.clientHeight * 0.28;


// =========================================
// SOUND
// =========================================

function beep(
  freq = 600,
  duration = 0.07,
  type = "square"
) {

  if (!soundEnabled) {
    return;
  }

  try {

    audioCtx ??= new (
      window.AudioContext ||
      window.webkitAudioContext
    )();

    const osc =
      audioCtx.createOscillator();

    const gain =
      audioCtx.createGain();

    osc.type = type;

    osc.frequency.value =
      freq;

    gain.gain.value =
      0.035;

    osc.connect(gain);
    gain.connect(
      audioCtx.destination
    );

    osc.start();

    osc.stop(
      audioCtx.currentTime +
      duration
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

  const ground =
    GROUND_HEIGHT();

  const bottom =
    ground + playerY;

  player.style.left =
    `${playerX}%`;

  player.style.bottom =
    `${bottom}px`;

}


// =========================================
// RESET PLAYER
// =========================================

function resetPlayer() {

  playerX = 8;

  playerY = 0;

  velocityY = 0;

  jumping = false;

  setPlayerState(
    "idle",
    true
  );

  playerSprite.style.transform =
    "scaleX(1)";

  setPlayerPosition();

}


// =========================================
// START GAME
// =========================================

function startGame() {

  // ---------------------------------------
  // Cancel old animation timers
  // ---------------------------------------

  if (hurtTimeout) {

    clearTimeout(
      hurtTimeout
    );

    hurtTimeout = null;

  }


  if (happyTimeout) {

    clearTimeout(
      happyTimeout
    );

    happyTimeout = null;

  }


  // ---------------------------------------
  // Remove old objects
  // ---------------------------------------

  objects.forEach(object => {

    object.el.remove();

  });

  objects = [];


  // ---------------------------------------
  // Reset game variables
  // ---------------------------------------

  score = 0;

  lives = 3;

  playerX = 8;

  playerY = 0;

  velocityY = 0;

  jumping = false;

  hitCooldown = 0;

  spawnTimer = 0;

  enemyTimer = 0;


  // ---------------------------------------
  // Start game
  // ---------------------------------------

  running = true;

  lastTime =
    performance.now();


  // ---------------------------------------
  // Reset animation
  // ---------------------------------------

  setPlayerState(
    "idle",
    true
  );

  playerSprite.style.transform =
    "scaleX(1)";


  // ---------------------------------------
  // UI
  // ---------------------------------------

  message.classList.add(
    "hidden"
  );

  updateHUD();

  setPlayerPosition();

  beep(
    700,
    0.08
  );

}


// =========================================
// GAME OVER
// =========================================

function endGame() {

  running = false;


  // ---------------------------------------
  // Check NEW best BEFORE updating best
  // ---------------------------------------

  const isNewBest =
    score > best;


  if (isNewBest) {

    best = score;

    localStorage.setItem(
      "berryQuestBest",
      best
    );

  }


  updateHUD();


  // ---------------------------------------
  // Stop any previous happy timer
  // ---------------------------------------

  if (happyTimeout) {

    clearTimeout(
      happyTimeout
    );

    happyTimeout = null;

  }


  // ---------------------------------------
  // Game-over character
  // ---------------------------------------

  if (
    isNewBest &&
    score > 0
  ) {

    playHappyAnimation();

  } else {

    setPlayerState(
      "idle",
      true
    );

  }


  // ---------------------------------------
  // Message
  // ---------------------------------------

  message.querySelector("h2").textContent =
    "Game Over 💗";

  message.querySelector(".big-icon").textContent =
    isNewBest
      ? "🏆"
      : "🍓";

  message.querySelector(
    ".message-box p"
  ).innerHTML =
    `You collected <strong>${score}</strong> points!<br>
     Best score: <strong>${best}</strong>`;


  startBtn.textContent =
    "PLAY AGAIN ✨";

  message.classList.remove(
    "hidden"
  );


  beep(
    180,
    0.2,
    "sawtooth"
  );

}


// =========================================
// HAPPY ANIMATION
// =========================================

function playHappyAnimation() {

  setPlayerState(
    "happy",
    true
  );


  happyTimeout =
    setTimeout(() => {

      happyTimeout = null;

      setPlayerState(
        "idle",
        true
      );

    }, 1800);

}


// =========================================
// JUMP
// =========================================

function jump() {

  if (!running) {
    return;
  }

  if (jumping) {
    return;
  }

  if (currentState === "hurt") {
    return;
  }


  jumping = true;

  velocityY = 700;


  setPlayerState(
    "jump",
    true
  );


  beep(
    850,
    0.06
  );

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
    18 +
    Math.random() * 72;

  const y =
    35 +
    Math.random() * 38;


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


  const x =
    Math.random() > 0.5
      ? -5
      : 101;


  const y =
    bee
      ? 85 +
        Math.random() * 80
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

function rectsOverlap(
  a,
  b
) {

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

function collectObject(
  obj,
  index
) {

  obj.el.remove();

  objects.splice(
    index,
    1
  );


  if (
    obj.type === "golden"
  ) {

    score += 50;

    beep(
      1100,
      0.12
    );

  } else {

    score += 10;

    beep(
      760,
      0.06
    );

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

  if (hitCooldown > 0) {
    return;
  }


  lives--;

  hitCooldown = 1.2;


  // ---------------------------------------
  // Clear previous hurt timer
  // ---------------------------------------

  if (hurtTimeout) {

    clearTimeout(
      hurtTimeout
    );

  }


  // ---------------------------------------
  // Hurt animation
  // ---------------------------------------

  setPlayerState(
    "hurt",
    true
  );


  player.classList.add(
    "flash"
  );


  hurtTimeout =
    setTimeout(() => {

      hurtTimeout = null;

      player.classList.remove(
        "flash"
      );


      if (
        running &&
        lives > 0
      ) {

        if (jumping) {

          setPlayerState(
            "jump",
            true
          );

        } else {

          setPlayerState(
            "idle",
            true
          );

        }

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

function smashEnemy(
  obj,
  index
) {

  obj.el.remove();

  objects.splice(
    index,
    1
  );


  playerY =
    Math.max(
      playerY,
      8
    );


  velocityY = 620;

  jumping = true;


  score += 25;


  if (score > best) {

    best = score;

    localStorage.setItem(
      "berryQuestBest",
      best
    );

  }


  setPlayerState(
    "jump",
    true
  );


  updateHUD();


  beep(
    980,
    0.08
  );

}


// =========================================
// GAME LOOP
// =========================================

function gameLoop(timestamp) {

  const dt =
    Math.min(
      (timestamp - lastTime) /
        1000 || 0,
      0.033
    );


  lastTime = timestamp;


  // =======================================
  // RUNNING GAME
  // =======================================

  if (running) {

    hitCooldown =
      Math.max(
        0,
        hitCooldown - dt
      );


    // =====================================
    // MOVEMENT
    // =====================================

    const movingLeft =
      keys.ArrowLeft;

    const movingRight =
      keys.ArrowRight;

    const moving =
      movingLeft ||
      movingRight;


    // =====================================
    // PLAYER HORIZONTAL MOVEMENT
    // =====================================

    if (movingLeft) {

      playerX -=
        45 * dt;

      playerSprite.style.transform =
        "scaleX(-1)";

    }


    if (movingRight) {

      playerX +=
        45 * dt;

      playerSprite.style.transform =
        "scaleX(1)";

    }


    playerX =
      Math.max(
        2,
        Math.min(
          93,
          playerX
        )
      );


    // =====================================
    // JUMP PHYSICS
    // =====================================

    if (jumping) {

      playerY +=
        velocityY * dt;

      velocityY -=
        1750 * dt;


      // -----------------------------------
      // LANDING
      // -----------------------------------

      if (playerY <= 0) {

        playerY = 0;

        velocityY = 0;

        jumping = false;


        // After landing,
        // immediately choose idle/run.
        if (moving) {

          setPlayerState(
            "run",
            true
          );

        } else {

          setPlayerState(
            "idle",
            true
          );

        }

      }

    }


    // =====================================
    // CHARACTER STATE
    // =====================================

    if (jumping) {

      // -----------------------------------
      // Jump pose depends on direction
      // -----------------------------------
      //
      // jump-1 = going UP
      // jump-2 = coming DOWN
      //

      if (velocityY > 0) {

        if (
          currentState !== "jump" ||
          animationFrame !== 0
        ) {

          currentState = "jump";

          animationFrame = 0;
          animationTimer = 0;

          setSprite(
            animations.jump.frames[0]
          );

        }

      } else {

        if (
          currentState !== "jump" ||
          animationFrame !== 1
        ) {

          currentState = "jump";

          animationFrame = 1;
          animationTimer = 0;

          setSprite(
            animations.jump.frames[1]
          );

        }

      }

    }

    else {

      // -----------------------------------
      // RUN / IDLE
      // -----------------------------------

      if (moving) {

        setPlayerState(
          "run"
        );

      } else {

        setPlayerState(
          "idle"
        );

      }

    }


    // =====================================
    // UPDATE ANIMATION
    // =====================================

    // Run + idle use the normal animation
    // engine. Jump is controlled by velocity.
    if (
      currentState === "run" ||
      currentState === "idle"
    ) {

      updateAnimation(dt);

    }


    // =====================================
    // SPAWN TIMERS
    // =====================================

    spawnTimer += dt;

    enemyTimer += dt;


    const berryRate =
      Math.max(
        0.65,
        1.15 -
        score / 1800
      );


    const enemyRate =
      Math.max(
        0.85,
        1.8 -
        score / 1200
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


    // =====================================
    // COLLISIONS
    // =====================================

    const pRect =
      playerRect();

    const gameRect =
      game.getBoundingClientRect();


    for (
      let index =
        objects.length - 1;

      index >= 0;

      index--
    ) {

      const obj =
        objects[index];


      // ===================================
      // ENEMY
      // ===================================

      if (
        obj.type === "enemy"
      ) {

        obj.x +=
          obj.direction *
          obj.speed *
          dt;


        obj.el.style.left =
          `${obj.x}%`;


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
        // SMASH ENEMY
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
        // NORMAL HIT
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
        // ENEMY OUTSIDE
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


  // =======================================
  // ALWAYS UPDATE POSITION
  // =======================================

  setPlayerPosition();


  requestAnimationFrame(
    gameLoop
  );

testRunSprite();

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

    btn.addEventListener(
      "pointercancel",
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

      beep(
        700,
        0.06
      );

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
// INITIALIZE
// =========================================

setPlayerState(
  "idle",
  true
);

setPlayerPosition();

lastTime =
  performance.now();

requestAnimationFrame(
  gameLoop
);