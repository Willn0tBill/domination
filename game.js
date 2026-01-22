// Game State Variables
let gameState = {
    active: false,
    mode: 'domination',
    playerName: 'Commander',
    playerTiles: [],
    botTiles: [],
    neutralTiles: [],
    currentTurn: 'player',
    turnNumber: 1,
    score: 0,
    bots: [],
    botCount: 0,
    maxBots: 5,
    botSpawnRate: 5, // Turns between bot spawns
    lastBotSpawn: 0,
    difficulty: 1,
    selectedTile: null,
    gameLog: [],
    gameGridSize: 8
};

// Leaderboard Data
let leaderboards = {
    daily: [],
    weekly: [],
    alltime: []
};

// DOM Elements
const playerNameInput = document.getElementById('playerName');
const modeButtons = document.querySelectorAll('.mode-btn');
const startGameBtn = document.getElementById('startGame');
const endGameBtn = document.getElementById('endGame');
const howToPlayBtn = document.getElementById('howToPlayBtn');
const tilesContainer = document.getElementById('tilesContainer');
const gameStatus = document.getElementById('gameStatus');
const gameLog = document.getElementById('gameLog');
const tabButtons = document.querySelectorAll('.tab-btn');
const leaderboardBody = document.getElementById('leaderboardBody');
const howToPlayModal = document.getElementById('howToPlayModal');
const closeModal = document.querySelector('.close-modal');

// Stats Elements
const playerTilesSpan = document.getElementById('playerTiles');
const botCountSpan = document.getElementById('botCount');
const currentTurnSpan = document.getElementById('currentTurn');
const currentScoreSpan = document.getElementById('currentScore');
const difficultyLevelSpan = document.getElementById('difficultyLevel');

// Initialize the game
function initGame() {
    loadLeaderboards();
    createTiles();
    updateUI();
    setupEventListeners();
}

// Create the game tiles
function createTiles() {
    tilesContainer.innerHTML = '';
    
    // Determine grid size based on mode
    let gridSize = 8; // Default 8x8 grid
    if (gameState.mode === '1v1') gridSize = 6;
    gameState.gameGridSize = gridSize;
    
    // Reset tile arrays
    gameState.neutralTiles = [];
    
    // Create tiles
    for (let row = 0; row < gridSize; row++) {
        for (let col = 0; col < gridSize; col++) {
            const tile = document.createElement('div');
            tile.className = 'tile neutral';
            tile.dataset.row = row;
            tile.dataset.col = col;
            tile.dataset.id = `${row}-${col}`;
            
            // Add tile icon
            const icon = document.createElement('div');
            icon.className = 'tile-icon';
            icon.textContent = '●';
            tile.appendChild(icon);
            
            // Add strength indicator (initially hidden)
            const strength = document.createElement('div');
            strength.className = 'tile-strength';
            strength.textContent = '1.0';
            tile.appendChild(strength);
            
            tilesContainer.appendChild(tile);
            
            // Add to neutral tiles
            gameState.neutralTiles.push(`${row}-${col}`);
        }
    }
    
    // Update grid template based on size
    tilesContainer.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    tilesContainer.style.gridTemplateRows = `repeat(${gridSize}, 1fr)`;
}

// Setup event listeners
function setupEventListeners() {
    // Player name input
    playerNameInput.addEventListener('input', () => {
        gameState.playerName = playerNameInput.value || 'Commander';
    });
    
    // Mode selection
    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            modeButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            gameState.mode = button.dataset.mode;
            resetGameState();
            createTiles();
            updateUI();
            
            // Update game status
            addLog(`Mode changed to: ${getModeName(gameState.mode)}`);
        });
    });
    
    // Start game button
    startGameBtn.addEventListener('click', startGame);
    
    // End game button
    endGameBtn.addEventListener('click', endGame);
    
    // How to Play button
    howToPlayBtn.addEventListener('click', () => {
        howToPlayModal.style.display = 'block';
    });
    
    // Close modal
    closeModal.addEventListener('click', () => {
        howToPlayModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === howToPlayModal) {
            howToPlayModal.style.display = 'none';
        }
    });
    
    // Leaderboard tabs
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            updateLeaderboard(button.dataset.period);
        });
    });
    
    // Tile click event (delegated)
    tilesContainer.addEventListener('click', handleTileClick);
}

