// ===========================================
// DOMINATION GAME - HEXAGON GRID VERSION
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
    
    // Domination mode specific
    wave: 1,
    waveTimer: 300, // 5 minutes
    mapSize: 8,
    zoomLevel: 1,
    
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
    console.log("Initializing game...");
    
    // Load settings
    gameState.playerName = localStorage.getItem('dominationPlayerName') || 'Commander';
    gameState.mode = localStorage.getItem('dominationGameMode') || 'domination';
    gameState.difficulty = parseInt(localStorage.getItem('dominationDifficulty')) || 2;
    
    // Load saved deployment percentage
    const savedDeployment = localStorage.getItem('dominationDeploymentPercentage');
    if (savedDeployment) {
        gameState.deploymentPercentage = parseInt(savedDeployment);
        troopSlider.value = gameState.deploymentPercentage;
        updateTroopDisplay();
    }
    
    // Update UI
    currentPlayerNameElement.textContent = gameState.playerName;
    const modeName = getModeName(gameState.mode);
    gameModeDisplay.textContent = modeName;
    modeInfoElement.textContent = modeName;
    
    // Show/hide wave info based on mode
    if (gameState.mode === 'domination') {
        if (waveInfo) waveInfo.style.display = 'flex';
        if (waveInfoPanel) waveInfoPanel.style.display = 'flex';
        if (zoomControls) zoomControls.style.display = 'flex';
        if (document.getElementById('troopRate')) {
            document.getElementById('troopRate').textContent = `${difficultySettings[gameState.difficulty].troopRate.toFixed(1)}/sec`;
        }
    } else {
        if (waveInfo) waveInfo.style.display = 'none';
        if (waveInfoPanel) waveInfoPanel.style.display = 'none';
        if (zoomControls) zoomControls.style.display = 'none';
        if (document.getElementById('troopRate')) {
            document.getElementById('troopRate').textContent = `${difficultySettings[gameState.difficulty].troopRate.toFixed(1)}/sec`;
        }
    }
    
    // Create hexagon tiles
    createHexagonTiles();
    
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
function createHexagonTiles() {
    console.log("Creating hexagon tiles...");
    tilesContainer.innerHTML = '';
    
    // Set grid size based on mode
    const gridSize = gameState.mode === 'domination' ? gameState.mapSize : 8;
    
    // Clear tile arrays
    gameState.neutralTiles = [];
    gameState.playerTiles = [];
    gameState.botTiles = [];
    gameState.troops = {};
    
    // Update map size display
    if (mapSizeElement) {
        mapSizeElement.textContent = `${gridSize}x${gridSize}`;
    }
    
    // Create hexagon grid
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const tileId = `${row}-${col}`;
            const tile = document.createElement('div');
            tile.className = 'tile neutral';
            tile.dataset.id = tileId;
            tile.dataset.row = row;
            tile.dataset.col = col;
            
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
    console.log(`Created ${gridSize}x${gridSize} hexagon grid`);
}

// Setup troop slider
function setupTroopSlider() {
    console.log("Setting up troop slider...");
    troopSlider.value = gameState.deploymentPercentage;
    updateTroopDisplay();
    
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
    console.log(`Troop deployment set to ${gameState.deploymentPercentage}%`);
}

