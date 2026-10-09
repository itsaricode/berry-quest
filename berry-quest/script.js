/* =========================================================
   BERRY QUEST 🍓
   SIMPLE CHARACTER SYSTEM

   Character:
   IDLE  → idle-1 + idle-2
   MOVE  → same idle sprites + flip
   JUMP  → jump-1 + jump-2
   HURT  → hurt.png
   HAPPY → happy-1 + happy-2

   RUN SPRITES ARE NOT USED FOR NOW.
========================================================= */


/* =========================================================
   DOM ELEMENTS
========================================================= */

const game = document.getElementById("game");
const player = document.getElementById("player");
const playerSprite = document.getElementById("playerSprite");

const scoreEl = document.getElementById("score");
const bestEl = document.getElementById("best");
const livesEl = document.getElementById("lives");

const message = document.getElementById("message");
const startBtn = document.getElementById("startBtn");
const soundBtn = document.getElementById("soundBtn");


/* =========================================================
   CHARACTER SPRITES
========================================================= */

const sprites = {

    idle: [
        "assets/character/idle-1.png",
        "assets/character/idle-2.png"
    ],

    jump: [
        "assets/character/jump-1.png",
        "assets/character/jump-2.png"
    ],

    hurt: "assets/character/hurt.png",

    happy: [
        "assets/character/happy-1.png",
        "assets/character/happy-2.png"
    ]
};


/* =========================================================
   GAME VARIABLES
========================================================= */

let score = 0;
let lives = 3;

let best = Number(
    localStorage.getItem("berryQuestBest") || 0
);

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


/* =========================================================
   CHARACTER ANIMATION VARIABLES
========================================================= */

let idleFrame = 0;
let idleTimer = 0;


/* HAPPY ANIMATION */

let happyActive = false;
let happyFrame = 0;
let happyTimer = 0;


/* HURT ANIMATION */

let hurtActive = false;
let hurtTimer = 0;


/* HIGH SCORE */

let newBestThisRun = false;
let happyShownThisRun = false;


/* =========================================================
   CONSTANTS
========================================================= */

const GRAVITY = 1200;
const JUMP_POWER = 520;

const PLAYER_SPEED = 45;

const HAPPY_FRAME_TIME = 0.18;
const IDLE_FRAME_TIME = 0.45;
const HURT_DURATION = 0.65;


/* =========================================================
   BASIC SPRITE FUNCTION
=========================================================

   Ye function sirf sprite change karta hai.

   Agar hum kahen:

   setCharacterSprite("assets/character/hurt.png");

   to character hurt image dikhaegi.
========================================================= */

function setCharacterSprite(src) {

    if (playerSprite.getAttribute("src") !== src) {
        playerSprite.setAttribute("src", src);
    }
}


/* =========================================================
   IDLE ANIMATION
=========================================================

   Standing character:

   idle-1
      ↓
   idle-2
      ↓
   idle-1
      ↓
   idle-2
========================================================= */

function updateIdleAnimation(dt) {

    idleTimer += dt;

    if (idleTimer >= IDLE_FRAME_TIME) {

        idleTimer = 0;

        idleFrame++;

        if (idleFrame >= sprites.idle.length) {
            idleFrame = 0;
        }

        setCharacterSprite(
            sprites.idle[idleFrame]
        );
    }
}


/* =========================================================
   JUMP SPRITE
=========================================================

   Going UP:
       jump-1

   Coming DOWN:
       jump-2
========================================================= */

function updateJumpSprite() {

    if (velocityY > 0) {

        setCharacterSprite(
            sprites.jump[0]
        );

    } else {

        setCharacterSprite(
            sprites.jump[1]
        );
    }
}


/* =========================================================
   HAPPY ANIMATION
=========================================================

   Ye GAMEOVER ke liye nahi hai.

   Ye gameplay ke DURING chalegi.

   happy-1
      ↓
   happy-2
      ↓
   normal gameplay
========================================================= */

function triggerHappy() {

    /*
       Agar already happy animation chal rahi hai
       to dobara restart nahi karni.
    */

    if (happyActive || hurtActive) {
        return;
    }

    happyActive = true;

    happyFrame = 0;

    happyTimer = 0;

    setCharacterSprite(
        sprites.happy[0]
    );
}


/* =========================================================
   UPDATE HAPPY ANIMATION
========================================================= */

