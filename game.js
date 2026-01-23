// ===========================================
// DOMINATION GAME - COMPLETELY UPDATED VERSION
// Features: Growing map, zoom, permanent troop selector
// ===========================================

// Game State
let gameState = {
    active: false,
    mode: 'domination',
    playerName: 'Commander',
    playerTiles: [],
    botTiles: [],
    neutralTiles: [],
    score: 0,
    bots: [],
    botCount: 0,
    difficulty: 2,
    selectedTile: null,
    gridSize: 8,
    botsDefeated: 0,
    gameTime: 0,
    lastUpdate: Date.now(),
    gameLoop: null,
    isPaused: false,
    
    // Game settings
    troopGenerationRate: 0.6,
    maxTroopsPerTile: 50,
    troops: {},
    
    // Difficulty settings
    difficultyPresets: {
        1: { // Easy
            startTroops: 50,
            startTiles: 5,
            troopRate: 0.8,
            botSpawnRate: 60,
            botStartTroops: 15,
            botShield: 0,
            botAggression: 0.3,
            scoreMultiplier: 1.0
        },
        2: { // Normal
            startTroops: 40,
            startTiles: 4,
            troopRate: 0.6,
            botSpawnRate: 45,
            botStartTroops: 25,
            botShield: 2,
            botAggression: 0.5,
            scoreMultiplier: 1.5
        },
        3: { // Hard
            startTroops: 30,
            startTiles: 3,
            troopRate: 0.4,
            botSpawnRate: 30,
            botStartTroops: 35,
            botShield: 4,
            botAggression: 0.7,
            scoreMultiplier: 2.0
        },
        4: { // Expert
            startTroops: 20,
            startTiles: 2,
            troopRate: 0.3,
            botSpawnRate: 20,
            botStartTroops: 45,
            botShield: 6,
            botAggression: 0.9,
            scoreMultiplier: 2.5
        },
        5: { // Insane
            startTroops: 10,
            startTiles: 1,
            troopRate: 0.2,
            botSpawnRate: 10,
            botStartTroops: 55,
            botShield: 8,
            botAggression: 1.0,
            scoreMultiplier: 3.0
        }
    },
    
    // Domination mode specific
    wave: 1,
    nextWaveTime: 300, // 5 minutes in seconds
    mapExpansionCount: 0,
    
    // Map view state (for Domination mode)
    mapView: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        dragStartX: 0,
        dragStartY: 0,
        lastOffsetX: 0,
        lastOffsetY: 0
    },
    
    // Troop deployment
    troopDeploymentAmount: 5, // Default troops to send
    lastSelectedTroops: 5
};

// DOM Elements
const tilesContainer = document.getElementById('tilesContainer');
const gameStatus = document.getElementById('gameStatus');
const playerTilesElement = document.getElementById('playerTiles');
const currentScoreElement = document.getElementById('currentScore');
const botCountElement = document.getElementById('botCount');
const difficultyLevelElement = document.getElementById('difficultyLevel');
const gameModeDisplay = document.getElementById('gameModeDisplay');
const currentPlayerNameElement = document.getElementById('currentPlayerName');
const modeInfoElement = document.getElementById('modeInfo');
const gameTimeElement = document.getElementById('gameTime');
const totalTroopsElement = document.getElementById('totalTroops');
const gameStatusTextElement = document.getElementById('gameStatusText');
const pauseBtn = document.getElementById('pauseBtn');

// Mini stats
const miniTiles = document.getElementById('miniTiles');
const miniScore = document.getElementById('miniScore');
const miniTime = document.getElementById('miniTime');
const miniWave = document.getElementById('miniWave');

// Troop selector elements
const troopSelector = document.getElementById('troopSelector');
const selectorMessage = document.getElementById('selectorMessage');
const selectedTileInfo = document.getElementById('selectedTileInfo');
const troopSlider = document.getElementById('troopSlider');
const currentTroops = document.getElementById('currentTroops');
const minTroopsLabel = document.getElementById('minTroopsLabel');
const maxTroopsLabel = document.getElementById('maxTroopsLabel');

// Map elements
const mapContainer = document.getElementById('mapContainer');
const zoomLevel = document.getElementById('zoomLevel');

// Stats panel
const statsPanel = document.getElementById('statsPanel');

