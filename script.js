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
    } else if (type === 'eat') {
        osc.type = 'sine'; osc.frequency.setValueAtTime(600, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    }
    g.gain.setValueAtTime(sfxVolume * 0.2, audioCtx.currentTime);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.2);
}

// --- SYSTÈME DE SPRITES (106x106 par sprite) ---
const spriteSheet = new Image();
spriteSheet.src = 'snakePreview.png';

const SPRITE_SIZE = 106;

// Structure : Chaque serpent = 2 colonnes × 3 lignes
// Ligne 0 : [col 0] virage, [col 1] tête droite
// Ligne 1 : [col 0] corps droit, [col 1] tête tournée (virage)
// Ligne 2 : [col 0] queue, [col 1] langue

const sprites = {
    green: {
        colStart: 0,  // Serpent 1 : colonnes 0-1
        turn: { col: 0, row: 0 },           // Corps en virage
        head_straight: { col: 1, row: 0 },  // Tête droite
        body_straight: { col: 0, row: 1 },  // Corps droit
        head_turn: { col: 1, row: 1 },      // Tête en virage
        tail: { col: 0, row: 2 },           // Queue
        tongue: { col: 1, row: 2 }          // Langue
    },
    yellow: {
        colStart: 2,  // Serpent 2 : colonnes 2-3
        turn: { col: 2, row: 0 },
        head_straight: { col: 3, row: 0 },
        body_straight: { col: 2, row: 1 },
        head_turn: { col: 3, row: 1 },
        tail: { col: 2, row: 2 },
        tongue: { col: 3, row: 2 }
    },
    red: {
        colStart: 4,  // Serpent 3 : colonnes 4-5
        turn: { col: 4, row: 0 },
        head_straight: { col: 5, row: 0 },
        body_straight: { col: 4, row: 1 },
        head_turn: { col: 5, row: 1 },
        tail: { col: 4, row: 2 },
        tongue: { col: 5, row: 2 }
    }
};

const spriteMap = {
    classic: 'green',
    speedy: 'yellow',
    tank: 'red'
};

// Fonction pour dessiner un sprite avec rotation, offset et flip optionnels
function drawRotatedSprite(sprite, x, y, rotation, offsetY = 0, offsetX = 0, flipH = false, crop = null) {
    ctx.save();
    ctx.translate(x, y);
    ctx.translate(box/2, box/2);
    ctx.rotate(rotation);
    
    // Appliquer le flip horizontal si nécessaire
    if (flipH) {
        ctx.scale(-1, 1);
    }
    
    // Si crop est défini, on ne prend qu'une portion du sprite
    if (crop) {
        ctx.drawImage(
            spriteSheet,
            sprite.col * SPRITE_SIZE + crop.sx,
            sprite.row * SPRITE_SIZE + crop.sy,
            crop.sw,
            crop.sh,
            -box/2 + offsetX,
            -box/2 + offsetY,
            box, box
        );
    } else {
        // Dessin normal
        ctx.drawImage(
            spriteSheet,
            sprite.col * SPRITE_SIZE,
            sprite.row * SPRITE_SIZE,
            SPRITE_SIZE,
            SPRITE_SIZE,
            -box/2 + offsetX, -box/2 + offsetY,
            box, box
        );
    }
    ctx.restore();
}

// Fonction pour obtenir la direction entre deux segments
function getDirection(from, to) {
    if (to.x > from.x) return 'right';
    if (to.x < from.x) return 'left';
    if (to.y > from.y) return 'down';
    if (to.y < from.y) return 'up';
    return 'right';
}