function updateHappy(dt) {

    if (!happyActive) {
        return;
    }

    happyTimer += dt;

    if (happyTimer >= HAPPY_FRAME_TIME) {

        happyTimer = 0;

        happyFrame++;

        /*
           Happy animation complete
        */

        if (happyFrame >= sprites.happy.length) {

            happyActive = false;

            happyFrame = 0;

            restoreNormalSprite();

            return;
        }

        setCharacterSprite(
            sprites.happy[happyFrame]
        );
    }
}


/* =========================================================
   RESTORE NORMAL CHARACTER
=========================================================

   Happy ya hurt ke baad:

   Agar jumping hai:
       jump sprite

   Agar ground par hai:
       idle sprite
========================================================= */

function restoreNormalSprite() {

    idleFrame = 0;
    idleTimer = 0;

    if (jumping) {

        updateJumpSprite();

    } else {

        setCharacterSprite(
            sprites.idle[0]
        );
    }
}


/* =========================================================
   HURT
========================================================= */

function triggerHurt() {

    /*
       Agar already hit cooldown mein hai
       to dobara hit nahi hoga.
    */

    if (hitCooldown > 0) {
        return;
    }

    lives--;

    livesEl.textContent = lives;

    hitCooldown = 1.2;

    hurtActive = true;

    hurtTimer = 0;

    /*
       Agar happy animation chal rahi ho
       to hurt usko cancel karega.
    */

    happyActive = false;

    setCharacterSprite(
        sprites.hurt
    );

    /*
       Small visual flash
    */

    player.classList.add("hurt");

    playSound(180, 0.12);

    if (lives <= 0) {

        endGame();

    }
}


/* =========================================================
   UPDATE HURT
========================================================= */

function updateHurt(dt) {

    if (!hurtActive) {
        return;
    }

    hurtTimer += dt;

    if (hurtTimer >= HURT_DURATION) {

        hurtActive = false;

        hurtTimer = 0;

        player.classList.remove("hurt");

        restoreNormalSprite();
    }
}


/* =========================================================
   PLAYER POSITION
========================================================= */

function GROUND_HEIGHT() {

    return game.clientHeight * 0.28;
}


function setPlayerPosition() {

    player.style.left = playerX + "%";

    player.style.bottom =
        (GROUND_HEIGHT() + playerY) + "px";
}


/* =========================================================
   JUMP
========================================================= */

function jump() {

    if (!running) {
        return;
    }

    /*
       Double jump prevent
    */

    if (jumping) {
        return;
    }

    jumping = true;

    velocityY = JUMP_POWER;

    updateJumpSprite();

    playSound(420, 0.08);
}


/* =========================================================
   SCORE
=========================================================

   IMPORTANT:

   Score yahan increase hota hai.

   Agar new BEST bana:

       best update
       localStorage update
       happy reaction
========================================================= */

function addScore(points) {

    score += points;

    scoreEl.textContent = score;


    /*
       NEW BEST
    */

    if (score > best) {

        best = score;

        newBestThisRun = true;

        localStorage.setItem(
            "berryQuestBest",
            best
        );

        bestEl.textContent = best;


        /*
           Happy reaction tab show hogi
           jab score kam az kam 50 ho.

           Is se first berry par
           character immediately happy nahi hogi.
        */

        if (
            !happyShownThisRun &&
            score >= 50
        ) {

            happyShownThisRun = true;

            triggerHappy();
        }
    }
}


/* =========================================================
   UPDATE HUD
========================================================= */

function updateHUD() {

    scoreEl.textContent = score;

    bestEl.textContent = best;

    livesEl.textContent = lives;
}


/* =========================================================
   SPAWN BERRY
========================================================= */

function spawnBerry() {

    const berry = document.createElement("div");

    berry.className = "game-object berry";

    berry.textContent = "🍓";

    berry.style.left =
        (Math.random() * 88 + 5) + "%";

    berry.style.bottom =
        (GROUND_HEIGHT() + 5) + "px";

    game.appendChild(berry);

    objects.push({

        element: berry,

        type: "berry",

        x: parseFloat(berry.style.left),

        y: 0,

        width: 5,

        height: 8

    });
}


/* =========================================================
   SPAWN GOLDEN BERRY
========================================================= */

