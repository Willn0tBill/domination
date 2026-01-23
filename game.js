// ===========================================
// DOMINATION GAME - UPDATED 2026 VERSION
// Features: Expanding map, global leaderboard, improved difficulty
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
    gameTime: 0,
    lastUpdate: Date.now(),
    gameLoop: null,
    isPaused: false,
    
    // Game settings
    troopGenerationRate: 1,
    maxTroopsPerTile: 100,
    troops: {},
    
    // New features
    difficultyShields: {
        1: 0,   // Easy
        2: 1,   // Normal
        3: 2,   // Hard
        4: 4,   // Expert
        5: 8    // Insane
    },
    
    // Domination mode specific
    wave: 1,
    waveTimer: 300, // 5 minutes
    mapSize: 8,
    zoomLevel: 1,
    baseGridSize: 8,
    
    // Deployment system
    deploymentPercentage: 50,
    
    // Settings
    soundEnabled: true,
    theme: 'default',
    tileSize: 'medium'
};

// Extreme difficulty settings
const difficultySettings = {
    1: { // Easy
        startingTroops: 100,
        startingTiles: 8,
        troopRate: 3.0,
        botSpawnRate: 120,
        botStrength: 0.3,
        botIntelligence: 0.3,
        shieldBonus: 0,
        scoreMultiplier: 0.5,
        botSpawnCount: 2,
        waveGrowth: 1.1
    },
    2: { // Normal
        startingTroops: 50,
        startingTiles: 4,
        troopRate: 1.5,
        botSpawnRate: 90,
        botStrength: 0.8,
        botIntelligence: 0.8,
        shieldBonus: 1,
        scoreMultiplier: 1.0,
        botSpawnCount: 3,
        waveGrowth: 1.2
    },
    3: { // Hard
        startingTroops: 25,
        startingTiles: 2,
        troopRate: 1.0,
        botSpawnRate: 60,
        botStrength: 1.5,
        botIntelligence: 1.5,
        shieldBonus: 2,
        scoreMultiplier: 2.0,
        botSpawnCount: 4,
        waveGrowth: 1.3
    },
    4: { // Expert
        startingTroops: 10,
        startingTiles: 1,
        troopRate: 0.5,
        botSpawnRate: 30,
        botStrength: 2.5,
        botIntelligence: 2.5,
        shieldBonus: 4,
        scoreMultiplier: 5.0,
        botSpawnCount: 5,
        waveGrowth: 1.5
    },
    5: { // Insane
        startingTroops: 5,
        startingTiles: 1,
        troopRate: 0.2,
        botSpawnRate: 15,
        botStrength: 4.0,
        botIntelligence: 4.0,
        shieldBonus: 8,
        scoreMultiplier: 10.0,
        botSpawnCount: 6,
        waveGrowth: 2.0
    }
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
const difficultyIndicator = document.getElementById('difficultyIndicator');
const pauseBtn = document.getElementById('pauseBtn');
const mapSizeElement = document.getElementById('mapSize');
const currentWaveElement = document.getElementById('currentWave');
const waveInfoPanel = document.getElementById('waveInfoPanel');
const zoomControls = document.getElementById('zoomControls');
const waveInfo = document.getElementById('waveInfo');
const currentWaveDisplay = document.getElementById('currentWaveDisplay');
const nextWaveTimer = document.getElementById('nextWaveTimer');

// Bottom troop selector elements
const troopSlider = document.getElementById('troopSlider');
const currentTroops = document.getElementById('currentTroops');
const selectedTroopsDisplay = document.getElementById('selectedTroopsDisplay');
const selectedTileInfo = document.getElementById('selectedTileInfo');

// Side panel
const sidePanel = document.getElementById('sidePanel');
const panelToggleIcon = document.getElementById('panelToggleIcon');

// Initialize Game
function initGame() {
    // Load settings
    gameState.playerName = localStorage.getItem('dominationPlayerName') || 'Commander';
    gameState.mode = localStorage.getItem('dominationGameMode') || 'domination';
    gameState.difficulty = parseInt(localStorage.getItem('dominationDifficulty')) || 2;
    gameState.soundEnabled = localStorage.getItem('dominationSoundEnabled') !== 'false';
    gameState.theme = localStorage.getItem('dominationColorTheme') || 'default';
    gameState.tileSize = localStorage.getItem('dominationTileSize') || 'medium';
    
    // Load saved deployment percentage
    const savedDeployment = localStorage.getItem('dominationDeploymentPercentage');
    if (savedDeployment) {
        gameState.deploymentPercentage = parseInt(savedDeployment);
        troopSlider.value = gameState.deploymentPercentage;
        updateTroopDisplay();
    }
    
    // Apply theme
    document.body.classList.remove('theme-default', 'theme-green', 'theme-purple', 'theme-monochrome');
    document.body.classList.add(`theme-${gameState.theme}`);
    tilesContainer.classList.remove('tile-size-small', 'tile-size-medium', 'tile-size-large');
    tilesContainer.classList.add(`tile-size-${gameState.tileSize}`);
    
    // Update UI
    currentPlayerNameElement.textContent = gameState.playerName;
    const modeName = getModeName(gameState.mode);
    gameModeDisplay.textContent = modeName;
    modeInfoElement.textContent = modeName;
    
    // Show/hide wave info based on mode
    if (gameState.mode === 'domination') {
        waveInfo.style.display = 'flex';
        waveInfoPanel.style.display = 'flex';
        zoomControls.style.display = 'flex';
        document.getElementById('troopRate').textContent = `${difficultySettings[gameState.difficulty].troopRate.toFixed(1)}/sec`;
    } else {
        waveInfo.style.display = 'none';
        waveInfoPanel.style.display = 'none';
        zoomControls.style.display = 'none';
        document.getElementById('troopRate').textContent = `${difficultySettings[gameState.difficulty].troopRate.toFixed(1)}/sec`;
    }
    
    // Create tiles
    createTiles();
    
    // Start game based on mode
    if (gameState.mode === 'domination') {
        startDomination();
    } else if (gameState.mode === 'bots') {
        startBotsBattle();
    } else if (gameState.mode === '1v1') {
        start1v1();
    }
    
    updateUI();
    gameStatus.textContent = `Welcome, Commander ${gameState.playerName}!`;
    gameStatus.className = "game-status player-turn";
    
    // Setup troop slider
    setupTroopSlider();
    
    // Start game loop
    startGameLoop();
}

// Create hexagon tiles
function createTiles() {
    tilesContainer.innerHTML = '';
    
    // Set grid size based on mode
    const gridSize = gameState.mode === 'domination' ? gameState.mapSize : gameState.baseGridSize;
    
    // Create hexagon grid
    tilesContainer.style.gridTemplateColumns = `repeat(${gridSize * 2 - 1}, 1fr)`;
    
    // Update map size display
    if (mapSizeElement) {
        mapSizeElement.textContent = `${gridSize}x${gridSize}`;
    }
    
    // Reset tile arrays
    gameState.neutralTiles = [];
    gameState.playerTiles = [];
    gameState.botTiles = [];
    gameState.troops = {};
    
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const tileId = `${row}-${col}`;
            const tile = document.createElement('div');
            tile.className = 'tile neutral';
            tile.dataset.id = tileId;
            tile.style.gridColumn = `${col * 2 + (row % 2) + 1} / span 1`;
            tile.style.gridRow = `${row + 1} / span 1`;
            
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
            
            // Tile icon
            const icon = document.createElement('div');
            icon.className = 'tile-icon';
            icon.textContent = '●';
            content.appendChild(icon);
            
            tile.appendChild(content);
            tile.addEventListener('click', () => handleTileClick(tileId));
            tilesContainer.appendChild(tile);
            
            // Initialize troop data
            gameState.troops[tileId] = {
                playerTroops: 0,
                botTroops: 0,
                neutralTroops: 2 + Math.floor(Math.random() * 4),
                owner: 'neutral',
                shield: difficultySettings[gameState.difficulty].shieldBonus
            };
            
            gameState.neutralTiles.push(tileId);
        }
    }
    
    // Apply zoom
    tilesContainer.style.transform = `scale(${gameState.zoomLevel})`;
    tilesContainer.style.transformOrigin = 'center center';
}

// Setup troop slider
function setupTroopSlider() {
    troopSlider.addEventListener('input', function() {
        gameState.deploymentPercentage = parseInt(this.value);
        updateTroopDisplay();
        localStorage.setItem('dominationDeploymentPercentage', gameState.deploymentPercentage);
    });
    
    troopSlider.addEventListener('change', function() {
        gameState.deploymentPercentage = parseInt(this.value);
        updateTroopDisplay();
        localStorage.setItem('dominationDeploymentPercentage', gameState.deploymentPercentage);
    });
}

function updateTroopDisplay() {
    currentTroops.textContent = `${gameState.deploymentPercentage}%`;
    selectedTroopsDisplay.textContent = `${gameState.deploymentPercentage}%`;
}

// Start Domination mode
function startDomination() {
    gameState.active = true;
    gameState.wave = 1;
    gameState.waveTimer = 300; // 5 minutes
    gameState.mapSize = 8;
    
    const settings = difficultySettings[gameState.difficulty];
    gameState.troopGenerationRate = settings.troopRate;
    
    // Player starts in center
    const centerRow = Math.floor(gameState.mapSize / 2);
    const centerCol = Math.floor(gameState.mapSize / 2);
    
    // Starting troops based on difficulty
    const startTroops = settings.startingTroops;
    const startTiles = settings.startingTiles;
    
    // Starting tiles
    const playerTiles = [];
    for (let i = 0; i < startTiles; i++) {
        const row = centerRow + Math.floor(Math.random() * 3) - 1;
        const col = centerCol + Math.floor(Math.random() * 3) - 1;
        const tileId = `${row}-${col}`;
        if (row >= 0 && row < gameState.mapSize && col >= 0 && col < gameState.mapSize) {
            playerTiles.push(tileId);
        }
    }
    
    // Ensure at least one tile
    if (playerTiles.length === 0) {
        playerTiles.push(`${centerRow}-${centerCol}`);
    }
    
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        gameState.troops[tileId].playerTroops = startTroops;
        updateTroopDisplay(tileId);
    });
    
    gameStatus.textContent = "Domination: Survive infinite waves!";
    
    // Spawn initial bots
    spawnBots(settings.botSpawnCount);
    
    // Update wave display
    updateWaveDisplay();
}

// Start Bots Battle mode
function startBotsBattle() {
    gameState.active = true;
    gameState.mapSize = 8;
    
    const settings = difficultySettings[gameState.difficulty];
    gameState.troopGenerationRate = settings.troopRate;
    
    // Player starts in corner
    const playerTiles = [];
    for (let i = 0; i < settings.startingTiles; i++) {
        const row = Math.floor(Math.random() * 3);
        const col = Math.floor(Math.random() * 3);
        const tileId = `${row}-${col}`;
        playerTiles.push(tileId);
    }
    
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        gameState.troops[tileId].playerTroops = settings.startingTroops;
        updateTroopDisplay(tileId);
    });
    
    gameStatus.textContent = "Bots Battle: Eliminate all opponents!";
    
    // Spawn bots
    spawnBots(settings.botSpawnCount * 2);
}

// Start 1v1 mode
function start1v1() {
    gameState.active = true;
    gameState.mapSize = 8;
    
    const settings = difficultySettings[gameState.difficulty];
    gameState.troopGenerationRate = settings.troopRate;
    
    // Player starts on left
    const playerRow = Math.floor(gameState.mapSize / 2);
    const playerTile = `${playerRow}-1`;
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = settings.startingTroops;
    updateTroopDisplay(playerTile);
    
    // Bot starts on right
    const botTile = `${playerRow}-${gameState.mapSize - 2}`;
    conquerTile(botTile, 'bot');
    gameState.troops[botTile].botTroops = settings.startingTroops * 1.5;
    updateTroopDisplay(botTile);
    
    gameState.bots.push({
        id: 'elite',
        strength: settings.botStrength * 1.5,
        intelligence: settings.botIntelligence * 1.5,
        aggression: 0.7,
        wave: 1
    });
    gameState.botCount = 1;
    
    gameStatus.textContent = "1v1 Duel: Defeat the elite bot!";
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
        
        // Generate troops
        generateTroops(deltaTime);
        
        // Bot actions
        if (Math.random() < 0.3) {
            botActions();
        }
        
        // Update wave timer (Domination mode only)
        if (gameState.mode === 'domination') {
            gameState.waveTimer -= deltaTime;
            if (gameState.waveTimer <= 0) {
                nextWave();
            }
            updateWaveTimerDisplay();
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
            gameState.troops[tileId].botTroops += generation * 0.8 * difficultySettings[gameState.difficulty].botStrength;
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
        const fromTroops = Math.floor(gameState.troops[fromTileId].playerTroops);
        const deployTroops = Math.floor(fromTroops * (gameState.deploymentPercentage / 100));
        
        if (deployTroops < 1) {
            gameStatus.textContent = "Need at least 1 troop to deploy!";
            return;
        }
        
        // Determine action type
        if (gameState.playerTiles.includes(tileId)) {
            reinforceTile(fromTileId, tileId, deployTroops);
        } else {
            attackTile(fromTileId, tileId, deployTroops);
        }
        
        deselectTile();
    } else if (gameState.selectedTile) {
        gameStatus.textContent = "Target not adjacent!";
        deselectTile();
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
    
    // DIFFERENCE-BASED COMBAT
    if (attackTroops > defenseStrength) {
        // Attacker wins
        const survivingTroops = attackTroops - defenseStrength;
        
        // Clear defender troops
        defenderData.neutralTroops = 0;
        defenderData.botTroops = 0;
        
        if (defenderOwner === 'neutral') {
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            gameState.score += 25;
            gameStatus.textContent = `Captured neutral territory! ${survivingTroops} troops remain.`;
        } else if (defenderOwner === 'bot') {
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            gameState.score += 100;
            gameState.botsDefeated = (gameState.botsDefeated || 0) + 1;
            gameStatus.textContent = `Victory! Defeated bot. ${survivingTroops} troops remain.`;
            
            // Check if bot is completely defeated
            checkBotDefeated();
        }
    } else {
        // Defender wins
        const survivingDefenders = defenseStrength - attackTroops;
        
        if (defenderOwner === 'neutral') {
            defenderData.neutralTroops = Math.max(1, survivingDefenders - shield);
            gameStatus.textContent = `Attack failed! Neutral tile defended.`;
        } else if (defenderOwner === 'bot') {
            defenderData.botTroops = Math.max(1, survivingDefenders - shield);
            gameStatus.textContent = `Attack failed! Bot defended.`;
        }
    }
    
    // Battle animation
    animateBattle(attackerTileId, defenderTileId);
    
    updateTroopDisplay(attackerTileId);
    updateTroopDisplay(defenderTileId);
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
    
    gameStatus.textContent = `Moved ${troops} troops`;
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

// Deselect tile
function deselectTile() {
    if (gameState.selectedTile) {
        const tile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        if (tile) tile.classList.remove('selected');
        gameState.selectedTile = null;
        selectedTileInfo.textContent = "None";
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
    gameState.bots.forEach((bot, botIndex) => {
        if (Math.random() > 0.4) return;
        
        // Find bot tiles with troops
        const botTilesWithTroops = gameState.botTiles.filter(tileId => 
            gameState.troops[tileId].botTroops > 5
        );
        
        if (botTilesWithTroops.length === 0) return;
        
        const fromTileId = botTilesWithTroops[Math.floor(Math.random() * botTilesWithTroops.length)];
        const fromTroops = gameState.troops[fromTileId].botTroops;
        const deployTroops = Math.floor(fromTroops * (0.4 + bot.aggression * 0.3));
        
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
        
        // Try to attack player (based on aggression)
        if (Math.random() < bot.aggression && playerTargets.length > 0) {
            for (const tileId of playerTargets) {
                const defense = gameState.troops[tileId].playerTroops + gameState.troops[tileId].shield;
                if (deployTroops > defense * (0.8 + bot.strength * 0.2)) {
                    targetTileId = tileId;
                    targetType = 'player';
                    break;
                }
            }
        }
        
        // Try neutral
        if (!targetTileId && neutralTargets.length > 0) {
            for (const tileId of neutralTargets) {
                const defense = gameState.troops[tileId].neutralTroops + gameState.troops[tileId].shield;
                if (deployTroops > defense) {
                    targetTileId = tileId;
                    targetType = 'neutral';
                    break;
                }
            }
        }
        
        // Attack if found
        if (targetTileId) {
            const attackerData = gameState.troops[fromTileId];
            const defenderData = gameState.troops[targetTileId];
            
            attackerData.botTroops -= deployTroops;
            
            if (targetType === 'player') {
                const defense = defenderData.playerTroops + defenderData.shield;
                if (deployTroops > defense) {
                    const surviving = deployTroops - defense;
                    defenderData.playerTroops = 0;
                    defenderData.botTroops = surviving;
                    conquerTile(targetTileId, 'bot');
                    gameStatus.textContent = "AI captured your territory!";
                    gameStatus.className = "game-status bot-turn";
                }
            } else if (targetType === 'neutral') {
                const defense = defenderData.neutralTroops + defenderData.shield;
                if (deployTroops > defense) {
                    const surviving = deployTroops - defense;
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
    const settings = difficultySettings[gameState.difficulty];
    
    for (let i = 0; i < count; i++) {
        // Find neutral tile away from player
        let spawnTile = null;
        let attempts = 0;
        
        const gridSize = gameState.mapSize;
        
        while (!spawnTile && attempts < 100) {
            const row = Math.floor(Math.random() * gridSize);
            const col = Math.floor(Math.random() * gridSize);
            const tileId = `${row}-${col}`;
            
            if (gameState.neutralTiles.includes(tileId)) {
                // Check distance from player tiles
                let tooClose = false;
                for (const playerTileId of gameState.playerTiles) {
                    const [pRow, pCol] = playerTileId.split('-').map(Number);
                    const distance = Math.abs(pRow - row) + Math.abs(pCol - col);
                    if (distance < 3) {
                        tooClose = true;
                        break;
                    }
                }
                
                if (!tooClose) {
                    spawnTile = tileId;
                }
            }
            attempts++;
        }
        
        if (spawnTile) {
            const baseTroops = settings.startingTroops * (0.5 + Math.random() * 0.5);
            const waveMultiplier = Math.pow(settings.waveGrowth, gameState.wave - 1);
            const startTroops = Math.floor(baseTroops * waveMultiplier * bot.strength);
            
            gameState.troops[spawnTile].neutralTroops = 0;
            gameState.troops[spawnTile].botTroops = startTroops;
            gameState.troops[spawnTile].shield = settings.shieldBonus;
            conquerTile(spawnTile, 'bot');
            
            gameState.bots.push({
                id: `bot-${Date.now()}-${i}`,
                strength: settings.botStrength * waveMultiplier,
                intelligence: settings.botIntelligence * waveMultiplier,
                aggression: 0.4 + Math.random() * 0.3,
                wave: gameState.wave
            });
        }
    }
    
    gameState.botCount = gameState.bots.length;
}

// Next wave (Domination mode)
function nextWave() {
    if (gameState.mode !== 'domination') return;
    
    gameState.wave++;
    gameState.mapSize += 25; // Expand map by 25x25
    gameState.waveTimer = 300; // Reset to 5 minutes
    
    // Update wave display
    updateWaveDisplay();
    
    // Save current state
    const oldTroops = {...gameState.troops};
    const oldPlayerTiles = [...gameState.playerTiles];
    const oldBotTiles = [...gameState.botTiles];
    const oldNeutralTiles = [...gameState.neutralTiles];
    
    // Regenerate tiles
    createTiles();
    
    // Restore old state
    gameState.troops = oldTroops;
    gameState.playerTiles = oldPlayerTiles;
    gameState.botTiles = oldBotTiles;
    gameState.neutralTiles = oldNeutralTiles;
    
    // Initialize new tiles
    const gridSize = gameState.mapSize;
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const tileId = `${row}-${col}`;
            if (!gameState.troops[tileId]) {
                gameState.troops[tileId] = {
                    playerTroops: 0,
                    botTroops: 0,
                    neutralTroops: 2 + Math.floor(Math.random() * 4),
                    owner: 'neutral',
                    shield: difficultySettings[gameState.difficulty].shieldBonus
                };
                gameState.neutralTiles.push(tileId);
            }
        }
    }
    
    // Update all tile displays
    Object.keys(gameState.troops).forEach(tileId => {
        updateTroopDisplay(tileId);
        const tile = document.querySelector(`[data-id="${tileId}"]`);
        if (tile) {
            tile.classList.remove('player', 'bot', 'neutral');
            tile.classList.add(gameState.troops[tileId].owner);
        }
    });
    
    // Spawn more bots with increased difficulty
    const settings = difficultySettings[gameState.difficulty];
    const spawnCount = settings.botSpawnCount + Math.floor(gameState.wave / 2);
    spawnBots(spawnCount);
    
    gameStatus.textContent = `Wave ${gameState.wave}! Map expanded to ${gameState.mapSize}x${gameState.mapSize}`;
    gameStatus.className = "game-status player-turn";
}

// Update wave display
function updateWaveDisplay() {
    if (currentWaveElement) {
        currentWaveElement.textContent = gameState.wave;
    }
    if (currentWaveDisplay) {
        currentWaveDisplay.textContent = gameState.wave;
    }
}

// Update wave timer display
function updateWaveTimerDisplay() {
    if (nextWaveTimer) {
        const minutes = Math.floor(gameState.waveTimer / 60);
        const seconds = Math.floor(gameState.waveTimer % 60);
        nextWaveTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
}

// End game
function endGame(isVictory) {
    gameState.active = false;
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    
    // Calculate score
    const settings = difficultySettings[gameState.difficulty];
    const timeBonus = Math.floor(gameState.gameTime * 2);
    const tileBonus = gameState.playerTiles.length * 50;
    const troopBonus = Math.floor(totalPlayerTroops() * 0.5);
    const botBonus = (gameState.botsDefeated || 0) * 100;
    const waveBonus = (gameState.wave || 1) * 1000;
    
    let finalScore = Math.floor((
        gameState.score + 
        timeBonus + 
        tileBonus + 
        troopBonus + 
        botBonus +
        waveBonus
    ) * settings.scoreMultiplier);
    
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
    document.getElementById('finalBots').textContent = gameState.botsDefeated || 0;
    document.getElementById('finalDifficulty').textContent = getDifficultyText(gameState.difficulty);
    
    // Show wave stats for domination mode
    if (gameState.mode === 'domination') {
        document.getElementById('finalWavesContainer').style.display = 'block';
        document.getElementById('finalWaves').textContent = gameState.wave || 1;
    }
    
    // Save to global leaderboard
    saveToGlobalLeaderboard(finalScore);
    
    // Show modal
    setTimeout(() => {
        document.getElementById('gameOverModal').style.display = 'block';
    }, 1000);
}

// ========== HELPER FUNCTIONS ==========

// Check if tiles are adjacent (hexagon grid)
function isAdjacent(tileId1, tileId2) {
    const [row1, col1] = tileId1.split('-').map(Number);
    const [row2, col2] = tileId2.split('-').map(Number);
    
    const rowDiff = Math.abs(row1 - row2);
    const colDiff = Math.abs(col1 - col2);
    
    // Hexagon adjacency rules
    if (rowDiff === 0) {
        return colDiff === 1;
    } else if (rowDiff === 1) {
        if (row1 % 2 === 0) { // Even row
            return (col2 === col1) || (col2 === col1 + 1);
        } else { // Odd row
            return (col2 === col1) || (col2 === col1 - 1);
        }
    }
    return false;
}

// Get adjacent tiles (hexagon grid)
function getAdjacentTiles(tileId) {
    const [row, col] = tileId.split('-').map(Number);
    const gridSize = gameState.mapSize;
    const adjacent = [];
    
    // Same row
    if (col > 0) adjacent.push(`${row}-${col-1}`);
    if (col < gridSize - 1) adjacent.push(`${row}-${col+1}`);
    
    // Row above
    if (row > 0) {
        if (row % 2 === 0) { // Even row
            if (col > 0) adjacent.push(`${row-1}-${col-1}`);
            adjacent.push(`${row-1}-${col}`);
        } else { // Odd row
            adjacent.push(`${row-1}-${col}`);
            if (col < gridSize - 1) adjacent.push(`${row-1}-${col+1}`);
        }
    }
    
    // Row below
    if (row < gridSize - 1) {
        if (row % 2 === 0) { // Even row
            if (col > 0) adjacent.push(`${row+1}-${col-1}`);
            adjacent.push(`${row+1}-${col}`);
        } else { // Odd row
            adjacent.push(`${row+1}-${col}`);
            if (col < gridSize - 1) adjacent.push(`${row+1}-${col+1}`);
        }
    }
    
    return adjacent;
}

// Update troop display
function updateTroopDisplay(tileId) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return;
    
    const troopData = gameState.troops[tileId];
    if (!troopData) return;
    
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
    
    // Get existing leaderboard
    let leaderboard = JSON.parse(localStorage.getItem('dominationLeaderboard')) || [];
    
    // Add new score
    leaderboard.push({
        player: playerName,
        score: score,
        mode: gameState.mode,
        difficulty: gameState.difficulty,
        time: Math.floor(gameState.gameTime),
        date: date,
        waves: gameState.wave || 0,
        tiles: gameState.playerTiles.length,
        botsDefeated: gameState.botsDefeated || 0
    });
    
    // Sort by score (descending) and keep top 100
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 100);
    
    // Save back to localStorage
    localStorage.setItem('dominationLeaderboard', JSON.stringify(leaderboard));
}

// Animate battle
function animateBattle(attackerTileId, defenderTileId) {
    const attackerTile = document.querySelector(`[data-id="${attackerTileId}"]`);
    const defenderTile = document.querySelector(`[data-id="${defenderTileId}"]`);
    
    if (attackerTile && defenderTile) {
        attackerTile.classList.add('battle');
        defenderTile.classList.add('battle');
        setTimeout(() => {
            attackerTile.classList.remove('battle');
            defenderTile.classList.remove('battle');
        }, 500);
    }
}

// Update UI
function updateUI() {
    playerTilesElement.textContent = gameState.playerTiles.length;
    currentScoreElement.textContent = gameState.score;
    botCountElement.textContent = gameState.botCount;
    
    if (totalTroopsElement) {
        totalTroopsElement.textContent = totalPlayerTroops();
    }
    
    if (gameTime