// Initialize Game
function initGame() {
    // Load settings
    gameState.playerName = localStorage.getItem('dominationPlayerName') || 'Commander';
    gameState.mode = localStorage.getItem('dominationGameMode') || 'domination';
    gameState.difficulty = parseInt(localStorage.getItem('dominationDifficulty')) || 2;
    
    // Load game settings
    const savedSettings = localStorage.getItem('dominationSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        applyTheme(settings.theme);
        applyTileSize(settings.tileSize);
    }
    
    // Update UI
    currentPlayerNameElement.textContent = gameState.playerName;
    const modeName = getModeName(gameState.mode);
    gameModeDisplay.textContent = modeName;
    modeInfoElement.textContent = modeName;
    
    // Set difficulty from preset
    const preset = gameState.difficultyPresets[gameState.difficulty];
    gameState.troopGenerationRate = preset.troopRate;
    
    // Create tiles based on mode
    if (gameState.mode === 'domination') {
        startDomination();
    } else if (gameState.mode === 'bots') {
        startBotsBattle();
    } else if (gameState.mode === '1v1') {
        start1v1();
    }
    
    // Setup troop slider
    setupTroopSlider();
    
    // Setup map interactions for Domination mode
    if (gameState.mode === 'domination') {
        setupMapInteractions();
    }
    
    // Update UI
    updateUI();
    
    // Start game loop
    startGameLoop();
}

// Setup map interactions for Domination mode
function setupMapInteractions() {
    // Mouse wheel zoom
    mapContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        const zoomSpeed = gameState.mapView.zoom * 0.1;
        if (e.deltaY < 0) {
            zoomIn();
        } else {
            zoomOut();
        }
    });
    
    // Mouse drag
    mapContainer.addEventListener('mousedown', function(e) {
        gameState.mapView.isDragging = true;
        gameState.mapView.dragStartX = e.clientX - gameState.mapView.offsetX;
        gameState.mapView.dragStartY = e.clientY - gameState.mapView.offsetY;
        mapContainer.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (gameState.mapView.isDragging) {
            gameState.mapView.offsetX = e.clientX - gameState.mapView.dragStartX;
            gameState.mapView.offsetY = e.clientY - gameState.mapView.dragStartY;
            updateMapView();
        }
    });
    
    document.addEventListener('mouseup', function() {
        gameState.mapView.isDragging = false;
        mapContainer.style.cursor = 'grab';
    });
    
    // Touch support for mobile
    mapContainer.addEventListener('touchstart', function(e) {
        if (e.touches.length === 1) {
            gameState.mapView.isDragging = true;
            gameState.mapView.dragStartX = e.touches[0].clientX - gameState.mapView.offsetX;
            gameState.mapView.dragStartY = e.touches[0].clientY - gameState.mapView.offsetY;
        } else if (e.touches.length === 2) {
            // Pinch zoom
            e.preventDefault();
        }
    });
    
    mapContainer.addEventListener('touchmove', function(e) {
        if (e.touches.length === 1 && gameState.mapView.isDragging) {
            gameState.mapView.offsetX = e.touches[0].clientX - gameState.mapView.dragStartX;
            gameState.mapView.offsetY = e.touches[0].clientY - gameState.mapView.dragStartY;
            updateMapView();
        }
    });
    
    mapContainer.addEventListener('touchend', function() {
        gameState.mapView.isDragging = false;
    });
}

// Update map view transform
function updateMapView() {
    tilesContainer.style.transform = `translate(${gameState.mapView.offsetX}px, ${gameState.mapView.offsetY}px) scale(${gameState.mapView.zoom})`;
}

// Zoom in
function zoomIn() {
    gameState.mapView.zoom = Math.min(3, gameState.mapView.zoom + 0.2);
    updateMapView();
    zoomLevel.textContent = Math.round(gameState.mapView.zoom * 100) + '%';
}

// Zoom out
function zoomOut() {
    gameState.mapView.zoom = Math.max(0.5, gameState.mapView.zoom - 0.2);
    updateMapView();
    zoomLevel.textContent = Math.round(gameState.mapView.zoom * 100) + '%';
}

// Reset view
function resetView() {
    gameState.mapView.zoom = 1;
    gameState.mapView.offsetX = 0;
    gameState.mapView.offsetY = 0;
    updateMapView();
    zoomLevel.textContent = '100%';
}

// Apply color theme
function applyTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\w+/g, '');
    if (theme !== 'default') {
        document.body.classList.add('theme-' + theme);
    }
}

// Apply tile size
function applyTileSize(size) {
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => {
        tile.style.minWidth = size + 'px';
        tile.style.minHeight = size + 'px';
        tile.style.fontSize = (size * 0.1) + 'px';
    });
}

