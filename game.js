// Game State
let gameState = {
    active: true,
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
    botSpawnRate: 5,
    lastBotSpawn: 0,
    difficulty: 1,
    selectedTile: null,
    gameLog: [],
    gridSize: 8,
    botsDefeated: 0
};

// DOM Elements
const tilesContainer = document.getElementById('tilesContainer');
const gameStatus = document.getElementById('gameStatus');
const gameLog = document.getElementById('gameLog');
const playerTilesElement = document.getElementById('playerTiles');
const currentScoreElement = document.getElementById('currentScore');
const currentTurnElement = document.getElementById('currentTurn');
const botCountElement = document.getElementById('botCount');
const difficultyLevelElement = document.getElementById('difficultyLevel');
const gameStatusTextElement = document.getElementById('gameStatusText');
const gameModeDisplay = document.getElementById('gameModeDisplay');
const currentPlayerNameElement = document.getElementById('currentPlayerName');
const modeInfoElement = document.getElementById('modeInfo');
const endTurnBtn = document.getElementById('endTurnBtn');

// Initialize Game
function initGame() {
    // Load player name and mode
    gameState.playerName = localStorage.getItem('dominationPlayerName') || 'Commander';
    gameState.mode = localStorage.getItem('dominationGameMode') || 'domination';
    
    // Update UI
    currentPlayerNameElement.textContent = gameState.playerName;
    gameModeDisplay.textContent = getModeName(gameState.mode);
    modeInfoElement.textContent = getModeName(gameState.mode);
    
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
    addLog(`Welcome, ${gameState.playerName}! Game started in ${getModeName(gameState.mode)} mode.`);
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
    
    for (let row = 0; row < gameState.gridSize; row++) {
        for (let col = 0; col < gameState.gridSize; col++) {
            const tileId = `${row}-${col}`;
            const tile = document.createElement('div');
            tile.className = 'tile neutral';
            tile.dataset.id = tileId;
            
            const icon = document.createElement('div');
            icon.className = 'tile-icon';
            icon.textContent = '●';
            tile.appendChild(icon);
            
            const strength = document.createElement('div');
            strength.className = 'tile-strength';
            strength.textContent = '1.0';
            tile.appendChild(strength);
            
            tile.addEventListener('click', () => handleTileClick(tileId));
            tilesContainer.appendChild(tile);
            
            gameState.neutralTiles.push(tileId);
        }
    }
}

// Start Domination mode
function startDomination() {
    // Player starts in the center
    const centerRow = Math.floor(gameState.gridSize / 2);
    const centerCol = Math.floor(gameState.gridSize / 2);
    const centerTile = `${centerRow}-${centerCol}`;
    
    conquerTile(centerTile, 'player');
    addLog("Domination mode: Bots will spawn periodically. Survive as long as possible!");
    
    // Spawn initial bots
    spawnBots(2);
}

// Start Bots Battle mode
function startBotsBattle() {
    // Player starts in a corner
    const playerTile = '1-1';
    conquerTile(playerTile, 'player');
    addLog("Bots Battle mode: Defeat all bots to win!");
    
    // Spawn bots in opposite corner
    spawnBots(4);
}

// Start 1v1 mode
function start1v1() {
    // Player starts on left side
    const playerRow = Math.floor(gameState.gridSize / 2);
    const playerTile = `${playerRow}-1`;
    conquerTile(playerTile, 'player');
    
    // Bot starts on right side
    const botTile = `${playerRow}-${gameState.gridSize - 2}`;
    conquerTile(botTile, 'bot');
    
    // Create elite bot
    gameState.bots.push({
        id: 'elite',
        strength: 2.5,
        intelligence: 3
    });
    gameState.botCount = 1;
    
    addLog("1v1 Challenge: Face the elite bot in single combat!");
    gameState.difficulty = 3; // Harder difficulty for 1v1
}

// Handle tile click
function handleTileClick(tileId) {
    if (!gameState.active || gameState.currentTurn !== 'player') {
        return;
    }
    
    // If player owns this tile, select it
    if (gameState.playerTiles.includes(tileId)) {
        selectTile(tileId);
        return;
    }
    
    // Check if tile is adjacent to player territory
    if (isAdjacent(tileId, gameState.playerTiles)) {
        // If neutral tile, conquer it
        if (gameState.neutralTiles.includes(tileId)) {
            conquerTile(tileId, 'player');
            addLog(`Conquered tile at ${tileId}`);
            endTurnBtn.disabled = false;
        }
        // If bot tile and player has selected a tile, attack
        else if (gameState.botTiles.includes(tileId) && gameState.selectedTile) {
            attackTile(tileId);
        }
    } else {
        addLog("Cannot reach that tile. It must be adjacent to your territory.");
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
    
    addLog(`Selected tile ${tileId} for attack`);
}

// Attack a tile
function attackTile(targetTileId) {
    const attackingTile = gameState.selectedTile;
    const attackingStrength = getTileStrength(attackingTile);
    const defendingStrength = getTileStrength(targetTileId);
    
    // Calculate battle
    const attackRoll = attackingStrength * (0.7 + Math.random() * 0.6);
    const defenseRoll = defendingStrength * (0.7 + Math.random() * 0.6);
    
    if (attackRoll > defenseRoll) {
        // Player wins
        conquerTile(targetTileId, 'player');
        gameState.score += 50 * gameState.difficulty;
        addLog(`Victory! Captured bot tile at ${targetTileId}`);
        
        // Check if bot was defeated
        const botIndex = gameState.bots.findIndex(bot => 
            gameState.botTiles.length === 0
        );
        if (botIndex !== -1) {
            gameState.bots.splice(botIndex, 1);
            gameState.botsDefeated++;
        }
    } else {
        // Player loses
        reduceTileStrength(attackingTile, 0.3);
        addLog(`Attack failed! Tile at ${attackingTile} weakened.`);
    }
    
    // Deselect tile
    const selectedTile = document.querySelector(`[data-id="${attackingTile}"]`);
    selectedTile.classList.remove('selected');
    gameState.selectedTile = null;
    
    endPlayerTurn();
}

// Conquer a tile
function conquerTile(tileId, owner) {
    // Remove from current owner
    const neutralIndex = gameState.neutralTiles.indexOf(tileId);
    if (neutralIndex !== -1) gameState.neutralTiles.splice(neutralIndex, 1);
    
    const playerIndex = gameState.playerTiles.indexOf(tileId);
    if (playerIndex !== -1) gameState.playerTiles.splice(playerIndex, 1);
    
    const botIndex = gameState.botTiles.indexOf(tileId);
    if (botIndex !== -1) gameState.botTiles.splice(botIndex, 1);
    
    // Add to new owner
    const tile = document.querySelector(`[data-id="${tileId}"]`);
    tile.classList.remove('player', 'bot', 'neutral');
    tile.classList.add(owner);
    
    if (owner === 'player') {
        gameState.playerTiles.push(tileId);
        gameState.score += 10 * gameState.difficulty;
        setTileStrength(tileId, 1.0);
    } else if (owner === 'bot') {
        gameState.botTiles.push(tileId);
        setTileStrength(tileId, 0.8 + (gameState.difficulty * 0.2));
    }
    
    updateUI();
}

// Check if tile is adjacent to any tile in list
function isAdjacent(tileId, tileList) {
    const [row, col] = tileId.split('-').map(Number);
    const neighbors = [
        `${row-1}-${col}`, `${row+1}-${col}`,
        `${row}-${col-1}`, `${row}-${col+1}`
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
    if (!tile) return 1.0;
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
    const currentStrength = getTileStrength(tileId);
    setTileStrength(tileId, Math.max(0.5, currentStrength - amount));
}

// Spawn bots
function spawnBots(count) {
    for (let i = 0; i < count; i++) {
        if (gameState.bots.length >= gameState.maxBots) break;
        
        // Find neutral tile
        let spawnTile = null;
        for (let attempt = 0; attempt < 100; attempt++) {
            const row = Math.floor(Math.random() * gameState.gridSize);
            const col = Math.floor(Math.random() * gameState.gridSize);
            const tileId = `${row}-${col}`;
            
            if (gameState.neutralTiles.includes(tileId) && 
                !isAdjacent(tileId, gameState.playerTiles)) {
                spawnTile = tileId;
                break;
            }
        }
        
        if (spawnTile) {
            conquerTile(spawnTile, 'bot');
            gameState.bots.push({
                id: `bot-${gameState.botCount + i}`,
                strength: 0.8 + (Math.random() * 0.4 * gameState.difficulty),
                intelligence: 1 + (Math.random() * 0.5 * gameState.difficulty)
            });
        }
    }
    
    gameState.botCount = gameState.bots.length;
}

// End player turn
function endPlayerTurn() {
    gameState.currentTurn = 'bot';
    gameState.turnNumber++;
    endTurnBtn.disabled = true;
    
    updateUI();
    gameStatus.textContent = "Bot's turn...";
    gameStatus.className = "game-status bot-turn";
    gameStatusTextElement.textContent = "Bot's Turn";
    
    setTimeout(executeBotTurn, 1000);
}

// Execute bot turn
function executeBotTurn() {
    if (!gameState.active || gameState.currentTurn !== 'bot') return;
    
    // Spawn new bots in domination mode
    if (gameState.mode === 'domination' && 
        gameState.turnNumber - gameState.lastBotSpawn >= gameState.botSpawnRate) {
        spawnBots(1);
        gameState.lastBotSpawn = gameState.turnNumber;
        addLog("A new bot has spawned!");
    }
    
    // Each bot takes action
    for (const bot of gameState.bots) {
        // Find target
        let targetTile = null;
        let targetType = null;
        
        for (const botTile of gameState.botTiles) {
            const [row, col] = botTile.split('-').map(Number);
            const neighbors = [
                `${row-1}-${col}`, `${row+1}-${col}`,
                `${row}-${col-1}`, `${row}-${col+1}`
            ];
            
            for (const neighbor of neighbors) {
                if (gameState.neutralTiles.includes(neighbor)) {
                    targetTile = neighbor;
                    targetType = 'neutral';
                    break;
                } else if (gameState.playerTiles.includes(neighbor) && Math.random() > 0.5) {
                    targetTile = neighbor;
                    targetType = 'player';
                    break;
                }
            }
            
            if (targetTile) break;
        }
        
        // Take action
        if (targetTile && targetType === 'neutral') {
            conquerTile(targetTile, 'bot');
        } else if (targetTile && targetType === 'player') {
            // Bot attacks player tile
            const attackingTile = findAdjacentBotTile(targetTile);
            if (attackingTile) {
                const attackStrength = getTileStrength(attackingTile) * bot.strength;
                const defenseStrength = getTileStrength(targetTile);
                
                if (Math.random() * attackStrength > Math.random() * defenseStrength * 0.8) {
                    conquerTile(targetTile, 'bot');
                    addLog("Bot captured one of your tiles!");
                } else {
                    reduceTileStrength(attackingTile, 0.2);
                }
            }
        }
    }
    
    // Increase difficulty
    if (gameState.turnNumber % 10 === 0 && gameState.difficulty < 5) {
        gameState.difficulty++;
        addLog(`Difficulty increased to level ${gameState.difficulty}!`);
    }
    
    // Check game end
    checkGameEnd();
    
    // Return to player turn
    if (gameState.active) {
        gameState.currentTurn = 'player';
        endTurnBtn.disabled = false;
        updateUI();
        gameStatus.textContent = "Your turn!";
        gameStatus.className = "game-status player-turn";
        gameStatusTextElement.textContent = "Your Turn";
    }
}

// Find bot tile adjacent to target
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

// Check if game should end
function checkGameEnd() {
    // Player wins if no bots left
    if (gameState.botTiles.length === 0 && gameState.bots.length === 0) {
        endGame(true);
        return;
    }
    
    // Player loses if no tiles left
    if (gameState.playerTiles.length === 0) {
        endGame(false);
        return;
    }
    
    // 1v1 mode: check board control
    if (gameState.mode === '1v1') {
        const totalTiles = gameState.gridSize * gameState.gridSize;
        const playerPercentage = gameState.playerTiles.length / totalTiles;
        const botPercentage = gameState.botTiles.length / totalTiles;
        
        if (playerPercentage > 0.75) {
            endGame(true);
        } else if (botPercentage > 0.75) {
            endGame(false);
        }
    }
}

// End game
function endGame(isVictory) {
    gameState.active = false;
    
    // Calculate final score
    const turnBonus = gameState.turnNumber * 5;
    const tileBonus = gameState.playerTiles.length * 20;
    const botBonus = gameState.botsDefeated * 100;
    const finalScore = Math.floor((gameState.score + turnBonus + tileBonus + botBonus) * gameState.difficulty);
    
    // Save to leaderboard if in domination mode
    if (gameState.mode === 'domination') {
        saveToLeaderboard(finalScore);
    }
    
    // Show game over modal
    document.getElementById('finalScore').textContent = finalScore;
    document.getElementById('finalTurns').textContent = gameState.turnNumber;
    document.getElementById('finalTiles').textContent = gameState.playerTiles.length;
    document.getElementById('finalBots').textContent = gameState.botsDefeated;
    
    if (isVictory) {
        document.getElementById('gameOverTitle').textContent = 'Victory!';
        addLog("Congratulations! You won!");
    } else {
        document.getElementById('gameOverTitle').textContent = 'Defeat!';
        addLog("Game over! Better luck next time.");
    }
    
    // Show leaderboard button only for domination mode
    document.getElementById('viewLeaderboardBtn').style.display = 
        gameState.mode === 'domination' ? 'flex' : 'none';
    
    document.getElementById('gameOverModal').style.display = 'block';
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
        timestamp: Date.now()
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
    currentTurnElement.textContent = gameState.turnNumber;
    botCountElement.textContent = gameState.botCount;
    
    // Update difficulty display
    let difficultyText = "Easy";
    if (gameState.difficulty >= 4) difficultyText = "Extreme";
    else if (gameState.difficulty >= 3) difficultyText = "Hard";
    else if (gameState.difficulty >= 2) difficultyText = "Normal";
    
    difficultyLevelElement.textContent = difficultyText;
}

// Add log message
function addLog(message) {
    const timestamp = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
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
    window.location.href = 'index.html';
}

function viewLeaderboard() {
    window.location.href = 'leaderboard.html';
}

function restartGame() {
    document.getElementById('gameOverModal').style.display = 'none';
    initGame();
}

// Initialize game when page loads
window.onload = initGame;
