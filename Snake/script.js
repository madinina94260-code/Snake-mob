// --- CONFIGURATION AUDIO ---
const menuMusic = new Audio('Theme_Menu.mp3');
const gameMusic = new Audio('World1.wav');
menuMusic.loop = true;
gameMusic.loop = true;

let musicVolume = localStorage.getItem('snakeMusicVol') !== null ? parseFloat(localStorage.getItem('snakeMusicVol')) : 0.5;
let sfxVolume = localStorage.getItem('snakeSfxVol') !== null ? parseFloat(localStorage.getItem('snakeSfxVol')) : 0.5;
let highScore = localStorage.getItem('snakeHighScore') !== null ? parseInt(localStorage.getItem('snakeHighScore')) : 0;

menuMusic.volume = musicVolume;
gameMusic.volume = musicVolume;

function updateHighScoreDisplay() {
    document.getElementById("highScoreHUD").innerText = highScore;
    const menuHS = document.getElementById("menuHighScore");
    if(menuHS) menuHS.innerText = highScore;
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("musicRange").value = musicVolume;
    document.getElementById("sfxRange").value = sfxVolume;
    updateHighScoreDisplay();
});

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Débloquer l'audio sur iOS
function resumeAudioContext() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playEatSound() {
    resumeAudioContext();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    g.gain.setValueAtTime(sfxVolume * 0.2, audioCtx.currentTime);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);
}

function playDeathSound() {
    resumeAudioContext();
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
    g.gain.setValueAtTime(sfxVolume * 0.4, audioCtx.currentTime);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);
}

// --- VARIABLES DU JEU ---
const canvas = document.getElementById("snakeGame");
const ctx = canvas.getContext("2d");
const startMenu = document.getElementById("start-menu");
const optionsMenu = document.getElementById("options-menu");
const gameOverMenu = document.getElementById("game-over");

const box = 20;
let score = 0;
let snake = [];
let food = { x: 0, y: 0 };
let d, nextD;
let lastMoveTime = 0;
let moveInterval = 130; 
let requestID;

// --- GESTION DU TACTILE (SWIPE) ---
let xDown = null;                                                        
let yDown = null;

document.addEventListener('touchstart', (evt) => {
    resumeAudioContext(); // Débloque l'audio sur iPhone
    xDown = evt.touches[0].clientX;                                      
    yDown = evt.touches[0].clientY;                                      
}, false);                                                

document.addEventListener('touchmove', (evt) => {
    if ( ! xDown || ! yDown ) return;
    let xUp = evt.touches[0].clientX;                                    
    let yUp = evt.touches[0].clientY;
    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;

    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {
        if ( xDiff > 0 && d != "RIGHT") nextD = "LEFT";
        else if (xDiff < 0 && d != "LEFT") nextD = "RIGHT";                       
    } else {
        if ( yDiff > 0 && d != "DOWN") nextD = "UP";
        else if (yDiff < 0 && d != "UP") nextD = "DOWN";                                                                 
    }
    xDown = null; yDown = null;                                             
}, {passive: false});

function startGame() {
    resumeAudioContext();
    menuMusic.pause();
    gameMusic.play().catch(() => {});

    startMenu.classList.add("hidden");
    optionsMenu.classList.add("hidden");
    gameOverMenu.classList.add("hidden");
    document.getElementById("new-record").classList.add("hidden");

    score = 0;
    document.getElementById("score").innerText = score;
    d = "RIGHT"; nextD = "RIGHT";
    snake = [{ x: 10 * box, y: 10 * box, oldX: 10 * box, oldY: 10 * box }];
    
    spawnFood();
    lastMoveTime = performance.now();
    if(requestID) cancelAnimationFrame(requestID);
    requestID = requestAnimationFrame(gameLoop);
}

function spawnFood() {
    let foodCollision;
    do {
        foodCollision = false;
        food.x = Math.floor(Math.random() * (canvas.width / box)) * box;
        food.y = Math.floor(Math.random() * (canvas.height / box)) * box;
        for (let segment of snake) {
            if (segment.x === food.x && segment.y === food.y) {
                foodCollision = true; break;
            }
        }
    } while (foodCollision);
}