function spawnGoldenBerry() {

    const berry = document.createElement("div");

    berry.className =
        "game-object golden-berry";

    berry.textContent = "⭐";

    berry.style.left =
        (Math.random() * 88 + 5) + "%";

    berry.style.bottom =
        (GROUND_HEIGHT() + 5) + "px";

    game.appendChild(berry);

    objects.push({

        element: berry,

        type: "golden",

        x: parseFloat(berry.style.left),

        y: 0,

        width: 5,

        height: 8

    });
}


/* =========================================================
   SPAWN ENEMY
========================================================= */

function spawnEnemy() {

    const enemy = document.createElement("div");

    enemy.className =
        "game-object enemy";

    const isBee =
        Math.random() < 0.5;

    enemy.textContent =
        isBee ? "🐝" : "🐌";

    const startX =
        Math.random() < 0.5
            ? 2
            : 92;

    enemy.style.left =
        startX + "%";

    enemy.style.bottom =
        (GROUND_HEIGHT() + 2) + "px";

    game.appendChild(enemy);

    objects.push({

        element: enemy,

        type: "enemy",

        enemyType: isBee ? "bee" : "snail",

        x: startX,

        y: 0,

        width: 6,

        height: 8,

        direction:
            startX < 50 ? 1 : -1

    });
}


/* =========================================================
   COLLISION
========================================================= */

function isColliding(obj) {

    const playerLeft = playerX;

    const playerRight =
        playerX + 7;

    const objectLeft =
        obj.x;

    const objectRight =
        obj.x + obj.width;


    return (
        playerRight > objectLeft &&
        playerLeft < objectRight
    );
}


/* =========================================================
   COLLECT OBJECT
========================================================= */

function collectObject(obj, index) {

    if (!isColliding(obj)) {
        return;
    }


    /*
       BERRY
    */

    if (obj.type === "berry") {

        addScore(10);

        playSound(650, 0.06);
    }


    /*
       GOLDEN BERRY
    */

    if (obj.type === "golden") {

        addScore(50);

        playSound(850, 0.1);
    }


    /*
       ENEMY
    */

    if (obj.type === "enemy") {

        /*
           Agar player enemy ke upar hai
           aur falling hai → SMASH
        */

        if (
            jumping &&
            velocityY < 0 &&
            playerY > 5
        ) {

            addScore(25);

            velocityY = JUMP_POWER * 0.55;

            playSound(720, 0.08);

        } else {

            /*
               Normal collision
            */

            triggerHurt();
        }
    }


    /*
       Object remove
    */

    if (
        obj.type !== "enemy" ||
        (jumping && velocityY < 0 && playerY > 5)
    ) {

        obj.element.remove();

        objects.splice(index, 1);
    }
}


/* =========================================================
   UPDATE OBJECTS
========================================================= */

function updateObjects(dt) {

    for (
        let i = objects.length - 1;
        i >= 0;
        i--
    ) {

        const obj = objects[i];


        /*
           ENEMY MOVEMENT
        */

        if (obj.type === "enemy") {

            obj.x +=
                obj.direction *
                (25 * dt);

            obj.element.style.left =
                obj.x + "%";


            /*
               Enemy wall hit

               Agar screen se bahar chala jaye
               to remove.
            */

            if (
                obj.x < -10 ||
                obj.x > 105
            ) {

                obj.element.remove();

                objects.splice(i, 1);

                continue;
            }
        }


        /*
           COLLISION
        */

        collectObject(obj, i);
    }
}


/* =========================================================
   SPAWN SYSTEM
========================================================= */

function updateSpawning(dt) {

    spawnTimer += dt;

    enemyTimer += dt;


    /*
       Berry spawn rate
    */

    const berryRate =
        Math.max(
            0.65,
            1.15 - score / 1800
        );


    if (spawnTimer >= berryRate) {

        spawnTimer = 0;

        /*
           Small chance golden berry
        */

        if (Math.random() < 0.12) {

            spawnGoldenBerry();

        } else {

            spawnBerry();
        }
    }


    /*
       Enemy spawn rate
    */

    const enemyRate =
        Math.max(
            0.85,
            1.8 - score / 1200
        );


    if (enemyTimer >= enemyRate) {

        enemyTimer = 0;

        spawnEnemy();
    }
}


/* =========================================================
   PLAYER MOVEMENT
=========================================================

   THIS IS THE MAIN MOVEMENT FUNCTION.

   LEFT:
       playerX decreases
       idle sprite remains
       character flips one way

   RIGHT:
       playerX increases
       idle sprite remains
       character flips other way

   NO RUN SPRITES HERE.
========================================================= */

