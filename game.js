// Game State
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
    botSpawnRate: 30, // Seconds between bot spawns
    lastBotSpawn: 0,
    difficulty: 1,
    selectedTile: null,
    gameLog: [],
    gridSize: 8,
    botsDefeated: 0,
    gameTime: 0,
    lastUpdate: Date.now(),
    gameLoop: null,
    isPaused: false,
    
    // RTS Elements
    troopGenerationRate: 0.5, // Troops per second per tile
    maxTroopsPerTile: 50,
    attackMultiplier: 1.2, // Need 1.2x troops to conquer
    defenseBonus: 1.1, // Defenders get 10% bonus
    
    // Troop Data Structure
    troops: {}, // tileId: {playerTroops: number, botTroops: number, neutralTroops: number, owner: string}
    
    // For real-time mode
    lastTroopUpdate: Date.now()
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
    // Load player name and mode
    gameState.playerName = localStorage.getItem('dominationPlayerName') || 'Commander';
    gameState.mode = localStorage.getItem('dominationGameMode') || 'domination';
    
    // Update UI
    currentPlayerNameElement.textContent = gameState.playerName;
    const modeName = getModeName(gameState.mode);
    gameModeDisplay.textContent = modeName;
    modeInfoElement.textContent = modeName;
    
    // Set grid size based on mode
    gameState.gridSize = gameState.mode === '1v1' ? 6 : 8;
    
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
    addLog(`Welcome, ${gameState.playerName}! Game started in ${modeName} mode.`);
    
    // Hide turn-based controls (not used in real-time)
    document.getElementById('endTurnBtn').style.display = 'none';
    
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
            
            // Create tile content container
            const content = document.createElement('div');
            content.className = 'tile-content';
            
            // Troop count display
            const troopCount = document.createElement('div');
            troopCount.className = 'troop-count';
            troopCount.textContent = '0';
            content.appendChild(troopCount);
            
            // Tile icon
            const icon = document.createElement('div');
            icon.className = 'tile-icon';
            icon.textContent = '●';
            content.appendChild(icon);
            
            // Tile info (owner, troops)
            const info = document.createElement('div');
            info.className = 'tile-info';
            info.innerHTML = '<span class="troop-label">Troops:</span><span class="troop-value">0</span>';
            content.appendChild(info);
            
            // Progress bar for troop generation
            const progress = document.createElement('div');
            progress.className = 'troop-progress';
            const progressFill = document.createElement('div');
            progressFill.className = 'troop-progress-fill';
            progress.appendChild(progressFill);
            content.appendChild(progress);
            
            tile.appendChild(content);
            tile.addEventListener('click', () => handleTileClick(tileId));
            tilesContainer.appendChild(tile);
            
            // Initialize troop data
            gameState.troops[tileId] = {
                playerTroops: 0,
                botTroops: 0,
                neutralTroops: 5, // Neutral tiles start with 5 troops
                owner: 'neutral'
            };
            
            gameState.neutralTiles.push(tileId);
        }
    }
}

// Start Domination mode (real-time)
function startDomination() {
    gameState.active = true;
    
    // Player starts with a cluster of 3 tiles in the center
    const centerRow = Math.floor(gameState.gridSize / 2);
    const centerCol = Math.floor(gameState.gridSize / 2);
    
    const playerTiles = [
        `${centerRow}-${centerCol}`,
        `${centerRow-1}-${centerCol}`,
        `${centerRow}-${centerCol-1}`
    ];
    
    playerTiles.forEach(tileId => {
        conquerTile(tileId, 'player');
        // Give player some starting troops
        gameState.troops[tileId].playerTroops = 20;
        updateTroopDisplay(tileId);
    });
    
    addLog("Domination mode: Real-time strategy! Troops generate automatically.");
    addLog("Control more tiles to generate more troops!");
    
    // Spawn initial bots
    spawnBots(2);
    
    gameState.lastTroopUpdate = Date.now();
    gameStatus.textContent = "Domination Mode: Expand your territory!";
}

// Start Bots Battle mode
function startBotsBattle() {
    gameState.active = true;
    
    // Player starts in a corner
    const playerTile = '1-1';
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = 30;
    updateTroopDisplay(playerTile);
    
    addLog("Bots Battle mode: Defeat all bots to win!");
    
    // Spawn bots in opposite corner
    spawnBots(4);
    
    gameStatus.textContent = "Bots Battle: Defeat all enemy bots!";
}

