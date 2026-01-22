// ===========================================
// DOMINATION GAME - COMPREHENSIVE FIX
// Fixed: All reported issues + new features
// ===========================================

// Game State with all new features
let gameState = {
    active: false,
    mode: 'domination',
    playerName: 'Commander',
    playerTiles: [],
    botTiles: [],
    neutralTiles: [],
    turnNumber: 1,
    score: 0,
    bots: [],
    botCount: 0,
    maxBots: 5,
    botSpawnRate: 30,
    lastBotSpawn: 0,
    difficulty: 2,
    selectedTile: null,
    gameLog: [],
    gridSize: 8,
    botsDefeated: 0,
    gameTime: 0,
    lastUpdate: Date.now(),
    gameLoop: null,
    isPaused: false,
    
    // NEW: Difficulty-based shield values
    difficultyShields: {
        1: 0,  // Easy: no shield
        2: 1,  // Normal: +1 shield
        3: 2,  // Hard: +2 shield
        4: 3,  // Expert: +3 shield
        5: 5   // Insane: +5 shield
    },
    
    // NEW: Troop deployment system
    troopDeployment: {
        active: false,
        fromTile: null,
        toTile: null,
        maxTroops: 0,
        selectedTroops: 0,
        actionType: null // 'attack' or 'reinforce'
    },
    
    // NEW: Difference-based combat (no 1.2x multiplier)
    attackMultiplier: 1.0,
    defenseBonus: 1.0,
    
    // Other game settings
    troopGenerationRate: 0.5,
    maxTroopsPerTile: 50,
    troops: {},
    lastTroopUpdate: Date.now(),
    totalTroopsGenerated: 0,
    
    // Fix for fast difficulty change
    difficultyChangeCooldown: 0,
    lastDifficultyChange: 0,
    
    // Leaderboard bot filtering
    leaderboardFiltered: false
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
const botCountInfoElement = document.getElementById('botCountInfo');
const troopRateElement = document.getElementById('troopRate');
const gameStatusTextElement = document.getElementById('gameStatusText');
const difficultyIndicator = document.getElementById('difficultyIndicator');
const pauseBtn = document.getElementById('pauseBtn');

// Initialize Game
function initGame() {
    // Load player name, mode, and difficulty
    gameState.playerName = localStorage.getItem('dominationPlayerName') || 'Commander';
    gameState.mode = localStorage.getItem('dominationGameMode') || 'domination';
    
    // FIX: Load difficulty with cooldown
    const savedDifficulty = localStorage.getItem('dominationDifficulty');
    gameState.difficulty = savedDifficulty ? parseInt(savedDifficulty) : 2;
    gameState.difficultyChangeCooldown = Date.now() + 3000; // 3-second cooldown
    
    // Load game settings
    const savedSettings = localStorage.getItem('dominationSettings');
    if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        gameState.troopGenerationRate = settings.troopSpeed || 0.5;
        gameState.maxTroopsPerTile = settings.maxTroops || 50;
    }
    
    // Update UI
    currentPlayerNameElement.textContent = gameState.playerName;
    const modeName = getModeName(gameState.mode);
    gameModeDisplay.textContent = modeName;
    modeInfoElement.textContent = modeName;
    
    // Set grid size based on mode
    gameState.gridSize = gameState.mode === '1v1' ? 6 : 8;
    
    // Create tiles with shields
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
    addLog(`Welcome, Commander ${gameState.playerName}! Starting ${modeName} mission.`);
    addLog(`Difficulty: ${getDifficultyText(gameState.difficulty)}`);
    addLog(`Shield Level: +${gameState.difficultyShields[gameState.difficulty]}`);
    
    // Start game loop
    startGameLoop();
}

// Create game tiles with shield indicators
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
            
            // Create tile content container
            const content = document.createElement('div');
            content.className = 'tile-content';
            
            // Troop count display
            const troopCount = document.createElement('div');
            troopCount.className = 'troop-count';
            troopCount.textContent = '0';
            content.appendChild(troopCount);
            
            // NEW: Shield indicator
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
            
            // Initialize troop data with shields
            gameState.troops[tileId] = {
                playerTroops: 0,
                botTroops: 0,
                neutralTroops: 3 + Math.floor(Math.random() * 4), // 3-6 troops for neutral
                owner: 'neutral',
                shield: gameState.difficultyShields[gameState.difficulty] // Apply shield based on difficulty
            };
            
            gameState.neutralTiles.push(tileId);
        }
    }
}

