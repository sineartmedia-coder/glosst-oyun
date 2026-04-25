const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreText');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('finalScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const livesContainer = document.getElementById('lives-container');
const damageFlash = document.getElementById('damage-flash');
const levelNotification = document.getElementById('level-notification');
const muteBtn = document.getElementById('muteBtn');

// Ses Efektleri (GitHub üzerinden direkt linkler)
const sounds = {
    collect: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/collect.mp3'),
    hit: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/hit.mp3'),
    levelup: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/levelup.mp3'),
    gameover: new Audio('https://raw.githubusercontent.com/sineartmedia-coder/glosst/main/gameover.mp3'),
    bgMusic: new Audio()
};

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
let waitingForFirstMove = true; // Hareket bekleme kontrolü
let isMuted = false;
let items = [];
let particles = []; // Toz efekti parçacıkları
let itemPool = []; // Eşit dağılım için ürün havuzu
let spawnRate = 1200; 
let lastSpawn = 0;
let gameSpeed = 5; 
let lives = 9;

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
    targetHeight: 400, // Karakterin sahnedeki hedef boyu
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

// Giriş Kontrolleri
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});


class Item {
    constructor(type) {
        this.type = type; 
        
        // Havuz sistemi ile ürün seçimi ve orantılı ölçeklendirme
        if (this.type === 'good') {
            if (itemPool.length === 0) refillItemPool();
            const randomIndex = itemPool.pop();
            this.image = assets.items[randomIndex];
            
            // TÜM GÖRSELLER İÇİN AYNI EBAT MANTIĞI (Maksimum 220px Kutuya Sığdırma)
            const maxSize = 220; // Tüm öğeler için izin verilen maksimum genişlik veya yükseklik
            
            const ratio = (this.image.naturalWidth && this.image.naturalHeight) 
                ? (this.image.naturalWidth / this.image.naturalHeight) 
                : 1;

            if (ratio > 1) {
                // Eğer görsel geniş ise (örn: 12.png), genişliği sabitle, yüksekliği daralt
                this.width = maxSize;
                this.height = maxSize / ratio;
            } else {
                // Eğer görsel uzun veya kareyse, yüksekliği sabitle, genişliği daralt
                this.height = maxSize;
                this.width = maxSize * ratio;
            }
        } else {
            this.image = assets.brokenMirror;
            this.width = 130; 
            this.height = 130;
        }
        
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -this.height;
        this.speed = (Math.random() * 2 + gameSpeed);
        this.dx = 0; // Yatay hız (Diyagonal düşüş için)
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
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    }
}

let currentLevel = 1;

function checkLevel() {
    let newLevel = 1;
    if (score >= 500) newLevel = 4;
    else if (score >= 250) newLevel = 3;
    else if (score >= 100) newLevel = 2;

    if (newLevel > currentLevel) {
        currentLevel = newLevel;
        showLevelNotification(currentLevel);
        const s = sounds.levelup.cloneNode();
        s.volume = 0.5;
        s.play();
    }
}

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
    if (now - lastSpawn > spawnRate) {
        let spawnCount = 1;
        // Seviyelere göre çoklu düşüş oranları
        if (currentLevel >= 3 && Math.random() < 0.4) spawnCount = 2; 
        if (currentLevel >= 4 && Math.random() < 0.3) spawnCount = 3; 

        for (let i = 0; i < spawnCount; i++) {
            // Puan arttıkça kötü eşya gelme ihtimali artar (Maks %60)
            const badChance = Math.min(0.2 + (currentLevel * 0.1), 0.6);
            const type = Math.random() < badChance ? 'bad' : 'good';
            
            const newItem = new Item(type);
            
            // Çapraz (diyagonal) düşüş ekle (Seviye 2 ve üstü)
            if (currentLevel >= 2 && Math.random() < 0.5) {
                newItem.dx = (Math.random() - 0.5) * (gameSpeed * 1.5);
            }
            
            // Açılış pozisyonunu diğer elemanlarla çakışmaması için kaydır
            if (i > 0) {
                newItem.x = (newItem.x + 300) % (canvas.width - newItem.width); 
            }
            
            items.push(newItem);
        }
        
        lastSpawn = now;
        
        // Hızı ve sıklığı ayarla
        spawnRate = Math.max(400, 2500 - (score * 2.5)); // Çok daha hızlı bir ivmelenme
        gameSpeed = 2 + (score / 1500) * 3; 
    }
}

function update() {
    if (!gameActive) return;

    checkLevel();

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
        item.update();

        // Çarpışma Algılama (Ölçeklenebilir ve hassas hitbox)
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
                score += 10;
                scoreDisplay.innerText = score.toString().padStart(3, '0');
                player.currentScale = 1.15; // Pop efekti
                
                const s = sounds.collect.cloneNode();
                s.volume = 0.4;
                s.play();
                
                items.splice(i, 1);
            } else {
                takeDamage(i);
            }
            continue;
        }

        // Ekrandan çıkanları sil
        if (item.y > canvas.height) {
            items.splice(i, 1);
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
    draw();
    requestAnimationFrame(gameLoop);
}

function startGame() {
    score = 0;
    currentLevel = 1;
    lives = 9;
    items = [];
    waitingForFirstMove = true; // Başa al
    refillItemPool(); // Oyun başında havuzu doldur
    gameSpeed = 2; 
    spawnRate = 2500; // Başlangıçta daha ferah (2.5 saniye)
    scoreDisplay.innerText = '000';
    updateLivesUI();
    gameActive = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    
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

function takeDamage(itemIndex) {
    lives--;
    items.splice(itemIndex, 1);
    updateLivesUI();
    
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

function gameOver() {
    gameActive = false;
    finalScoreDisplay.innerText = score;
    gameOverScreen.classList.remove('hidden');
    
    sounds.bgMusic.pause();
    sounds.gameover.play();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Oyun döngüsünü başlat
gameLoop();