// Handle tile clicks
function handleTileClick(e) {
    if (!gameState.active || gameState.currentTurn !== 'player') return;
    
    const tile = e.target.closest('.tile');
    if (!tile) return;
    
    const tileId = tile.dataset.id;
    
    // If player already owns this tile, select it for attacking
    if (gameState.playerTiles.includes(tileId)) {
        selectTile(tileId);
        return;
    }
    
    // Check if tile is adjacent to player tiles
    const isAdjacent = checkAdjacent(tileId, gameState.playerTiles);
    
    if (isAdjacent) {
        // If neutral tile, conquer it
        if (gameState.neutralTiles.includes(tileId)) {
            conquerTile(tileId, 'player');
            addLog(`${gameState.playerName} conquered a new tile!`);
            endPlayerTurn();
        } 
        // If bot tile, attack it
        else if (gameState.botTiles.includes(tileId)) {
            attackTile(tileId);
        }
    } else {
        addLog("Tile is not adjacent to your territory!");
    }
}

// Select a tile for attacking
function selectTile(tileId) {
    // Deselect previous tile
    if (gameState.selectedTile) {
        const prevTile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
        if (prevTile) prevTile.style.boxShadow = '';
    }
    
    // Select new tile
    gameState.selectedTile = tileId;
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    tile.style.boxShadow = '0 0 20px gold';
    
    addLog(`Selected tile ${tileId} for attack`);
}

// Attack a tile
function attackTile(tileId) {
    if (!gameState.selectedTile) {
        addLog("Select one of your tiles first to attack from!");
        return;
    }
    
    const attackingTile = gameState.selectedTile;
    const attackingStrength = getTileStrength(attackingTile);
    const defendingStrength = getTileStrength(tileId);
    
    // Calculate battle outcome
    const attackRoll = (Math.random() * 0.5 + 0.75) * attackingStrength;
    const defenseRoll = (Math.random() * 0.5 + 0.75) * defendingStrength;
    
    if (attackRoll > defenseRoll) {
        // Player wins the battle
        conquerTile(tileId, 'player');
        addLog(`${gameState.playerName} captured a bot tile!`);
        endPlayerTurn();
    } else {
        // Bot defends successfully
        reduceTileStrength(attackingTile, 0.3);
        addLog(`Attack failed! Your tile at ${attackingTile} was weakened.`);
        endPlayerTurn();
    }
    
    // Deselect tile after attack
    const selectedTile = document.querySelector(`[data-id="${gameState.selectedTile}"]`);
    if (selectedTile) selectedTile.style.boxShadow = '';
    gameState.selectedTile = null;
}

// Conquer a tile
function conquerTile(tileId, conqueror) {
    // Remove from previous owner
    const neutralIndex = gameState.neutralTiles.indexOf(tileId);
    if (neutralIndex !== -1) gameState.neutralTiles.splice(neutralIndex, 1);
    
    const playerIndex = gameState.playerTiles.indexOf(tileId);
    if (playerIndex !== -1) gameState.playerTiles.splice(playerIndex, 1);
    
    const botIndex = gameState.botTiles.indexOf(tileId);
    if (botIndex !== -1) gameState.botTiles.splice(botIndex, 1);
    
    // Add to new owner
    if (conqueror === 'player') {
        gameState.playerTiles.push(tileId);
        updateTileAppearance(tileId, 'player');
        
        // Update score
        gameState.score += Math.floor(10 * gameState.difficulty);
        
        // Increase tile strength for newly conquered tiles
        setTileStrength(tileId, 1.0 + (gameState.difficulty * 0.1));
    } else {
        gameState.botTiles.push(tileId);
        updateTileAppearance(tileId, 'bot');
        
        // Increase bot tile strength based on difficulty
        setTileStrength(tileId, 0.8 + (gameState.difficulty * 0.2));
    }
    
    updateUI();
}

