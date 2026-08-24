const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const baseEnemySpeed = 1.2;
const baseEnemyShotInterval = 1200;

let score = 0;
let lives = 3;
let stage = 1;
let gameOver = false;

let lastDiveTime = 0;
const diveInterval = 2000;

let lastEnemyShotTime = 0;
let enemyShotInterval = baseEnemyShotInterval;

let playerInvincible = false;
let invincibleUntil = 0;
const invincibleDuration = 1200;

const stars = [];
const starCount = 80;

const explosions = [];
const enemyBullets = [];

let stageTransition = false;
let stageTransitionUntil = 0;
const stageTransitionDuration = 1200;

let audioContext = null;
let highScore = Number(localStorage.getItem("galagaHighScore")) || 0;

const player = {
    width: 50,
    height: 30,
    x: canvas.width / 2 - 25,
    y: canvas.height - 70,
    speed: 6
};

const keys = {
    left: false,
    right: false
};

const bullets = [];

const enemies = [];
const enemyRows = 3;
const enemyCols = 8;
const enemyWidth = 34;
const enemyHeight = 24;
const enemyGap = 18;

let enemyDirection = 1;
let enemySpeed = baseEnemySpeed;

let paused = false;
let pauseStartedAt = 0;

let gameStarted = false;
let stageStartedAt = 0;

function createEnemies() {
        
    const formationWidth =
        enemyCols * enemyWidth +
        (enemyCols - 1) * enemyGap;

    const startX =
        (canvas.width - formationWidth) / 2;

    const startY = 120;

    for (let row = 0; row < enemyRows; row++) {
        for (let col = 0; col < enemyCols; col++) {
                let type;

                if (row === 0) {
                        type = "boss";
                } else if (row === 1) {
                        type = "butterfly";
                } else {
                        type = "bee";
                }

                enemies.push({
                        //x: startX + col * (enemyWidth + enemyGap),
                        x: canvas.width / 2,
                        //y: -100 - row * 30,
                        y: -80 - row * 25,

                        homeX: startX + col * (enemyWidth + enemyGap),
                        homeY: startY + row * (enemyHeight + enemyGap),

                        width: enemyWidth,
                        height: enemyHeight,

                        type: type,
                        hitsRemaining: type === "boss" ? 2 : 1,

                        state: "entering",

                        entryDelay: row * 150 + col * 90,
                        entryTime: 0,
                        entryStartX: 0,
                        entryStartY: 0,

                        rotation: 0,

                        diveSpeed: 3,
                        diveTargetX: 0,
                        diveStartX: 0,
                        diveTime: 0
                });
        }
    }
}

document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
        keys.left = true;
    }

    if (event.key === "ArrowRight") {
        keys.right = true;
    }

    if (
        event.code === "Space" &&
        !event.repeat &&
        gameStarted &&
        !paused &&
        !gameOver &&
        !stageTransition
        ) {
        fireBullet();
        }

    if (event.code === "Enter" && !gameStarted) {
        gameStarted = true;
        stageStartedAt = performance.now();
    }

    if (event.code === "Enter" && gameOver) {
        restartGame();
    }

    if (event.code === "KeyP" && !event.repeat && !gameOver) {
        const now = performance.now();

        if (!paused) {
                // Pause 시작
                paused = true;
                pauseStartedAt = now;
        } else {
                // Pause 종료
                paused = false;

                const pausedDuration =
                now - pauseStartedAt;

                // 모든 timestamp 기반 타이머를
                // pause한 시간만큼 뒤로 밀어준다.
                lastDiveTime += pausedDuration;
                lastEnemyShotTime += pausedDuration;

                if (playerInvincible) {
                invincibleUntil += pausedDuration;
                }

                if (stageTransition) {
                stageTransitionUntil += pausedDuration;
                }

                pauseStartedAt = 0;
        }
        }
});

document.addEventListener("keyup", (event) => {
    if (event.key === "ArrowLeft") {
        keys.left = false;
    }

    if (event.key === "ArrowRight") {
        keys.right = false;
    }
});

function fireBullet() {
    bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 12,
        speed: 8
    });
    playTone(700, 0.08, "square", 0.04);
}

