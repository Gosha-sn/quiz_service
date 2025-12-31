document.addEventListener('DOMContentLoaded', function() {
    // Get the quiz ID from the URL
    const pathParts = window.location.pathname.split('/');
    const quizId = pathParts[pathParts.length - 2]; // Get quiz ID from URL path
    
    if (!quizId) {
        alert('Quiz ID not found in URL');
        return;
    }
    
    // Get references to DOM elements
    const leaderboardBody = document.getElementById('leaderboard-body');
    const leaderboardQuizTitle = document.getElementById('leaderboard-quiz-title');
    
    // Load the leaderboard data
    loadLeaderboard(quizId);
    
    // Function to load the leaderboard
    function loadLeaderboard(id) {
        fetch(`/leaderboard/${id}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                // Display quiz title
                leaderboardQuizTitle.textContent = data.quiz_title;
                
                // Display leaderboard
                displayLeaderboard(data.leaderboard);
            })
            .catch(error => {
                console.error('Error loading leaderboard:', error);
                alert('Error loading leaderboard');
            });
    }
    
    // Function to display the leaderboard
    function displayLeaderboard(leaderboard) {
        leaderboardBody.innerHTML = '';
        
        if (leaderboard.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="4">No participants yet</td>';
            leaderboardBody.appendChild(row);
            return;
        }
        
        leaderboard.forEach((participant, index) => {
            const row = document.createElement('tr');
            
            // Calculate rank (1-indexed)
            const rank = index + 1;
            
            // Set rank with medal for top 3
            let rankDisplay = rank;
            if (rank === 1) {
                rankDisplay = '🥇';
            } else if (rank === 2) {
                rankDisplay = '🥈';
            } else if (rank === 3) {
                rankDisplay = '🥉';
            } else {
                rankDisplay = rank;
            }
            
            row.innerHTML = `
                <td>${rankDisplay}</td>
                <td>${participant.participant_name}</td>
                <td>${participant.correct_answers || 0}</td>
                <td>${participant.total_questions || 0}</td>
            `;
            
            leaderboardBody.appendChild(row);
        });
    }
});