function updateMovement(dt) {

    const movingLeft =
        keys["ArrowLeft"] ||
        keys["a"] ||
        keys["A"];

    const movingRight =
        keys["ArrowRight"] ||
        keys["d"] ||
        keys["D"];


    /*
       MOVE LEFT
    */

    if (movingLeft) {

        playerX -=
            PLAYER_SPEED * dt;

        /*
           Artwork ki original direction
           ki wajah se scaleX(1) = LEFT
        */

        playerSprite.style.transform =
            "scaleX(1)";
    }


    /*
       MOVE RIGHT
    */

    if (movingRight) {

        playerX +=
            PLAYER_SPEED * dt;

        /*
           scaleX(-1) = RIGHT
        */

        playerSprite.style.transform =
            "scaleX(-1)";
    }


    /*
       Screen boundaries
    */

    playerX =
        Math.max(
            2,
            Math.min(93, playerX)
        );
}


/* =========================================================
   PLAYER PHYSICS
========================================================= */

function updatePhysics(dt) {

    if (!jumping) {
        return;
    }


    /*
       Gravity
    */

    velocityY -=
        GRAVITY * dt;


    /*
       Vertical movement
    */

    playerY +=
        velocityY * dt;


    /*
       Ground
    */

    if (playerY <= 0) {

        playerY = 0;

        velocityY = 0;

        jumping = false;
    }
}


/* =========================================================
   UPDATE CHARACTER SPRITE
=========================================================

   PRIORITY:

   1. HURT
   2. HAPPY
   3. JUMP
   4. IDLE

   Is se sprites mix nahi hongi.
========================================================= */

function updateCharacter(dt) {

    /*
       HURT
    */

    if (hurtActive) {

        updateHurt(dt);

        return;
    }


    /*
       HAPPY
    */

    if (happyActive) {

        updateHappy(dt);

        return;
    }


    /*
       JUMP
    */

    if (jumping) {

        updateJumpSprite();

        return;
    }


    /*
       NORMAL / IDLE

       Ye movement ke waqt bhi chalega.

       Matlab:

       Move Left
       → idle animation + flip

       Move Right
       → idle animation + flip
    */

    updateIdleAnimation(dt);
}


/* =========================================================
   MAIN GAME UPDATE
========================================================= */

function updateGame(dt) {

    /*
       Cooldown
    */

    if (hitCooldown > 0) {

        hitCooldown -= dt;

        if (hitCooldown < 0) {
            hitCooldown = 0;
        }
    }


    /*
       Movement
    */

    updateMovement(dt);


    /*
       Jump physics
    */

    updatePhysics(dt);


    /*
       Character sprite
    */

    updateCharacter(dt);


    /*
       Objects
    */

    updateObjects(dt);


    /*
       Spawn
    */

    updateSpawning(dt);


    /*
       Position character
    */

    setPlayerPosition();
}


/* =========================================================
   GAME LOOP
========================================================= */

