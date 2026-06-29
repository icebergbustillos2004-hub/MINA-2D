// ============================================
// MINA 2D - Sistema de Juego Completo
// ============================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ajustar canvas
function resizeCanvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// ============================================
// CONSTANTES Y CONFIGURACIÓN
// ============================================
const TILE_SIZE = 40;
const WORLD_WIDTH = 500;
const WORLD_HEIGHT = 100;

// Tipos de bloques
const BLOCKS = {
    EMPTY: 0,
    DIRT: 1,
    GRASS: 2,
    STONE: 3,
    WOOD: 4,
    SAND: 5,
    COAL: 6
};

const BLOCK_COLORS = {
    [BLOCKS.DIRT]: '#8B6F47',
    [BLOCKS.GRASS]: '#228B22',
    [BLOCKS.STONE]: '#808080',
    [BLOCKS.WOOD]: '#8B4513',
    [BLOCKS.SAND]: '#DAA520',
    [BLOCKS.COAL]: '#222222'
};

const BLOCK_HARDNESS = {
    [BLOCKS.DIRT]: 1,
    [BLOCKS.GRASS]: 1,
    [BLOCKS.STONE]: 3,
    [BLOCKS.WOOD]: 2,
    [BLOCKS.SAND]: 1,
    [BLOCKS.COAL]: 2
};

// ============================================
// ESTADO DEL JUGADOR
// ============================================
const player = {
    x: 200 * TILE_SIZE,
    y: 100 * TILE_SIZE,
    width: 30,
    height: 50,
    vx: 0,
    vy: 0,
    health: 100,
    maxHealth: 100,
    hunger: 100,
    maxHunger: 100,
    level: 1,
    experience: 0,
    experienceToLevel: 100,
    toolLevel: 1,
    selectedSlot: 0,
    inventory: {
        dirt: 0,
        stone: 0,
        grass: 0,
        wood: 0,
        sand: 0,
        coal: 0,
        meat: 0
    },
    isJumping: false,
    direction: 1 // 1 = derecha, -1 = izquierda
};

// ============================================
// MUNDO
// ============================================
let world = Array.from({length: WORLD_WIDTH}, () => Array(WORLD_HEIGHT).fill(BLOCKS.EMPTY));

function generateWorld() {
    // Generar terreno base
    for(let x = 0; x < WORLD_WIDTH; x++) {
        let height = 70 + Math.floor(Math.sin(x / 15) * 8);
        
        for(let y = 0; y < WORLD_HEIGHT; y++) {
            if(y > height) {
                // Pasto en la superficie
                if(y === height + 1) {
                    world[x][y] = BLOCKS.GRASS;
                }
                // Tierra debajo del pasto
                else if(y < height + 10) {
                    world[x][y] = BLOCKS.DIRT;
                }
                // Piedra más abajo
                else if(y < height + 20) {
                    world[x][y] = BLOCKS.STONE;
                }
                // Carbón ocasional
                else if(Math.random() < 0.1) {
                    world[x][y] = BLOCKS.COAL;
                } else {
                    world[x][y] = BLOCKS.STONE;
                }
                
                // Arena en biomas desérticos
                if(x > 300 && x < 400 && y > height && y < height + 5) {
                    world[x][y] = BLOCKS.SAND;
                }
            }
        }
    }
    
    // Agregar árboles
    for(let i = 0; i < 15; i++) {
        let tx = Math.floor(Math.random() * WORLD_WIDTH);
        let ty = 70;
        // Buscar altura del terreno
        while(ty < WORLD_HEIGHT - 1 && world[tx][ty] === BLOCKS.EMPTY) ty++;
        ty--;
        
        if(world[tx][ty] === BLOCKS.GRASS) {
            // Crear árbol
            for(let j = 0; j < 4; j++) {
                if(ty - j >= 0) world[tx][ty - j] = BLOCKS.WOOD;
            }
        }
    }
}