// Start Domination mode
function startDomination() {
    console.log("Starting Domination mode...");
    gameState.active = true;
    gameState.wave = 1;
    gameState.waveTimer = 300;
    gameState.mapSize = 8;
    
    const settings = difficultySettings[gameState.difficulty];
    gameState.troopGenerationRate = settings.troopRate;
    
    // Player starts in center
    const centerRow = Math.floor(gameState.mapSize / 2);
    const centerCol = Math.floor(gameState.mapSize / 2);
    
    // Starting troops based on difficulty
    const startTroops = settings.startingTroops;
    const startTiles = settings.startingTiles;
    
    // Starting tiles (create a small cluster)
    const playerTiles = [];
    for (let i = 0; i < startTiles; i++) {
        const row = centerRow + Math.floor(Math.random() * 3) - 1;
        const col = centerCol + Math.floor(Math.random() * 3) - 1;
        const tileId = `${row}-${col}`;
        if (row >= 0 && row < gameState.mapSize && col >= 0 && col < gameState.mapSize) {
            if (!playerTiles.includes(tileId)) {
                playerTiles.push(tileId);
            }
        }
    }
    
    // Ensure at least one tile
    if (playerTiles.length === 0) {
        playerTiles.push(`${centerRow}-${centerCol}`);
    }
    
    console.log(`Starting with ${playerTiles.length} tiles and ${startTroops} troops each`);
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        gameState.troops[tileId].playerTroops = startTroops;
        updateTroopDisplayOnTile(tileId);
    });
    
    gameStatus.textContent = "Domination: Survive infinite waves! Map expands 25x25 every 5 minutes!";
    
    // Spawn initial bots
    spawnBots(settings.botSpawnCount);
    
    // Update wave display
    updateWaveDisplay();
}

// Start Bots Battle mode
function startBotsBattle() {
    console.log("Starting Bots Battle mode...");
    gameState.active = true;
    gameState.mapSize = 8;
    
    const settings = difficultySettings[gameState.difficulty];
    gameState.troopGenerationRate = settings.troopRate;
    
    // Player starts in top-left corner
    const playerTiles = [];
    for (let i = 0; i < settings.startingTiles; i++) {
        const row = Math.floor(Math.random() * 3);
        const col = Math.floor(Math.random() * 3);
        const tileId = `${row}-${col}`;
        if (!playerTiles.includes(tileId)) {
            playerTiles.push(tileId);
        }
    }
    
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        gameState.troops[tileId].playerTroops = settings.startingTroops;
        updateTroopDisplayOnTile(tileId);
    });
    
    gameStatus.textContent = "Bots Battle: Eliminate all opponents!";
    
    // Spawn bots
    spawnBots(settings.botSpawnCount * 2);
}

// Start 1v1 mode
function start1v1() {
    console.log("Starting 1v1 mode...");
    gameState.active = true;
    gameState.mapSize = 8;
    
    const settings = difficultySettings[gameState.difficulty];
    gameState.troopGenerationRate = settings.troopRate;
    
    // Player starts on left
    const playerRow = Math.floor(gameState.mapSize / 2);
    const playerTile = `${playerRow}-1`;
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = settings.startingTroops;
    updateTroopDisplayOnTile(playerTile);
    
    // Bot starts on right
    const botRow = Math.floor(Math.random() * gameState.mapSize);
    const botTile = `${botRow}-${gameState.mapSize - 2}`;
    conquerTile(botTile, 'bot');
    gameState.troops[botTile].botTroops = settings.startingTroops * 1.5;
    updateTroopDisplayOnTile(botTile);
    
    gameState.bots.push({
        id: 'elite',
        strength: settings.botStrength * 1.5,
        intelligence: settings.botIntelligence * 1.5,
        aggression: 0.7
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
        
    }, 1000);
}

// Generate troops
function generateTroops(deltaTime) {
    const generation = gameState.troopGenerationRate * deltaTime;
    
    // Player troops
    gameState.playerTiles.forEach(tileId => {
        if (gameState.troops[tileId].playerTroops < gameState.maxTroopsPerTile) {
            gameState.troops[tileId].playerTroops += generation;
            updateTroopDisplayOnTile(tileId);
        }
    });
    
    // Bot troops
    gameState.botTiles.forEach(tileId => {
        if (gameState.troops[tileId].botTroops < gameState.maxTroopsPerTile) {
            gameState.troops[tileId].botTroops += generation * 0.8 * difficultySettings[gameState.difficulty].botStrength;
            updateTroopDisplayOnTile(tileId);
        }
    });
}