// Check if a tile is adjacent to any tile in a list
function checkAdjacent(tileId, tileList) {
    const [row, col] = tileId.split('-').map(Number);
    
    // Check all four directions
    const neighbors = [
        `${row-1}-${col}`, // Up
        `${row+1}-${col}`, // Down
        `${row}-${col-1}`, // Left
        `${row}-${col+1}`  // Right
    ];
    
    for (const neighbor of neighbors) {
        if (tileList.includes(neighbor)) {
            return true;
        }
    }
    
    return false;
}

// Get tile strength
function getTileStrength(tileId) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return 1;
    
    const strengthElement = tile.querySelector('.tile-strength');
    return parseFloat(strengthElement.textContent) || 1.0;
}

// Set tile strength
function setTileStrength(tileId, strength) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return;
    
    const strengthElement = tile.querySelector('.tile-strength');
    strengthElement.textContent = strength.toFixed(1);
}

// Reduce tile strength
function reduceTileStrength(tileId, amount) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return;
    
    const strengthElement = tile.querySelector('.tile-strength');
    let strength = parseFloat(strengthElement.textContent) || 1.0;
    strength = Math.max(0.5, strength - amount);
    strengthElement.textContent = strength.toFixed(1);
}

// Update tile appearance
function updateTileAppearance(tileId, owner) {
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    if (!tile) return;
    
    // Remove previous owner classes
    tile.classList.remove('player', 'bot', 'neutral');
    
    // Add new owner class
    tile.classList.add(owner);
    
    // Update icon
    const icon = tile.querySelector('.tile-icon');
    if (owner === 'player') {
        icon.textContent = '★';
        icon.style.color = '#00d2ff';
    } else if (owner === 'bot') {
        icon.textContent = '☠';
        icon.style.color = '#ff416c';
    } else {
        icon.textContent = '●';
        icon.style.color = '#a0c8ff';
    }
    
    // Update strength display
    const strengthElement = tile.querySelector('.tile-strength');
    if (owner === 'neutral') {
        strengthElement.style.display = 'none';
    } else {
        strengthElement.style.display = 'block';
    }
}

// Start the game
function startGame() {
    if (gameState.active) return;
    
    resetGameState();
    gameState.active = true;
    gameState.playerName = playerNameInput.value || 'Commander';
    
    // Set initial player tile (center of grid)
    const gridSize = gameState.gameGridSize;
    const centerRow = Math.floor(gridSize/2);
    const centerCol = Math.floor(gridSize/2);
    const centerTile = `${centerRow}-${centerCol}`;
    
    // Conquer initial tiles based on mode
    if (gameState.mode === 'domination') {
        // Player starts with a cluster of 3 tiles
        conquerTile(centerTile, 'player');
        conquerTile(`${centerRow-1}-${centerCol}`, 'player');
        conquerTile(`${centerRow}-${centerCol-1}`, 'player');
        
        addLog(`${gameState.playerName} started a Domination game!`);
        addLog("Bots will spawn periodically. Survive as long as possible!");
        
        // Spawn initial bots
        spawnBots(2);
    } else if (gameState.mode === 'bots') {
        // Player starts with a cluster
        conquerTile(centerTile, 'player');
        conquerTile(`${centerRow-1}-${centerCol}`, 'player');
        
        addLog(`${gameState.playerName} started a Bots Battle!`);
        addLog("Defeat all bots to win!");
        
        // Spawn more initial bots
        spawnBots(4);
    } else if (gameState.mode === '1v1') {
        // Player starts on one side, bot on the other
        const playerTile = `${Math.floor(gridSize/2)}-1`;
        const botTile = `${Math.floor(gridSize/2)}-${gridSize-2}`;
        
        conquerTile(playerTile, 'player');
        conquerTile(botTile, 'bot');
        
        // Create a strong 1v1 bot
        gameState.bots.push({
            id: 'elite',
            strength: 2.5,
            intelligence: 3
        });
        gameState.botCount = 1;
        
        addLog(`${gameState.playerName} started a 1v1 Challenge against an Elite Bot!`);
        addLog("This bot is stronger and smarter than regular bots!");
    }
    
    updateUI();
    startGameBtn.disabled = true;
    endGameBtn.disabled = false;
    gameStatus.textContent = "Your turn! Conquer adjacent tiles or attack bot tiles.";
    gameStatus.className = "game-status player-turn";
}