function update(timestamp) {
    if (!gameStarted) {
        updateStars();
        return;
    }

    if (gameOver) {
        return;
    }

    if (paused) {
        return;
    }

    if (stageTransition) {
        updateStars();
        updateExplosions();

        if (timestamp >= stageTransitionUntil) {
                stageTransition = false;
                stageStartedAt = timestamp;
                createEnemies();
        }
        return;
    }

    if (playerInvincible && timestamp >= invincibleUntil) {
        playerInvincible = false;
    }

    updateStars();
    updatePlayer();
    updateBullets();
    updateEnemyBullets();
    updateEnemies(timestamp);
    updateExplosions();

    tryEnemyShoot(timestamp);

    checkBulletEnemyCollisions();
    checkEnemyPlayerCollisions(timestamp);
    checkEnemyBulletPlayerCollisions(timestamp);

    if (enemies.length === 0) {
        startNextStage(timestamp);
    }

    if (lives <= 0) {
        gameOver = true;
    }
}

function restartGame() {
    score = 0;
    lives = 3;
    stage = 1;
    gameOver = false;

    bullets.length = 0;
    enemyBullets.length = 0;
    enemies.length = 0;
    explosions.length = 0;

    enemyDirection = 1;
    enemySpeed = baseEnemySpeed;
    enemyShotInterval = baseEnemyShotInterval;

    lastDiveTime = 0;
    lastEnemyShotTime = 0;

    playerInvincible = false;
    invincibleUntil = 0;

    stageTransition = false;
    stageTransitionUntil = 0;

    paused = false;

    paused = false;
    pauseStartedAt = 0;
    
    resetPlayer();
    createEnemies();
}

function checkBulletEnemyCollisions() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];

            const hit =
                bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y;

            if (hit) {
                bullets.splice(i, 1);

                enemy.hitsRemaining--;

                createExplosion(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2
                );

                playTone(
                    180,
                    0.15,
                    "sawtooth",
                    0.06
                );

                if (enemy.hitsRemaining <= 0) {
                    if (enemy.type === "boss") {
                        score += 300;
                    } else if (enemy.type === "butterfly") {
                        score += 200;
                    } else {
                        score += 100;
                    }

                    enemies.splice(j, 1);

                    if (score > highScore) {
                        highScore = score;

                        localStorage.setItem(
                            "galagaHighScore",
                            highScore
                        );
                    }
                }

                break;
            }
        }
    }
}

function updatePlayer() {
    if (keys.left) {
        player.x -= player.speed;
    }

    if (keys.right) {
        player.x += player.speed;
    }

    if (player.x < 0) {
        player.x = 0;
    }

    if (player.x + player.width > canvas.width) {
        player.x = canvas.width - player.width;
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        bullets[i].y -= bullets[i].speed;

        if (bullets[i].y + bullets[i].height < 0) {
            bullets.splice(i, 1);
        }
    }
}

function updateEnemies(timestamp) {
    let hitEdge = false;

    for (const enemy of enemies) {

        if (enemy.state === "entering") {
                const elapsed = timestamp - stageStartedAt;

                if (elapsed >= enemy.entryDelay) {

                        if (enemy.entryTime === 0) {
                        enemy.entryStartX = enemy.x;
                        enemy.entryStartY = enemy.y;
                        }

                        enemy.entryTime += 0.025;

                        const t = Math.min(enemy.entryTime, 1);

                        const curve =
                        Math.sin(t * Math.PI) * 120;

                        enemy.x =
                        enemy.entryStartX +
                        (enemy.homeX - enemy.entryStartX) * t +
                        curve * (enemy.homeX < canvas.width / 2 ? -1 : 1);

                        enemy.y =
                        enemy.entryStartY +
                        (enemy.homeY - enemy.entryStartY) * t;

                        enemy.rotation =
                                Math.sin(t * Math.PI) * 0.8;

                        if (t >= 1) {
                        enemy.x = enemy.homeX;
                        enemy.y = enemy.homeY;
                        enemy.rotation = 0;
                        enemy.state = "formation";
                        enemy.entryTime = 0;
                        }
                }

                continue;
                }

        if (enemy.state === "formation") {
            enemy.x += enemySpeed * enemyDirection;

            if (
                enemy.x <= 10 ||
                enemy.x + enemy.width >= canvas.width - 10
            ) {
                hitEdge = true;
            }
        }

        if (enemy.state === "diving") {
            enemy.diveTime += 0.06;

            const wave =
                Math.sin(enemy.diveTime * 3) * 45;

            const targetDirection =
                (enemy.diveTargetX - enemy.diveStartX) * 0.015;

            enemy.x += targetDirection;
            enemy.x += wave * 0.03;

            enemy.y += enemy.diveSpeed;

            if (enemy.y > canvas.height) {
                enemy.state = "formation";
                enemy.y = enemy.homeY;
                enemy.x = enemy.homeX;
                enemy.diveTime = 0;
            }
        }
    }

    if (hitEdge) {
        enemyDirection *= -1;
    }

    if (timestamp - lastDiveTime > diveInterval) {
        startEnemyDive();
        lastDiveTime = timestamp;
    }
}