// Create game tiles
function createTiles(rows, cols) {
    tilesContainer.innerHTML = '';
    tilesContainer.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    tilesContainer.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
    
    // Reset tile arrays
    gameState.neutralTiles = [];
    gameState.playerTiles = [];
    gameState.botTiles = [];
    gameState.troops = {};
    
    const preset = gameState.difficultyPresets[gameState.difficulty];
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const tileId = `${row}-${col}`;
            const tile = document.createElement('div');
            tile.className = 'tile neutral';
            tile.dataset.id = tileId;
            
            // Create tile content
            const content = document.createElement('div');
            content.className = 'tile-content';
            
            // Troop count display
            const troopCount = document.createElement('div');
            troopCount.className = 'troop-count';
            troopCount.textContent = '0';
            content.appendChild(troopCount);
            
            // Shield indicator
            const shieldIndicator = document.createElement('div');
            shieldIndicator.className = 'shield-indicator';
            shieldIndicator.innerHTML = '<i class="fas fa-shield-alt"></i>';
            shieldIndicator.style.display = 'none';
            content.appendChild(shieldIndicator);
            
            tile.appendChild(content);
            tile.addEventListener('click', () => handleTileClick(tileId));
            tilesContainer.appendChild(tile);
            
            // Initialize troop data
            gameState.troops[tileId] = {
                playerTroops: 0,
                botTroops: 0,
                neutralTroops: 2 + Math.floor(Math.random() * 4),
                owner: 'neutral',
                shield: preset.botShield
            };
            
            gameState.neutralTiles.push(tileId);
        }
    }
    
    // Update map size display
    document.getElementById('mapSize').textContent = `${rows}x${cols}`;
}

// Setup troop slider
function setupTroopSlider() {
    // Load last troop amount
    const savedTroops = localStorage.getItem('dominationLastTroops');
    if (savedTroops) {
        gameState.troopDeploymentAmount = parseInt(savedTroops);
        gameState.lastSelectedTroops = parseInt(savedTroops);
    }
    
    troopSlider.value = gameState.troopDeploymentAmount;
    currentTroops.textContent = gameState.troopDeploymentAmount;
    selectorMessage.textContent = gameState.troopDeploymentAmount;
    
    troopSlider.addEventListener('input', function() {
        gameState.troopDeploymentAmount = parseInt(this.value);
        currentTroops.textContent = gameState.troopDeploymentAmount;
        selectorMessage.textContent = gameState.troopDeploymentAmount;
        
        // Save to localStorage
        localStorage.setItem('dominationLastTroops', gameState.troopDeploymentAmount);
    });
}

// Set troops to 50% of selected tile
function setHalfTroops() {
    if (gameState.selectedTile) {
        const tileData = gameState.troops[gameState.selectedTile];
        const troops = tileData.owner === 'player' ? tileData.playerTroops : 0;
        const halfTroops = Math.max(1, Math.floor(troops / 2));
        troopSlider.value = halfTroops;
        gameState.troopDeploymentAmount = halfTroops;
        currentTroops.textContent = halfTroops;
        selectorMessage.textContent = halfTroops;
        localStorage.setItem('dominationLastTroops', halfTroops);
    }
}

// Set troops to maximum available
function setMaxTroops() {
    if (gameState.selectedTile) {
        const tileData = gameState.troops[gameState.selectedTile];
        const troops = tileData.owner === 'player' ? tileData.playerTroops : 0;
        troopSlider.value = troops;
        gameState.troopDeploymentAmount = troops;
        currentTroops.textContent = troops;
        selectorMessage.textContent = troops;
        localStorage.setItem('dominationLastTroops', troops);
    }
}

// Clear tile selection
function clearSelection() {
    if (gameState.selectedTile) {
        const tile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        if (tile) tile.classList.remove('selected');
        gameState.selectedTile = null;
        selectedTileInfo.textContent = 'None';
    }
}

// Start Domination mode
function startDomination() {
    gameState.active = true;
    gameState.gridSize = 8; // Start with 8x8
    gameState.wave = 1;
    gameState.nextWaveTime = 300; // 5 minutes
    
    const preset = gameState.difficultyPresets[gameState.difficulty];
    
    // Create initial tiles
    createTiles(gameState.gridSize, gameState.gridSize);
    
    // Player starts in center
    const centerRow = Math.floor(gameState.gridSize / 2);
    const centerCol = Math.floor(gameState.gridSize / 2);
    
    // Starting tiles based on difficulty
    const playerTiles = [];
    for (let i = 0; i < preset.startTiles; i++) {
        let row = centerRow + Math.floor(i / 2) * (i % 2 === 0 ? 1 : -1);
        let col = centerCol + (i % 2) * (i % 2 === 0 ? 1 : -1);
        if (row >= 0 && row < gameState.gridSize && col >= 0 && col < gameState.gridSize) {
            playerTiles.push(`${row}-${col}`);
        }
    }
    
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        gameState.troops[tileId].playerTroops = preset.startTroops;
        gameState.troops[tileId].shield = Math.floor(preset.botShield / 2);
        updateTroopDisplay(tileId);
    });
    
    // Spawn initial bots
    spawnBots(2);
    
    gameStatus.textContent = "Domination: Survive as long as possible!";
    gameStatus.className = "game-status player-turn";
    
    // Setup map container size
    mapContainer.style.height = '400px';
}

