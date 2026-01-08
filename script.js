// --- CONFIGURATION AUDIO ---
const menuMusic = new Audio('Theme_Menu.mp3');
const gameMusic = new Audio('World1.wav');
menuMusic.loop = true; gameMusic.loop = true;

let musicVolume = localStorage.getItem('snakeMusicVol') !== null ? parseFloat(localStorage.getItem('snakeMusicVol')) : 0.5;
let sfxVolume = localStorage.getItem('snakeSfxVol') !== null ? parseFloat(localStorage.getItem('snakeSfxVol')) : 0.5;
menuMusic.volume = musicVolume; gameMusic.volume = musicVolume;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function resumeAudioContext() { if (audioCtx.state === 'suspended') audioCtx.resume(); }

function playSoundEffect(type) {
    resumeAudioContext();
    const osc = audioCtx.createOscillator(); const g = audioCtx.createGain();
    if (type === 'hit') {
        osc.type = 'square'; osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.1);
    } else if (type === 'shoot') {
        osc.type = 'triangle'; osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    } else if (type === 'dash') {
        osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, audioCtx.currentTime + 0.15);
    } else if (type === 'coin') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(900, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    } else if (type === 'lvlup') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
    }
    g.gain.setValueAtTime(sfxVolume * 0.2, audioCtx.currentTime);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

// --- CONFIGURATION RPG ---
let player = { type: 'classic', hp: 3, maxHp: 3, dmg: 10, speed: 110, xp: 0, lvl: 1, coins: 0, hasDash: false };
const characters = {
    classic: { hp: 3, dmg: 10, speed: 110, color: "#2a9d8f" },
    speedy:  { hp: 2, dmg: 8,  speed: 80,  color: "#e9c46a" },
    tank:    { hp: 5, dmg: 20, speed: 140, color: "#264653" }
};

// --- VARIABLES JEU ---
const canvas = document.getElementById("snakeGame");
const ctx = canvas.getContext("2d");
const box = 20;
let score = 0, targetScore = 5; 
let snake = [], food = {x:0, y:0, type:'apple'};
let goldCoin = null, d, nextD, gameInterval; 
let bossActive = false, isPaused = false; 

let rocks = [];
let isDashing = false;
let dashCooldown = 0;
let shakeDuration = 0, bossFlash = 0; 
let enemies = [];
let numEnemies = 2; 

let boss = { hp: 100, maxHp: 100, x:170, y:50, size: 60, dirX: 6, dirY: 3, state: 'normal', timer: 0 };
let bullets = [];

// --- FONCTIONS DE MENU ---
function showCharMenu() {
    resumeAudioContext();
    document.getElementById("start-menu").classList.add("hidden");
    document.getElementById("char-menu").classList.remove("hidden");
}

function selectChar(type) {
    // Réinitialisation complète propre
    player = { ...player, ...characters[type], type: type, coins: 0, lvl: 1, xp: 0, hasDash: false };
    document.getElementById("char-menu").classList.add("hidden");
    document.getElementById("rpg-bar").classList.remove("hidden");
    gameMusic.currentTime = 0;
    gameMusic.play();
    startRound();
}

// --- LOGIQUE DE ROUND ---
function startRound() {
    isPaused = false; score = 0; bossActive = false; bullets = []; goldCoin = null;
    
    // Le serpent commence avec une taille proportionnelle au niveau
    snake = [];
    for(let i = 0; i < player.lvl; i++) {
        snake.push({ x: (10 - i) * box, y: 10 * box });
    }
    
    d = "RIGHT"; nextD = "RIGHT";
    initEnemies();
    spawnRocks();
    spawnFood();
    updateUI();
    
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(gameLoop, player.speed);
}

function spawnRocks() {
    rocks = [];
    let count = player.lvl + 2; 
    for(let i=0; i<count; i++) {
        rocks.push({ x: Math.floor(Math.random() * 19) * box, y: Math.floor(Math.random() * 19) * box });
    }
}

