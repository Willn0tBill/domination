// Load leaderboard data with bot filtering
function loadLeaderboard(period) {
    const leaderboards = JSON.parse(localStorage.getItem('dominationLeaderboards')) || {
        daily: [],
        weekly: [],
        alltime: []
    };
    
    // Filter based on period
    let data = [];
    const now = Date.now();
    
    if (period === 'daily') {
        const oneDayAgo = now - (24 * 60 * 60 * 1000);
        data = leaderboards.daily.filter(entry => entry.timestamp > oneDayAgo);
    } else if (period === 'weekly') {
        const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
        data = leaderboards.weekly.filter(entry => entry.timestamp > oneWeekAgo);
    } else {
        data = leaderboards.alltime;
    }
    
    // NEW: Filter out any remaining bot entries
    data = filterBotEntriesFromData(data);
    
    // Sort by score
    data.sort((a, b) => b.score - a.score);
    
    return data.slice(0, 10);
}

// NEW: Filter bot entries from data
function filterBotEntriesFromData(data) {
    if (!data || !Array.isArray(data)) return [];
    
    const botNames = ['Bot', 'AI', 'Computer', 'CPU', 'Robot', 'Opponent', 'Enemy', 'bot-'];
    
    return data.filter(entry => {
        if (!entry || !entry.player) return false;
        
        const playerName = entry.player.toString().toLowerCase();
        const isBot = botNames.some(botName => 
            playerName.includes(botName.toLowerCase()) || 
            entry.player === 'Commander' ||
            entry.player.trim() === '' ||
            entry.mode === 'bot' ||
            entry.player.startsWith('bot-') ||
            entry.player === 'Default' ||
            entry.player === 'Player' ||
            entry.player === 'User'
        );
        
        return !isBot;
    });
}

// Display leaderboard
function displayLeaderboard(period) {
    const data = loadLeaderboard(period);
    const tableBody = document.getElementById('leaderboardBody');
    const noScoresMessage = document.getElementById('noScoresMessage');
    
    // Clear existing content
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableBody.style.display = 'none';
        noScoresMessage.style.display = 'block';
        return;
    }
    
    tableBody.style.display = 'block';
    noScoresMessage.style.display = 'none';
    
    // Create rows
    data.forEach((entry, index) => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        // Add rank class for top 3
        let rankClass = '';
        if (index === 0) rankClass = 'rank-1';
        else if (index === 1) rankClass = 'rank-2';
        else if (index === 2) rankClass = 'rank-3';
        
        // Format date nicely
        const date = new Date(entry.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        row.innerHTML = `
            <div class="rank-col ${rankClass}">${index + 1}</div>
            <div class="player-col ${rankClass}">${entry.player}</div>
            <div class="score-col">${entry.score.toLocaleString()}</div>
            <div class="mode-col">${entry.mode}</div>
            <div class="date-col">${formattedDate}</div>
        `;
        
        tableBody.appendChild(row);
    });
}

// Change tab
function changeTab(period) {
    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.period === period) {
            btn.classList.add('active');
        }
    });
    
    // Display data for selected period
    displayLeaderboard(period);
}

// Go to main menu
function goToMenu() {
    window.location.href = 'index.html';
}