// Start Bots Battle mode
function startBotsBattle() {
    gameState.active = true;
    gameState.gridSize = 8;
    
    const preset = gameState.difficultyPresets[gameState.difficulty];
    
    // Create tiles
    createTiles(gameState.gridSize, gameState.gridSize);
    
    // Player starts in corner
    const playerTile = '1-1';
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = preset.startTroops;
    gameState.troops[playerTile].shield = Math.floor(preset.botShield / 2);
    updateTroopDisplay(playerTile);
    
    // Spawn bots
    spawnBots(3);
    
    gameStatus.textContent = "Bots Battle: Eliminate all bots!";
    gameStatus.className = "game-status player-turn";
    
    // Fixed map for this mode
    mapContainer.style.height = '400px';
    mapContainer.style.overflow = 'auto';
}

// Start 1v1 mode
function start1v1() {
    gameState.active = true;
    gameState.gridSize = 8;
    
    const preset = gameState.difficultyPresets[gameState.difficulty];
    
    // Create tiles
    createTiles(gameState.gridSize, gameState.gridSize);
    
    // Player starts on left
    const playerRow = Math.floor(gameState.gridSize / 2);
    const playerTile = `${playerRow}-1`;
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = preset.startTroops;
    gameState.troops[playerTile].shield = Math.floor(preset.botShield / 2);
    updateTroopDisplay(playerTile);
    
    // Bot starts on right
    const botTile = `${playerRow}-${gameState.gridSize - 2}`;
    conquerTile(botTile, 'bot');
    gameState.troops[botTile].botTroops = preset.botStartTroops;
    gameState.troops[botTile].shield = preset.botShield;
    updateTroopDisplay(botTile);
    
    gameState.bots.push({
        id: 'elite',
        strength: 1.0,
        intelligence: 1,
        aggression: preset.botAggression
    });
    gameState.botCount = 1;
    
    gameStatus.textContent = "1v1 Duel: Defeat the elite bot!";
    gameStatus.className = "game-status player-turn";
    
    // Fixed map for this mode
    mapContainer.style.height = '400px';
    mapContainer.style.overflow = 'auto';
}

// Start game loop
function startGameLoop() {
    if (gameState.gameLoop) clearInterval(gameState.gameLoop);
    
    gameState.gameLoop = setInterval(() => {
        if (!gameState.active || gameState.isPaused) return;
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - gameState.lastUpdate) / 1000;
        gameState.lastUpdate = currentTime;
        
        // Update game time
        gameState.gameTime += deltaTime;
        
        // Update next wave timer for Domination mode
        if (gameState.mode === 'domination') {
            gameState.nextWaveTime -= deltaTime;
            if (gameState.nextWaveTime <= 0) {
                triggerNextWave();
            }
            updateWaveTimer();
        }
        
        // Generate troops
        generateTroops(deltaTime);
        
        // Bot actions
        if (Math.random() < 0.3) {
            botActions();
        }
        
        // Update UI
        updateUI();
        
        // Check win conditions
        checkGameEnd();
        
    }, 1000); // Update every second
}

// Generate troops
function generateTroops(deltaTime) {
    const generation = gameState.troopGenerationRate * deltaTime;
    
    // Player troops
    gameState.playerTiles.forEach(tileId => {
        if (gameState.troops[tileId].playerTroops < gameState.maxTroopsPerTile) {
            gameState.troops[tileId].playerTroops += generation;
            updateTroopDisplay(tileId);
        }
    });
    
    // Bot troops
    gameState.botTiles.forEach(tileId => {
        if (gameState.troops[tileId].botTroops < gameState.maxTroopsPerTile) {
            gameState.troops[tileId].botTroops += generation * 0.8;
            updateTroopDisplay(tileId);
        }
    });
}

// Handle tile click
function handleTileClick(tileId) {
    if (!gameState.active || gameState.isPaused) return;
    
    const tileData = gameState.troops[tileId];
    
    // If player owns this tile, select it
    if (gameState.playerTiles.includes(tileId) && tileData.playerTroops > 0) {
        selectTile(tileId);
        return;
    }
    
    // If a tile is selected and clicked tile is adjacent
    if (gameState.selectedTile && isAdjacent(tileId, gameState.selectedTile)) {
        const fromTileId = gameState.selectedTile;
        const attackTroops = gameState.troopDeploymentAmount;
        
        if (gameState.playerTiles.includes(tileId)) {
            reinforceTile(fromTileId, tileId, attackTroops);
        } else {
            attackTile(fromTileId, tileId, attackTroops);
        }
        
        // Keep selection after attack
        selectTile(fromTileId);
    } else if (gameState.selectedTile) {
        gameStatus.textContent = "Target not adjacent!";
        gameStatus.className = "game-status";
        setTimeout(() => {
            if (gameState.active) {
                gameStatus.textContent = gameState.mode === 'domination' ? 
                    "Domination: Survive as long as possible!" : 
                    "Game in Progress";
                gameStatus.className = "game-status player-turn";
            }
        }, 2000);
    }
}

