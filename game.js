// ===========================================
// DOMINATION GAME - FIXED VERSION
// Features: Bottom troop selector, no auto takeover
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
    gameLog: [],
    gridSize: 8,
    botsDefeated: 0,
    gameTime: 0,
    lastUpdate: Date.now(),
    gameLoop: null,
    isPaused: false,
    
    // Game settings
    troopGenerationRate: 0.5,
    maxTroopsPerTile: 50,
    troops: {},
    
    // New features
    difficultyShields: {
        1: 0,   // Easy
        2: 1,   // Normal
        3: 2,   // Hard
        4: 3,   // Expert
        5: 5    // Insane
    },
    
    // Deployment system
    troopDeployment: {
        active: false,
        fromTile: null,
        toTile: null,
        maxTroops: 0,
        selectedTroops: 0,
        actionType: null
    }
};

// DOM Elements
const tilesContainer = document.getElementById('tilesContainer');
const gameStatus = document.getElementById('gameStatus');
const gameLog = document.getElementById('gameLog');
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
const difficultyIndicator = document.getElementById('difficultyIndicator');
const pauseBtn = document.getElementById('pauseBtn');

// Bottom troop selector elements
const troopSelector = document.getElementById('troopSelector');
const selectorMessage = document.getElementById('selectorMessage');
const troopSlider = document.getElementById('troopSlider');
const currentTroops = document.getElementById('currentTroops');
const minTroopsLabel = document.getElementById('minTroopsLabel');
const maxTroopsLabel = document.getElementById('maxTroopsLabel');

// Initialize Game
function initGame() {
    // Load settings
    gameState.playerName = localStorage.getItem('dominationPlayerName') || 'Commander';
    gameState.mode = localStorage.getItem('dominationGameMode') || 'domination';
    gameState.difficulty = parseInt(localStorage.getItem('dominationDifficulty')) || 2;
    
    // Update UI
    currentPlayerNameElement.textContent = gameState.playerName;
    const modeName = getModeName(gameState.mode);
    gameModeDisplay.textContent = modeName;
    modeInfoElement.textContent = modeName;
    
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
    addLog(`Welcome, Commander ${gameState.playerName}!`);
    addLog(`Mode: ${modeName}, Difficulty: ${getDifficultyText(gameState.difficulty)}`);
    
    // Setup troop slider
    setupTroopSlider();
    
    // Start game loop
    startGameLoop();
}

// Create game tiles
function createTiles() {
    tilesContainer.innerHTML = '';
    tilesContainer.style.gridTemplateColumns = `repeat(${gameState.gridSize}, 1fr)`;
    tilesContainer.style.gridTemplateRows = `repeat(${gameState.gridSize}, 1fr)`;
    
    // Reset tile arrays
    gameState.neutralTiles = [];
    gameState.playerTiles = [];
    gameState.botTiles = [];
    gameState.troops = {};
    
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
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
            
            // Tile icon
            const icon = document.createElement('div');
            icon.className = 'tile-icon';
            icon.textContent = '●';
            content.appendChild(icon);
            
            // Tile info
            const info = document.createElement('div');
            info.className = 'tile-info';
            info.innerHTML = '<span class="troop-label">Troops:</span><span class="troop-value">0</span>';
            content.appendChild(info);
            
            tile.appendChild(content);
            tile.addEventListener('click', () => handleTileClick(tileId));
            tilesContainer.appendChild(tile);
            
            // Initialize troop data
            gameState.troops[tileId] = {
                playerTroops: 0,
                botTroops: 0,
                neutralTroops: 2 + Math.floor(Math.random() * 4),
                owner: 'neutral',
                shield: gameState.difficultyShields[gameState.difficulty]
            };
            
            gameState.neutralTiles.push(tileId);
        }
    }
}

// Setup troop slider
function setupTroopSlider() {
    troopSlider.addEventListener('input', function() {
        currentTroops.textContent = this.value;
    });
}

// Start Domination mode
function startDomination() {
    gameState.active = true;
    
    // Player starts in center
    const centerRow = Math.floor(gameState.gridSize / 2);
    const centerCol = Math.floor(gameState.gridSize / 2);
    
    // Starting troops based on difficulty
    const startTroops = 25 - (gameState.difficulty * 2);
    
    // Starting tiles (3 tiles)
    const playerTiles = [
        `${centerRow}-${centerCol}`,
        `${centerRow-1}-${centerCol}`,
        `${centerRow}-${centerCol-1}`
    ];
    
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        gameState.troops[tileId].playerTroops = startTroops;
        // Player gets half shield
        gameState.troops[tileId].shield = Math.floor(gameState.difficultyShields[gameState.difficulty] / 2);
        updateTroopDisplay(tileId);
    });
    
    addLog(`Domination mode: Start with ${startTroops} troops per tile`);
    
    // Spawn initial bots
    spawnBots(2);
    
    gameStatus.textContent = "Domination: Conquer territory!";
    gameStatus.className = "game-status player-turn";
}