// Start Domination mode
function startDomination() {
    gameState.active = true;
    
    // Player starts with a cluster based on difficulty
    const centerRow = Math.floor(gameState.gridSize / 2);
    const centerCol = Math.floor(gameState.gridSize / 2);
    
    // Starting troops based on difficulty
    const startTroops = 40 - (gameState.difficulty * 2);
    
    // Starting tiles based on difficulty
    const startTiles = gameState.difficulty === 5 ? 2 : 3;
    
    const playerTiles = [
        `${centerRow}-${centerCol}`,
        `${centerRow-1}-${centerCol}`,
        `${centerRow}-${centerCol-1}`
    ].slice(0, startTiles);
    
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        gameState.troops[tileId].playerTroops = startTroops;
        // Player tiles have half shield
        gameState.troops[tileId].shield = Math.floor(gameState.difficultyShields[gameState.difficulty] / 2);
        updateTroopDisplay(tileId);
    });
    
    addLog(`Domination mode engaged. Starting with ${startTiles} tiles and ${startTroops} troops each.`);
    addLog(`Shield defense: +${gameState.difficultyShields[gameState.difficulty]}`);
    addLog("Expand your territory and survive against progressive bot waves!");
    
    // Spawn initial bots
    const initialBots = Math.max(1, 3 - gameState.difficulty);
    spawnBots(initialBots);
    
    // Set bot spawn rate based on difficulty
    gameState.botSpawnRate = 40 - (gameState.difficulty * 5);
    
    gameState.lastTroopUpdate = Date.now();
    gameStatus.textContent = "Domination: Secure your territory!";
    gameStatus.className = "game-status player-turn";
}

// Start Bots Battle mode
function startBotsBattle() {
    gameState.active = true;
    
    // Starting troops based on difficulty
    const startTroops = 35 - (gameState.difficulty * 3);
    
    // Player starts in a corner
    const playerTile = '1-1';
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = startTroops;
    gameState.troops[playerTile].shield = Math.floor(gameState.difficultyShields[gameState.difficulty] / 2);
    updateTroopDisplay(playerTile);
    
    addLog(`Bots Battle initiated. Starting with ${startTroops} troops.`);
    addLog("Eliminate all AI commanders to claim victory!");
    
    // Spawn bots
    const botCount = 2 + gameState.difficulty;
    spawnBots(botCount);
    
    gameStatus.textContent = "Bots Battle: Eliminate all opponents!";
    gameStatus.className = "game-status player-turn";
}

// Start 1v1 mode
function start1v1() {
    gameState.active = true;
    
    // Starting troops based on difficulty
    const playerStartTroops = 40 - (gameState.difficulty * 4);
    const botStartTroops = 45 + (gameState.difficulty * 5);
    
    // Player starts on left side
    const playerRow = Math.floor(gameState.gridSize / 2);
    const playerTile = `${playerRow}-1`;
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = playerStartTroops;
    gameState.troops[playerTile].shield = Math.floor(gameState.difficultyShields[gameState.difficulty] / 2);
    updateTroopDisplay(playerTile);
    
    // Bot starts on right side
    const botTile = `${playerRow}-${gameState.gridSize - 2}`;
    conquerTile(botTile, 'bot');
    gameState.troops[botTile].botTroops = botStartTroops;
    gameState.troops[botTile].shield = gameState.difficultyShields[gameState.difficulty];
    updateTroopDisplay(botTile);
    
    // Create elite bot
    gameState.bots.push({
        id: 'elite',
        strength: 1.0 + (gameState.difficulty * 0.3),
        intelligence: 1 + (gameState.difficulty * 0.4),
        aggression: 0.4 + (gameState.difficulty * 0.1)
    });
    gameState.botCount = 1;
    
    addLog(`1v1 Duel against Elite Commander. You: ${playerStartTroops} troops, Bot: ${botStartTroops} troops`);
    addLog("Outmaneuver and outthink your opponent!");
    
    gameState.difficulty = Math.min(5, gameState.difficulty + 1);
    
    gameStatus.textContent = "1v1 Duel: Defeat the elite commander!";
    gameStatus.className = "game-status player-turn";
}