// Attack tile
function attackTile(attackerTileId, defenderTileId, attackTroops) {
    const attackerData = gameState.troops[attackerTileId];
    const defenderData = gameState.troops[defenderTileId];
    
    // Check if we have enough troops
    if (attackTroops > attackerData.playerTroops) {
        gameStatus.textContent = "Not enough troops!";
        return;
    }
    
    // Remove attacking troops
    attackerData.playerTroops -= attackTroops;
    
    let defenseStrength = 0;
    let defenderOwner = defenderData.owner;
    const shield = defenderData.shield || 0;
    
    if (defenderOwner === 'neutral') {
        defenseStrength = defenderData.neutralTroops + shield;
    } else if (defenderOwner === 'bot') {
        defenseStrength = defenderData.botTroops + shield;
    }
    
    // Difference-based combat
    if (attackTroops > defenseStrength) {
        // Attacker wins
        const survivingTroops = attackTroops - defenseStrength;
        
        // Clear defender troops
        defenderData.neutralTroops = 0;
        defenderData.botTroops = 0;
        
        if (defenderOwner === 'neutral') {
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            defenderData.shield = Math.floor(shield / 2);
            gameState.score += 25;
            gameStatus.textContent = `Captured neutral territory! ${survivingTroops} troops remain.`;
        } else if (defenderOwner === 'bot') {
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            defenderData.shield = Math.floor(shield / 2);
            gameState.score += 100;
            gameState.botsDefeated++;
            gameStatus.textContent = `Victory! Defeated bot. ${survivingTroops} troops remain.`;
            
            // Check if bot is completely defeated
            checkBotDefeated();
        }
    } else {
        // Defender wins
        const survivingDefenders = defenseStrength - attackTroops;
        
        if (defenderOwner === 'neutral') {
            defenderData.neutralTroops = Math.max(1, survivingDefenders - shield);
            gameStatus.textContent = `Attack failed! Neutral tile has ${Math.floor(defenderData.neutralTroops)} troops left.`;
        } else if (defenderOwner === 'bot') {
            defenderData.botTroops = Math.max(1, survivingDefenders - shield);
            gameStatus.textContent = `Attack failed! Bot has ${Math.floor(defenderData.botTroops)} troops left.`;
        }
        
        gameStatus.textContent += ` Lost ${attackTroops} troops.`;
    }
    
    // Battle animation
    animateBattle(attackerTileId, defenderTileId);
    
    updateTroopDisplay(attackerTileId);
    updateTroopDisplay(defenderTileId);
    
    // Reset status message after 2 seconds
    setTimeout(() => {
        if (gameState.active) {
            gameStatus.textContent = gameState.mode === 'domination' ? 
                "Domination: Survive as long as possible!" : 
                "Game in Progress";
            gameStatus.className = "game-status player-turn";
        }
    }, 2000);
}

// Reinforce tile
function reinforceTile(fromTileId, toTileId, troops) {
    const fromData = gameState.troops[fromTileId];
    const toData = gameState.troops[toTileId];
    
    if (troops > fromData.playerTroops) {
        gameStatus.textContent = "Not enough troops!";
        return;
    }
    
    fromData.playerTroops -= troops;
    toData.playerTroops += troops;
    
    // Cap at max troops
    if (toData.playerTroops > gameState.maxTroopsPerTile) {
        const excess = toData.playerTroops - gameState.maxTroopsPerTile;
        toData.playerTroops = gameState.maxTroopsPerTile;
        fromData.playerTroops += excess;
    }
    
    updateTroopDisplay(fromTileId);
    updateTroopDisplay(toTileId);
    
    gameStatus.textContent = `Moved ${troops} troops to ${toTileId}`;
    
    // Reset status message after 2 seconds
    setTimeout(() => {
        if (gameState.active) {
            gameStatus.textContent = gameState.mode === 'domination' ? 
                "Domination: Survive as long as possible!" : 
                "Game in Progress";
            gameStatus.className = "game-status player-turn";
        }
    }, 2000);
}