// ============================================
// ENTIDADES
// ============================================
let animals = [];
let items = [];
let particles = [];

class Animal {
    constructor(x, y, type = 'pig') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30;
        this.height = 30;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = 0;
        this.health = 5;
        this.direction = this.vx > 0 ? 1 : -1;
    }
    
    update() {
        this.vy += 0.8; // Gravedad
        this.x += this.vx;
        this.y += this.vy;
        
        // Colisión con terreno
        let tileX = Math.floor(this.x / TILE_SIZE);
        let tileY = Math.floor((this.y + this.height) / TILE_SIZE);
        
        if(tileX >= 0 && tileX < WORLD_WIDTH && tileY >= 0 && tileY < WORLD_HEIGHT) {
            if(world[tileX][tileY] !== BLOCKS.EMPTY) {
                this.vy = 0;
                this.y = tileY * TILE_SIZE - this.height;
                
                // Salto ocasional
                if(Math.random() < 0.02) {
                    this.vy = -12;
                }
            }
        }
        
        // Cambiar dirección ocasionalmente
        if(Math.random() < 0.01) {
            this.vx = (Math.random() - 0.5) * 4;
            this.direction = this.vx > 0 ? 1 : -1;
        }
    }
    
    draw(camX) {
        ctx.fillStyle = this.type === 'pig' ? '#FFB6C1' : '#CD5C5C';
        ctx.fillRect(this.x - camX, this.y, this.width, this.height);
        
        // Ojos
        ctx.fillStyle = '#000';
        ctx.fillRect(this.x - camX + 8, this.y + 5, 4, 4);
        ctx.fillRect(this.x - camX + 18, this.y + 5, 4, 4);
    }
}

function spawnAnimals() {
    for(let i = 0; i < 8; i++) {
        animals.push(new Animal(
            Math.random() * WORLD_WIDTH * TILE_SIZE,
            50 * TILE_SIZE,
            'pig'
        ));
    }
}

// ============================================
// FÍSICA DEL JUGADOR
// ============================================
function updatePlayer() {
    // Gravedad
    player.vy += 0.8;
    player.x += player.vx;
    player.y += player.vy;
    
    // Colisiones
    let tileX = Math.floor(player.x / TILE_SIZE);
    let tileY = Math.floor((player.y + player.height) / TILE_SIZE);
    
    if(world[tileX] && world[tileX][tileY] !== BLOCKS.EMPTY) {
        player.vy = 0;
        player.y = tileY * TILE_SIZE - player.height;
        player.isJumping = false;
    }
    
    // Fricción horizontal
    player.vx *= 0.85;
    
    // Límites del mundo
    if(player.x < 0) player.x = 0;
    if(player.x > WORLD_WIDTH * TILE_SIZE - player.width) 
        player.x = WORLD_WIDTH * TILE_SIZE - player.width;
    
    // Hambre decrece lentamente
    player.hunger -= 0.02;
    if(player.hunger < 0) {
        player.hunger = 0;
        player.health -= 0.5; // Daño por hambre
    }
    
    if(player.health < 0) player.health = 0;
    if(player.hunger > player.maxHunger) player.hunger = player.maxHunger;
}

// ============================================
// ENTRADA DE USUARIO
// ============================================
const keys = {};

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Números 1-5 para seleccionar slot
    if(e.key >= '1' && e.key <= '5') {
        player.selectedSlot = parseInt(e.key) - 1;
    }
    
    // X para comer
    if(e.key.toLowerCase() === 'x' && player.inventory.meat > 0) {
        player.inventory.meat--;
        player.hunger = Math.min(player.hunger + 30, player.maxHunger);
    }
});

window.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

function handleInput() {
    // Movimiento
    if(keys['a']) {
        player.vx = -5;
        player.direction = -1;
    }
    if(keys['d']) {
        player.vx = 5;
        player.direction = 1;
    }
    
    // Salto
    if((keys['w'] || keys[' ']) && !player.isJumping) {
        player.vy = -12;
        player.isJumping = true;
    }
}