// Start the game loop
function startGameLoop() {
    if (gameState.gameLoop) clearInterval(gameState.gameLoop);
    
    gameState.gameLoop = setInterval(() => {
        if (!gameState.active || gameState.isPaused) return;
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - gameState.lastUpdate) / 1000;
        gameState.lastUpdate = currentTime;
        
        // Update game time
        gameState.gameTime += deltaTime;
        
        // Generate troops for owned tiles
        generateTroops(deltaTime);
        
        // Process ongoing border skirmishes
        processBattles();
        
        // Bot AI actions
        if (Math.random() < 0.3) {
            botActions(deltaTime);
        }
        
        // Spawn bots in domination mode
        if (gameState.mode === 'domination' && 
            gameState.gameTime - gameState.lastBotSpawn > gameState.botSpawnRate) {
            spawnBots(1);
            gameState.lastBotSpawn = gameState.gameTime;
        }
        
        // Slowly increase difficulty in domination mode
        if (gameState.mode === 'domination' && 
            Math.floor(gameState.gameTime) % 120 === 0 && 
            gameState.difficulty < 5) {
            gameState.difficulty++;
            addLog(`Difficulty increased to ${getDifficultyText(gameState.difficulty)}!`);
            
            // Update shields for all tiles
            updateAllShields();
        }
        
        // Update UI
        updateUI();
        
        // Check win conditions
        checkGameEnd();
        
    }, 200);
}

// Generate troops for owned tiles
function generateTroops(deltaTime) {
    const generation = gameState.troopGenerationRate * deltaTime;
    gameState.totalTroopsGenerated += generation;
    
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
            gameState.troops[tileId].botTroops += generation * 0.7;
            updateTroopDisplay(tileId);
        }
    });
}

// NEW: Handle tile click with deployment system
function handleTileClick(tileId) {
    if (!gameState.active || gameState.isPaused) return;
    
    // If deployment is active, cancel it first
    if (gameState.troopDeployment.active) {
        cancelDeployment();
        return;
    }
    
    const tileData = gameState.troops[tileId];
    const playerTroops = tileData.playerTroops;
    
    // If player owns this tile and has troops, select it
    if (gameState.playerTiles.includes(tileId) && playerTroops > 0) {
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
        } else if (gameState.neutralTiles.includes(tileId) || gameState.botTiles.includes(tileId)) {
            actionType = 'attack';
        }
        
        // Start deployment process
        startDeployment(fromTileId, tileId, fromTroops, actionType);
    } else if (gameState.selectedTile && !isAdjacent(tileId, gameState.selectedTile)) {
        addLog("Target not adjacent. Troops can only move/attack to adjacent tiles.");
        deselectTile();
    }
}

// NEW: Start troop deployment process
function startDeployment(fromTileId, toTileId, maxTroops, actionType) {
    gameState.troopDeployment = {
        active: true,
        fromTile: fromTileId,
        toTile: toTileId,
        maxTroops: maxTroops,
        selectedTroops: Math.min(10, Math.floor(maxTroops / 2)),
        actionType: actionType
    };
    
    // Show deployment modal
    const modal = document.getElementById('deploymentModal');
    const message = document.getElementById('deploymentMessage');
    const slider = document.getElementById('troopSlider');
    const minTroops = document.getElementById('minTroops');
    const currentTroops = document.getElementById('currentTroops');
    const maxTroopsElem = document.getElementById('maxTroops');
    
    // Set modal content based on action type
    if (actionType === 'attack') {
        const targetOwner = gameState.troops[toTileId].owner;
        const defenderTroops = targetOwner === 'bot' ? 
            gameState.troops[toTileId].botTroops : 
            gameState.troops[toTileId].neutralTroops;
        const shield = gameState.troops[toTileId].shield;
        
        message.textContent = `Attack ${toTileId} (${defenderTroops + shield} defense). Select troops:`;
    } else {
        message.textContent = `Reinforce ${toTileId}. Select troops to send:`;
    }
    
    // Configure slider
    slider.min = 1;
    slider.max = Math.min(20, maxTroops);
    slider.value = gameState.troopDeployment.selectedTroops;
    
    minTroops.textContent = '1';
    currentTroops.textContent = gameState.troopDeployment.selectedTroops;
    maxTroopsElem.textContent = slider.max;
    
    // Update slider display
    slider.oninput = function() {
        gameState.troopDeployment.selectedTroops = parseInt(this.value);
        currentTroops.textContent = this.value;
    };
    
    modal.style.display = 'block';
}

