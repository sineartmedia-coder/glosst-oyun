const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreText');
const timerDisplay = document.getElementById('timerText');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const livesContainer = document.getElementById('lives-container');
const damageFlash = document.getElementById('damage-flash');
const levelNotification = document.getElementById('level-notification');
const muteBtn = document.getElementById('muteBtn');
const powerupTimersContainer = document.getElementById('powerup-timers');

const rewardOverlay = document.getElementById('reward-overlay');
const rewardImg = document.getElementById('reward-img');
const rewardVideo = document.getElementById('reward-video');
const gameOverVideo = document.getElementById('game-over-video');
const rewardName = document.getElementById('reward-name');
const rewardDesc = document.getElementById('reward-desc');
const continueBtn = document.getElementById('continueBtn');
const rewardsList = document.getElementById('rewards-list');

const multiplierTimerEl = document.getElementById('multiplier-timer');
const multiplierCircle = document.getElementById('multiplier-circle');
const multiplierSec = document.getElementById('multiplier-sec');
const multiplierIcon = document.getElementById('multiplier-icon');
const multiplierLabel = document.getElementById('multiplier-label');

const magnetTimerEl = document.getElementById('magnet-timer');
const magnetCircle = document.getElementById('magnet-circle');
const magnetSec = document.getElementById('magnet-sec');
const magnetIcon = document.getElementById('magnet-icon');

// Ses Efektleri (GitHub üzerinden direkt linkler)
const sounds = {
    collect: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/collect.mp3'),
    hit: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/hit.mp3'),
    levelup: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/levelup.mp3'),
    gameover: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/gameover.mp3'),
    bgMusic: new Audio()
};