// Fonction pour obtenir le sprite et la rotation appropriés
function getSegmentSpriteData(index, snake) {
    const snakeType = sprites[spriteMap[player.type]];
    const segment = snake[index];
    
    // Tête
    if (index === 0) {
        let rotation = 0;
        
        if (d === "RIGHT") rotation = 0;
        else if (d === "LEFT") rotation = Math.PI;
        else if (d === "DOWN") rotation = Math.PI / 2;
        else if (d === "UP") rotation = -Math.PI / 2;
        
        return { ...snakeType.head_straight, rotation: rotation };
    }
    
    // Queue
    if (index === snake.length - 1) {
        const prev = snake[index - 1];
        let rotation = 0;
        
        if (prev.x > segment.x) rotation = 0;           // Queue vers droite
        else if (prev.x < segment.x) rotation = Math.PI; // Queue vers gauche
        else if (prev.y > segment.y) rotation = Math.PI / 2;  // Queue vers bas
        else rotation = -Math.PI / 2;                    // Queue vers haut
        
        return { ...snakeType.tail, rotation: rotation };
    }
    
    // Corps
    const prev = snake[index - 1];
    const next = snake[index + 1];
    
    const dirIn = getDirection(prev, segment);
    const dirOut = getDirection(segment, next);
    
    // Corps droit (pas de virage)
    if (dirIn === dirOut) {
        let rotation = 0;
        if (dirIn === 'right' || dirIn === 'left') rotation = 0; // Horizontal
        else rotation = Math.PI / 2; // Vertical
        
        return { ...snakeType.body_straight, rotation: rotation };
    }
    
    // OPTION 2 : Sprite de virage complet avec offset (meilleur compromis)
    let rotation = 0;
    let flipH = false;
    
    // Virages SENS HORAIRE
    if (dirIn === 'right' && dirOut === 'down') {
        rotation = 0; flipH = false;
    } else if (dirIn === 'down' && dirOut === 'left') {
        rotation = Math.PI / 2; flipH = false;
    } else if (dirIn === 'left' && dirOut === 'up') {
        rotation = Math.PI; flipH = false;
    } else if (dirIn === 'up' && dirOut === 'right') {
        rotation = -Math.PI / 2; flipH = false;
    }
    // Virages SENS ANTI-HORAIRE (avec flip)
    else if (dirIn === 'down' && dirOut === 'right') {
        rotation = -Math.PI / 2; flipH = true;
    } else if (dirIn === 'left' && dirOut === 'down') {
        rotation = 0; flipH = true;
    } else if (dirIn === 'up' && dirOut === 'left') {
        rotation = Math.PI / 2; flipH = true;
    } else if (dirIn === 'right' && dirOut === 'up') {
        rotation = Math.PI; flipH = true;
    }
    
    return { ...snakeType.turn, rotation: rotation, offsetY: 9.8, offsetX: 0, flipH: flipH };
}

spriteSheet.onload = function() {
    console.log("Spritesheet 106x106 chargé avec succès!");
};

spriteSheet.onerror = function() {
    console.error("Erreur lors du chargement du spritesheet");
};

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

// --- VARIABLES TACTILES ---
let touchStartX = 0;
let touchStartY = 0;
let lastTap = 0;

// --- FONCTIONS DE MENU ---
function showCharMenu() {
    resumeAudioContext();
    document.getElementById("start-menu").classList.add("hidden");
    document.getElementById("char-menu").classList.remove("hidden");
}

function selectChar(type) {
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
        if (headX < 0 || headX >= 400 || headY < 0 || headY >= 400) { triggerDamage(); break; }
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
        powerDesc.innerText = "Tu as absorbé l'âme du Boss ! POUVOIR DÉBLOQUÉ : CHARGE. Double-tap l'écran pour pulvériser les rochers !";
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
    if(player.hp < player.maxHp) player.hp++;
    snake.push({ ...snake[snake.length-1] });
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
    
    // Rochers
    rocks.forEach(r => {
        ctx.fillStyle = "#7f8c8d"; ctx.fillRect(r.x+2, r.y+2, box-4, box-4);
        ctx.strokeStyle = "#2c3e50"; ctx.strokeRect(r.x+2, r.y+2, box-4, box-4);
    });
    
    // Ennemis
    enemies.forEach(en => {
        ctx.fillStyle = "#8338ec"; ctx.beginPath(); ctx.arc(en.x + 10, en.y + 10, 12, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "white"; ctx.fillRect(en.x + 2, en.y + 6, 4, 4); ctx.fillRect(en.x + 14, en.y + 6, 4, 4);
    });
    
    // Boss
    if(bossActive) {
        ctx.fillStyle = (boss.state === 'preparing') ? "orange" : (bossFlash > 0 ? "white" : "#3d0000");
        ctx.fillRect(boss.x, boss.y, boss.size, boss.size);
        ctx.fillStyle = (bossFlash > 0) ? "black" : "red";
        ctx.fillRect(boss.x+10, boss.y+10, 10, 10); ctx.fillRect(boss.x+40, boss.y+10, 10, 10);
    }
    
    // Nourriture
    ctx.fillStyle = food.type === 'ammo' ? "white" : "red";
    ctx.beginPath(); ctx.arc(food.x+10, food.y+10, 8, 0, Math.PI*2); ctx.fill();
    
    // Pièce d'or
    if (goldCoin) { ctx.fillStyle = "#FFD700"; ctx.beginPath(); ctx.arc(goldCoin.x+10, goldCoin.y+10, 7, 0, Math.PI*2); ctx.fill(); }
    
    // Balles
    ctx.fillStyle = "yellow"; bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI*2); ctx.fill(); });
    
    // SNAKE AVEC SPRITES 106x106
    if (spriteSheet.complete && spriteSheet.naturalWidth > 0) {
        snake.forEach((s, i) => {
            if (isDashing) {
                ctx.globalAlpha = 1 - (i / snake.length);
                ctx.shadowBlur = 15;
                ctx.shadowColor = "white";
            } else {
                ctx.globalAlpha = 1;
                ctx.shadowBlur = 0;
            }
            
            const spriteData = getSegmentSpriteData(i, snake);
            if (spriteData) {
                drawRotatedSprite(spriteData, s.x, s.y, spriteData.rotation, spriteData.offsetY || 0, spriteData.offsetX || 0, spriteData.flipH || false, spriteData.crop || null);
            }
        });
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    } else {
        // Fallback si sprites pas chargés
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
    }
    
    ctx.restore();
}