// NEW: Confirm deployment
function confirmDeployment() {
    const deployment = gameState.troopDeployment;
    
    if (deployment.actionType === 'attack') {
        attackTileWithCustomTroops(deployment.fromTile, deployment.toTile, deployment.selectedTroops);
    } else if (deployment.actionType === 'reinforce') {
        reinforceTile(deployment.fromTile, deployment.toTile, deployment.selectedTroops);
    }
    
    // Close modal and reset
    document.getElementById('deploymentModal').style.display = 'none';
    gameState.troopDeployment.active = false;
    deselectTile();
}

// NEW: Cancel deployment
function cancelDeployment() {
    document.getElementById('deploymentModal').style.display = 'none';
    gameState.troopDeployment.active = false;
    addLog("Deployment cancelled.");
    deselectTile();
}

// NEW: Attack with custom troop amount (DIFFERENCE-BASED COMBAT)
function attackTileWithCustomTroops(attackerTileId, defenderTileId, attackTroops) {
    const attackerData = gameState.troops[attackerTileId];
    const defenderData = gameState.troops[defenderTileId];
    
    // Check if we have enough troops
    if (attackTroops > attackerData.playerTroops) {
        addLog("Not enough troops for this attack!");
        return;
    }
    
    // Remove attacking troops from source
    attackerData.playerTroops -= attackTroops;
    
    let defenseStrength = 0;
    let defenderOwner = defenderData.owner;
    const shieldBonus = defenderData.shield || 0;
    
    if (defenderOwner === 'neutral') {
        defenseStrength = defenderData.neutralTroops + shieldBonus;
    } else if (defenderOwner === 'bot') {
        defenseStrength = defenderData.botTroops + shieldBonus;
    }
    
    // NEW: Difference-based combat
    // If attacker has more troops (including shield), they win with difference
    if (attackTroops > defenseStrength) {
        // Attacker wins
        const survivingTroops = attackTroops - defenseStrength;
        
        // Clear defender troops
        defenderData.neutralTroops = 0;
        defenderData.botTroops = 0;
        
        if (defenderOwner === 'neutral') {
            // FIXED: Neutral tile conquest - troops stay on captured tile
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            // Keep shield for player (half value)
            defenderData.shield = Math.floor(shieldBonus / 2);
            gameState.score += 25 * gameState.difficulty;
            addLog(`Captured neutral territory at ${defenderTileId}! ${survivingTroops} troops remain.`);
        } else if (defenderOwner === 'bot') {
            defenderData.playerTroops = survivingTroops;
            conquerTile(defenderTileId, 'player');
            defenderData.shield = Math.floor(shieldBonus / 2);
            gameState.score += 100 * gameState.difficulty;
            gameState.botsDefeated++;
            addLog(`Victory! Defeated bot at ${defenderTileId}. ${survivingTroops} troops remain.`);
            
            // Check if bot is completely defeated
            checkBotDefeated();
        }
    } else {
        // Defender wins
        const survivingDefenders = defenseStrength - attackTroops;
        
        if (defenderOwner === 'neutral') {
            defenderData.neutralTroops = Math.max(1, survivingDefenders - shieldBonus);
            addLog(`Attack failed at ${defenderTileId}. Defender has ${Math.floor(defenderData.neutralTroops)} troops left.`);
        } else if (defenderOwner === 'bot') {
            defenderData.botTroops = Math.max(1, survivingDefenders - shieldBonus);
            addLog(`Attack failed at ${defenderTileId}. Bot has ${Math.floor(defenderData.botTroops)} troops left.`);
        }
        
        // Attacker loses all attacking troops
        addLog(`Lost ${attackTroops} troops in the attack.`);
    }
    
    // Battle animation
    animateBattle(attackerTileId, defenderTileId);
    
    updateTroopDisplay(attackerTileId);
    updateTroopDisplay(defenderTileId);
}