function startEnemyDive() {
    const formationEnemies =
        enemies.filter(enemy => enemy.state === "formation");

    if (formationEnemies.length === 0) {
        return;
    }

    const index =
        Math.floor(Math.random() * formationEnemies.length);

    const enemy = formationEnemies[index];

    enemy.state = "diving";

    enemy.diveTargetX =
        player.x + player.width / 2;

    enemy.diveStartX = enemy.x;
    enemy.diveTime = 0;
}

function drawPlayer() {
    if (playerInvincible) {
        const blink =
            Math.floor(performance.now() / 100) % 2;

        if (blink === 0) {
            return;
        }
    }

    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;

    // 중앙 몸통
    ctx.fillStyle = "white";
    ctx.fillRect(
        x + w * 0.42,
        y,
        w * 0.16,
        h * 0.75
    );

    // 기수
    ctx.fillStyle = "cyan";
    ctx.beginPath();
    ctx.moveTo(
        x + w / 2,
        y - h * 0.25
    );
    ctx.lineTo(
        x + w * 0.38,
        y + h * 0.15
    );
    ctx.lineTo(
        x + w * 0.62,
        y + h * 0.15
    );
    ctx.closePath();
    ctx.fill();

    // 왼쪽 날개
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(
        x + w * 0.42,
        y + h * 0.30
    );
    ctx.lineTo(
        x,
        y + h
    );
    ctx.lineTo(
        x + w * 0.38,
        y + h * 0.75
    );
    ctx.closePath();
    ctx.fill();

    // 오른쪽 날개
    ctx.beginPath();
    ctx.moveTo(
        x + w * 0.58,
        y + h * 0.30
    );
    ctx.lineTo(
        x + w,
        y + h
    );
    ctx.lineTo(
        x + w * 0.62,
        y + h * 0.75
    );
    ctx.closePath();
    ctx.fill();

    // 엔진
    ctx.fillStyle = "yellow";

    ctx.fillRect(
        x + w * 0.30,
        y + h * 0.72,
        w * 0.12,
        h * 0.20
    );

    ctx.fillRect(
        x + w * 0.58,
        y + h * 0.72,
        w * 0.12,
        h * 0.20
    );
}