// Start 1v1 mode
function start1v1() {
    gameState.active = true;
    
    // Player starts on left side with extra troops
    const playerRow = Math.floor(gameState.gridSize / 2);
    const playerTile = `${playerRow}-1`;
    conquerTile(playerTile, 'player');
    gameState.troops[playerTile].playerTroops = 40;
    updateTroopDisplay(playerTile);
    
    // Bot starts on right side with even more troops
    const botTile = `${playerRow}-${gameState.gridSize - 2}`;
    conquerTile(botTile, 'bot');
    gameState.troops[botTile].botTroops = 50;
    updateTroopDisplay(botTile);
    
    // Create elite bot
    gameState.bots.push({
        id: 'elite',
        strength: 2.5,
        intelligence: 3,
        aggression: 0.8 // More aggressive
    });
    gameState.botCount = 1;
    
    addLog("1v1 Challenge: Face the elite bot in intense combat!");
    gameState.difficulty = 3;
    
    gameStatus.textContent = "1v1 Challenge: Defeat the elite bot!";
}

// Start the game loop
function startGameLoop() {
    if (gameState.gameLoop) clearInterval(gameState.gameLoop);
    
    gameState.gameLoop = setInterval(() => {
        if (!gameState.active || gameState.isPaused) return;
        
        const currentTime = Date.now();
        const deltaTime = (currentTime - gameState.lastUpdate) / 1000; // In seconds
        gameState.lastUpdate = currentTime;
        
        // Update game time
        gameState.gameTime += deltaTime;
        
        // Generate troops for owned tiles
        generateTroops(deltaTime);
        
        // Process ongoing battles
        processBattles();
        
        // Bot AI actions
        if (gameState.mode === 'domination') {
            // Faster bot actions for domination
            if (Math.random() < 0.7) {
                botActions(deltaTime);
            }
        } else {
            // Slower for other modes
            if (Math.random() < 0.3) {
                botActions(deltaTime);
            }
        }
        
        // Spawn bots in domination mode
        if (gameState.mode === 'domination' && 
            gameState.gameTime - gameState.lastBotSpawn > gameState.botSpawnRate) {
            spawnBots(1);
            gameState.lastBotSpawn = gameState.gameTime;
        }
        
        // Increase difficulty over time
        if (Math.floor(gameState.gameTime) % 60 === 0 && gameState.difficulty < 5) {
            gameState.difficulty++;
            addLog(`Difficulty increased to level ${gameState.difficulty}!`);
        }
        
        // Update UI
        updateUI();
        
        // Check win conditions
        checkGameEnd();
        
    }, 100); // Update every 100ms for smooth real-time
}

// Generate troops for owned tiles
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
            gameState.troops[tileId].botTroops += generation * 0.8; // Bots generate slightly slower
            updateTroopDisplay(tileId);
        }
    });
}

// Handle tile click
function handleTileClick(tileId) {
    if (!gameState.active || gameState.isPaused) return;
    
    const tileData = gameState.troops[tileId];
    
    // If player owns this tile and has troops, select it
    if (gameState.playerTiles.includes(tileId) && tileData.playerTroops > 0) {
        selectTile(tileId);
        return;
    }
    
    // If a tile is selected and clicked tile is adjacent
    if (gameState.selectedTile && isAdjacent(tileId, gameState.selectedTile)) {
        // Determine action based on tile owner
        if (gameState.playerTiles.includes(tileId)) {
            // Move troops to friendly tile
            moveTroops(gameState.selectedTile, tileId);
        } else if (gameState.neutralTiles.includes(tileId) || gameState.botTiles.includes(tileId)) {
            // Attack neutral or enemy tile
            attackTile(gameState.selectedTile, tileId);
        }
        
        // Deselect after action
        deselectTile();
    }
}

// Select a tile
function selectTile(tileId) {
    // Deselect previous tile
    if (gameState.selectedTile) {
        const prevTile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        prevTile.classList.remove('selected');
    }
    
    // Select new tile
    gameState.selectedTile = tileId;
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    tile.classList.add('selected');
    
    const troops = Math.floor(gameState.troops[tileId].playerTroops);
    addLog(`Selected ${tileId} with ${troops} troops`);
}

// Deselect tile
function deselectTile() {
    if (gameState.selectedTile) {
        const tile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        tile.classList.remove('selected');
        gameState.selectedTile = null;
    }
}