// End the game
function endGame() {
    if (!gameState.active) return;
    
    // Calculate final score
    const turnBonus = gameState.turnNumber * 5;
    const tileBonus = gameState.playerTiles.length * 20;
    const difficultyMultiplier = gameState.difficulty;
    const finalScore = Math.floor((gameState.score + turnBonus + tileBonus) * difficultyMultiplier);
    
    // Save to leaderboard if in domination mode
    if (gameState.mode === 'domination') {
        saveToLeaderboard(gameState.playerName, finalScore, gameState.mode);
        updateLeaderboard('daily');
    }
    
    addLog(`Game ended! Final score: ${finalScore}`);
    gameStatus.textContent = `Game Over! Final Score: ${finalScore}`;
    gameStatus.className = "game-status";
    
    // Highlight if it's a high score
    if (finalScore > 1000) {
        addLog("Impressive score! Consider yourself a Domination master!");
    }
    
    gameState.active = false;
    startGameBtn.disabled = false;
    endGameBtn.disabled = true;
}

// End player turn and start bot turn
function endPlayerTurn() {
    gameState.currentTurn = 'bot';
    gameState.turnNumber++;
    
    updateUI();
    gameStatus.textContent = "Bot's turn...";
    gameStatus.className = "game-status bot-turn";
    
    // Bot actions after a short delay
    setTimeout(executeBotTurn, 1000);
}