// Start Bots Battle mode
function startBotsBattle() {
    gameState.active = true;
    
    // Player starts in corner
    const playerTile = '1-1';
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = 20;
    gameState.troops[playerTile].shield = Math.floor(gameState.difficultyShields[gameState.difficulty] / 2);
    updateTroopDisplay(playerTile);
    
    addLog("Bots Battle: Eliminate all opponents!");
    
    // Spawn bots
    spawnBots(3);
    
    gameStatus.textContent = "Bots Battle: Eliminate all bots!";
    gameStatus.className = "game-status player-turn";
}

// Start 1v1 mode
function start1v1() {
    gameState.active = true;
    
    // Player starts on left
    const playerRow = Math.floor(gameState.gridSize / 2);
    const playerTile = `${playerRow}-1`;
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = 25;
    gameState.troops[playerTile].shield = Math.floor(gameState.difficultyShields[gameState.difficulty] / 2);
    updateTroopDisplay(playerTile);
    
    // Bot starts on right
    const botTile = `${playerRow}-${gameState.gridSize - 2}`;
    conquerTile(botTile, 'bot');
    gameState.troops[botTile].botTroops = 30;
    gameState.troops[botTile].shield = gameState.difficultyShields[gameState.difficulty];
    updateTroopDisplay(botTile);
    
    gameState.bots.push({
        id: 'elite',
        strength: 1.0,
        intelligence: 1,
        aggression: 0.5
    });
    gameState.botCount = 1;
    
    addLog("1v1 Duel: Defeat the elite commander!");
    
    gameStatus.textContent = "1v1 Duel: Defeat the elite bot!";
    gameStatus.className = "game-status player-turn";
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
        if (Math.random() < 0.2) {
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
    
    // If deployment is active, cancel it
    if (gameState.troopDeployment.active) {
        cancelDeployment();
        return;
    }
    
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
        
        // Determine action type
        let actionType = null;
        if (gameState.playerTiles.includes(tileId)) {
            actionType = 'reinforce';
        } else {
            actionType = 'attack';
        }
        
        // Start deployment
        startDeployment(fromTileId, tileId, fromTroops, actionType);
    } else if (gameState.selectedTile) {
        addLog("Target not adjacent!");
        deselectTile();
    }
}

// Start deployment with bottom selector
function startDeployment(fromTileId, toTileId, maxTroops, actionType) {
    gameState.troopDeployment = {
        active: true,
        fromTile: fromTileId,
        toTile: toTileId,
        maxTroops: maxTroops,
        selectedTroops: Math.min(10, Math.floor(maxTroops / 2)),
        actionType: actionType
    };
    
    // Set up bottom selector
    troopSlider.min = 1;
    troopSlider.max = maxTroops;
    troopSlider.value = gameState.troopDeployment.selectedTroops;
    
    currentTroops.textContent = gameState.troopDeployment.selectedTroops;
    minTroopsLabel.textContent = '1';
    maxTroopsLabel.textContent = maxTroops;
    
    // Set message based on action type
    if (actionType === 'attack') {
        const targetOwner = gameState.troops[toTileId].owner;
        const defense = targetOwner === 'bot' ? 
            Math.floor(gameState.troops[toTileId].botTroops) : 
            Math.floor(gameState.troops[toTileId].neutralTroops);
        const shield = gameState.troops[toTileId].shield || 0;
        
        selectorMessage.innerHTML = `Attack ${toTileId} <strong>(${defense} troops + ${shield} shield)</strong>`;
    } else {
        selectorMessage.innerHTML = `Reinforce ${toTileId}`;
    }
    
    // Show bottom selector
    troopSelector.style.display = 'block';
}

// Confirm deployment
function confirmDeployment() {
    const deployment = gameState.troopDeployment;
    
    if (deployment.actionType === 'attack') {
        attackTile(deployment.fromTile, deployment.toTile, deployment.selectedTroops);
    } else if (deployment.actionType === 'reinforce') {
        reinforceTile(deployment.fromTile, deployment.toTile, deployment.selectedTroops);
    }
    
    // Hide selector
    troopSelector.style.display = 'none';
    gameState.troopDeployment.active = false;
    deselectTile();
}

// Cancel deployment
function cancelDeployment() {
    troopSelector.style.display = 'none';
    gameState.troopDeployment.active = false;
    addLog("Deployment cancelled");
    deselectTile();
}