// Initialize leaderboard
window.onload = function() {
    // Display all-time leaderboard by default
    displayLeaderboard('alltime');
    
    // Add some CSS for leaderboard styling
    const style = document.createElement('style');
    style.textContent = `
        .leaderboard-page header {
            text-align: center;
            margin-bottom: 30px;
            padding: 25px;
            background: rgba(0, 20, 40, 0.85);
            border-radius: 20px;
            border: 2px solid #3a7bd5;
        }
        
        .leaderboard-page h1 {
            font-family: 'Orbitron', sans-serif;
            font-size: 3rem;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #ffd700, #ffcc33);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        .leaderboard-page .subtitle {
            font-size: 1.2rem;
            color: #a0c8ff;
        }
        
        .leaderboard-container {
            background: rgba(0, 20, 40, 0.85);
            border-radius: 20px;
            padding: 30px;
            margin-bottom: 30px;
            border: 2px solid #2a5a9a;
        }
        
        .leaderboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .leaderboard-tabs {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .tab-btn {
            padding: 10px 20px;
            background: rgba(0, 30, 60, 0.7);
            border: 1px solid #3a7bd5;
            color: #a0c8ff;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .tab-btn.active {
            background: #3a7bd5;
            color: white;
            font-weight: bold;
        }
        
        .tab-btn:hover:not(.active) {
            background: rgba(58, 123, 213, 0.5);
        }
        
        .leaderboard-table {
            background: rgba(0, 10, 20, 0.7);
            border-radius: 12px;
            overflow: hidden;
            margin-bottom: 30px;
            border: 1px solid rgba(100, 150, 255, 0.2);
        }
        
        .table-header {
            display: grid;
            grid-template-columns: 80px 2fr 1fr 1fr 1fr;
            background: rgba(0, 30, 60, 0.9);
            padding: 15px;
            font-weight: bold;
            color: #4dabf7;
            border-bottom: 2px solid #3a7bd5;
        }
        
        .table-body {
            max-height: 400px;
            overflow-y: auto;
        }
        
        .table-row {
            display: grid;
            grid-template-columns: 80px 2fr 1fr 1fr 1fr;
            padding: 12px 15px;
            border-bottom: 1px solid rgba(100, 150, 255, 0.1);
            transition: background 0.3s ease;
        }
        
        .table-row:hover {
            background: rgba(0, 30, 60, 0.5);
        }
        
        .table-row:last-child {
            border-bottom: none;
        }
        
        .rank-col {
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .rank-1 {
            color: #ffd700;
        }
        
        .rank-2 {
            color: #c0c0c0;
        }
        
        .rank-3 {
            color: #cd7f32;
        }
        
        .player-col {
            font-weight: 500;
        }
        
        .score-col {
            font-weight: bold;
            color: #00d2ff;
        }
        
        .no-scores {
            text-align: center;
            padding: 60px 20px;
            color: #a0c8ff;
        }
        
        .no-scores i {
            font-size: 4rem;
            color: #3a7bd5;
            margin-bottom: 20px;
        }
        
        .no-scores h3 {
            font-size: 1.8rem;
            margin-bottom: 10px;
            color: #4dabf7;
        }
        
        .play-now-btn {
            margin-top: 20px;
            padding: 12px 30px;
            background: linear-gradient(90deg, #3a7bd5, #00d2ff);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 1.1rem;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        
        .play-now-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(0, 210, 255, 0.4);
        }
        
        .leaderboard-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 30px;
        }
        
        .info-card {
            background: rgba(0, 30, 60, 0.7);
            border-radius: 12px;
            padding: 20px;
            border: 1px solid rgba(100, 150, 255, 0.2);
        }
        
        .info-card h3 {
            color: #4dabf7;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .info-card ul {
            list-style-type: none;
            padding-left: 0;
        }
        
        .info-card li {
            margin-bottom: 8px;
            padding-left: 20px;
            position: relative;
            color: #c0d5ff;
        }
        
        .info-card li:before {
            content: "•";
            color: #00d2ff;
            position: absolute;
            left: 0;
        }
        
        @media (max-width: 768px) {
            .leaderboard-header {
                flex-direction: column;
                align-items: stretch;
            }
            
            .leaderboard-tabs {
                justify-content: center;
            }
            
            .table-header, .table-row {
                grid-template-columns: 60px 1fr 1fr;
            }
            
            .mode-col, .date-col {
                display: none;
            }
            
            .leaderboard-info {
                grid-template-columns: 1fr;
            }
        }
    `;
    document.head.appendChild(style);
};