// Execute bot turn
function executeBotTurn() {
    if (!gameState.active || gameState.currentTurn !== 'bot') return;
    
    // In domination mode, spawn bots periodically
    if (gameState.mode === 'domination' && gameState.turnNumber - gameState.lastBotSpawn >= gameState.botSpawnRate) {
        spawnBots(1);
        gameState.lastBotSpawn = gameState.turnNumber;
        addLog("A new bot has entered the battlefield!");
    }
    
    // Each bot takes an action
    let botActionsTaken = 0;
    for (let i = 0; i < gameState.bots.length; i++) {
        const bot = gameState.bots[i];
        
        // Simple bot AI: try to conquer adjacent neutral tiles, or attack player tiles
        const botTiles = [...gameState.botTiles];
        
        // Find adjacent neutral or player tiles
        let targetTile = null;
        let targetType = null;
        
        for (const botTile of botTiles) {
            const [row, col] = botTile.split('-').map(Number);
            const neighbors = [
                `${row-1}-${col}`, `${row+1}-${col}`,
                `${row}-${col-1}`, `${row}-${col+1}`
            ];
            
            for (const neighbor of neighbors) {
                // Check if neighbor exists
                const tile = document.querySelector(`[data-id="${neighbor}"]`);
                if (!tile) continue;
                
                if (gameState.neutralTiles.includes(neighbor)) {
                    targetTile = neighbor;
                    targetType = 'neutral';
                    break;
                } else if (gameState.playerTiles.includes(neighbor) && Math.random() > 0.3) {
                    // Bots are more likely to attack in harder difficulties
                    targetTile = neighbor;
                    targetType = 'player';
                    break;
                }
            }
            
            if (targetTile) break;
        }
        
        // Take action
        if (targetTile) {
            if (targetType === 'neutral') {
                conquerTile(targetTile, 'bot');
                botActionsTaken++;
            } else if (targetType === 'player') {
                // Bot attacks player tile
                const attackingTile = findAdjacentBotTile(targetTile);
                if (attackingTile) {
                    const attackStrength = getTileStrength(attackingTile) * bot.strength;
                    const defenseStrength = getTileStrength(targetTile);
                    
                    // Calculate attack with bot intelligence factor
                    const attackRoll = (Math.random() * 0.4 + 0.8) * attackStrength;
                    const defenseRoll = (Math.random() * 0.4 + 0.8) * defenseStrength;
                    
                    if (attackRoll > defenseRoll * (1.2 - (bot.intelligence * 0.1))) {
                        conquerTile(targetTile, 'bot');
                        addLog("Bot captured one of your tiles!");
                        botActionsTaken++;
                    } else {
                        reduceTileStrength(attackingTile, 0.2);
                        addLog("Bot attacked but failed to capture your tile!");
                        botActionsTaken++;
                    }
                }
            }
        }
        
        // Limit actions per turn
        if (botActionsTaken >= 2) break;
    }
    
    // Increase difficulty over time
    if (gameState.turnNumber % 10 === 0 && gameState.difficulty < 5) {
        gameState.difficulty++;
        addLog(`Difficulty increased to level ${gameState.difficulty}!`);
        
        // Strengthen all bot tiles
        gameState.botTiles.forEach(tileId => {
            const currentStrength = getTileStrength(tileId);
            setTileStrength(tileId, currentStrength * 1.1);
        });
    }
    
    // Check win/lose conditions
    checkGameEnd();
    
    // Switch back to player turn if game is still active
    if (gameState.active) {
        gameState.currentTurn = 'player';
        updateUI();
        gameStatus.textContent = "Your turn! Conquer adjacent tiles or attack bot tiles.";
        gameStatus.className = "game-status player-turn";
    }
}

// Find a bot tile adjacent to a target
function findAdjacentBotTile(targetTileId) {
    const [row, col] = targetTileId.split('-').map(Number);
    const neighbors = [
        `${row-1}-${col}`, `${row+1}-${col}`,
        `${row}-${col-1}`, `${row}-${col+1}`
    ];
    
    for (const neighbor of neighbors) {
        if (gameState.botTiles.includes(neighbor)) {
            return neighbor;
        }
    }
    
    return null;
}

// Spawn new bots
function spawnBots(count) {
    const gridSize = gameState.gameGridSize;
    
    for (let i = 0; i < count; i++) {
        // Check if we've reached max bots
        if (gameState.bots.length >= gameState.maxBots) {
            break;
        }
        
        // Find a neutral tile away from the player
        let spawnTile = null;
        let attempts = 0;
        
        while (!spawnTile && attempts < 100) {
            const row = Math.floor(Math.random() * gridSize);
            const col = Math.floor(Math.random() * gridSize);
            const tileId = `${row}-${col}`;
            
            // Check if tile is neutral and not adjacent to player
            if (gameState.neutralTiles.includes(tileId) && !checkAdjacent(tileId, gameState.playerTiles)) {
                spawnTile = tileId;
            }
            
            attempts++;
        }
        
        if (spawnTile) {
            conquerTile(spawnTile, 'bot');
            
            // Create bot with random strength based on difficulty
            const botStrength = 0.8 + (Math.random() * 0.4 * gameState.difficulty);
            const botIntelligence = 1 + (Math.random() * 0.5 * gameState.difficulty);
            
            gameState.bots.push({
                id: `bot-${gameState.botCount + i}`,
                strength: botStrength,
                intelligence: botIntelligence
            });
            
            // Set bot tile strength
            setTileStrength(spawnTile, botStrength);
        }
    }
    
    gameState.botCount = gameState.bots.length;
    gameState.maxBots = Math.min(10, 3 + Math.floor(gameState.turnNumber / 5));
}

