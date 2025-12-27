const lanes = [
    document.getElementById("lane1"),
    document.getElementById("lane2"),
    document.getElementById("lane3"),
    document.getElementById("lane4")
];

const scoreDisplay = document.getElementById("score");
const comboDisplay = document.getElementById("combo");
const bgMusic = document.getElementById("bg-music");
const btnVoltar = document.getElementById("btnVoltar");
const countdown = document.getElementById("countdown");
const countText = document.getElementById("count-text");
const diffScreen = document.getElementById("difficulty-screen");
const buttonsDiff = document.querySelectorAll(".btn-diff");
const hitSound = document.getElementById("hitSound");
const specialSound = document.getElementById("specialSound");
const resultScreen = document.getElementById("result-screen");
const finalXpDisplay = document.getElementById("final-xp");
const finalComboDisplay = document.getElementById("final-combo");
const medalDisplay = document.getElementById("medal");
const restartBtn = document.getElementById("restart-btn");

let score = 0;
let combo = 0;
let fallSpeed = 2000; // tempo para descer toda a tela
let intervalSpawn = 800; // tempo entre notas
let loop;
let count = 3;
let jogoIniciado = false;
let micChance = 0.15;
let dificuldadeProgresso = 0;
let dificuldadeMax = 6; // evita ficar impossível
let comboMax = 0;

// desabilita contagem até escolher a dificuldade
countdown.style.display = "none";

buttonsDiff.forEach(btn => {
    btn.addEventListener("click", () => {
        const diff = btn.getAttribute("data-diff");
        selecionarDificuldade(diff);
    });
});

// cria nota em pista aleatória
function criarNota() {
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const note = document.createElement("div");

    // chance configurável de vir microfone
    const isMic = Math.random() < micChance;

    note.classList.add("note");

    // nota musical padrão 🎵
    note.textContent = "🎵";
    note.style.fontSize = "24px";
    note.style.display = "flex";
    note.style.justifyContent = "center";
    note.style.alignItems = "center";

    if (isMic) {
        note.classList.add("mic");
        note.textContent = "🎤";
    }

    note.style.top = "-60px";
    lane.appendChild(note);

    const anim = note.animate([
        { top: "-60px" },
        { top: "100%" }
    ], {
        duration: fallSpeed,
        easing: "linear"
    });

    anim.onfinish = () => {
        note.remove();
        combo = 0;
        atualizarCombo();
    };

    note.addEventListener("click", () => {
        note.remove();

        if (isMic) {
            criarExplosao(lane);
        }

        if (isMic) {
            score += 50;
        } else {
            score += 10;
        }

        scoreDisplay.textContent = score;

        combo++;
        atualizarCombo();
        comboMax = Math.max(comboMax, combo);

        // sons
        if (isMic) {
            specialSound.currentTime = 0;
            specialSound.play();
        } else {
            hitSound.currentTime = 0;
            hitSound.play();
        }

        // pulsar SOMENTE no microfone
        if (isMic) {
            document.body.classList.add("camera-pulse");
            setTimeout(() => {
                document.body.classList.remove("camera-pulse");
            }, 300);

            // efeito nas luzes
            document.querySelectorAll('.light').forEach(light => {
                light.classList.add('flash');
                setTimeout(() => {
                    light.classList.remove('flash');
                }, 400);
            });
        }

        if (combo % 5 === 0 && fallSpeed > 800) {
            fallSpeed -= 100;
            intervalSpawn -= 25;
            reiniciarLoop();
        }

        dificuldadeProgresso++;
        if (dificuldadeProgresso % 6 === 0) {
            fallSpeed = Math.max(700, fallSpeed - 150);
            intervalSpawn = Math.max(400, intervalSpawn - 60);
            clearInterval(loop);
            loop = setInterval(criarNota, intervalSpawn);
        }
    });
}

function atualizarCombo() {
    comboDisplay.textContent = `Combo x${combo}`;
}

function criarExplosao(lane) {
    const boom = document.createElement("div");
    boom.classList.add("explosion");

    // posição central da lane
    boom.style.left = "50%";
    boom.style.top = "80%";
    boom.style.transform = "translate(-50%, -50%)";

    lane.appendChild(boom);

    setTimeout(() => boom.remove(), 400);
}

function reiniciarLoop() {
    clearInterval(loop);
    loop = setInterval(criarNota, intervalSpawn);
}

function selecionarDificuldade(diff) {
    if (diff === "easy") {
        fallSpeed = 2700;
        intervalSpawn = 1000;
        micChance = 0.25;
    }
    if (diff === "normal") {
        fallSpeed = 2000;
        intervalSpawn = 800;
        micChance = 0.15;
    }
    if (diff === "hard") {
        fallSpeed = 1400;
        intervalSpawn = 550;
        micChance = 0.05;
    }

    diffScreen.style.display = "none";
    countdown.style.display = "flex";
    iniciarContagem();
}

// Musica
bgMusic.volume = 0.7;
bgMusic.addEventListener("ended", finalizarJogo);

function iniciarJogo() {
    jogoIniciado = true;
    countdown.style.display = "none";

    bgMusic.play().catch(() => {
        document.body.addEventListener("click", () => bgMusic.play(), { once: true });
    });

    loop = setInterval(criarNota, intervalSpawn);
}

function iniciarContagem() {
    let interval = setInterval(() => {
        count--;
        if (count > 0) {
            countText.textContent = count;
        } else if (count === 0) {
            countText.textContent = "SHOWTIME!";
        } else {
            clearInterval(interval);
            iniciarJogo();
        }
    }, 1000);
}

atualizarCombo();

btnVoltar.addEventListener("click", () => {
    bgMusic.pause();
    clearInterval(loop);
    window.location.href = "../index.html";
});

restartBtn.addEventListener("click", () => {
    location.reload();
});

function finalizarJogo() {
    clearInterval(loop);
    bgMusic.pause();

    finalXpDisplay.textContent = score;
    finalComboDisplay.textContent = comboMax;

    let medal = "";
    if (score >= 1500) medal = "🥇";
    else if (score >= 700) medal = "🥈";
    else if (score >= 300) medal = "🥉";
    else medal = "😅";

    medalDisplay.textContent = medal;

    resultScreen.style.display = "flex";
}
