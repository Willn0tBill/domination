// Load leaderboard data
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
    
    // Sort by score
    data.sort((a, b) => b.score - a.score);
    
    return data.slice(0, 10);
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
        
        row.innerHTML = `
            <div class="rank-col ${rankClass}">${index + 1}</div>
            <div class="player-col ${rankClass}">${entry.player}</div>
            <div class="score-col">${entry.score}</div>
            <div class="mode-col">${entry.mode}</div>
            <div class="date-col">${entry.date}</div>
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
};
