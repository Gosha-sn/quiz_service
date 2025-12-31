document.addEventListener('DOMContentLoaded', function() {
    const sessionCodeInput = document.getElementById('session-code');
    const playerNameInput = document.getElementById('player-name');
    const joinBtn = document.getElementById('join-btn');
    const joinError = document.getElementById('join-error');
    
    joinBtn.addEventListener('click', joinQuiz);
    
    function joinQuiz() {
        const sessionCode = sessionCodeInput.value.trim().toUpperCase();
        const playerName = playerNameInput.value.trim();
        
        if (!sessionCode || sessionCode.length !== 6) {
            showError('Please enter a valid 6-digit session code');
            return;
        }
        
        if (!playerName) {
            showError('Please enter your name');
            return;
        }
        
        // Try to join the session
        fetch(`/join_session/${sessionCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                participant_name: playerName,
                is_host: false
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Redirect to the participant page
                window.location.href = `/quiz/${sessionCode}`;
            } else {
                showError(data.error || 'Error joining quiz');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showError('Error connecting to server');
        });
    }
    
    function showError(message) {
        joinError.textContent = message;
        joinError.classList.remove('hidden');
    }
    
    // Allow pressing Enter to join
    playerNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinQuiz();
        }
    });
    
    sessionCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinQuiz();
        }
    });
});