function initEnemies() {
    enemies = [];
    for (let i = 0; i < numEnemies; i++) {
        enemies.push({ x: Math.floor(Math.random() * 19) * box, y: Math.floor(Math.random() * 19) * box, dirX: Math.random() > 0.5 ? 1 : -1, dirY: Math.random() > 0.5 ? 1 : -1 });
    }
}

function spawnFood() {
    food.x = Math.floor(Math.random() * 19) * box;
    food.y = Math.floor(Math.random() * 19) * box;
    food.type = bossActive ? 'ammo' : 'apple';
}

function spawnGold() {
    if (!bossActive && !goldCoin && Math.random() < 0.15) {
        goldCoin = { x: Math.floor(Math.random() * 19) * box, y: Math.floor(Math.random() * 19) * box };
    }
}

function gameLoop() { if (!isPaused) { update(); draw(); } }

function performDash() {
    if (!player.hasDash || dashCooldown > 0) return;
    
    isDashing = true;
    dashCooldown = 20;
    playSoundEffect('dash');
    shakeDuration = 5;

    for (let i = 0; i < 3; i++) {
        let headX = snake[0].x;
        let headY = snake[0].y;

        if (d === "LEFT") headX -= box;
        if (d === "UP") headY -= box;
        if (d === "RIGHT") headX += box;
        if (d === "DOWN") headY += box;

        for(let j = rocks.length - 1; j >= 0; j--) {
            if(headX === rocks[j].x && headY === rocks[j].y) {
                rocks.splice(j, 1);
                player.coins += 3;
                playSoundEffect('coin');
                shakeDuration = 8;
            }
        }

        if (headX < 0 || headX >= 400 || headY < 0 || headY >= 400) {
            triggerDamage();
            break; 
        }

        snake.unshift({x: headX, y: headY});
        snake.pop();
    }
    
    setTimeout(() => { isDashing = false; }, 100);
}

function update() {
    if (dashCooldown > 0) dashCooldown--;
    if (isDashing) return;

    d = nextD;
    let headX = snake[0].x;
    let headY = snake[0].y;

    if (d === "LEFT") headX -= box;
    if (d === "UP") headY -= box;
    if (d === "RIGHT") headX += box;
    if (d === "DOWN") headY += box;

    for(let i = rocks.length - 1; i >= 0; i--) {
        if(headX === rocks[i].x && headY === rocks[i].y) {
            triggerDamage();
            headX = 10 * box; headY = 10 * box;
        }
    }

    if (headX < 0 || headX >= 400 || headY < 0 || headY >= 400 || checkCollision({x:headX, y:headY}, snake)) {
        triggerDamage();
        headX = 10 * box; headY = 10 * box; d = "RIGHT"; nextD = "RIGHT";
    }

    updateEnemies(headX, headY);

    if (goldCoin && headX === goldCoin.x && headY === goldCoin.y) {
        player.coins += 5; goldCoin = null; playSoundEffect('coin'); updateUI();
    }

    if (headX === food.x && headY === food.y) {
        if (food.type === 'ammo') {
            bullets.push({ x: headX + 10, y: headY + 10 });
            playSoundEffect('shoot');
        } else {
            score++; player.xp += 15; playSoundEffect('eat');
            if (player.xp >= player.lvl * 50) levelUp();
            if (score >= targetScore && !bossActive) startBoss();
        }
        spawnFood(); spawnGold(); updateUI();
    } else {
        snake.pop();
    }

    snake.unshift({x: headX, y: headY});
    if (bossActive) updateBossLogic();
}

function updateEnemies(headX, headY) {
    if (bossActive) return;
    enemies.forEach(en => {
        if (Math.random() < 0.2) { 
            en.x += en.dirX * box; en.y += en.dirY * box;
            if (en.x < 0 || en.x >= 400) en.dirX *= -1;
            if (en.y < 0 || en.y >= 400) en.dirY *= -1;
        }
        let dist = Math.sqrt(Math.pow(headX + 10 - (en.x + 10), 2) + Math.pow(headY + 10 - (en.y + 10), 2));
        if (dist < 15) triggerDamage();
    });
}