// Handle tile click
function handleTileClick(tileId) {
    if (!gameState.active || gameState.isPaused) {
        console.log("Game not active or paused");
        return;
    }
    
    console.log(`Tile clicked: ${tileId}`);
    const tileData = gameState.troops[tileId];
    
    // If player owns this tile, select it
    if (gameState.playerTiles.includes(tileId) && tileData.playerTroops > 0) {
        console.log(`Selecting player tile: ${tileId} with ${Math.floor(tileData.playerTroops)} troops`);
        selectTile(tileId);
        return;
    }
    
    // If a tile is selected and clicked tile is adjacent
    if (gameState.selectedTile) {
        console.log(`Selected tile: ${gameState.selectedTile}, target: ${tileId}`);
        
        if (isAdjacentHex(tileId, gameState.selectedTile)) {
            const fromTileId = gameState.selectedTile;
            const fromTroops = Math.floor(gameState.troops[fromTileId].playerTroops);
            const deployTroops = Math.floor(fromTroops * (gameState.deploymentPercentage / 100));
            
            console.log(`From: ${fromTileId} (${fromTroops} troops), deploying: ${deployTroops} troops`);
            
            if (deployTroops < 1) {
                gameStatus.textContent = "Need at least 1 troop to deploy!";
                return;
            }
            
            // Determine action type
            if (gameState.playerTiles.includes(tileId)) {
                console.log(`Reinforcing tile ${tileId} from ${fromTileId}`);
                reinforceTile(fromTileId, tileId, deployTroops);
            } else {
                console.log(`Attacking tile ${tileId} from ${fromTileId}`);
                attackTile(fromTileId, tileId, deployTroops);
            }
            
            deselectTile();
        } else {
            console.log(`Target not adjacent to ${gameState.selectedTile}`);
            gameStatus.textContent = "Target not adjacent!";
            deselectTile();
        }
    } else if (gameState.selectedTile) {
        console.log("Deselecting tile");
        deselectTile();
    }
}

// Attack tile
function attackTile(attackerTileId, defenderTileId, attackTroops) {
    const attackerData = gameState.troops[attackerTileId];
    const defenderData = gameState.troops[defenderTileId];
    
    console.log(`Attack: ${attackerTileId} -> ${defenderTileId} with ${attackTroops} troops`);
    
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
        console.log(`Neutral defense: ${defenseStrength} (${defenderData.neutralTroops} + ${shield} shield)`);
    } else if (defenderOwner === 'bot') {
        defenseStrength = defenderData.botTroops + shield;
        console.log(`Bot defense: ${defenseStrength} (${defenderData.botTroops} + ${shield} shield)`);
    }
    
    // DIFFERENCE-BASED COMBAT
    if (attackTroops > defenseStrength) {
        // Attacker wins
        const survivingTroops = attackTroops - defenseStrength;
        console.log(`Attacker wins! Surviving troops: ${survivingTroops}`);
        
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
        console.log(`Defender wins! Surviving defenders: ${survivingDefenders}`);
        
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
    
    updateTroopDisplayOnTile(attackerTileId);
    updateTroopDisplayOnTile(defenderTileId);
}

// Reinforce tile (move troops between player tiles)
function reinforceTile(fromTileId, toTileId, troops) {
    const fromData = gameState.troops[fromTileId];
    const toData = gameState.troops[toTileId];
    
    console.log(`Reinforce: ${fromTileId} -> ${toTileId} with ${troops} troops`);
    
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
    
    updateTroopDisplayOnTile(fromTileId);
    updateTroopDisplayOnTile(toTileId);
    
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
        console.log(`Tile selected: ${tileId} with ${troops} troops`);
    }
}

// Deselect tile
function deselectTile() {
    if (gameState.selectedTile) {
        const tile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        if (tile) tile.classList.remove('selected');
        gameState.selectedTile = null;
        selectedTileInfo.textContent = "None";
        console.log("Tile deselected");
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
    
    updateTroopDisplayOnTile(tileId);
    console.log(`Tile ${tileId} conquered by ${newOwner}`);
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
        
        // Find adjacent tiles (hexagon grid)
        const adjacentTiles = getAdjacentHexTiles(fromTileId);
        
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
            
            updateTroopDisplayOnTile(fromTileId);
            updateTroopDisplayOnTile(targetTileId);
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
            const waveMultiplier = gameState.wave ? Math.pow(settings.waveGrowth, gameState.wave - 1) : 1;
            const startTroops = Math.floor(baseTroops * waveMultiplier);
            
            gameState.troops[spawnTile].neutralTroops = 0;
            gameState.troops[spawnTile].botTroops = startTroops;
            gameState.troops[spawnTile].shield = settings.shieldBonus;
            conquerTile(spawnTile, 'bot');
            
            gameState.bots.push({
                id: `bot-${Date.now()}-${i}`,
                strength: settings.botStrength * waveMultiplier,
                intelligence: settings.botIntelligence * waveMultiplier,
                aggression: 0.4 + Math.random() * 0.3
            });
        }
    }
    
    gameState.botCount = gameState.bots.length;
    console.log(`Spawned ${count} bots. Total bots: ${gameState.botCount}`);
}