// Attack tile with custom troops
function attackTile(attackerTileId, defenderTileId, attackTroops) {
    const attackerData = gameState.troops[attackerTileId];
    const defenderData = gameState.troops[defenderTileId];
    
    // Check if we have enough troops
    if (attackTroops > attackerData.playerTroops) {
        addLog("Not enough troops!");
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
            // FIXED: Neutral tile gives troops to player
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            // Keep half shield for player
            defenderData.shield = Math.floor(shield / 2);
            gameState.score += 25;
            addLog(`Captured neutral territory! ${survivingTroops} troops remain.`);
        } else if (defenderOwner === 'bot') {
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            defenderData.shield = Math.floor(shield / 2);
            gameState.score += 100;
            gameState.botsDefeated++;
            addLog(`Victory! Defeated bot. ${survivingTroops} troops remain.`);
            
            // Check if bot is completely defeated
            checkBotDefeated();
        }
    } else {
        // Defender wins
        const survivingDefenders = defenseStrength - attackTroops;
        
        if (defenderOwner === 'neutral') {
            defenderData.neutralTroops = Math.max(1, survivingDefenders - shield);
            addLog(`Attack failed! Neutral tile has ${Math.floor(defenderData.neutralTroops)} troops left.`);
        } else if (defenderOwner === 'bot') {
            defenderData.botTroops = Math.max(1, survivingDefenders - shield);
            addLog(`Attack failed! Bot has ${Math.floor(defenderData.botTroops)} troops left.`);
        }
        
        addLog(`Lost ${attackTroops} troops.`);
    }
    
    // Battle animation
    animateBattle(attackerTileId, defenderTileId);
    
    updateTroopDisplay(attackerTileId);
    updateTroopDisplay(defenderTileId);
    
    // REMOVED: No auto takeover of adjacent tiles
}

// Reinforce tile
function reinforceTile(fromTileId, toTileId, troops) {
    const fromData = gameState.troops[fromTileId];
    const toData = gameState.troops[toTileId];
    
    if (troops > fromData.playerTroops) {
        addLog("Not enough troops!");
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
    
    addLog(`Moved ${troops} troops to ${toTileId}`);
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
        addLog(`Selected ${tileId} with ${troops} troops. Click adjacent tile.`);
    }
}