function startBoss() {
    bossActive = true; goldCoin = null; enemies = []; 
    boss.hp = boss.maxHp; boss.state = 'normal';
    document.getElementById("boss-ui").classList.remove("hidden");
    document.getElementById("boss-hp-fill").style.width = "100%";
    spawnFood(); 
}

function updateBossLogic() {
    boss.timer++;
    if (boss.state === 'normal') {
        let speedMult = 1 + (1 - (boss.hp / boss.maxHp));
        boss.x += boss.dirX * speedMult; boss.y += boss.dirY * speedMult;
        if (boss.timer > 100) { boss.state = 'preparing'; boss.timer = 0; }
    } else if (boss.state === 'preparing') {
        shakeDuration = 2;
        if (boss.timer > 30) { boss.state = 'charging'; boss.timer = 0; boss.dirX *= 4; boss.dirY *= 4; }
    } else if (boss.state === 'charging') {
        boss.x += boss.dirX; boss.y += boss.dirY;
        if (boss.timer > 20) { boss.state = 'normal'; boss.timer = 0; boss.dirX /= 4; boss.dirY /= 4; }
    }

    if (boss.x <= 0 || boss.x >= 340) { boss.dirX *= -1; shakeDuration = 10; }
    if (boss.y <= 0 || boss.y >= 150) { boss.dirY *= -1; shakeDuration = 10; }

    if (bossFlash > 0) bossFlash--;

    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        let targetX = boss.x + 30, targetY = boss.y + 30;
        let angle = Math.atan2(targetY - b.y, targetX - b.x);
        b.x += Math.cos(angle) * 10; b.y += Math.sin(angle) * 10;
        if (b.x > boss.x && b.x < boss.x + boss.size && b.y > boss.y && b.y < boss.y + boss.size) {
            boss.hp -= player.dmg; bullets.splice(i, 1);
            playSoundEffect('hit'); bossFlash = 5;
            document.getElementById("boss-hp-fill").style.width = (boss.hp / boss.maxHp * 100) + "%";
            if(boss.hp <= 0) winRound();
        }
    }
}

function winRound() {
    isPaused = true; bossActive = false; player.coins += 20;
    document.getElementById("boss-ui").classList.add("hidden");
    const victoryScreen = document.getElementById("victory-screen");
    const powerDesc = document.getElementById("power-desc");
    if (!player.hasDash) {
        player.hasDash = true;
        powerDesc.innerText = "Tu as absorbé l'âme du Boss ! POUVOIR DÉBLOQUÉ : CHARGE. Appuie sur ESPACE pour pulvériser les rochers !";
    } else { powerDesc.innerText = "Boss vaincu ! Tu as récupéré un bonus de 20 pièces."; }
    victoryScreen.classList.remove("hidden");
}

function showShopAfterVictory() {
    document.getElementById("victory-screen").classList.add("hidden");
    document.getElementById("shop-menu").classList.remove("hidden");
    document.getElementById("shop-coins").innerText = player.coins;
    updateUI();
}

function buyUpgrade(stat) {
    if (stat === 'hp' && player.coins >= 10) { player.maxHp++; player.hp = player.maxHp; player.coins -= 10; playSoundEffect('coin'); }
    else if (stat === 'dmg' && player.coins >= 15) { player.dmg += 5; player.coins -= 15; playSoundEffect('coin'); }
    updateUI(); document.getElementById("shop-coins").innerText = player.coins;
}

function nextLevel() { document.getElementById("shop-menu").classList.add("hidden"); targetScore += 5; boss.maxHp += 50; numEnemies++; startRound(); }

function levelUp() {
    player.lvl++;
    player.xp = 0;
    if(player.hp < player.maxHp) player.hp++; // Soin au Level Up
    snake.push({ ...snake[snake.length-1] }); // Grandir au Level Up
    
    playSoundEffect('lvlup');
    const notif = document.getElementById("notif-lvl");
    notif.classList.remove("hidden");
    setTimeout(() => notif.classList.add("hidden"), 2000);
    updateUI();
}