// Select tile
function selectTile(tileId) {
    // Deselect previous
    if (gameState.selectedTile) {
        const prevTile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        if (prevTile) prevTile.classList.remove('selected');
    }
    
    // Select new
    gameState.selectedTile = tileId;
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (tile) {
        tile.classList.add('selected');
        const troops = Math.floor(gameState.troops[tileId].playerTroops);
        selectedTileInfo.textContent = `${tileId} (${troops} troops)`;
    }
}

// Conquer tile
function conquerTile(tileId, newOwner) {
    const tileData = gameState.troops[tileId];
    const oldOwner = tileData.owner;
    
    // Remove from old owner
    if (oldOwner === 'player') {
        const index = gameState.playerTiles.indexOf(tileId);
        if (index > -1) gameState.playerTiles.splice(index, 1);
    } else if (oldOwner === 'bot') {
        const index = gameState.botTiles.indexOf(tileId);
        if (index > -1) gameState.botTiles.splice(index, 1);
    } else if (oldOwner === 'neutral') {
        const index = gameState.neutralTiles.indexOf(tileId);
        if (index > -1) gameState.neutralTiles.splice(index, 1);
    }
    
    // Add to new owner
    tileData.owner = newOwner;
    
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (tile) {
        tile.classList.remove('player', 'bot', 'neutral');
        
        if (newOwner === 'player') {
            gameState.playerTiles.push(tileId);
            tile.classList.add('player');
            gameState.score += 50;
        } else if (newOwner === 'bot') {
            gameState.botTiles.push(tileId);
            tile.classList.add('bot');
        } else if (newOwner === 'neutral') {
            gameState.neutralTiles.push(tileId);
            tile.classList.add('neutral');
        }
    }
    
    updateTroopDisplay(tileId);
}

// Bot actions
function botActions() {
    const preset = gameState.difficultyPresets[gameState.difficulty];
    
    gameState.bots.forEach((bot, botIndex) => {
        if (Math.random() > preset.botAggression) return;
        
        // Find bot tiles with troops
        const botTilesWithTroops = gameState.botTiles.filter(tileId => 
            gameState.troops[tileId].botTroops > 5
        );
        
        if (botTilesWithTroops.length === 0) return;
        
        const fromTileId = botTilesWithTroops[Math.floor(Math.random() * botTilesWithTroops.length)];
        const fromTroops = gameState.troops[fromTileId].botTroops;
        
        // Find adjacent tiles
        const adjacentTiles = getAdjacentTiles(fromTileId);
        
        // Find targets
        const playerTargets = adjacentTiles.filter(tileId => 
            gameState.playerTiles.includes(tileId)
        );
        
        const neutralTargets = adjacentTiles.filter(tileId => 
            gameState.neutralTiles.includes(tileId)
        );
        
        let targetTileId = null;
        let targetType = null;
        
        // Try to attack player
        for (const tileId of playerTargets) {
            const defense = gameState.troops[tileId].playerTroops + gameState.troops[tileId].shield;
            if (fromTroops > defense * 1.1) {
                targetTileId = tileId;
                targetType = 'player';
                break;
            }
        }
        
        // Try neutral
        if (!targetTileId && neutralTargets.length > 0) {
            for (const tileId of neutralTargets) {
                const defense = gameState.troops[tileId].neutralTroops + gameState.troops[tileId].shield;
                if (fromTroops > defense) {
                    targetTileId = tileId;
                    targetType = 'neutral';
                    break;
                }
            }
        }
        
        // Attack if found
        if (targetTileId) {
            const attackTroops = Math.floor(fromTroops * 0.6);
            const attackerData = gameState.troops[fromTileId];
            const defenderData = gameState.troops[targetTileId];
            
            attackerData.botTroops -= attackTroops;
            
            if (targetType === 'player') {
                const defense = defenderData.playerTroops + defenderData.shield;
                if (attackTroops > defense) {
                    const surviving = attackTroops - defense;
                    defenderData.playerTroops = 0;
                    defenderData.botTroops = surviving;
                    conquerTile(targetTileId, 'bot');
                    gameStatus.textContent = "AI captured your territory!";
                }
            } else if (targetType === 'neutral') {
                const defense = defenderData.neutralTroops + defenderData.shield;
                if (attackTroops > defense) {
                    const surviving = attackTroops - defense;
                    defenderData.neutralTroops = 0;
                    defenderData.botTroops = surviving;
                    conquerTile(targetTileId, 'bot');
                }
            }
            
            updateTroopDisplay(fromTileId);
            updateTroopDisplay(targetTileId);
        }
    });
}