// Deselect tile
function deselectTile() {
    if (gameState.selectedTile) {
        const tile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        if (tile) tile.classList.remove('selected');
        gameState.selectedTile = null;
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
    gameState.bots.forEach((bot, botIndex) => {
        if (Math.random() > 0.3) return;
        
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
                    addLog("AI captured your territory!");
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
            const startTroops = 10 + (gameState.difficulty * 3);
            gameState.troops[spawnTile].neutralTroops = 0;
            gameState.troops[spawnTile].botTroops = startTroops;
            gameState.troops[spawnTile].shield = gameState.difficultyShields[gameState.difficulty];
            conquerTile(spawnTile, 'bot');
            
            gameState.bots.push({
                id: `bot-${Date.now()}-${i}`,
                strength: 1.0,
                intelligence: 1,
                aggression: 0.5
            });
            
            addLog(`New AI commander spawned with ${startTroops} troops!`);
        }
    }
    
    gameState.botCount = gameState.bots.length;
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
    
    // Win conditions
    if (gameState.mode === 'bots' && gameState.botTiles.length === 0) {
        endGame(true);
        return;
    }
    
    if (gameState.mode === '1v1' && gameState.botTiles.length === 0) {
        endGame(true);
        return;
    }
    
    if (gameState.mode === 'domination' && gameState.playerTiles.length > (gameState.gridSize * gameState.gridSize) * 0.7) {
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
    
    // Hide troop selector
    troopSelector.style.display = 'none';
    
    // Calculate score
    const timeBonus = Math.floor(gameState.gameTime * 2);
    const tileBonus = gameState.playerTiles.length * 75;
    const troopBonus = Math.floor(totalPlayerTroops() * 0.5);
    const botBonus = gameState.botsDefeated * 250;
    const difficultyMultiplier = gameState.difficulty;
    
    let finalScore = Math.floor((
        gameState.score + 
        timeBonus + 
        tileBonus + 
        troopBonus + 
        botBonus
    ) * difficultyMultiplier);
    
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
    document.getElementById('finalDifficulty').textContent = getDifficultyText(gameState.difficulty);
    
    // Save to leaderboard if domination mode
    if (gameState.mode === 'domination') {
        saveToLeaderboard(finalScore);
    }
    
    // Show modal
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
    const troopValueElement = tile.querySelector('.troop-value');
    const shieldIndicator = tile.querySelector('.shield-indicator');
    
    if (troopCountElement) troopCountElement.textContent = troopCount;
    if (troopValueElement) troopValueElement.textContent = troopCount;
    
    // Update shield
    if (shieldIndicator) {
        const shield = troopData.shield || 0;
        if (shield > 0) {
            shieldIndicator.style.display = 'flex';
            shieldIndicator.title = `+${shield} shield`;
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

// Save to leaderboard
function saveToLeaderboard(score) {
    const playerName = gameState.playerName;
    const date = new Date().toISOString().split('T')[0];
    
    let leaderboards = JSON.parse(localStorage.getItem('dominationLeaderboards')) || {
        daily: [],
        weekly: [],
        alltime: []
    };
    
    const entry = {
        player: playerName,
        score: score,
        mode: getModeName(gameState.mode),
        date: date,
        timestamp: Date.now(),
        time: Math.floor(gameState.gameTime),
        tiles: gameState.playerTiles.length,
        difficulty: gameState.difficulty,
        botsDefeated: gameState.botsDefeated
    };
    
    // Add to leaderboards
    leaderboards.daily.push(entry);
    leaderboards.weekly.push(entry);
    leaderboards.alltime.push(entry);
    
    // Filter out bot entries
    filterBotEntries(leaderboards);
    
    // Sort and keep top 10
    ['daily', 'weekly', 'alltime'].forEach(period => {
        leaderboards[period].sort((a, b) => b.score - a.score);
        leaderboards[period] = leaderboards[period].slice(0, 10);
    });
    
    localStorage.setItem('dominationLeaderboards', JSON.stringify(leaderboards));
}

// Filter bot entries
function filterBotEntries(leaderboards) {
    const botNames = ['Bot', 'AI', 'Computer', 'CPU', 'Robot', 'Opponent', 'Enemy', 'bot-'];
    
    ['daily', 'weekly', 'alltime'].forEach(period => {
        leaderboards[period] = leaderboards[period].filter(entry => {
            if (!entry || !entry.player) return false;
            
            const playerName = entry.player.toString().toLowerCase();
            const isBot = botNames.some(botName => 
                playerName.includes(botName.toLowerCase()) || 
                entry.player === 'Commander' ||
                entry.player.trim() === '' ||
                entry.player.startsWith('bot-')
            );
            
            return !isBot;
        });
    });
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
    
    if (gameStatusTextElement) {
        gameStatusTextElement.textContent = gameState.isPaused ? "Paused" : "Playing";
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
    
    // Update troop slider if deployment is active
    if (gameState.troopDeployment.active) {
        const deployment = gameState.troopDeployment;
        const selectedValue = parseInt(troopSlider.value);
        if (selectedValue !== deployment.selectedTroops) {
            deployment.selectedTroops = selectedValue;
            currentTroops.textContent = selectedValue;
        }
    }
}

// Add log
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'});
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    gameLog.appendChild(logEntry);
    
    // Keep only last 12 messages
    while (gameLog.children.length > 12) {
        gameLog.removeChild(gameLog.firstChild);
    }
    
    gameLog.scrollTop = gameLog.scrollHeight;
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
    troopSelector.style.display = 'none';
    
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
        gameLog: [],
        gridSize: 8,
        botsDefeated: 0,
        gameTime: 0,
        lastUpdate: Date.now(),
        gameLoop: null,
        isPaused: false,
        troopGenerationRate: 0.5,
        maxTroopsPerTile: 50,
        troops: {},
        difficultyShields: gameState.difficultyShields,
        troopDeployment: {
            active: false,
            fromTile: null,
            toTile: null,
            maxTroops: 0,
            selectedTroops: 0,
            actionType: null
        }
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
        addLog("Game paused");
        gameStatus.textContent = "Game Paused";
    } else {
        addLog("Game resumed");
        gameStatus.textContent = "Game in Progress";
    }
}

function showInstructions() {
    document.getElementById('instructionsModal').style.display = 'block';
}

function closeInstructions() {
    document.getElementById('instructionsModal').style.display = 'none';
}

// Initialize
window.onload = initGame;

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (!gameState.active) return;
    
    // ESC to cancel
    if (event.key === 'Escape') {
        if (gameState.troopDeployment.active) {
            cancelDeployment();
        } else if (gameState.selectedTile) {
            deselectTile();
            addLog("Deselected tile");
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
});

// Close modals
window.onclick = function(event) {
    const modals = ['gameOverModal', 'instructionsModal'];
    modals.forEach(modalId => {
        const modal = document.getElementById(modalId);
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};