// Next wave (Domination mode) - EXPANDS 25x25
function nextWave() {
    if (gameState.mode !== 'domination') return;
    
    console.log(`Starting wave ${gameState.wave + 1}`);
    gameState.wave++;
    gameState.mapSize += 25; // EXPAND BY 25x25
    gameState.waveTimer = 300;
    
    // Update wave display
    updateWaveDisplay();
    
    // Save current player and bot tiles
    const savedPlayerTiles = [...gameState.playerTiles];
    const savedBotTiles = [...gameState.botTiles];
    const savedNeutralTiles = [...gameState.neutralTiles];
    const savedTroops = JSON.parse(JSON.stringify(gameState.troops));
    
    // Regenerate tiles with new size (hexagon grid)
    createHexagonTiles();
    
    // Restore player and bot tiles in new grid
    savedPlayerTiles.forEach(tileId => {
        const [row, col] = tileId.split('-').map(Number);
        if (row < gameState.mapSize && col < gameState.mapSize) {
            if (savedTroops[tileId]) {
                gameState.troops[tileId] = savedTroops[tileId];
                conquerTile(tileId, 'player');
                updateTroopDisplayOnTile(tileId);
            }
        }
    });
    
    savedBotTiles.forEach(tileId => {
        const [row, col] = tileId.split('-').map(Number);
        if (row < gameState.mapSize && col < gameState.mapSize) {
            if (savedTroops[tileId]) {
                gameState.troops[tileId] = savedTroops[tileId];
                conquerTile(tileId, 'bot');
                updateTroopDisplayOnTile(tileId);
            }
        }
    });
    
    // Spawn more bots with increased difficulty
    const settings = difficultySettings[gameState.difficulty];
    const spawnCount = settings.botSpawnCount + Math.floor(gameState.wave / 2);
    spawnBots(spawnCount);
    
    gameStatus.textContent = `Wave ${gameState.wave}! Map expanded to ${gameState.mapSize}x${gameState.mapSize}!`;
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

// ========== HEXAGON GRID FUNCTIONS ==========

// Check if hexagon tiles are adjacent
function isAdjacentHex(tileId1, tileId2) {
    const [r1, c1] = tileId1.split('-').map(Number);
    const [r2, c2] = tileId2.split('-').map(Number);

    const oddRow = r1 % 2 === 1;

    const neighbors = oddRow
        ? [
            [0, -1], [0, 1],      // left, right
            [-1, 0], [-1, 1],     // up-left, up-right  ✅ (0,5 from 1,4)
            [1, 0], [1, 1],       // down-left, down-right
        ]
        : [
            [0, -1], [0, 1],
            [-1, -1], [-1, 0],
            [1, -1], [1, 0],
        ];

    return neighbors.some(
        ([dr, dc]) => r1 + dr === r2 && c1 + dc === c2
    );
}


// Get adjacent hexagon tiles
function getAdjacentHexTiles(tileId) {
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
    
    return adjacent.filter(id => {
        const [r, c] = id.split('-').map(Number);
        return r >= 0 && r < gridSize && c >= 0 && c < gridSize;
    });
}

// ========== HELPER FUNCTIONS ==========

// Update troop display on specific tile
function updateTroopDisplayOnTile(tileId) {
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
    
    if (gameTimeElement) {
        gameTimeElement.textContent = formatTime(gameState.gameTime);
    }
    
    if (difficultyLevelElement) {
        difficultyLevelElement.textContent = getDifficultyText(gameState.difficulty);
    }
    
    // Update difficulty indicator
    if (difficultyIndicator) {
        difficultyIndicator.innerHTML = '';
        for (let i = 0; i < 5; i++) {
            const dot = document.createElement('div');
            dot.className = 'diff-dot';
            if (i < gameState.difficulty) {
                dot.classList.add('active');
            }
            difficultyIndicator.appendChild(dot);
        }
    }
}

// Get mode name
function getModeName(mode) {
    switch(mode) {
        case 'domination': return 'Domination';
        case 'bots': return 'Bots Battle';
        case '1v1': return '1v1 Duel';
        default: return 'Unknown';
    }
}

// ========== GAME CONTROLS ==========

function goToMenu() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    window.location.href = 'index.html';
}

