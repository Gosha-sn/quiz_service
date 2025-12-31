document.addEventListener('DOMContentLoaded', function() {
    // Get the session code from the URL
    const sessionCode = window.location.pathname.split('/').pop();
    document.getElementById('session-code-display').textContent = sessionCode;
    
    // Get references to DOM elements
    const participantsList = document.getElementById('participants-list');
    const participantCount = document.getElementById('participant-count');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const endQuizBtn = document.getElementById('end-quiz-btn');
    
    // Update participants list periodically
    setInterval(updateParticipantsList, 2000);
    
    // Function to update participants list
    function updateParticipantsList() {
        fetch(`/lobby_participants/${sessionCode}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error getting participants:', data.error);
                    return;
                }
                
                const participants = data.participants || [];
                
                // Update participant count
                participantCount.textContent = participants.length;
                
                // Update participants list
                participantsList.innerHTML = '';
                
                if (participants.length === 0) {
                    participantsList.innerHTML = '<li>No participants yet</li>';
                    return;
                }
                
                participants.forEach(participant => {
                    const li = document.createElement('li');
                    li.textContent = participant.name;
                    if (participant.is_host) {
                        li.textContent += ' (Host)';
                        li.style.fontWeight = 'bold';
                    }
                    participantsList.appendChild(li);
                });
            })
            .catch(error => {
                console.error('Error fetching participants:', error);
            });
    }
    
    // Event listener for start quiz button
    startQuizBtn.addEventListener('click', function() {
        fetch(`/start_quiz_now/${sessionCode}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Redirect to host page where quiz will start
                window.location.href = `/host/${sessionCode}`;
            } else {
                alert('Error starting quiz: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error starting quiz');
        });
    });
    
    // Event listener for end quiz button
    endQuizBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to end the quiz?')) {
            fetch(`/end_quiz/${sessionCode}`, {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Redirect to results page
                    window.location.href = `/live_results/${sessionCode}`;
                } else {
                    alert('Error ending quiz: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error ending quiz');
            });
        }
    });
    
    // Initial update
    updateParticipantsList();
});