function drawBullets() {
    ctx.fillStyle = "yellow";

    for (const bullet of bullets) {
        ctx.fillRect(
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        drawEnemy(enemy);
    }
}

function drawEnemy(enemy) {
    const x = enemy.x;
    const y = enemy.y;
    const w = enemy.width;
    const h = enemy.height;

    ctx.save();

    ctx.translate(
        x + w / 2,
        y + h / 2
    );

    ctx.rotate(enemy.rotation || 0);

    ctx.translate(
        -(x + w / 2),
        -(y + h / 2)
    );

    const diving = enemy.state === "diving";

    // 몸통
    let bodyColor;

    if (enemy.type === "boss") {
        bodyColor =
                enemy.hitsRemaining === 1
                ? "yellow"
                : "green";
        } else if (enemy.type === "butterfly") {
                bodyColor = "red";
        } else {
                bodyColor = "blue";
        }

        if (diving && enemy.type !== "boss") {
                bodyColor = "orange";
        }

        ctx.fillStyle = bodyColor;

    ctx.fillRect(
        x + w * 0.35,
        y + h * 0.20,
        w * 0.30,
        h * 0.55
    );

    // 머리
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(
        x + w / 2,
        y + h * 0.20,
        w * 0.13,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // 왼쪽 날개
    ctx.fillStyle = "magenta";
    ctx.beginPath();
    ctx.moveTo(
        x + w * 0.35,
        y + h * 0.35
    );
    ctx.lineTo(
        x,
        y + h * 0.10
    );
    ctx.lineTo(
        x + w * 0.15,
        y + h * 0.75
    );
    ctx.lineTo(
        x + w * 0.40,
        y + h * 0.60
    );
    ctx.closePath();
    ctx.fill();

    // 오른쪽 날개
    ctx.beginPath();
    ctx.moveTo(
        x + w * 0.65,
        y + h * 0.35
    );
    ctx.lineTo(
        x + w,
        y + h * 0.10
    );
    ctx.lineTo(
        x + w * 0.85,
        y + h * 0.75
    );
    ctx.lineTo(
        x + w * 0.60,
        y + h * 0.60
    );
    ctx.closePath();
    ctx.fill();

    // 아래쪽 다리/꼬리
    ctx.fillStyle = "cyan";

    ctx.fillRect(
        x + w * 0.25,
        y + h * 0.68,
        w * 0.12,
        h * 0.25
    );

    ctx.fillRect(
        x + w * 0.63,
        y + h * 0.68,
        w * 0.12,
        h * 0.25
    );

    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 별 배경은 시작 화면에서도 계속 보여준다.
    drawStars();

    // =========================
    // START SCREEN
    // =========================
    if (!gameStarted) {
        ctx.fillStyle = "white";
        ctx.textAlign = "center";

        ctx.font = "48px Arial";
        ctx.fillText(
            "GALAGA",
            canvas.width / 2,
            canvas.height / 2 - 80
        );

        ctx.font = "24px Arial";
        ctx.fillStyle = "yellow";
        ctx.fillText(
            "PRESS ENTER TO START",
            canvas.width / 2,
            canvas.height / 2
        );

        ctx.fillStyle = "white";
        ctx.font = "18px Arial";

        ctx.fillText(
            "Arrow Keys: Move",
            canvas.width / 2,
            canvas.height / 2 + 60
        );

        ctx.fillText(
            "Space: Fire   P: Pause",
            canvas.width / 2,
            canvas.height / 2 + 90
        );

        // 여기서 draw()를 끝낸다.
        // 게임 화면은 아직 그리지 않는다.
        return;
    }

    // =========================
    // NORMAL GAME SCREEN
    // =========================

    ctx.fillStyle = "white";
    ctx.font = "24px Arial";

    // Title
    ctx.textAlign = "center";
    ctx.fillText(
        "GALAGA",
        canvas.width / 2,
        50
    );

    // Score
    ctx.textAlign = "left";
    ctx.fillText(
        `SCORE: ${score}`,
        20,
        50
    );

    // Lives
    ctx.textAlign = "right";
    ctx.fillText(
        `LIVES: ${lives}`,
        canvas.width - 20,
        50
    );

    // Stage
    ctx.textAlign = "center";
    ctx.fillText(
        `STAGE: ${stage}`,
        canvas.width / 2,
        85
    );

    // High Score
    ctx.font = "18px Arial";
    ctx.fillText(
        `HIGH SCORE: ${highScore}`,
        canvas.width / 2,
        110
    );

    // Game objects
    drawEnemies();
    drawPlayer();
    drawBullets();
    drawEnemyBullets();
    drawExplosions();

    // =========================
    // STAGE TRANSITION
    // =========================
    if (stageTransition) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle = "yellow";
        ctx.font = "52px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            `STAGE ${stage}`,
            canvas.width / 2,
            canvas.height / 2
        );
    }

    // =========================
    // PAUSE SCREEN
    // =========================
    if (paused) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle = "yellow";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "PAUSED",
            canvas.width / 2,
            canvas.height / 2
        );

        ctx.fillStyle = "white";
        ctx.font = "20px Arial";

        ctx.fillText(
            "Press P to continue",
            canvas.width / 2,
            canvas.height / 2 + 45
        );
    }

    // =========================
    // GAME OVER SCREEN
    // =========================
    if (gameOver) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        ctx.fillStyle = "red";
        ctx.font = "48px Arial";
        ctx.textAlign = "center";

        ctx.fillText(
            "GAME OVER",
            canvas.width / 2,
            canvas.height / 2 - 20
        );

        ctx.fillStyle = "white";
        ctx.font = "24px Arial";

        ctx.fillText(
            "Press ENTER to restart",
            canvas.width / 2,
            canvas.height / 2 + 40
        );
    }
}

function gameLoop(timestamp) {
    update(timestamp);
    draw();

    requestAnimationFrame(gameLoop);
}

function checkEnemyPlayerCollisions(timestamp) {
    if (playerInvincible) {
        return;
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        if (enemy.state !== "diving") {
            continue;
        }

        const hit =
            enemy.x < player.x + player.width &&
            enemy.x + enemy.width > player.x &&
            enemy.y < player.y + player.height &&
            enemy.y + enemy.height > player.y;

        if (hit) {
            lives--;
            playTone(90, 0.35, "sawtooth", 0.08);

            createExplosion(
                player.x + player.width / 2,
                player.y + player.height / 2
            );

            enemy.state = "formation";
            enemy.x = enemy.homeX;
            enemy.y = enemy.homeY;

            resetPlayer();

            playerInvincible = true;
            invincibleUntil =
                timestamp + invincibleDuration;

            break;
        }
    }
}

function resetPlayer() {
    player.x =
        canvas.width / 2 -
        player.width / 2;
}