function viewLeaderboard() {
    window.location.href = 'leaderboard.html';
}

function restartGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    
    // Reset game state
    gameState = {
        active: false,
        mode: gameState.mode,
        playerName: gameState.playerName,
        playerTiles: [],
        botTiles: [],
        neutralTiles: [],
        score: 0,
        bots: [],
        botCount: 0,
        difficulty: gameState.difficulty,
        selectedTile: null,
        gameTime: 0,
        lastUpdate: Date.now(),
        gameLoop: null,
        isPaused: false,
        troopGenerationRate: 1,
        maxTroopsPerTile: 100,
        troops: {},
        deploymentPercentage: gameState.deploymentPercentage,
        wave: 1,
        waveTimer: 300,
        mapSize: 8,
        zoomLevel: 1
    };
    
    // Restart
    initGame();
}

function pauseGame() {
    gameState.isPaused = !gameState.isPaused;
    if (pauseBtn) {
        pauseBtn.innerHTML = gameState.isPaused ? 
            '<i class="fas fa-play"></i> Resume' : 
            '<i class="fas fa-pause"></i> Pause';
    }
    
    if (gameState.isPaused) {
        gameStatus.textContent = "Game Paused";
        gameStatus.className = "game-status";
    } else {
        gameStatus.textContent = "Game in Progress";
        gameStatus.className = "game-status player-turn";
    }
}

function toggleSidePanel() {
    sidePanel.classList.toggle('active');
    panelToggleIcon.classList.toggle('fa-chevron-left');
    panelToggleIcon.classList.toggle('fa-chevron-right');
}

function zoomIn() {
    if (gameState.zoomLevel < 2) {
        gameState.zoomLevel += 0.1;
        tilesContainer.style.transform = `scale(${gameState.zoomLevel})`;
    }
}

function zoomOut() {
    if (gameState.zoomLevel > 0.5) {
        gameState.zoomLevel -= 0.1;
        tilesContainer.style.transform = `scale(${gameState.zoomLevel})`;
    }
}

function resetZoom() {
    gameState.zoomLevel = 1;
    tilesContainer.style.transform = `scale(${gameState.zoomLevel})`;
}

// Initialize
window.onload = initGame;

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (!gameState.active) return;
    
    // ESC to cancel
    if (event.key === 'Escape') {
        if (gameState.selectedTile) {
            deselectTile();
        }
    }
    
    // P to pause
    if (event.key === 'p' || event.key === 'P') {
        pauseGame();
    }
    
    // R to restart
    if (event.key === 'r' || event.key === 'R') {
        if (confirm("Restart game?")) {
            restartGame();
        }
    }
    
    // M for menu
    if (event.key === 'm' || event.key === 'M') {
        if (confirm("Return to main menu?")) {
            goToMenu();
        }
    }
    
    // + to zoom in
    if (event.key === '+' || event.key === '=') {
        zoomIn();
    }
    
    // - to zoom out
    if (event.key === '-' || event.key === '_') {
        zoomOut();
    }
    
    // 0 to reset zoom
    if (event.key === '0') {
        resetZoom();
    }
});

// Close modals
window.onclick = function(event) {
    const modal = document.getElementById('gameOverModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
};