// --- ÉCOUTEURS D'ÉVÉNEMENTS CLAVIER ---
document.addEventListener("keydown", e => {
    if(e.keyCode == 37 && d != "RIGHT") nextD = "LEFT";
    if(e.keyCode == 38 && d != "DOWN") nextD = "UP";
    if(e.keyCode == 39 && d != "LEFT") nextD = "RIGHT";
    if(e.keyCode == 40 && d != "UP") nextD = "DOWN";
    if(e.keyCode == 32) performDash();
    if(e.keyCode == 13) togglePause(); // Entrée pour pause
});

// --- ÉCOUTEURS D'ÉVÉNEMENTS TACTILES ---
canvas.addEventListener('touchstart', function(e) {
    resumeAudioContext();
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
    
    let now = new Date().getTime();
    let timesince = now - lastTap;
    if((timesince < 300) && (timesince > 0)){
        performDash();
    }
    lastTap = now;
    e.preventDefault();
}, {passive: false});

canvas.addEventListener('touchend', function(e) {
    let touchEndX = e.changedTouches[0].screenX;
    let touchEndY = e.changedTouches[0].screenY;
    handleSwipe(touchEndX, touchEndY);
    e.preventDefault();
}, {passive: false});

canvas.addEventListener('touchmove', function(e) {
    e.preventDefault();
}, {passive: false});

function handleSwipe(endX, endY) {
    let dx = endX - touchStartX;
    let dy = endY - touchStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30 && d != "LEFT") nextD = "RIGHT";
        else if (dx < -30 && d != "RIGHT") nextD = "LEFT";
    } else {
        if (dy > 30 && d != "UP") nextD = "DOWN";
        else if (dy < -30 && d != "DOWN") nextD = "UP";
    }
}

function toggleOptions() {
    document.getElementById("start-menu").classList.toggle("hidden");
    document.getElementById("options-menu").classList.toggle("hidden");
}

function updateVolume() {
    musicVolume = document.getElementById("musicVol").value;
    sfxVolume = document.getElementById("sfxVol").value;
    menuMusic.volume = musicVolume; gameMusic.volume = musicVolume;
}

function togglePause() {
    if (bossActive || snake.length === 0) return; // Pas de pause pendant les menus
    isPaused = !isPaused;
    
    // Afficher/masquer un indicateur de pause
    let pauseIndicator = document.getElementById("pause-indicator");
    if (!pauseIndicator) {
        pauseIndicator = document.createElement("div");
        pauseIndicator.id = "pause-indicator";
        pauseIndicator.innerHTML = "⏸️ PAUSE<br><small>Appuyez sur Entrée</small>";
        pauseIndicator.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            color: #e9c46a;
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 24px;
            font-weight: bold;
            z-index: 150;
            text-align: center;
            border: 3px solid #e9c46a;
        `;
        document.querySelector(".game-container").appendChild(pauseIndicator);
    }
    
    pauseIndicator.style.display = isPaused ? "block" : "none";
}