function updateUI() {
    document.getElementById("hp-val").innerText = player.hp;
    document.getElementById("coins-val").innerText = player.coins;
    document.getElementById("lvl-val").innerText = player.lvl;
}

function triggerDamage() { 
    player.hp--; 
    playSoundEffect('hit'); 
    updateUI(); 
    if(player.hp <= 0) gameOver(); 
}

function gameOver() { 
    isPaused = true; 
    clearInterval(gameInterval); 
    gameMusic.pause(); 
    document.getElementById("game-over").classList.remove("hidden"); 
}

function checkCollision(head, array) { 
    for(let i=1; i<array.length; i++) {
        if(head.x === array[i].x && head.y === array[i].y) return true;
    }
    return false; 
}

function draw() {
    ctx.save();
    if (shakeDuration > 0) { ctx.translate(Math.random()*10-5, Math.random()*10-5); shakeDuration--; }
    ctx.fillStyle = "#f4a261"; ctx.fillRect(0,0,400,400);

    rocks.forEach(r => {
        ctx.fillStyle = "#7f8c8d"; ctx.fillRect(r.x+2, r.y+2, box-4, box-4);
        ctx.strokeStyle = "#2c3e50"; ctx.strokeRect(r.x+2, r.y+2, box-4, box-4);
    });

    enemies.forEach(en => {
        ctx.fillStyle = "#8338ec"; ctx.beginPath(); ctx.arc(en.x + 10, en.y + 10, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "white"; ctx.fillRect(en.x + 2, en.y + 6, 4, 4); ctx.fillRect(en.x + 14, en.y + 6, 4, 4);
    });

    if(bossActive) {
        ctx.fillStyle = (boss.state === 'preparing') ? "orange" : (bossFlash > 0 ? "white" : "#3d0000");
        ctx.fillRect(boss.x, boss.y, boss.size, boss.size);
        ctx.fillStyle = (bossFlash > 0) ? "black" : "red";
        ctx.fillRect(boss.x+10, boss.y+10, 10, 10); ctx.fillRect(boss.x+40, boss.y+10, 10, 10);
    }

    ctx.fillStyle = food.type === 'ammo' ? "white" : "red";
    ctx.beginPath(); ctx.arc(food.x+10, food.y+10, 8, 0, Math.PI*2); ctx.fill();
    if (goldCoin) { ctx.fillStyle = "#FFD700"; ctx.beginPath(); ctx.arc(goldCoin.x+10, goldCoin.y+10, 7, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = "yellow"; bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill(); });

    snake.forEach((s, i) => {
        if (isDashing) {
            ctx.fillStyle = "rgba(255, 255, 255, " + (1 - i/snake.length) + ")";
            ctx.shadowBlur = 15; ctx.shadowColor = "white";
        } else {
            ctx.fillStyle = i === 0 ? "#333" : characters[player.type].color;
            ctx.shadowBlur = 0;
        }
        ctx.fillRect(s.x, s.y, box-1, box-1);
    });
    ctx.restore();
}

document.addEventListener("keydown", e => {
    if(e.keyCode == 37 && d != "RIGHT") nextD = "LEFT";
    if(e.keyCode == 38 && d != "DOWN") nextD = "UP";
    if(e.keyCode == 39 && d != "LEFT") nextD = "RIGHT";
    if(e.keyCode == 40 && d != "UP") nextD = "DOWN";
    if(e.keyCode == 32) performDash();
});

function toggleOptions() {
    document.getElementById("start-menu").classList.toggle("hidden");
    document.getElementById("options-menu").classList.toggle("hidden");
}

function updateVolume() {
    musicVolume = document.getElementById("musicVol").value;
    sfxVolume = document.getElementById("sfxVol").value;
    menuMusic.volume = musicVolume; gameMusic.volume = musicVolume;
}