// 10 Seviye Ödül Tanımları
const levelRewards = [
    { name: "Piko", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Piko.jpg" },
    { name: "Ülker Çikolatalı Gofret", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/%C3%9Clker%20%C3%87ikolatal%C4%B1%20Gofret.jpg" },
    { name: "Snickers", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Snickers.jpg" },
    { name: "Eti Karam Gurme", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Eti%20Karam%20Gurme.jpg" },
    { name: "Milka", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Milka.jpg" },
    { name: "Kinder Bueno", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Kinder%20Bueno.jpg" },
    { name: "Toblerone", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Toblerone.jpg" },
    { name: "Toffifee", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Toffifee.jpg" },
    { name: "Ferrero Rocher", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Ferrero%20Rocher.jpg" },
    { name: "Kinder Surprise Maxi", img: "https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/Kinder%20Surprise%20Maxi.jpg" }
];
let unlockedRewards = [];

// Çalma Listesi (Senin gönderdiğin güncel linkler)
const bgTracks = [
    'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/fon.mp3',
    'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/music.mp3',
    'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/music1.mp3',
    'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/music3.mp3',
    'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/pix1.mp3',
    'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/pix2.mp3',
    'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/pix4.mp3'
];
let currentTrackIndex = 0;

// Müzik ayarları
sounds.bgMusic.loop = false; // Artık kendi kendine başa sarmayacak, listeyi gezecek
sounds.bgMusic.volume = 0.10; // Fon müziği iyice kısıldı (arka planda çok soft)

// Müzik bitince sonrakine geç
sounds.bgMusic.addEventListener('ended', () => {
    currentTrackIndex = (currentTrackIndex + 1) % bgTracks.length;
    sounds.bgMusic.src = bgTracks[currentTrackIndex];
    if (gameActive && !isMuted) {
        sounds.bgMusic.play().catch(e => {});
    }
});

// Canvas Boyutları
canvas.width = 1920;
canvas.height = 1080;

// Assets Yükleme
const assets = {
    background: new Image(),
    player: new Image(),
    items: [], // Yeni hediyeler dizisi
    brokenMirror: new Image()
};

assets.background.src = 'assets/background_final.png';
assets.brokenMirror.src = 'assets/broken_mirror.png';

// 13 yeni hediyeyi yükle
for (let i = 1; i <= 13; i++) {
    const img = new Image();
    img.src = `assets/item${i}.png`;
    assets.items.push(img);
}

// Oyun Değişkenleri
let score = 0;
let gameActive = false;
let currentUnlockingLevel = 0; // Takip için yeni değişken
let waitingForFirstMove = true; // Hareket bekleme kontrolü
let isMuted = false;
let items = [];
let particles = []; // Toz efekti parçacıkları
let itemPool = []; // Eşit dağılım için ürün havuzu
let spawnRate = 1200; 
let lastSpawn = 0;
let gameSpeed = 5; 
let lives = 9;
let startTime = 0;
let elapsedTime = 0;
let timerInterval = null;

// Özel Güç Durumları
let activePowerups = {
    multiplier: { active: false, value: 1, timer: 0, max: 30, label: 'SKOR', icon: '' },
    magnet: { active: false, timer: 0, max: 15, label: 'MIKNATIS', icon: 'https://i.imgur.com/aCqzG2f.png' }
};

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 10 + 5;
        this.speedX = (Math.random() - 0.5) * 4;
        this.speedY = -Math.random() * 2;
        this.life = 1.0;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
    }
    update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.life -= 0.02;
    }
    draw() {
        ctx.fillStyle = this.color.replace('0.3', (this.life * 0.3).toString());
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

function refillItemPool() {
    // 0'dan 12'ye kadar olan indexleri havuza ekle
    itemPool = Array.from({length: assets.items.length}, (_, i) => i);
    // Havuzu karıştır (Fisher-Yates Shuffle)
    for (let i = itemPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [itemPool[i], itemPool[j]] = [itemPool[j], itemPool[i]];
    }
}

const player = {
    x: 650, // Mağaza giriş kapısının önü
    y: 600, // Merdivenlerin üstü
    width: 200, // Varsayılan (görsel yüklenince güncellencek)
    height: 350, // Varsayılan (görsel yüklenince güncellencek)
    targetHeight: 440, // Karakterin sahnedeki hedef boyu (Hafifçe büyütüldü)
    speed: 18,
    currentTilt: 0,
    targetTilt: 0,
    currentScale: 1.0
};

// Karakter görseli yüklendiğinde en-boy oranını koruyarak boyutu ayarla
assets.player.onload = () => {
    const aspectRatio = assets.player.naturalWidth / assets.player.naturalHeight;
    player.height = player.targetHeight;
    player.width = player.targetHeight * aspectRatio;
    
    // Alt kısmın (ayakların) merdiven üzerinde kalması için y koordinatını düzelt
    // Landing seviyesi (yaklaşık saksı hizası), player.y + player.height = 900 olmalı
    player.y = 900 - player.height;
};
assets.player.src = 'assets/player_final.png';

// Özel Güç Görselleri (Senin linklerin, engeli aşmak için yerel olarak indirildi)
assets.powerups = {
    cat2x: new Image(),
    cat3x: new Image(),
    magnet: new Image(),
    camera: new Image()
};
assets.powerups.cat2x.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/100puan.png';
assets.powerups.cat3x.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/150puan.png';
assets.powerups.magnet.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/%C3%A7ek.png';
assets.powerups.camera.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/kamera.png';

// Ceza İtemleri Görselleri
assets.penalty = {
    altin: new Image(),
    bok: new Image(),
    bomba: new Image(),
    fare: new Image()
};
assets.penalty.altin.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/alt%C4%B1n.png';
assets.penalty.bok.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/bok.png';
assets.penalty.bomba.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/bomba.png';
assets.penalty.fare.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/fare.png';

// Giriş Kontrolleri
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});


// Eşya puan tablosu (İsimsel olarak: 1-4: 10, 5-8: 15, 9-11: 20, 12-13: 25)
const itemScoreMap = {
    0: 10, 1: 10, 2: 10, 3: 10,
    4: 15, 5: 15, 6: 15, 7: 15,
    8: 20, 9: 20, 10: 20,
    11: 25, 12: 25
};

class Item {
    constructor(type, subType = null) {
        this.type = type; // 'good', 'bad', 'powerup'
        this.subType = subType; // powerup için: 'cat2x', 'cat3x', 'magnet', 'camera'
        if (this.type === 'good') {
            if (itemPool.length === 0) refillItemPool();
            const randomIndex = itemPool.pop();
            this.image = assets.items[randomIndex];
            this.points = itemScoreMap[randomIndex] || 10;
            
            // TÜM GÖRSELLER İÇİN AYNI EBAT MANTIĞI
            const maxSize = 220; 
            const ratio = (this.image.naturalWidth && this.image.naturalHeight) 
                ? (this.image.naturalWidth / this.image.naturalHeight) 
                : 1;

            if (ratio > 1) {
                this.width = maxSize;
                this.height = maxSize / ratio;
            } else {
                this.height = maxSize;
                this.width = maxSize * ratio;
            }
        } else if (this.type === 'bad') {
            this.image = assets.penalty[this.subType];
            if (this.subType === 'altin' || this.subType === 'fare') {
                this.width = 160;
                this.height = 160;
            } else if (this.subType === 'bomba') {
                this.width = 130;
                this.height = 130;
            } else {
                this.width = 110;
                this.height = 110;
            }
        } else if (this.type === 'powerup') {
            this.image = assets.powerups[this.subType];
            this.width = 150;
            this.height = 150;
        }
        
        this.isExploding = false;
        this.explosionTimer = 0;
        this.explosionRadius = 400; 
        
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;

        // Hız sistemi: 1 tık ileri taşındı (Başlangıç 5 → Max 13)
        const progress = Math.min(1, score / 10000);
        let baseSpeed;
        if (progress <= 0.5) {
            // Faz 1: 5 → 8 (Eski Seviye 2-3 gibi başlar)
            baseSpeed = 5 + (progress * 2) * 3;
        } else {
            // Faz 2: 8 → 13
            baseSpeed = 8 + ((progress - 0.5) * 2) * 5;
        }
        this.speed = baseSpeed * (0.6 + Math.random() * 0.8);
        this.dx = 0;
    }

    update() {
        this.y += this.speed;
        this.x += this.dx;
        
        // Ekran yanlarından taşmasını engelle (Duvarlardan seker)
        if (this.x < 0) { 
            this.x = 0; 
            this.dx *= -1; 
        }
        if (this.x > canvas.width - this.width) { 
            this.x = canvas.width - this.width; 
            this.dx *= -1; 
        }
    }

    draw() {
        if (this.isExploding) {
            // Patlama görsel efekti
            const alpha = 1 - (this.explosionTimer / 30);
            ctx.save();
            ctx.beginPath();
            ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.explosionRadius * (this.explosionTimer / 30), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 100, 0, ${alpha * 0.5})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
            ctx.lineWidth = 5;
            ctx.stroke();
            ctx.restore();
            return;
        }
        if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }
    }
}

let lastMilestone = 0;

function updateDifficulty() {
    const progress = Math.min(1, score / 10000);
    
    // Spawn hızı 1 tık ileri taşındı (1500ms → 400ms)
    if (progress <= 0.5) {
        const p1 = progress * 2;
        spawnRate = Math.max(900, Math.round(1500 - p1 * 600));
    } else {
        const p2 = (progress - 0.5) * 2;
        spawnRate = Math.max(400, Math.round(900 - p2 * 500));
    }
    
    // Her 1000 puanda ödül ekranını aç
    const currentMilestone = Math.floor(score / 1000);
    if (currentMilestone > lastMilestone && currentMilestone <= 10) {
        lastMilestone = currentMilestone;
        showRewardOverlay(currentMilestone);
        const s = sounds.levelup.cloneNode();
        s.volume = 0.4;
        s.play();
    }
}

function showRewardOverlay(level) {
    gameActive = false; // Oyunu durdur
    currentUnlockingLevel = level; // Mevcut seviyeyi kaydet
    
    const reward = levelRewards[level - 1];
    rewardImg.src = reward.img;
    rewardName.innerText = reward.name;
    rewardDesc.innerText = `${score.toLocaleString()} Puan Aldınız!`;
    
    // Sidebar'ı güncelle
    const slot = document.querySelector(`.reward-slot[data-level="${level}"]`);
    if (slot) {
        slot.classList.add('unlocked');
        slot.querySelector('.slot-icon').innerText = '✓';
    }
    
    // Videoyu baştan başlat
    if (rewardVideo) {
        rewardVideo.currentTime = 0;
        rewardVideo.play().catch(e => console.log("Video oynatılamadı."));
    }
    
    rewardOverlay.classList.remove('hidden');
}

continueBtn.addEventListener('click', () => {
    rewardOverlay.classList.add('hidden');
    
    // Sidebar'daki gizemli ismi aç
    if (currentUnlockingLevel > 0) {
        const reward = levelRewards[currentUnlockingLevel - 1];
        const slot = document.querySelector(`.reward-slot[data-level="${currentUnlockingLevel}"]`);
        if (slot) {
            slot.querySelector('span').innerText = `${currentUnlockingLevel * 1000} Puan: ${reward.name}`;
            slot.classList.add('revealed');
        }
    }
    
    gameActive = true; // Oyunu devam ettir
});

function showLevelNotification(level) {
    levelNotification.innerText = 'SEVİYE ' + level;
    levelNotification.classList.remove('hidden');
    levelNotification.classList.add('show');
    
    setTimeout(() => {
        levelNotification.classList.remove('show');
        setTimeout(() => levelNotification.classList.add('hidden'), 500);
    }, 2000);
}

function spawnItem() {
    const now = Date.now();
    if (now - lastSpawn <= spawnRate) return;

    const progress = Math.min(1, score / 10000);

    // --- EKRANDA HEDEFLENEBİLECEK ITEM SAYISI ---
    // Kaos seviyesi ve item sayısı 1 tık ileri taşındı
    let targetOnScreen;
    if (progress <= 0.5) {
        const p1 = progress * 2;
        targetOnScreen = 5 + Math.floor(p1 * 5); // 5 → 10
    } else {
        const p2 = (progress - 0.5) * 2;
        targetOnScreen = 10 + Math.floor(p2 * 5); // 10 → 15
    }

    // Şu an ekranda kaç item var? (patlamaları say ma)
    const activeCount = items.filter(i => !i.isExploding).length;
    const toSpawn = Math.max(0, Math.min(3, targetOnScreen - activeCount));

    // Ekran zaten doluysa sadece ritmi koru
    if (toSpawn === 0) {
        lastSpawn = now;
        return;
    }

    let badSpawnedInThisWave = 0;
    // Cezaların sayısını 1'er artırarak daha zorlayıcı hale getirildi
    const maxBadPerWave = progress > 0.5 ? 3 : 2;

    for (let i = 0; i < toSpawn; i++) {
        const rand = Math.random();
        let type, subType = null;

        if (rand < 0.08) { // Güç gelme şansı %5'ten %8'e çıkarıldı
            type = 'powerup';
            const pRand = Math.random() * 13;
            if (pRand < 4) subType = 'camera'; // Kamera şansı artırıldı
            else if (pRand < 7) subType = 'magnet';
            else if (pRand < 10) subType = 'cat3x';
            else subType = 'cat2x';
        } else {
            // Ceza oranı 1 tık ileri taşındı (Başlangıçta %30 ceza)
            let badChance;
            if (progress <= 0.5) {
                const p1 = progress * 2;
                badChance = 0.30 + p1 * 0.30; // %30 -> %60
            } else {
                const p2 = (progress - 0.5) * 2;
                badChance = 0.60 + p2 * 0.20; // %60 -> %80
            }

            if (Math.random() < badChance && badSpawnedInThisWave < maxBadPerWave) {
                type = 'bad';
                const badRand = Math.random();
                if (badRand < 0.06) subType = 'bomba';
                else if (badRand < 0.36) subType = 'altin';
                else if (badRand < 0.66) subType = 'bok';
                else subType = 'fare';
                badSpawnedInThisWave++;
            } else {
                type = 'good';
            }
        }

        const newItem = new Item(type, subType);

        // Çapraz düşüş 1 tık ileri taşındı (Başlangıçtan itibaren var)
        let diagonalChance;
        if (progress <= 0.5) {
            diagonalChance = 0.20 + (progress * 2) * 0.30; // %20 -> %50
        } else {
            diagonalChance = 0.50 + ((progress - 0.5) * 2) * 0.40; // %50 -> %90
        }
        if (Math.random() < diagonalChance) {
            newItem.dx = (Math.random() - 0.5) * (newItem.speed * 0.8);
        }

        // Birden fazla item'da X konumlarını ekrana yay
        if (i > 0 || toSpawn > 1) {
            const section = canvas.width / Math.max(toSpawn, 2);
            newItem.x = section * i + Math.random() * Math.max(0, section - newItem.width);
            newItem.x = Math.max(0, Math.min(canvas.width - newItem.width, newItem.x));
        }

        items.push(newItem);
    }
    lastSpawn = now;
}

function update() {
    if (!gameActive) return;

    updateDifficulty();

    // Karakter Hareketi ve Animasyon Hedefleri
    player.targetTilt = 0;
    
    let isMoving = false;
    if (keys['ArrowLeft'] || keys['KeyA']) {
        player.x -= player.speed;
        player.targetTilt = -0.12;
        isMoving = true;
        waitingForFirstMove = false; // Hareket edilince oyunu başlat
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
        player.x += player.speed;
        player.targetTilt = 0.12;
        isMoving = true;
        waitingForFirstMove = false; // Hareket edilince oyunu başlat
    }

    if (isMoving) {
        // Toz efekti oluştur
        if (Math.random() < 0.4) {
            particles.push(new Particle(player.x + player.width / 2, player.y + player.height - 20));
        }
    }

    // Parçacıkları Güncelle
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    // Animasyon (Lerp)
    player.currentTilt += (player.targetTilt - player.currentTilt) * 0.15;
    player.currentScale += (1.0 - player.currentScale) * 0.1; // Orijinal boyuta dön

    // Sınır Kontrolü
    if (player.x < 0) player.x = 0;
    if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;

    // Eşyaları Güncelle
    if (!waitingForFirstMove) {
        spawnItem();
    }

    for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];
        
        // Mıknatıs Etkisi: Eğer mıknatıs aktifse ve eşya 'iyi' ise karakteri takip etsin
        if (activePowerups.magnet.active && (item.type === 'good' || item.type === 'powerup')) {
            const centerX = player.x + player.width / 2;
            const itemCenterX = item.x + item.width / 2;
            const dist = centerX - itemCenterX;
            if (Math.abs(dist) < 800) { // Belirli bir mesafedeyse çek
                const moveSpeed = 12; // Çekme hızı
                if (Math.abs(dist) < moveSpeed) {
                    item.x += dist; // Hedefe ulaştıysa direkt üstüne koy, titremeyi önle
                } else {
                    item.x += Math.sign(dist) * moveSpeed; // Karakterin üzerine doğru kay
                }
                item.y += 2; // Çapraz bir çekim hissi için aşağı düşüş hızlansa iyi olur
            }
        }

        item.y += item.speed;
        item.x += item.dx;

        // Ekran yanlarından taşmasını engelle (Duvarlardan seker)
        if (item.x < 0) { 
            item.x = 0; 
            item.dx *= -1; 
        }
        if (item.x > canvas.width - item.width) { 
            item.x = canvas.width - item.width; 
            item.dx *= -1; 
        }

        // Çarpışma Algılama (Ölçeklenebilir ve hassas hitbox)
        if (item.isExploding) continue;

        const playerHitbox = {
            x: player.x + player.width * 0.2,
            y: player.y + player.height * 0.1,
            width: player.width * 0.6,
            height: player.height * 0.85
        };

        if (
            item.x < playerHitbox.x + playerHitbox.width &&
            item.x + item.width > playerHitbox.x &&
            item.y < playerHitbox.y + playerHitbox.height &&
            item.y + item.height > playerHitbox.y
        ) {
            if (item.type === 'good') {
                const add = item.points * activePowerups.multiplier.value;
                score += add;
                scoreDisplay.innerText = score.toString().padStart(3, '0');
                player.currentScale = 1.15; // Pop efekti
                
                const s = sounds.collect.cloneNode();
                s.volume = 0.4;
                s.play();
                
                items.splice(i, 1);
            } else if (item.type === 'bad') {
                if (item.subType === 'bomba') {
                    // Bomba doğrudan çarpınca hem can gider hem 200 puan
                    score = Math.max(0, score - 200);
                    scoreDisplay.innerText = score.toString().padStart(3, '0');
                    takeDamage(i, true); // true = patlama efektiyle sil, hasar alındı
                } else if (item.subType === 'altin') {
                    takeDamage(i); // Altın can götürür
                } else if (item.subType === 'bok') {
                    score = Math.max(0, score - 35);
                    scoreDisplay.innerText = score.toString().padStart(3, '0');
                    items.splice(i, 1);
                    const s = sounds.hit.cloneNode();
                    s.volume = 0.3;
                    s.play();
                } else if (item.subType === 'fare') {
                    score = Math.max(0, score - 20);
                    scoreDisplay.innerText = score.toString().padStart(3, '0');
                    items.splice(i, 1);
                    const s = sounds.hit.cloneNode();
                    s.volume = 0.3;
                    s.play();
                } else {
                    takeDamage(i); // Varsayılan kırık ayna
                }
            } else if (item.type === 'powerup') {
                applyPowerup(item.subType);
                items.splice(i, 1);
                
                const s = sounds.levelup.cloneNode();
                s.volume = 0.5;
                s.play();
            }
            continue;
        }

        // Bomba patlama süreci
        if (item.isExploding) {
            item.explosionTimer++;
            if (item.explosionTimer > 30) {
                items.splice(i, 1);
            }
            continue;
        }

        // Ekrandan çıkanları sil veya bombayı patlat
        if (item.y > canvas.height - 100) { // Yere inince (Hafif bir ofsetle)
            if (item.type === 'bad' && item.subType === 'bomba') {
                explodeBomb(item);
            } else if (item.y > canvas.height) {
                items.splice(i, 1);
            }
        }
    }
}

function applyPowerup(type) {
    if (type === 'cat2x') {
        activePowerups.multiplier.active = true;
        activePowerups.multiplier.value = 2;
        activePowerups.multiplier.timer = activePowerups.multiplier.max * 60; // 30 saniye
        multiplierIcon.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/100puan.png';
        multiplierLabel.innerText = '2X PUAN';
        multiplierTimerEl.classList.remove('hidden');
        multiplierTimerEl.style.display = 'flex';
    } else if (type === 'cat3x') {
        activePowerups.multiplier.active = true;
        activePowerups.multiplier.value = 3;
        activePowerups.multiplier.timer = activePowerups.multiplier.max * 60; // 30 saniye
        multiplierIcon.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/150puan.png';
        multiplierLabel.innerText = '3X PUAN';
        multiplierTimerEl.classList.remove('hidden');
        multiplierTimerEl.style.display = 'flex';
    } else if (type === 'magnet') {
        activePowerups.magnet.active = true;
        activePowerups.magnet.timer = activePowerups.magnet.max * 60; // 15 saniye
        magnetIcon.src = 'https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/%C3%A7ek.png';
        magnetTimerEl.classList.remove('hidden');
        magnetTimerEl.style.display = 'flex';
    } else if (type === 'camera') {
        if (lives < 9) {
            lives++;
            updateLivesUI();
        }
    }
}

function updatePowerupTimers() {
    if (activePowerups.multiplier.active) {
        activePowerups.multiplier.timer--;
        if (activePowerups.multiplier.timer <= 0) {
            activePowerups.multiplier.active = false;
            activePowerups.multiplier.value = 1;
            multiplierTimerEl.classList.add('hidden');
            multiplierTimerEl.style.display = 'none';
        } else {
            const progress = (activePowerups.multiplier.timer / (activePowerups.multiplier.max * 60)) * 100;
            multiplierCircle.style.setProperty('--progress', progress + '%');
            multiplierSec.innerText = Math.ceil(activePowerups.multiplier.timer / 60);
        }
    }

    if (activePowerups.magnet.active) {
        activePowerups.magnet.timer--;
        if (activePowerups.magnet.timer <= 0) {
            activePowerups.magnet.active = false;
            magnetTimerEl.classList.add('hidden');
            magnetTimerEl.style.display = 'none';
        } else {
            const progress = (activePowerups.magnet.timer / (activePowerups.magnet.max * 60)) * 100;
            magnetCircle.style.setProperty('--progress', progress + '%');
            magnetSec.innerText = Math.ceil(activePowerups.magnet.timer / 60);
        }
    }
}

function draw() {
    // Arka planı temizle ve çiz
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (assets.background.complete) {
        ctx.drawImage(assets.background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Karakter gölgesi (Daha küçük ve zarif hale getirildi)
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(
        player.x + player.width / 2, 
        player.y + player.height - 45, // Ayağa tam bitişmesi için biraz daha yukarı çekildi
        player.width / 4, 
        10, 
        0, 0, Math.PI * 2
    );
    ctx.fill();

    // Karakteri çiz (Animasyonlu ve Pivotlu)
    ctx.save();
    
    // Dönüşüm ve ölçekleme işlemleri ayak ucundan (pivot noktası) yapılsın
    const pivotX = player.x + player.width / 2;
    const pivotY = player.y + player.height;
    
    ctx.translate(pivotX, pivotY);
    ctx.rotate(player.currentTilt);
    ctx.scale(player.currentScale, player.currentScale);
    
    // Resim koordinatlarını pivot'a göre yerleştir
    ctx.drawImage(assets.player, -player.width / 2, -player.height, player.width, player.height);
    
    ctx.restore();

    // Ön plandaki nesneleri karakterin üzerine çiz (Derinlik efekti için)
    // Rampadaki saksı ve çevresi
    if (assets.background.complete) {
        ctx.drawImage(assets.background, 1410, 730, 220, 350, 1410, 730, 220, 350);
        // İstenirse ortadaki saksı için de eklenebilir:
        // ctx.drawImage(assets.background, 880, 730, 150, 300, 880, 730, 150, 300);
    }

    // Eşyaları çiz
    items.forEach(item => item.draw());

    // Parçacıkları çiz
    particles.forEach(p => p.draw());
}

function gameLoop() {
    update();
    updatePowerupTimers();
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0;
    lastMilestone = 0;
    lives = 9;
    items = [];
    waitingForFirstMove = true; // Başa al
    elapsedTime = 0;
    updateTimerUI();
    if (timerInterval) clearInterval(timerInterval);

    // Güçleri sıfırla
    activePowerups.multiplier.active = false;
    activePowerups.multiplier.value = 1;
    activePowerups.multiplier.timer = 0;
    activePowerups.magnet.active = false;
    activePowerups.magnet.timer = 0;

    refillItemPool(); // Oyun başında havuzu doldur
    gameSpeed = 2; 
    spawnRate = 2500; // Başlangıçta daha ferah (2.5 saniye)
    scoreDisplay.innerText = '000';
    updateLivesUI();
    gameActive = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    rewardOverlay.classList.add('hidden');
    
    // Timer'ı başlat (Hareket bekleme kontrolü bittiğinde değil, oyun başladığında)
    startTime = Date.now();
    timerInterval = setInterval(() => {
        if (gameActive && !waitingForFirstMove) {
            elapsedTime = Math.floor((Date.now() - startTime) / 1000);
            updateTimerUI();
        } else if (!waitingForFirstMove && gameActive === false) {
             // Oyun duraklatıldığında (ödül ekranı vb.) startTime'ı güncelle ki süre kaldığı yerden devam etsin
             startTime = Date.now() - (elapsedTime * 1000);
        }
    }, 1000);
    
    // Yan menü ikonlarını ve isimlerini sıfırla
    document.querySelectorAll('.reward-slot').forEach(slot => {
        const level = slot.getAttribute('data-level');
        slot.classList.remove('unlocked', 'revealed');
        slot.querySelector('.slot-icon').innerText = '?';
        slot.querySelector('span').innerText = `${level}.000 Puan: ???`;
    });
    
    // Müziği oynat listesinin ilk/mevcut şarkısından başlat
    if (sounds.bgMusic.currentTime === 0 && sounds.bgMusic.paused) {
        sounds.bgMusic.src = bgTracks[currentTrackIndex];
    }
    if (!isMuted) {
        sounds.bgMusic.play()
            .then(() => console.log("Fon müziği başarıyla başladı."))
            .catch(e => {
                console.log("Müzik çalınamadı, etkileşim hatası veya dosya eksik.");
            });
    }
}

// Ses Kısma Fonksiyonu
muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    if (isMuted) {
        sounds.bgMusic.pause();
        muteBtn.innerText = '🔇';
    } else {
        if (gameActive) sounds.bgMusic.play();
        muteBtn.innerText = '🔊';
    }
});

function updateLivesUI() {
    livesContainer.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart';
        
        if (i >= lives) {
            heart.classList.add('lost');
            const crack = document.createElement('div');
            crack.className = 'crack';
            heart.appendChild(crack);
        }
        
        livesContainer.appendChild(heart);
    }
}

function takeDamage(itemIndex, isExplosion = false) {
    lives--;
    updateLivesUI();
    
    if (isExplosion) {
        // Bombayı patlat ve partiküller ekle (Hasar zaten alındı flag'i gönder)
        const item = items[itemIndex];
        explodeBomb(item, true);
    } else {
        items.splice(itemIndex, 1);
    }
    
    const s = sounds.hit.cloneNode();
    s.volume = 0.5;
    s.play();
    
    // Kırmızı flaş efekti
    damageFlash.classList.add('active');
    setTimeout(() => {
        damageFlash.classList.remove('active');
    }, 100);

    if (lives <= 0) {
        gameOver();
    }
}

function explodeBomb(bomb, damageAlreadyDealt = false) {
    if (bomb.isExploding) return;
    bomb.isExploding = true;
    bomb.speed = 0;
    bomb.dx = 0;
    
    // Ses efekti (Eğer bomba sesi yoksa mevcut hit sesini biraz daha kalın çalabiliriz)
    const s = sounds.hit.cloneNode();
    s.playbackRate = 0.5;
    s.volume = 0.8;
    s.play();

    const bombCenterX = bomb.x + bomb.width / 2;
    const bombCenterY = bomb.y + bomb.height / 2;

    // Yakınlık kontrolü (Eğer bomba yerdeyken patlarsa ve henüz hasar alınmadıysa)
    if (!damageAlreadyDealt) {
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;
        
        const dist = Math.sqrt(Math.pow(playerCenterX - bombCenterX, 2) + Math.pow(playerCenterY - bombCenterY, 2));
        
        if (dist < bomb.explosionRadius) {
            score = Math.max(0, score - 200);
            scoreDisplay.innerText = score.toString().padStart(3, '0');
            lives--;
            updateLivesUI();
            damageFlash.classList.add('active');
            setTimeout(() => damageFlash.classList.remove('active'), 100);
            if (lives <= 0) gameOver();
        }
    }

    // Patlama partikülleri
    for (let i = 0; i < 20; i++) {
        const p = new Particle(bombCenterX, bombCenterY);
        p.speedX = (Math.random() - 0.5) * 15;
        p.speedY = (Math.random() - 0.5) * 15;
        p.color = `rgba(255, ${Math.random() * 100 + 100}, 0, 0.8)`;
        p.life = 1.0;
        p.size = Math.random() * 15 + 10;
        particles.push(p);
    }
}

function gameOver() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    finalScoreDisplay.innerText = score;
    
    // Videoyu baştan başlat ve oynat
    if (gameOverVideo) {
        gameOverVideo.currentTime = 0;
        gameOverVideo.play().catch(e => console.log("Game over videosu oynatılamadı."));
    }
    
    gameOverScreen.classList.remove('hidden');
    
    sounds.bgMusic.pause();
    sounds.gameover.play();
}

function updateTimerUI() {
    const mins = Math.floor(elapsedTime / 60);
    const secs = elapsedTime % 60;
    timerDisplay.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Oyun döngüsünü başlat
gameLoop();