function gameLoop(currentTime) {
    requestID = requestAnimationFrame(gameLoop);
    const deltaTime = currentTime - lastMoveTime;
    let progress = deltaTime / moveInterval;
    if (progress >= 1) {
        updateLogic();
        lastMoveTime = currentTime;
        progress = 0;
    }
    draw(progress);
}

function updateLogic() {
    d = nextD;
    let headX = snake[0].x;
    let headY = snake[0].y;
    if (d === "LEFT") headX -= box;
    if (d === "UP") headY -= box;
    if (d === "RIGHT") headX += box;
    if (d === "DOWN") headY += box;

    for(let i = 0; i < snake.length; i++) {
        snake[i].oldX = snake[i].x;
        snake[i].oldY = snake[i].y;
    }

    if (headX === food.x && headY === food.y) {
        score++;
        document.getElementById("score").innerText = score;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('snakeHighScore', highScore);
            updateHighScoreDisplay();
        }
        playEatSound();
        spawnFood();
    } else {
        snake.pop();
    }

    let newHead = { x: headX, y: headY, oldX: headX, oldY: headY };
    if (headX < 0 || headX >= canvas.width || headY < 0 || headY >= canvas.height || checkCollision(newHead, snake)) {
        showGameOver();
        return;
    }
    snake.unshift(newHead);
}

function draw(progress) {
    ctx.fillStyle = "#f4a261"; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#48cae4";
    ctx.beginPath(); ctx.arc(200, 200, 80, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = "#e76f51";
    const pulse = Math.sin(performance.now() / 150) * 2;
    ctx.beginPath(); ctx.arc(food.x + box/2, food.y + box/2, (box/2.5) + pulse, 0, Math.PI*2); ctx.fill();

    for (let i = 0; i < snake.length; i++) {
        let segment = snake[i];
        const drawX = segment.oldX + (segment.x - segment.oldX) * progress;
        const drawY = segment.oldY + (segment.y - segment.oldY) * progress;
        ctx.fillStyle = (i === 0) ? "#264653" : "#2a9d8f";
        ctx.fillRect(drawX, drawY, box - 1, box - 1);
    }
}

function checkCollision(head, array) {
    for(let i = 0; i < array.length; i++) {
        if(head.x === array[i].x && head.y === array[i].y) return true;
    }
    return false;
}

document.addEventListener("keydown", (e) => {
    if (e.keyCode == 37 && d != "RIGHT") nextD = "LEFT";
    else if (e.keyCode == 38 && d != "DOWN") nextD = "UP";
    else if (e.keyCode == 39 && d != "LEFT") nextD = "RIGHT";
    else if (e.keyCode == 40 && d != "UP") nextD = "DOWN";
});

function showGameOver() {
    cancelAnimationFrame(requestID);
    gameMusic.pause();
    playDeathSound();
    menuMusic.play().catch(() => {});
    document.getElementById("final-score").innerText = "Score final : " + score;
    if (score >= highScore && score > 0) {
        document.getElementById("new-record").classList.remove("hidden");
    }
    gameOverMenu.classList.remove("hidden");
}

function toggleOptions() {
    if (optionsMenu.classList.contains("hidden")) {
        startMenu.classList.add("hidden");
        gameOverMenu.classList.add("hidden");
        optionsMenu.classList.remove("hidden");
    } else {
        optionsMenu.classList.add("hidden");
        startMenu.classList.remove("hidden");
        updateHighScoreDisplay();
    }
}

document.getElementById("musicRange").addEventListener("input", (e) => {
    musicVolume = parseFloat(e.target.value);
    menuMusic.volume = musicVolume;
    gameMusic.volume = musicVolume;
    localStorage.setItem('snakeMusicVol', musicVolume);
});

document.getElementById("sfxRange").addEventListener("input", (e) => {
    sfxVolume = parseFloat(e.target.value);
    localStorage.setItem('snakeSfxVol', sfxVolume);
});

function exitGame() {
    if (confirm("Voulez-vous vraiment quitter ?")) {
        window.location.href = "about:blank"; 
    }
}