// Spawn bots
function spawnBots(count) {
    const preset = gameState.difficultyPresets[gameState.difficulty];
    
    for (let i = 0; i < count; i++) {
        // Find neutral tile away from player
        let spawnTile = null;
        let attempts = 0;
        
        while (!spawnTile && attempts < 50) {
            const row = Math.floor(Math.random() * gameState.gridSize);
            const col = Math.floor(Math.random() * gameState.gridSize);
            const tileId = `${row}-${col}`;
            
            if (gameState.neutralTiles.includes(tileId)) {
                spawnTile = tileId;
            }
            attempts++;
        }
        
        if (spawnTile) {
            gameState.troops[spawnTile].neutralTroops = 0;
            gameState.troops[spawnTile].botTroops = preset.botStartTroops;
            gameState.troops[spawnTile].shield = preset.botShield;
            conquerTile(spawnTile, 'bot');
            
            gameState.bots.push({
                id: `bot-${Date.now()}-${i}`,
                strength: 1.0,
                intelligence: 1,
                aggression: preset.botAggression
            });
        }
    }
    
    gameState.botCount = gameState.bots.length;
}

// Trigger next wave in Domination mode
function triggerNextWave() {
    gameState.wave++;
    gameState.mapExpansionCount++;
    
    // Expand map by 25x25
    const newSize = gameState.gridSize + 25;
    expandMap(newSize);
    
    // Spawn more bots with increased strength
    const preset = gameState.difficultyPresets[gameState.difficulty];
    const botsToSpawn = 2 + gameState.wave;
    
    for (let i = 0; i < botsToSpawn; i++) {
        spawnBots(1);
    }
    
    // Increase bot strength for next wave
    gameState.bots.forEach(bot => {
        bot.strength += 0.1;
        bot.aggression = Math.min(1.0, bot.aggression + 0.05);
    });
    
    // Reset wave timer
    gameState.nextWaveTime = 300; // 5 minutes
    
    // Update game status
    gameStatus.textContent = `Wave ${gameState.wave}! Map expanded to ${newSize}x${newSize}. ${botsToSpawn} new bots spawned!`;
    gameStatus.className = "game-status";
    
    // Reset status message after 3 seconds
    setTimeout(() => {
        if (gameState.active) {
            gameStatus.textContent = "Domination: Survive as long as possible!";
            gameStatus.className = "game-status player-turn";
        }
    }, 3000);
}

// Expand map
function expandMap(newSize) {
    const oldSize = gameState.gridSize;
    gameState.gridSize = newSize;
    
    // Create new tile data for expanded area
    for (let row = 0; row < newSize; row++) {
        for (let col = 0; col < newSize; col++) {
            const tileId = `${row}-${col}`;
            
            // If tile doesn't exist, create it
            if (!gameState.troops[tileId]) {
                const preset = gameState.difficultyPresets[gameState.difficulty];
                
                gameState.troops[tileId] = {
                    playerTroops: 0,
                    botTroops: 0,
                    neutralTroops: 2 + Math.floor(Math.random() * 4),
                    owner: 'neutral',
                    shield: preset.botShield
                };
                
                gameState.neutralTiles.push(tileId);
            }
        }
    }
    
    // Recreate tiles in container
    createTiles(newSize, newSize);
    
    // Update existing tiles
    for (const tileId in gameState.troops) {
        updateTileAppearance(tileId);
        updateTroopDisplay(tileId);
    }
}

// Update tile appearance
function updateTileAppearance(tileId) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return;
    
    const tileData = gameState.troops[tileId];
    tile.className = 'tile';
    
    if (tileData.owner === 'player') {
        tile.classList.add('player');
    } else if (tileData.owner === 'bot') {
        tile.classList.add('bot');
    } else {
        tile.classList.add('neutral');
    }
    
    if (tileId === gameState.selectedTile) {
        tile.classList.add('selected');
    }
}

// Check if bot is completely defeated
function checkBotDefeated() {
    const remainingBots = gameState.bots.filter((bot, index) => {
        const botTiles = gameState.botTiles.filter(tileId => 
            gameState.troops[tileId].botTroops > 0
        );
        return botTiles.length > 0;
    });
    
    gameState.bots = remainingBots;
    gameState.botCount = remainingBots.length;
}

// Check game end
function checkGameEnd() {
    if (!gameState.active) return;
    
    // Player loses if no tiles
    if (gameState.playerTiles.length === 0) {
        endGame(false);
        return;
    }
    
    // Win conditions for non-domination modes
    if (gameState.mode === 'bots' && gameState.botTiles.length === 0) {
        endGame(true);
        return;
    }
    
    if (gameState.mode === '1v1' && gameState.botTiles.length === 0) {
        endGame(true);
        return;
    }
    
    // Domination mode has no win condition, only loss
}