// Move troops between friendly tiles
function moveTroops(fromTileId, toTileId) {
    const fromTroops = gameState.troops[fromTileId].playerTroops;
    const troopsToMove = Math.floor(fromTroops * 0.5); // Move half of troops
    
    if (troopsToMove > 0) {
        gameState.troops[fromTileId].playerTroops -= troopsToMove;
        gameState.troops[toTileId].playerTroops += troopsToMove;
        
        updateTroopDisplay(fromTileId);
        updateTroopDisplay(toTileId);
        
        addLog(`Moved ${troopsToMove} troops from ${fromTileId} to ${toTileId}`);
    }
}

// Attack a tile
function attackTile(attackerTileId, defenderTileId) {
    const attackerData = gameState.troops[attackerTileId];
    const defenderData = gameState.troops[defenderTileId];
    
    // Calculate attack strength
    let attackStrength = attackerData.playerTroops * 0.5; // Use 50% of troops for attack
    let defenseStrength = 0;
    let defenderOwner = 'neutral';
    
    if (gameState.neutralTiles.includes(defenderTileId)) {
        defenseStrength = defenderData.neutralTroops;
        defenderOwner = 'neutral';
    } else if (gameState.botTiles.includes(defenderTileId)) {
        defenseStrength = defenderData.botTroops * gameState.defenseBonus;
        defenderOwner = 'bot';
    }
    
    // You need more troops to conquer
    const requiredStrength = defenseStrength * gameState.attackMultiplier;
    
    if (attackStrength >= requiredStrength) {
        // Successful attack
        const casualties = Math.floor(defenseStrength * 0.7); // 70% of defenders die
        const remainingAttackers = attackStrength - Math.floor(casualties * 0.5); // Attackers lose half of defender casualties
        
        // Update troop counts
        attackerData.playerTroops -= attackStrength;
        
        if (defenderOwner === 'neutral') {
            // Conquer neutral tile
            defenderData.neutralTroops = 0;
            defenderData.playerTroops = remainingAttackers;
            conquerTile(defenderTileId, 'player');
            gameState.score += 25 * gameState.difficulty;
        } else if (defenderOwner === 'bot') {
            // Conquer bot tile
            defenderData.botTroops = 0;
            defenderData.playerTroops = remainingAttackers;
            conquerTile(defenderTileId, 'player');
            gameState.score += 100 * gameState.difficulty;
        }
        
        addLog(`Victory! Conquered ${defenderTileId} with ${Math.floor(remainingAttackers)} troops remaining`);
        
        // Check if bot was defeated
        if (defenderOwner === 'bot') {
            const botTileCount = gameState.botTiles.length;
            if (botTileCount === 0) {
                gameState.bots = [];
                gameState.botsDefeated++;
            }
        }
    } else {
        // Failed attack
        const attackerCasualties = Math.floor(attackStrength * 0.6); // 60% casualties
        const defenderCasualties = Math.floor(attackStrength * 0.3); // 30% of attackers
        
        attackerData.playerTroops -= attackerCasualties;
        
        if (defenderOwner === 'neutral') {
            defenderData.neutralTroops -= defenderCasualties;
            if (defenderData.neutralTroops < 0) defenderData.neutralTroops = 0;
        } else if (defenderOwner === 'bot') {
            defenderData.botTroops -= defenderCasualties;
            if (defenderData.botTroops < 0) defenderData.botTroops = 0;
        }
        
        addLog(`Attack failed! Lost ${attackerCasualties} troops`);
    }
    
    // Add battle animation
    const attackerTile = document.querySelector(`[data-id="${attackerTileId}"]`);
    const defenderTile = document.querySelector(`[data-id="${defenderTileId}"]`);
    attackerTile.classList.add('battle');
    defenderTile.classList.add('battle');
    setTimeout(() => {
        attackerTile.classList.remove('battle');
        defenderTile.classList.remove('battle');
    }, 500);
    
    updateTroopDisplay(attackerTileId);
    updateTroopDisplay(defenderTileId);
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
    
    if (newOwner === 'player') {
        gameState.playerTiles.push(tileId);
        gameState.score += 50 * gameState.difficulty;
        
        // Update tile appearance
        const tile = document.querySelector(`[data-id="${tileId}"]`);
        tile.classList.remove('player', 'bot', 'neutral');
        tile.classList.add('player');
    } else if (newOwner === 'bot') {
        gameState.botTiles.push(tileId);
        
        const tile = document.querySelector(`[data-id="${tileId}"]`);
        tile.classList.remove('player', 'bot', 'neutral');
        tile.classList.add('bot');
    } else if (newOwner === 'neutral') {
        gameState.neutralTiles.push(tileId);
        
        const tile = document.querySelector(`[data-id="${tileId}"]`);
        tile.classList.remove('player', 'bot', 'neutral');
        tile.classList.add('neutral');
    }
    
    updateTroopDisplay(tileId);
}

// Bot AI actions
function botActions(deltaTime) {
    gameState.bots.forEach((bot, botIndex) => {
        // Bot aggression increases with difficulty
        if (Math.random() > 0.5 + (bot.aggression || 0.3)) return;
        
        // Find bot tiles with troops
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
        
        // Prioritize weak player tiles, then neutral tiles
        let targetTileId = null;
        
        // Check for weak player tiles
        for (const tileId of playerTargets) {
            const defenseStrength = gameState.troops[tileId].playerTroops * gameState.defenseBonus;
            if (fromTroops >= defenseStrength * gameState.attackMultiplier) {
                targetTileId = tileId;
                break;
            }
        }
        
        // If no weak player tile, try neutral
        if (!targetTileId && neutralTargets.length > 0) {
            for (const tileId of neutralTargets) {
                const defenseStrength = gameState.troops[tileId].neutralTroops;
                if (fromTroops >= defenseStrength * gameState.attackMultiplier) {
                    targetTileId = tileId;
                    break;
                }
            }
        }
        
        // If we have a target, attack
        if (targetTileId) {
            const attackStrength = Math.floor(fromTroops * 0.7); // Use 70% of troops
            const defenderData = gameState.troops[targetTileId];
            
            // Simulate attack
            if (gameState.playerTiles.includes(targetTileId)) {
                const defenseStrength = defenderData.playerTroops * gameState.defenseBonus;
                
                if (attackStrength >= defenseStrength * gameState.attackMultiplier) {
                    // Bot wins
                    const casualties = Math.floor(defenseStrength * 0.7);
                    const remaining = attackStrength - Math.floor(casualties * 0.5);
                    
                    gameState.troops[fromTileId].botTroops -= attackStrength;
                    defenderData.playerTroops = 0;
                    defenderData.botTroops = remaining;
                    
                    conquerTile(targetTileId, 'bot');
                    addLog("Bot captured one of your tiles!");
                } else {
                    // Bot loses
                    const attackerCasualties = Math.floor(attackStrength * 0.6);
                    const defenderCasualties = Math.floor(attackStrength * 0.3);
                    
                    gameState.troops[fromTileId].botTroops -= attackerCasualties;
                    defenderData.playerTroops -= defenderCasualties;
                    if (defenderData.playerTroops < 0) defenderData.playerTroops = 0;
                    
                    addLog("Bot attacked but failed!");
                }
            } else if (gameState.neutralTiles.includes(targetTileId)) {
                // Attack neutral tile
                if (attackStrength >= defenderData.neutralTroops * gameState.attackMultiplier) {
                    gameState.troops[fromTileId].botTroops -= attackStrength;
                    defenderData.neutralTroops = 0;
                    defenderData.botTroops = attackStrength - Math.floor(defenderData.neutralTroops * 0.5);
                    conquerTile(targetTileId, 'bot');
                }
            }
            
            updateTroopDisplay(fromTileId);
            updateTroopDisplay(targetTileId);
        } else {
            // If no good target, reinforce adjacent bot tile
            const adjacentBotTiles = adjacentTiles.filter(tileId => 
                gameState.botTiles.includes(tileId)
            );
            
            if (adjacentBotTiles.length > 0) {
                const toTileId = adjacentBotTiles[Math.floor(Math.random() * adjacentBotTiles.length)];
                const troopsToMove = Math.floor(fromTroops * 0.3); // Move 30% of troops
                
                gameState.troops[fromTileId].botTroops -= troopsToMove;
                gameState.troops[toTileId].botTroops += troopsToMove;
                
                updateTroopDisplay(fromTileId);
                updateTroopDisplay(toTileId);
            }
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
        
        while (!spawnTile && attempts < 100) {
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
            // Give bot starting troops
            const startingTroops = 15 + (gameState.difficulty * 5);
            gameState.troops[spawnTile].neutralTroops = 0;
            gameState.troops[spawnTile].botTroops = startingTroops;
            conquerTile(spawnTile, 'bot');
            
            // Create bot
            const botStrength = 1.0 + (Math.random() * 0.5 * gameState.difficulty);
            gameState.bots.push({
                id: `bot-${gameState.botCount + i}`,
                strength: botStrength,
                intelligence: 1 + (Math.random() * 0.5 * gameState.difficulty),
                aggression: 0.3 + (Math.random() * 0.4)
            });
            
            addLog(`New bot spawned with ${startingTroops} troops!`);
        }
    }
    
    gameState.botCount = gameState.bots.length;
    gameState.maxBots = Math.min(10, 3 + Math.floor(gameState.gameTime / 60));
}

// Process ongoing battles (for border tiles)
function processBattles() {
    // Check border tiles for potential battles
    const borderTiles = [];
    
    gameState.playerTiles.forEach(playerTileId => {
        const adjacent = getAdjacentTiles(playerTileId);
        adjacent.forEach(adjTileId => {
            if (gameState.botTiles.includes(adjTileId) || 
                (gameState.neutralTiles.includes(adjTileId) && 
                 gameState.troops[adjTileId].neutralTroops > 0)) {
                borderTiles.push({playerTile: playerTileId, enemyTile: adjTileId});
            }
        });
    });
    
    // Process a few random battles each tick
    const battlesToProcess = Math.min(2, borderTiles.length);
    for (let i = 0; i < battlesToProcess; i++) {
        const battle = borderTiles[Math.floor(Math.random() * borderTiles.length)];
        const playerTroops = gameState.troops[battle.playerTile].playerTroops;
        const enemyTroops = gameState.botTiles.includes(battle.enemyTile) ? 
            gameState.troops[battle.enemyTile].botTroops : 
            gameState.troops[battle.enemyTile].neutralTroops;
        
        // Small skirmish losses
        const playerLoss = Math.floor(playerTroops * 0.005); // 0.5% loss
        const enemyLoss = Math.floor(enemyTroops * 0.005); // 0.5% loss
        
        gameState.troops[battle.playerTile].playerTroops -= playerLoss;
        
        if (gameState.botTiles.includes(battle.enemyTile)) {
            gameState.troops[battle.enemyTile].botTroops -= enemyLoss;
            if (gameState.troops[battle.enemyTile].botTroops < 0) {
                gameState.troops[battle.enemyTile].botTroops = 0;
            }
        } else {
            gameState.troops[battle.enemyTile].neutralTroops -= enemyLoss;
            if (gameState.troops[battle.enemyTile].neutralTroops < 0) {
                gameState.troops[battle.enemyTile].neutralTroops = 0;
            }
        }
        
        updateTroopDisplay(battle.playerTile);
        updateTroopDisplay(battle.enemyTile);
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
    
    // For Domination: win by controlling 60% of the board
    if (gameState.mode === 'domination') {
        const totalTiles = gameState.gridSize * gameState.gridSize;
        const playerPercentage = gameState.playerTiles.length / totalTiles;
        
        if (playerPercentage > 0.6) {
            endGame(true);
        }
    }
    
    // For 1v1: lose if bot controls 60% of the board
    if (gameState.mode === '1v1') {
        const totalTiles = gameState.gridSize * gameState.gridSize;
        const botPercentage = gameState.botTiles.length / totalTiles;
        
        if (botPercentage > 0.6) {
            endGame(false);
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
    const timeBonus = Math.floor(gameState.gameTime * 2);
    const tileBonus = gameState.playerTiles.length * 100;
    const troopBonus = Math.floor(totalPlayerTroops() * 0.5);
    const botBonus = gameState.botsDefeated * 500;
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
        document.getElementById('gameOverTitle').textContent = 'Victory!';
        document.getElementById('gameOverMessage').textContent = 'You dominated the battlefield!';
        addLog("Congratulations! You achieved victory!");
    } else {
        document.getElementById('gameOverTitle').textContent = 'Defeat!';
        document.getElementById('gameOverMessage').textContent = 'Better luck next time!';
        addLog("Game over! Your forces have been defeated.");
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
    
    document.getElementById('gameOverModal').style.display = 'block';
}

// Helper Functions
function isAdjacent(tileId1, tileId2) {
    const [row1, col1] = tileId1.split('-').map(Number);
    const [row2, col2] = tileId2.split('-').map(Number);
    
    return (Math.abs(row1 - row2) === 1 && col1 === col2) ||
           (Math.abs(col1 - col2) === 1 && row1 === row2);
}

function getAdjacentTiles(tileId) {
    const [row, col] = tileId.split('-').map(Number);
    const adjacent = [];
    
    if (row > 0) adjacent.push(`${row-1}-${col}`);
    if (row < gameState.gridSize - 1) adjacent.push(`${row+1}-${col}`);
    if (col > 0) adjacent.push(`${row}-${col-1}`);
    if (col < gameState.gridSize - 1) adjacent.push(`${row}-${col+1}`);
    
    return adjacent;
}

function isAdjacentToPlayer(tileId) {
    const adjacent = getAdjacentTiles(tileId);
    return adjacent.some(adjTileId => gameState.playerTiles.includes(adjTileId));
}

function updateTroopDisplay(tileId) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return;
    
    const troopData = gameState.troops[tileId];
    let troopCount = 0;
    let displayText = '';
    
    if (troopData.owner === 'player') {
        troopCount = Math.floor(troopData.playerTroops);
        displayText = `P: ${troopCount}`;
    } else if (troopData.owner === 'bot') {
        troopCount = Math.floor(troopData.botTroops);
        displayText = `B: ${troopCount}`;
    } else {
        troopCount = Math.floor(troopData.neutralTroops);
        displayText = `N: ${troopCount}`;
    }
    
    const troopCountElement = tile.querySelector('.troop-count');
    const troopValueElement = tile.querySelector('.troop-value');
    
    if (troopCountElement) troopCountElement.textContent = troopCount;
    if (troopValueElement) troopValueElement.textContent = troopCount;
    
    // Update tile color intensity based on troop count
    const intensity = Math.min(1, troopCount / 50);
    tile.style.opacity = 0.7 + (intensity * 0.3);
}

function totalPlayerTroops() {
    return gameState.playerTiles.reduce((total, tileId) => {
        return total + Math.floor(gameState.troops[tileId].playerTroops);
    }, 0);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getDifficultyText(difficulty) {
    switch(difficulty) {
        case 1: return "Easy";
        case 2: return "Normal";
        case 3: return "Hard";
        case 4: return "Very Hard";
        case 5: return "Extreme";
        default: return "Unknown";
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
        difficulty: gameState.difficulty
    };
    
    // Add to all leaderboards
    leaderboards.daily.push(entry);
    leaderboards.weekly.push(entry);
    leaderboards.alltime.push(entry);
    
    // Sort and keep top 10
    ['daily', 'weekly', 'alltime'].forEach(period => {
        leaderboards[period].sort((a, b) => b.score - a.score);
        leaderboards[period] = leaderboards[period].slice(0, 10);
    });
    
    localStorage.setItem('dominationLeaderboards', JSON.stringify(leaderboards));
}

// Update UI
function updateUI() {
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
        troopRateElement.textContent = `${gameState.troopGenerationRate}/sec`;
    }
    
    // Update game status text
    if (gameStatusTextElement) {
        gameStatusTextElement.textContent = gameState.isPaused ? "Paused" : "Playing";
        gameStatusTextElement.style.color = gameState.isPaused ? "#ffa500" : "#00d2ff";
    }
    
    // Update difficulty display
    if (difficultyLevelElement) {
        difficultyLevelElement.textContent = getDifficultyText(gameState.difficulty);
    }
    
    // Update difficulty indicator
    updateDifficultyIndicator();
}

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
    
    // Keep only last 10 messages
    while (gameLog.children.length > 10) {
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
        case '1v1': return '1v1 Challenge';
        default: return 'Unknown';
    }
}

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
        difficulty: 1,
        selectedTile: null,
        gameLog: [],
        gridSize: gameState.mode === '1v1' ? 6 : 8,
        botsDefeated: 0,
        gameTime: 0,
        lastUpdate: Date.now(),
        gameLoop: null,
        isPaused: false,
        troopGenerationRate: 0.5,
        maxTroopsPerTile: 50,
        attackMultiplier: 1.2,
        defenseBonus: 1.1,
        troops: {},
        lastTroopUpdate: Date.now()
    };
    
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

function endPlayerTurn() {
    // This function is kept for compatibility but not used in real-time mode
    addLog("Turn-based mode is not active in this version.");
}

// Close modal when clicking outside
window.onclick = function(event) {
    const instructionsModal = document.getElementById('instructionsModal');
    const gameOverModal = document.getElementById('gameOverModal');
    
    if (event.target === instructionsModal) {
        closeInstructions();
    }
    if (event.target === gameOverModal) {
        gameOverModal.style.display = 'none';
    }
}

// Initialize game when page loads
window.onload = initGame;