function gameLoop(timestamp) {

    if (!running) {
        return;
    }


    /*
       First frame
    */

    if (!lastTime) {
        lastTime = timestamp;
    }


    let dt =
        (timestamp - lastTime) / 1000;


    lastTime = timestamp;


    /*
       Prevent huge jump after tab switching
    */

    dt =
        Math.min(dt, 0.05);


    updateGame(dt);


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================================
   START GAME
========================================================= */

function startGame() {

    /*
       Reset game
    */

    score = 0;

    lives = 3;

    playerX = 8;

    playerY = 0;

    velocityY = 0;

    jumping = false;

    objects = [];

    spawnTimer = 0;

    enemyTimer = 0;

    hitCooldown = 0;

    lastTime = 0;


    /*
       Reset character animation
    */

    idleFrame = 0;

    idleTimer = 0;

    happyActive = false;

    happyFrame = 0;

    happyTimer = 0;

    hurtActive = false;

    hurtTimer = 0;


    /*
       Reset high-score tracking
    */

    newBestThisRun = false;

    happyShownThisRun = false;


    /*
       Remove old objects
    */

    const oldObjects =
        game.querySelectorAll(
            ".game-object"
        );

    oldObjects.forEach(obj => {
        obj.remove();
    });


    /*
       Reset character
    */

    setCharacterSprite(
        sprites.idle[0]
    );

    playerSprite.style.transform =
        "scaleX(1)";

    player.classList.remove("hurt");


    /*
       Update HUD
    */

    updateHUD();


    /*
       Hide message
    */

    message.classList.add("hidden");


    /*
       Button text
    */

    startBtn.textContent =
        "RESTART ✨";


    /*
       Start
    */

    running = true;


    requestAnimationFrame(
        gameLoop
    );
}


/* =========================================================
   END GAME
========================================================= */

function endGame() {

    running = false;

    hurtActive = false;

    happyActive = false;

    player.classList.remove("hurt");


    /*
       Game over message
    */

    const icon =
        message.querySelector(".big-icon");

    const title =
        message.querySelector("h2");

    const text =
        message.querySelector(
            ".message-box p"
        );


    if (newBestThisRun) {

        icon.textContent = "🏆";

        title.textContent =
            "NEW BEST! 🍓";

        text.textContent =
            `Amazing! You scored ${score} points!`;

    } else {

        icon.textContent = "🍓";

        title.textContent =
            "Game Over!";

        text.textContent =
            `You scored ${score} points.`;
    }


    message.classList.remove(
        "hidden"
    );


    startBtn.textContent =
        "PLAY AGAIN ✨";


    playSound(120, 0.25);
}


/* =========================================================
   KEYBOARD CONTROLS
========================================================= */

document.addEventListener(
    "keydown",
    function (event) {

        keys[event.key] = true;


        /*
           Prevent page scrolling
        */

        if (
            [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                " "
            ].includes(event.key)
        ) {

            event.preventDefault();
        }


        /*
           JUMP
        */

        if (
            event.key === "ArrowUp" ||
            event.key === " "
        ) {

            jump();
        }


        /*
           ENTER → start/restart
        */

        if (
            event.key === "Enter" &&
            !running
        ) {

            startGame();
        }
    }
);


document.addEventListener(
    "keyup",
    function (event) {

        keys[event.key] = false;
    }
);


/* =========================================================
   MOBILE CONTROLS
========================================================= */

document
    .querySelectorAll(
        ".mobile-controls button"
    )
    .forEach(button => {

        const key =
            button.dataset.key;


        button.addEventListener(
            "touchstart",
            function (event) {

                event.preventDefault();

                keys[key] = true;


                if (
                    key === "ArrowUp"
                ) {

                    jump();
                }
            }
        );


        button.addEventListener(
            "touchend",
            function (event) {

                event.preventDefault();

                keys[key] = false;
            }
        );


        button.addEventListener(
            "mousedown",
            function () {

                keys[key] = true;


                if (
                    key === "ArrowUp"
                ) {

                    jump();
                }
            }
        );


        button.addEventListener(
            "mouseup",
            function () {

                keys[key] = false;
            }
        );


        button.addEventListener(
            "mouseleave",
            function () {

                keys[key] = false;
            }
        );
    });


/* =========================================================
   SOUND
========================================================= */

function playSound(
    frequency = 440,
    duration = 0.1
) {

    if (!soundEnabled) {
        return;
    }


    try {

        if (!audioCtx) {

            audioCtx =
                new (
                    window.AudioContext ||
                    window.webkitAudioContext
                )();
        }


        const oscillator =
            audioCtx.createOscillator();

        const gain =
            audioCtx.createGain();


        oscillator.frequency.value =
            frequency;

        oscillator.type =
            "sine";


        gain.gain.setValueAtTime(
            0.08,
            audioCtx.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioCtx.currentTime + duration
        );


        oscillator.connect(gain);

        gain.connect(
            audioCtx.destination
        );


        oscillator.start();

        oscillator.stop(
            audioCtx.currentTime + duration
        );

    } catch (error) {

        console.log(
            "Sound unavailable."
        );
    }
}


/* =========================================================
   SOUND BUTTON
========================================================= */

soundBtn.addEventListener(
    "click",
    function () {

        soundEnabled =
            !soundEnabled;

        soundBtn.textContent =
            soundEnabled
                ? "🔊"
                : "🔇";
    }
);


/* =========================================================
   START BUTTON
========================================================= */

startBtn.addEventListener(
    "click",
    function () {

        startGame();
    }
);


/* =========================================================
   RESIZE
========================================================= */

window.addEventListener(
    "resize",
    function () {

        setPlayerPosition();
    }
);


/* =========================================================
   INITIAL SETUP
========================================================= */

bestEl.textContent = best;

livesEl.textContent = lives;

scoreEl.textContent = score;

setCharacterSprite(
    sprites.idle[0]
);

setPlayerPosition();