// Check if game should end
function checkGameEnd() {
    // Player wins if no bots left
    if (gameState.botTiles.length === 0 && gameState.bots.length === 0) {
        gameStatus.textContent = `Victory! You've dominated the battlefield! Final Score: ${gameState.score}`;
        gameStatus.className = "game-status player-turn";
        endGame();
        return;
    }
    
    // Player loses if no tiles left
    if (gameState.playerTiles.length === 0) {
        gameStatus.textContent = "Defeat! You've lost all your territory!";
        gameStatus.className = "game-status bot-turn";
        endGame();
        return;
    }
    
    // In 1v1 mode, check if player or bot controls most of the board
    if (gameState.mode === '1v1') {
        const totalTiles = gameState.gameGridSize * gameState.gameGridSize;
        const playerPercentage = gameState.playerTiles.length / totalTiles;
        const botPercentage = gameState.botTiles.length / totalTiles;
        
        if (playerPercentage > 0.75) {
            const victoryScore = Math.floor(gameState.score * 2); // Double score for 1v1 victory
            gameStatus.textContent = `Victory! You've dominated the 1v1 challenge! Final Score: ${victoryScore}`;
            gameStatus.className = "game-status player-turn";
            gameState.score = victoryScore;
            endGame();
        } else if (botPercentage > 0.75) {
            gameStatus.textContent = "Defeat! The elite bot has dominated you!";
            gameStatus.className = "game-status bot-turn";
            endGame();
        }
    }
    
    // In bots mode, check if player is the last one standing
    if (gameState.mode === 'bots' && gameState.bots.length === 0) {
        const victoryScore = Math.floor(gameState.score * 1.5); // 1.5x score for bots victory
        gameStatus.textContent = `Victory! You defeated all bots! Final Score: ${victoryScore}`;
        gameStatus.className = "game-status player-turn";
        gameState.score = victoryScore;
        endGame();
    }
}

// Reset game state
function resetGameState() {
    gameState.active = false;
    gameState.playerTiles = [];
    gameState.botTiles = [];
    gameState.neutralTiles = [];
    gameState.currentTurn = 'player';
    gameState.turnNumber = 1;
    gameState.score = 0;
    gameState.bots = [];
    gameState.botCount = 0;
    gameState.maxBots = 5;
    gameState.lastBotSpawn = 0;
    gameState.difficulty = 1;
    gameState.selectedTile = null;
    gameState.gameLog = ["Game reset. Ready to start!"];
    
    // Reset all tiles to neutral
    document.querySelectorAll('.tile').forEach(tile => {
        updateTileAppearance(tile.dataset.id, 'neutral');
    });
}

// Update UI elements
function updateUI() {
    // Update stats
    playerTilesSpan.textContent = gameState.playerTiles.length;
    botCountSpan.textContent = gameState.botCount;
    currentTurnSpan.textContent = gameState.turnNumber;
    currentScoreSpan.textContent = gameState.score;
    
    // Update difficulty display
    let difficultyText = "Easy";
    if (gameState.difficulty >= 4) difficultyText = "Extreme";
    else if (gameState.difficulty >= 3) difficultyText = "Hard";
    else if (gameState.difficulty >= 2) difficultyText = "Normal";
    
    difficultyLevelSpan.textContent = difficultyText;
    
    // Update game log
    updateGameLog();
}

// Add a message to the game log
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    gameState.gameLog.push(`[${timestamp}] ${message}`);
    
    // Keep only last 10 messages
    if (gameState.gameLog.length > 10) {
        gameState.gameLog.shift();
    }
    
    updateGameLog();
}

// Update the game log display
function updateGameLog() {
    gameLog.innerHTML = '';
    gameState.gameLog.forEach(message => {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry';
        logEntry.textContent = message;
        gameLog.appendChild(logEntry);
    });
    
    // Scroll to bottom
    gameLog.scrollTop = gameLog.scrollHeight;
}