// NEW: Reinforce friendly tile
function reinforceTile(fromTileId, toTileId, troops) {
    const fromData = gameState.troops[fromTileId];
    const toData = gameState.troops[toTileId];
    
    if (troops > fromData.playerTroops) {
        addLog("Not enough troops to move!");
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
    
    addLog(`Moved ${troops} troops from ${fromTileId} to ${toTileId}`);
}

// Select a tile
function selectTile(tileId) {
    // Deselect previous tile
    if (gameState.selectedTile) {
        const prevTile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        if (prevTile) prevTile.classList.remove('selected');
    }
    
    // Select new tile
    gameState.selectedTile = tileId;
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (tile) {
        tile.classList.add('selected');
        
        const troops = Math.floor(gameState.troops[tileId].playerTroops);
        const shield = gameState.troops[tileId].shield || 0;
        addLog(`Selected ${tileId} with ${troops} troops${shield > 0 ? ` (+${shield} shield)` : ''}. Click adjacent tile.`);
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

// Conquer a tile (change ownership)
function conquerTile(tileId, newOwner) {
    const tileData = gameState.troops[tileId];
    const oldOwner = tileData.owner;
    
    // Remove from old owner's list
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
    
    // Add to new owner's list
    tileData.owner = newOwner;
    
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (tile) {
        tile.classList.remove('player', 'bot', 'neutral');
        
        if (newOwner === 'player') {
            gameState.playerTiles.push(tileId);
            tile.classList.add('player');
            gameState.score += 50 * gameState.difficulty;
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

// Bot AI actions with new combat system
function botActions(deltaTime) {
    gameState.bots.forEach((bot, botIndex) => {
        // Bot aggression based on difficulty
        const aggressionChance = bot.aggression || 0.5;
        if (Math.random() > aggressionChance) return;
        
        // Find bot tiles with enough troops
        const botTilesWithTroops = gameState.botTiles.filter(tileId => 
            gameState.troops[tileId].botTroops > 5
        );
        
        if (botTilesWithTroops.length === 0) return;
        
        // Pick a random bot tile to act from
        const fromTileId = botTilesWithTroops[Math.floor(Math.random() * botTilesWithTroops.length)];
        const fromTroops = gameState.troops[fromTileId].botTroops;
        
        // Find adjacent tiles
        const adjacentTiles = getAdjacentTiles(fromTileId);
        
        // Filter potential targets
        const playerTargets = adjacentTiles.filter(tileId => 
            gameState.playerTiles.includes(tileId)
        );
        
        const neutralTargets = adjacentTiles.filter(tileId => 
            gameState.neutralTiles.includes(tileId) && 
            gameState.troops[tileId].neutralTroops > 0
        );
        
        // Prioritize weak targets
        let targetTileId = null;
        let targetType = null;
        
        // Check for weak player tiles
        for (const tileId of playerTargets) {
            const defenseStrength = gameState.troops[tileId].playerTroops + (gameState.troops[tileId].shield || 0);
            if (fromTroops > defenseStrength) {
                targetTileId = tileId;
                targetType = 'player';
                break;
            }
        }
        
        // If no weak player tile, try neutral
        if (!targetTileId && neutralTargets.length > 0) {
            for (const tileId of neutralTargets) {
                const defenseStrength = gameState.troops[tileId].neutralTroops + (gameState.troops[tileId].shield || 0);
                if (fromTroops > defenseStrength) {
                    targetTileId = tileId;
                    targetType = 'neutral';
                    break;
                }
            }
        }
        
        // If we have a target, attack
        if (targetTileId) {
            const attackPercent = 0.5 + (Math.random() * 0.3);
            const attackStrength = Math.floor(fromTroops * attackPercent);
            const defenderData = gameState.troops[targetTileId];
            
            if (targetType === 'player') {
                const defenseStrength = defenderData.playerTroops + (defenderData.shield || 0);
                
                if (attackStrength > defenseStrength) {
                    // Bot wins
                    const survivingTroops = attackStrength - defenseStrength;
                    
                    gameState.troops[fromTileId].botTroops -= attackStrength;
                    defenderData.playerTroops = 0;
                    defenderData.botTroops = survivingTroops;
                    
                    conquerTile(targetTileId, 'bot');
                    addLog("AI captured one of your territories!");
                } else {
                    // Bot loses
                    gameState.troops[fromTileId].botTroops -= attackStrength;
                    const survivingDefenders = defenseStrength - attackStrength;
                    defenderData.playerTroops = Math.max(0, survivingDefenders - (defenderData.shield || 0));
                    
                    addLog("AI attack repelled!");
                }
            } else if (targetType === 'neutral') {
                const defenseStrength = defenderData.neutralTroops + (defenderData.shield || 0);
                
                if (attackStrength > defenseStrength) {
                    gameState.troops[fromTileId].botTroops -= attackStrength;
                    defenderData.neutralTroops = 0;
                    defenderData.botTroops = attackStrength - defenseStrength;
                    conquerTile(targetTileId, 'bot');
                }
            }
            
            updateTroopDisplay(fromTileId);
            updateTroopDisplay(targetTileId);
        }
    });
}

// Spawn new bots
function spawnBots(count) {
    for (let i = 0; i < count; i++) {
        if (gameState.bots.length >= gameState.maxBots) break;
        
        // Find neutral tile away from player
        let spawnTile = null;
        let attempts = 0;
        
        while (!spawnTile && attempts < 50) {
            const row = Math.floor(Math.random() * gameState.gridSize);
            const col = Math.floor(Math.random() * gameState.gridSize);
            const tileId = `${row}-${col}`;
            
            if (gameState.neutralTiles.includes(tileId) && 
                !isAdjacentToPlayer(tileId)) {
                spawnTile = tileId;
            }
            attempts++;
        }
        
        if (spawnTile) {
            // Give bot starting troops based on difficulty
            const startingTroops = 15 + (gameState.difficulty * 3);
            gameState.troops[spawnTile].neutralTroops = 0;
            gameState.troops[spawnTile].botTroops = startingTroops;
            gameState.troops[spawnTile].shield = gameState.difficultyShields[gameState.difficulty];
            conquerTile(spawnTile, 'bot');
            
            // Create bot
            const botStrength = 1.0 + (Math.random() * 0.3 * gameState.difficulty);
            gameState.bots.push({
                id: `bot-${Date.now()}-${i}`,
                strength: botStrength,
                intelligence: 1 + (Math.random() * 0.4 * gameState.difficulty),
                aggression: 0.4 + (Math.random() * 0.2 * gameState.difficulty)
            });
            
            addLog(`New AI commander spawned with ${startingTroops} troops!`);
        }
    }
    
    gameState.botCount = gameState.bots.length;
    gameState.maxBots = Math.min(8, 3 + Math.floor(gameState.gameTime / 90));
}

// Process ongoing battles at borders
function processBattles() {
    // Only process a few battles per tick
    const maxBattles = 2;
    let battlesProcessed = 0;
    
    // Check border tiles for potential battles
    const borderTiles = [];
    
    gameState.playerTiles.forEach(playerTileId => {
        const adjacent = getAdjacentTiles(playerTileId);
        adjacent.forEach(adjTileId => {
            if (gameState.botTiles.includes(adjTileId)) {
                borderTiles.push({playerTile: playerTileId, enemyTile: adjTileId});
            }
        });
    });
    
    // Process random battles
    for (let i = 0; i < Math.min(maxBattles, borderTiles.length); i++) {
        const battle = borderTiles[Math.floor(Math.random() * borderTiles.length)];
        const playerTroops = gameState.troops[battle.playerTile].playerTroops;
        const enemyTroops = gameState.troops[battle.enemyTile].botTroops;
        
        if (playerTroops > 0 && enemyTroops > 0) {
            // Small skirmish losses
            const playerLoss = Math.max(0.1, playerTroops * 0.002);
            const enemyLoss = Math.max(0.1, enemyTroops * 0.002);
            
            gameState.troops[battle.playerTile].playerTroops -= playerLoss;
            gameState.troops[battle.enemyTile].botTroops -= enemyLoss;
            
            updateTroopDisplay(battle.playerTile);
            updateTroopDisplay(battle.enemyTile);
            
            battlesProcessed++;
        }
    }
}

// Check if game should end
function checkGameEnd() {
    if (!gameState.active) return;
    
    // Player loses if no tiles left
    if (gameState.playerTiles.length === 0) {
        endGame(false);
        return;
    }
    
    // For Bots Battle: win if no bots left
    if (gameState.mode === 'bots' && gameState.botTiles.length === 0 && gameState.bots.length === 0) {
        endGame(true);
        return;
    }
    
    // For 1v1: win if bot has no tiles
    if (gameState.mode === '1v1' && gameState.botTiles.length === 0) {
        endGame(true);
        return;
    }
    
    // For 1v1: lose if bot controls most of the board
    if (gameState.mode === '1v1') {
        const totalTiles = gameState.gridSize * gameState.gridSize;
        const botPercentage = gameState.botTiles.length / totalTiles;
        
        if (botPercentage > 0.7) {
            endGame(false);
        }
    }
    
    // For Domination: win by controlling most of the board
    if (gameState.mode === 'domination') {
        const totalTiles = gameState.gridSize * gameState.gridSize;
        const playerPercentage = gameState.playerTiles.length / totalTiles;
        
        if (playerPercentage > 0.65) {
            endGame(true);
        }
    }
}

// End game
function endGame(isVictory) {
    gameState.active = false;
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    
    // Calculate final score
    const timeBonus = Math.floor(gameState.gameTime * 1.5);
    const tileBonus = gameState.playerTiles.length * 75;
    const troopBonus = Math.floor(totalPlayerTroops() * 0.3);
    const botBonus = gameState.botsDefeated * 250;
    const difficultyMultiplier = gameState.difficulty;
    
    let finalScore = Math.floor((
        gameState.score + 
        timeBonus + 
        tileBonus + 
        troopBonus + 
        botBonus
    ) * difficultyMultiplier);
    
    // Victory bonus
    if (isVictory) {
        finalScore = Math.floor(finalScore * 1.5);
        document.getElementById('gameOverTitle').textContent = 'VICTORY!';
        document.getElementById('gameOverMessage').textContent = 'You have dominated the battlefield!';
        addLog("Congratulations! You achieved victory!");
        gameStatus.textContent = "Victory! You dominated the battlefield!";
        gameStatus.className = "game-status player-turn";
    } else {
        document.getElementById('gameOverTitle').textContent = 'DEFEAT';
        document.getElementById('gameOverMessage').textContent = 'Your forces have been overwhelmed!';
        addLog("Game over! Your forces have been defeated.");
        gameStatus.textContent = "Defeat! Your territory has been lost.";
        gameStatus.className = "game-status bot-turn";
    }
    
    // Update final stats
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('finalTime').textContent = formatTime(gameState.gameTime);
    document.getElementById('finalTiles').textContent = gameState.playerTiles.length;
    document.getElementById('finalBots').textContent = gameState.botsDefeated;
    document.getElementById('finalTroops').textContent = totalPlayerTroops();
    document.getElementById('finalDifficulty').textContent = getDifficultyText(gameState.difficulty);
    
    // Show leaderboard button only for domination mode
    document.getElementById('viewLeaderboardBtn').style.display = 
        gameState.mode === 'domination' ? 'flex' : 'none';
    
    // Save to leaderboard if in domination mode
    if (gameState.mode === 'domination') {
        saveToLeaderboard(finalScore);
    }
    
    // Show game over modal
    setTimeout(() => {
        document.getElementById('gameOverModal').style.display = 'block';
    }, 1000);
}

// ========== HELPER FUNCTIONS ==========

// NEW: Update all shields when difficulty changes
function updateAllShields() {
    Object.keys(gameState.troops).forEach(tileId => {
        const tileData = gameState.troops[tileId];
        const baseShield = gameState.difficultyShields[gameState.difficulty];
        
        if (tileData.owner === 'player') {
            tileData.shield = Math.floor(baseShield / 2);
        } else if (tileData.owner === 'bot' || tileData.owner === 'neutral') {
            tileData.shield = baseShield;
        }
        
        updateTroopDisplay(tileId);
    });
}

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

// Check if tile is adjacent to player territory
function isAdjacentToPlayer(tileId) {
    const adjacent = getAdjacentTiles(tileId);
    return adjacent.some(adjTileId => gameState.playerTiles.includes(adjTileId));
}

// Update troop display on tile
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
    
    // Update shield indicator
    if (shieldIndicator) {
        const shield = troopData.shield || 0;
        if (shield > 0) {
            shieldIndicator.style.display = 'flex';
            shieldIndicator.title = `+${shield} shield defense`;
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

// Format time as MM:SS
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

// NEW: Save to leaderboard with bot filtering
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
    
    // Add to all leaderboards
    leaderboards.daily.push(entry);
    leaderboards.weekly.push(entry);
    leaderboards.alltime.push(entry);
    
    // NEW: Filter out any remaining bot entries
    if (!gameState.leaderboardFiltered) {
        filterBotEntries(leaderboards);
        gameState.leaderboardFiltered = true;
    }
    
    // Sort and keep top 10
    ['daily', 'weekly', 'alltime'].forEach(period => {
        leaderboards[period].sort((a, b) => b.score - a.score);
        leaderboards[period] = leaderboards[period].slice(0, 10);
    });
    
    localStorage.setItem('dominationLeaderboards', JSON.stringify(leaderboards));
}

// NEW: Filter bot entries from leaderboard
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
                entry.mode === 'bot' ||
                entry.player.startsWith('bot-')
            );
            
            return !isBot;
        });
    });
}

// Check if a bot is completely defeated
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
    // Update basic stats
    playerTilesElement.textContent = gameState.playerTiles.length;
    currentScoreElement.textContent = gameState.score;
    botCountElement.textContent = gameState.botCount;
    
    // Update total troops
    if (totalTroopsElement) {
        totalTroopsElement.textContent = totalPlayerTroops();
    }
    
    // Update game time
    if (gameTimeElement) {
        gameTimeElement.textContent = formatTime(gameState.gameTime);
    }
    
    // Update bot count info
    if (botCountInfoElement) {
        botCountInfoElement.textContent = gameState.botCount;
    }
    
    // Update troop rate
    if (troopRateElement) {
        troopRateElement.textContent = `${gameState.troopGenerationRate.toFixed(1)}/sec`;
    }
    
    // Update game status text
    if (gameStatusTextElement) {
        gameStatusTextElement.textContent = gameState.isPaused ? "Paused" : "In Battle";
        gameStatusTextElement.style.color = gameState.isPaused ? "#ffa500" : "#00d2ff";
    }
    
    // Update difficulty display
    if (difficultyLevelElement) {
        difficultyLevelElement.textContent = getDifficultyText(gameState.difficulty);
    }
    
    // Update difficulty indicator
    updateDifficultyIndicator();
}