// End game
function endGame(isVictory) {
    gameState.active = false;
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    
    // Calculate score
    const preset = gameState.difficultyPresets[gameState.difficulty];
    const timeBonus = Math.floor(gameState.gameTime * 2);
    const tileBonus = gameState.playerTiles.length * 75;
    const troopBonus = Math.floor(totalPlayerTroops() * 0.5);
    const botBonus = gameState.botsDefeated * 250;
    const waveBonus = gameState.wave * 500;
    
    let finalScore = Math.floor((
        gameState.score + 
        timeBonus + 
        tileBonus + 
        troopBonus + 
        botBonus + 
        (gameState.mode === 'domination' ? waveBonus : 0)
    ) * preset.scoreMultiplier);
    
    if (isVictory) {
        finalScore = Math.floor(finalScore * 1.5);
        document.getElementById('gameOverTitle').textContent = 'VICTORY!';
        document.getElementById('gameOverMessage').textContent = 'You have dominated the battlefield!';
        gameStatus.textContent = "Victory!";
    } else {
        document.getElementById('gameOverTitle').textContent = 'DEFEAT';
        document.getElementById('gameOverMessage').textContent = 'Your forces have been overwhelmed!';
        gameStatus.textContent = "Defeat!";
    }
    
    // Update final stats
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('finalTime').textContent = formatTime(gameState.gameTime);
    document.getElementById('finalTiles').textContent = gameState.playerTiles.length;
    document.getElementById('finalBots').textContent = gameState.botsDefeated;
    document.getElementById('finalTroops').textContent = totalPlayerTroops();
    document.getElementById('finalWave').textContent = gameState.wave;
    document.getElementById('finalDifficulty').textContent = getDifficultyText(gameState.difficulty);
    
    // Save to global leaderboard
    saveToGlobalLeaderboard(finalScore);
    
    // Show modal after delay
    setTimeout(() => {
        document.getElementById('gameOverModal').style.display = 'block';
    }, 1000);
}

// ========== HELPER FUNCTIONS ==========

// Check if tiles are adjacent
function isAdjacent(tileId1, tileId2) {
    const [row1, col1] = tileId1.split('-').map(Number);
    const [row2, col2] = tileId2.split('-').map(Number);
    
    return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
           (Math.abs(col1 - col2) === 1 && row1 === row2);
}

// Get adjacent tiles
function getAdjacentTiles(tileId) {
    const [row, col] = tileId.split('-').map(Number);
    const adjacent = [];
    
    if (row > 0) adjacent.push(`${row-1}-${col}`);
    if (row < gameState.gridSize - 1) adjacent.push(`${row+1}-${col}`);
    if (col > 0) adjacent.push(`${row}-${col-1}`);
    if (col < gameState.gridSize - 1) adjacent.push(`${row}-${col+1}`);
    
    return adjacent;
}

// Update troop display
function updateTroopDisplay(tileId) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return;
    
    const troopData = gameState.troops[tileId];
    let troopCount = 0;
    
    if (troopData.owner === 'player') {
        troopCount = Math.floor(troopData.playerTroops);
    } else if (troopData.owner === 'bot') {
        troopCount = Math.floor(troopData.botTroops);
    } else {
        troopCount = Math.floor(troopData.neutralTroops);
    }
    
    const troopCountElement = tile.querySelector('.troop-count');
    const shieldIndicator = tile.querySelector('.shield-indicator');
    
    if (troopCountElement) troopCountElement.textContent = troopCount;
    
    // Update shield
    if (shieldIndicator) {
        const shield = troopData.shield || 0;
        if (shield > 0) {
            shieldIndicator.style.display = 'flex';
            shieldIndicator.title = `+${shield} defense`;
        } else {
            shieldIndicator.style.display = 'none';
        }
    }
}

// Calculate total player troops
function totalPlayerTroops() {
    return gameState.playerTiles.reduce((total, tileId) => {
        return total + Math.floor(gameState.troops[tileId].playerTroops);
    }, 0);
}

// Format time
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update wave timer display
function updateWaveTimer() {
    const nextWaveElement = document.getElementById('nextWave');
    if (nextWaveElement) {
        nextWaveElement.textContent = formatTime(gameState.nextWaveTime);
    }
}

// Get difficulty text
function getDifficultyText(difficulty) {
    switch(difficulty) {
        case 1: return "Easy";
        case 2: return "Normal";
        case 3: return "Hard";
        case 4: return "Expert";
        case 5: return "Insane";
        default: return "Normal";
    }
}

// Save to global leaderboard
function saveToGlobalLeaderboard(score) {
    const playerName = gameState.playerName;
    const date = new Date().toISOString();
    const mode = getModeName(gameState.mode);
    
    // Create entry
    const entry = {
        player:
