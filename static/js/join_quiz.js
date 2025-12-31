document.addEventListener('DOMContentLoaded', function() {
    const sessionCodeInput = document.getElementById('session-code');
    const participantNameInput = document.getElementById('participant-name');
    const joinQuizBtn = document.getElementById('join-quiz-btn');
    const joinError = document.getElementById('join-error');
    
    // Focus on the session code input
    sessionCodeInput.focus();
    
    // Add event listener to the join button
    joinQuizBtn.addEventListener('click', joinQuiz);
    
    // Allow pressing Enter to join
    sessionCodeInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinQuiz();
        }
    });
    
    participantNameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            joinQuiz();
        }
    });
    
    // Function to join the quiz
    function joinQuiz() {
        const sessionCode = sessionCodeInput.value.trim().toUpperCase();
        const participantName = participantNameInput.value.trim();
        
        if (!sessionCode || sessionCode.length !== 6) {
            showError('Please enter a valid 6-character session code');
            return;
        }
        
        if (!participantName) {
            showError('Please enter your name');
            return;
        }
        
        // Clear any previous errors
        joinError.classList.add('hidden');
        
        // Join the session
        fetch(`/join_session/${sessionCode}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                participant_name: participantName,
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
    
    // Function to show error message
    function showError(message) {
        joinError.textContent = message;
        joinError.classList.remove('hidden');
    }
});