// Update difficulty indicator dots
function updateDifficultyIndicator() {
    if (!difficultyIndicator) return;
    
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

// Add log message
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
    
    // Scroll to bottom
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

// Navigation functions
function goToMenu() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    window.location.href = 'index.html';
}

function viewLeaderboard() {
    if (gameState.gameLoop) {
        clearInterval(gameState.gameLoop);
        gameState.gameLoop = null;
    }
    window.location.href = 'leaderboard.html';
}

function restartGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    document.getElementById('deploymentModal').style.display = 'none';
    
    // Reset game state
    gameState = {
        active: false,
        mode: gameState.mode,
        playerName: gameState.playerName,
        playerTiles: [],
        botTiles: [],
        neutralTiles: [],
        turnNumber: 1,
        score: 0,
        bots: [],
        botCount: 0,
        maxBots: 5,
        botSpawnRate: 30,
        lastBotSpawn: 0,
        difficulty: gameState.difficulty,
        selectedTile: null,
        gameLog: [],
        gridSize: gameState.mode === '1v1' ? 6 : 8,
        botsDefeated: 0,
        gameTime: 0,
        lastUpdate: Date.now(),
        gameLoop: null,
        isPaused: false,
        difficultyShields: gameState.difficultyShields,
        troopDeployment: {
            active: false,
            fromTile: null,
            toTile: null,
            maxTroops: 0,
            selectedTroops: 0,
            actionType: null
        },
        attackMultiplier: 1.0,
        defenseBonus: 1.0,
        troopGenerationRate: gameState.troopGenerationRate,
        maxTroopsPerTile: gameState.maxTroopsPerTile,
        troops: {},
        lastTroopUpdate: Date.now(),
        totalTroopsGenerated: 0,
        difficultyChangeCooldown: Date.now() + 3000,
        lastDifficultyChange: 0,
        leaderboardFiltered: false
    };
    
    // Reload the page to restart
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

// Initialize game when page loads
window.onload = initGame;

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    if (!gameState.active) return;
    
    // ESC to deselect tile or cancel deployment
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
    
    // R to restart (with confirmation)
    if (event.key === 'r' || event.key === 'R') {
        if (confirm("Restart the game?")) {
            restartGame();
        }
    }
    
    // M for menu
    if (event.key === 'm' || event.key === 'M') {
        if (confirm("Return to main menu? Game progress will be lost.")) {
            goToMenu();
        }
    }
});

// Close modals when clicking outside
window.onclick = function(event) {
    const gameOverModal = document.getElementById('gameOverModal');
    const instructionsModal = document.getElementById('instructionsModal');
    const deploymentModal = document.getElementById('deploymentModal');
    
    if (event.target === gameOverModal) {
        gameOverModal.style.display = 'none';
    }
    if (event.target === instructionsModal) {
        instructionsModal.style.display = 'none';
    }
    if (event.target === deploymentModal) {
        deploymentModal.style.display = 'none';
        gameState.troopDeployment.active = false;
    }
};