// Get mode name
function getModeName(mode) {
    switch(mode) {
        case 'domination': return 'Domination';
        case 'bots': return 'Bots Battle';
        case '1v1': return '1v1 Challenge';
        default: return 'Unknown Mode';
    }
}

// Save score to leaderboard
function saveToLeaderboard(playerName, score, mode) {
    const entry = {
        player: playerName,
        score: score,
        mode: getModeName(mode),
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now()
    };
    
    // Add to all leaderboards
    leaderboards.daily.push({...entry});
    leaderboards.weekly.push({...entry});
    leaderboards.alltime.push({...entry});
    
    // Sort each leaderboard by score (descending)
    leaderboards.daily.sort((a, b) => b.score - a.score);
    leaderboards.weekly.sort((a, b) => b.score - a.score);
    leaderboards.alltime.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    leaderboards.daily = leaderboards.daily.slice(0, 10);
    leaderboards.weekly = leaderboards.weekly.slice(0, 10);
    leaderboards.alltime = leaderboards.alltime.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('dominationLeaderboards', JSON.stringify(leaderboards));
}

// Load leaderboards from localStorage
function loadLeaderboards() {
    const saved = localStorage.getItem('dominationLeaderboards');
    if (saved) {
        leaderboards = JSON.parse(saved);
        
        // Filter out old daily scores (older than 1 day)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        leaderboards.daily = leaderboards.daily.filter(entry => entry.timestamp > oneDayAgo);
        
        // Filter out old weekly scores (older than 7 days)
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        leaderboards.weekly = leaderboards.weekly.filter(entry => entry.timestamp > oneWeekAgo);
    } else {
        // Create sample data for demonstration
        createSampleLeaderboards();
    }
    
    // Show daily leaderboard by default
    updateLeaderboard('daily');
}

// Create sample leaderboard data for first-time users
function createSampleLeaderboards() {
    const samplePlayers = [
        "Alex", "Jordan", "Taylor", "Morgan", "Casey", 
        "Riley", "Quinn", "Dakota", "Skyler", "Phoenix"
    ];
    
    const sampleModes = ["Domination", "Bots Battle", "1v1 Challenge"];
    
    // Generate sample data
    for (let i = 0; i < 10; i++) {
        const score = Math.floor(Math.random() * 5000) + 1000;
        const mode = sampleModes[Math.floor(Math.random() * sampleModes.length)];
        const daysAgo = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        const entry = {
            player: samplePlayers[i],
            score: score,
            mode: mode,
            date: date.toISOString().split('T')[0],
            timestamp: date.getTime()
        };
        
        leaderboards.daily.push({...entry});
        leaderboards.weekly.push({...entry});
        leaderboards.alltime.push({...entry});
    }
    
    // Sort by score
    leaderboards.daily.sort((a, b) => b.score - a.score);
    leaderboards.weekly.sort((a, b) => b.score - a.score);
    leaderboards.alltime.sort((a, b) => b.score - a.score);
}

// Update leaderboard display
function updateLeaderboard(period) {
    const data = leaderboards[period];
    leaderboardBody.innerHTML = '';
    
    if (data.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.textContent = `No ${period} scores yet. Play a game to appear here!`;
        cell.style.textAlign = 'center';
        cell.style.padding = '30px';
        row.appendChild(cell);
        leaderboardBody.appendChild(row);
        return;
    }
    
    data.forEach((entry, index) => {
        const row = document.createElement('tr');
        
        // Add rank class for top 3
        let rankClass = '';
        if (index === 0) rankClass = 'rank-1';
        else if (index === 1) rankClass = 'rank-2';
        else if (index === 2) rankClass = 'rank-3';
        
        row.innerHTML = `
            <td class="${rankClass}">${index + 1}</td>
            <td class="${rankClass}">${entry.player}</td>
            <td>${entry.score}</td>
            <td>${entry.mode}</td>
            <td>${entry.date}</td>
        `;
        
        leaderboardBody.appendChild(row);
    });
}

// Initialize the game when page loads
window.addEventListener('DOMContentLoaded', initGame);