canvas.addEventListener('mousedown', (e) => {
    let rect = canvas.getBoundingClientRect();
    let mouseX = e.clientX - rect.left;
    let mouseY = e.clientY - rect.top;
    
    let camX = player.x - canvas.width / 2;
    let worldX = mouseX + camX;
    let worldY = mouseY;
    
    let tileX = Math.floor(worldX / TILE_SIZE);
    let tileY = Math.floor(worldY / TILE_SIZE);
    
    // Click izquierdo: romper bloque/atacar animal
    if(e.button === 0) {
        // Atacar animales
        animals.forEach((animal, idx) => {
            if(Math.abs(animal.x - worldX) < 50 && Math.abs(animal.y - worldY) < 50) {
                animal.health--;
                if(animal.health <= 0) {
                    animals.splice(idx, 1);
                    player.inventory.meat++;
                    player.experience += 25;
                    // Partículas de sangre
                    for(let i = 0; i < 8; i++) {
                        particles.push({
                            x: animal.x,
                            y: animal.y,
                            vx: (Math.random() - 0.5) * 6,
                            vy: Math.random() * -4,
                            life: 30,
                            color: '#FF6B6B'
                        });
                    }
                }
            }
        });
        
        // Romper bloque
        if(tileX >= 0 && tileX < WORLD_WIDTH && tileY >= 0 && tileY < WORLD_HEIGHT) {
            let block = world[tileX][tileY];
            if(block !== BLOCKS.EMPTY) {
                let hardness = BLOCK_HARDNESS[block] || 1;
                let miningTime = hardness / player.toolLevel;
                
                // Romper bloque instantáneamente para demo
                let blockName = Object.keys(BLOCKS).find(key => BLOCKS[key] === block).toLowerCase();
                player.inventory[blockName]++;
                world[tileX][tileY] = BLOCKS.EMPTY;
                player.experience += 10;
                
                // Partículas de bloque
                for(let i = 0; i < 5; i++) {
                    particles.push({
                        x: tileX * TILE_SIZE + TILE_SIZE / 2,
                        y: tileY * TILE_SIZE + TILE_SIZE / 2,
                        vx: (Math.random() - 0.5) * 5,
                        vy: Math.random() * -4,
                        life: 20,
                        color: BLOCK_COLORS[block]
                    });
                }
            }
        }
    }
    
    // Click derecho: colocar bloque
    if(e.button === 2) {
        if(tileX >= 0 && tileX < WORLD_WIDTH && tileY >= 0 && tileY < WORLD_HEIGHT) {
            if(world[tileX][tileY] === BLOCKS.EMPTY) {
                // Obtener bloque seleccionado del inventario
                let blockTypes = ['dirt', 'grass', 'stone', 'wood', 'sand', 'coal'];
                let selectedBlock = blockTypes[player.selectedSlot];
                
                if(player.inventory[selectedBlock] > 0) {
                    let blockType = BLOCKS[selectedBlock.toUpperCase()];
                    world[tileX][tileY] = blockType;
                    player.inventory[selectedBlock]--;
                }
            }
        }
    }
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ============================================
// SISTEMA DE NIVEL
// ============================================
function updateLevel() {
    if(player.experience >= player.experienceToLevel) {
        player.level++;
        player.toolLevel++;
        player.experience -= player.experienceToLevel;
        player.experienceToLevel = Math.floor(player.experienceToLevel * 1.2);
        player.maxHealth += 10;
        player.health = player.maxHealth;
    }
}

// ============================================
// INTERFAZ
// ============================================
function updateUI() {
    // Barras de estadísticas
    document.getElementById('healthBar').style.width = (player.health / player.maxHealth) * 100 + '%';
    document.getElementById('hungerBar').style.width = (player.hunger / player.maxHunger) * 100 + '%';
    document.getElementById('levelBar').style.width = (player.experience / player.experienceToLevel) * 100 + '%';
    
    document.getElementById('hpValue').textContent = Math.floor(player.health) + '/' + player.maxHealth;
    document.getElementById('hungerValue').textContent = Math.floor(player.hunger) + '/' + player.maxHunger;
    document.getElementById('levelValue').textContent = player.level;
    
    // Actualizar inventario
    let invDiv = document.getElementById('inventory');
    invDiv.innerHTML = '';
    
    let blockTypes = [
        {name: 'dirt', label: '🟫'},
        {name: 'stone', label: '⬜'},
        {name: 'wood', label: '🟫'},
        {name: 'grass', label: '🟩'},
        {name: 'sand', label: '🟨'},
        {name: 'meat', label: '🍖'}
    ];
    
    blockTypes.forEach((block, idx) => {
        let slot = document.createElement('div');
        slot.className = 'inventory-slot';
        if(idx === player.selectedSlot) slot.classList.add('selected');
        slot.setAttribute('data-block', block.name);
        slot.innerHTML = `
            <div>${block.label}</div>
            <div class="inventory-count">${player.inventory[block.name]}</div>
        `;
        invDiv.appendChild(slot);
    });
}

// ============================================
// DIBUJO
// ============================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Cámara
    let camX = player.x - canvas.width / 2;
    let camY = 0;
    
    // Dibujar cielo
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Dibujar bloques
    let startTileX = Math.floor(camX / TILE_SIZE);
    let endTileX = Math.ceil((camX + canvas.width) / TILE_SIZE);
    
    for(let x = Math.max(0, startTileX); x < Math.min(WORLD_WIDTH, endTileX); x++) {
        for(let y = 0; y < WORLD_HEIGHT; y++) {
            let block = world[x][y];
            if(block !== BLOCKS.EMPTY) {
                ctx.fillStyle = BLOCK_COLORS[block];
                ctx.fillRect(
                    x * TILE_SIZE - camX,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );
                // Borde del bloque
                ctx.strokeStyle = 'rgba(0,0,0,0.2)';
                ctx.lineWidth = 1;
                ctx.strokeRect(
                    x * TILE_SIZE - camX,
                    y * TILE_SIZE,
                    TILE_SIZE,
                    TILE_SIZE
                );
            }
        }
    }
    
    // Dibujar partículas
    ctx.fillStyle = '#FF6B6B';
    particles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life--;
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 30;
        ctx.fillRect(p.x - camX, p.y, 5, 5);
        ctx.globalAlpha = 1;
        
        if(p.life <= 0) particles.splice(idx, 1);
    });
    
    // Dibujar animales
    animals.forEach(animal => animal.draw(camX));
    
    // Dibujar jugador
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(player.x - camX, player.y, player.width, player.height);
    
    // Cabeza
    ctx.fillStyle = '#FFDBAC';
    ctx.fillRect(player.x - camX + 5, player.y - 10, player.width - 10, 15);
    
    // Ojos
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x - camX + 8, player.y - 7, 4, 4);
    ctx.fillRect(player.x - camX + 18, player.y - 7, 4, 4);
    
    // Herramienta en la mano
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(
        player.x - camX + (player.direction > 0 ? player.width : -5),
        player.y + 10,
        5,
        15
    );
}

// ============================================
// LOOP PRINCIPAL
// ============================================
let lastTime = Date.now();

function gameLoop() {
    let now = Date.now();
    let deltaTime = (now - lastTime) / 1000;
    lastTime = now;
    
    handleInput();
    updatePlayer();
    
    animals.forEach(animal => animal.update());
    
    updateLevel();
    updateUI();
    draw();
    
    requestAnimationFrame(gameLoop);
}

// ============================================
// INICIALIZACIÓN
// ============================================
generatWorld();
spawnAnimals();
gameLoop();