function createStars() {
    for (let i = 0; i < starCount; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: Math.random() * 2 + 1,
            speed: Math.random() * 1.5 + 0.5
        });
    }
}

function updateStars() {
    for (const star of stars) {
        star.y += star.speed;

        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    }
}

function drawStars() {
    ctx.fillStyle = "white";

    for (const star of stars) {
        ctx.fillRect(
            star.x,
            star.y,
            star.size,
            star.size
        );
    }
}

function createExplosion(x, y) {
    const particleCount = 14;

    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;

        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30,
            size: Math.random() * 3 + 2
        });
    }

    explosions.push(particles);
}

function updateExplosions() {
    for (let i = explosions.length - 1; i >= 0; i--) {
        const particles = explosions[i];

        for (const particle of particles) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life--;
        }

        if (particles.every(particle => particle.life <= 0)) {
            explosions.splice(i, 1);
        }
    }
}

function drawExplosions() {
    for (const particles of explosions) {
        for (const particle of particles) {
            if (particle.life <= 0) {
                continue;
            }

            const alpha = particle.life / 30;

            ctx.fillStyle = `rgba(255, 180, 0, ${alpha})`;

            ctx.fillRect(
                particle.x,
                particle.y,
                particle.size,
                particle.size
            );
        }
    }
}

function fireEnemyBullet(enemy) {
    enemyBullets.push({
        x: enemy.x + enemy.width / 2 - 2,
        y: enemy.y + enemy.height,
        width: 4,
        height: 14,
        speed: 4
    });
}

function updateEnemyBullets() {
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        enemyBullets[i].y += enemyBullets[i].speed;

        if (enemyBullets[i].y > canvas.height) {
            enemyBullets.splice(i, 1);
        }
    }
}

function drawEnemyBullets() {
    for (const bullet of enemyBullets) {
        ctx.save();

        // 바깥쪽 glow
        ctx.shadowColor = "lime";
        ctx.shadowBlur = 12;

        // 탄 중심
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(
            bullet.x + bullet.width / 2,
            bullet.y + bullet.height / 2,
            3,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // 꼬리
        ctx.fillStyle = "lime";
        ctx.fillRect(
            bullet.x + bullet.width / 2 - 1,
            bullet.y,
            2,
            bullet.height
        );

        ctx.restore();
    }
}

function tryEnemyShoot(timestamp) {
    if (timestamp - lastEnemyShotTime < enemyShotInterval) {
        return;
    }

    const candidates =
        enemies.filter(enemy => enemy.state === "formation");

    if (candidates.length === 0) {
        return;
    }

    const index =
        Math.floor(Math.random() * candidates.length);

    fireEnemyBullet(candidates[index]);

    lastEnemyShotTime = timestamp;
}

function checkEnemyBulletPlayerCollisions(timestamp) {
    if (playerInvincible) {
        return;
    }

    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const bullet = enemyBullets[i];

        const hit =
            bullet.x < player.x + player.width &&
            bullet.x + bullet.width > player.x &&
            bullet.y < player.y + player.height &&
            bullet.y + bullet.height > player.y;

        if (hit) {
            enemyBullets.splice(i, 1);

            lives--;
            playTone(90, 0.35, "sawtooth", 0.08);

            createExplosion(
                player.x + player.width / 2,
                player.y + player.height / 2
            );

            resetPlayer();

            playerInvincible = true;
            invincibleUntil =
                timestamp + invincibleDuration;

            break;
        }
    }
}

function startNextStage(timestamp) {
    stage++;

    bullets.length = 0;
    enemyBullets.length = 0;

    enemyDirection = 1;

    enemySpeed =
        baseEnemySpeed + (stage - 1) * 0.25;

    enemyShotInterval =
        Math.max(
            400,
            baseEnemyShotInterval - (stage - 1) * 100
        );

    lastDiveTime = 0;
    lastEnemyShotTime = 0;

    stageTransition = true;
    stageTransitionUntil =
        timestamp + stageTransitionDuration;
}

function getAudioContext() {
    if (!audioContext) {
        audioContext =
            new (window.AudioContext || window.webkitAudioContext)();
    }

    return audioContext;
}

function playTone(frequency, duration, type = "square", volume = 0.05) {
    const audio = getAudioContext();

    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.value = volume;

    oscillator.connect(gain);
    gain.connect(audio.destination);

    oscillator.start();

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        audio.currentTime + duration
    );

    oscillator.stop(
        audio.currentTime + duration
    );
}

createStars();
createEnemies();
requestAnimationFrame(gameLoop);