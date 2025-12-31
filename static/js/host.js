document.addEventListener('DOMContentLoaded', function() {
    // Get the session code from the URL
    const sessionCode = window.location.pathname.split('/').pop();
    document.getElementById('session-code-display').textContent = sessionCode;
    
    // Get references to DOM elements
    const waitingRoom = document.getElementById('waiting-room');
    const quizControls = document.getElementById('quiz-controls');
    const resultsSection = document.getElementById('results-section');
    const participantsList = document.getElementById('participants-list');
    const participantCount = document.getElementById('participant-count');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const goToLobbyBtn = document.getElementById('go-to-lobby-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const endQuizBtn = document.getElementById('end-quiz-btn');
    const currentQuestionText = document.getElementById('current-question-text');
    const answersContainer = document.getElementById('answers-container');
    const responsesSummaryContainer = document.getElementById('responses-summary-container');
    const restartQuizBtn = document.getElementById('restart-quiz-btn');
    
    let quizData = null;
    let currentQuestionIndex = 0;
    let timer = null;
    
    // Load the quiz data
    loadQuiz(sessionCode);
    
    // Function to load the quiz
    function loadQuiz(code) {
        fetch(`/api/quiz_by_code/${code}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                quizData = data;
                
                // Start monitoring the session
                monitorSession();
            })
            .catch(error => {
                console.error('Error loading quiz:', error);
                alert('Error loading quiz');
            });
    }
    
    // Function to monitor the session status
    function monitorSession() {
        // Update session status periodically
        setInterval(() => {
            fetch(`/session_status/${sessionCode}`)
                .then(response => response.json())
                .then(status => {
                    if (status.error) {
                        console.error('Session error:', status.error);
                        return;
                    }
                    
                    // Update participant count
                    participantCount.textContent = status.participant_count || 0;
                    
                    // Update participants list
                    updateParticipantsList(status.participants || []);
                    
                    // Update UI based on session status
                    if (status.status === 'waiting') {
                        // Show waiting room
                        waitingRoom.classList.remove('hidden');
                        quizControls.classList.add('hidden');
                        resultsSection.classList.add('hidden');
                    } else if (status.status === 'active') {
                        // Show quiz controls
                        waitingRoom.classList.add('hidden');
                        quizControls.classList.remove('hidden');
                        resultsSection.classList.add('hidden');
                        
                        // Show current question
                        if (status.current_question < quizData.questions.length) {
                            showQuestion(status.current_question);
                        }
                    } else if (status.status === 'results') {
                        // Show results
                        waitingRoom.classList.add('hidden');
                        quizControls.classList.add('hidden');
                        resultsSection.classList.remove('hidden');
                        showResults();
                    }
                })
                .catch(error => {
                    console.error('Error getting session status:', error);
                });
            
            // Update responses summary
            fetch(`/responses/${sessionCode}`)
                .then(response => response.json())
                .then(data => {
                    if (!data.error) {
                        updateResponsesSummary(data);
                    }
                })
                .catch(error => {
                    console.error('Error getting responses:', error);
                });
        }, 2000); // Update every 2 seconds
    }
    
    // Function to update participants list
    function updateParticipantsList(participants) {
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
    }
    
    // Function to update responses summary
    function updateResponsesSummary(data) {
        const responses = data.responses || {};
        const currentQ = data.current_question || 0;
        const participants = data.participants || [];
        
        if (!responses[currentQ]) {
            responsesSummaryContainer.innerHTML = '<p>No responses yet for this question</p>';
            return;
        }
        
        // Count responses
        const responseCount = Object.keys(responses[currentQ]).length;
        const totalParticipants = participants.filter(p => !p.is_host).length; // Don't count host
        
        responsesSummaryContainer.innerHTML = `
            <p><strong>Responses: ${responseCount}/${totalParticipants}</strong></p>
            <div class="responses-list">
                ${Object.entries(responses[currentQ]).map(([participantId, response]) => {
                    const participant = participants.find(p => p.id == participantId);
                    return `<div class="response-item">${participant ? participant.name : 'Unknown'} - Answered</div>`;
                }).join('')}
            </div>
        `;
    }
    
    // Function to show a question
    function showQuestion(index) {
        if (!quizData || index >= quizData.questions.length) {
            return;
        }
        
        currentQuestionIndex = index;
        const question = quizData.questions[index];
        
        // Display question text
        currentQuestionText.textContent = question.question_text;
        
        // Display answers
        answersContainer.innerHTML = '';
        question.answers.forEach((answer, idx) => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-display';
            answerDiv.innerHTML = `
                <div class="answer-text">${idx + 1}. ${answer.answer_text}</div>
                ${answer.image_url ? `<img src="${answer.image_url}" alt="${answer.answer_text}" class="answer-image">` : ''}
            `;
            answersContainer.appendChild(answerDiv);
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
                // Quiz will start, UI will update via monitorSession
            } else {
                alert('Error starting quiz: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error starting quiz');
        });
    });
    
    // Event listener for go to lobby button
    goToLobbyBtn.addEventListener('click', function() {
        window.location.href = `/lobby/${sessionCode}`;
    });
    
    // Event listener for next question button
    nextQuestionBtn.addEventListener('click', function() {
        fetch(`/next_question/${sessionCode}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                if (data.status === 'quiz_ended') {
                    alert('Quiz has ended. All questions have been completed.');
                    // Update UI to show results
                    waitingRoom.classList.add('hidden');
                    quizControls.classList.add('hidden');
                    resultsSection.classList.remove('hidden');
                    showResults();
                }
                // UI will update via monitorSession
            } else {
                alert('Error advancing question: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error advancing question');
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
                    // UI will update via monitorSession
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
    
    // Event listener for restart quiz button
    restartQuizBtn.addEventListener('click', function() {
        // Reset session to waiting state
        fetch(`/start_session/${sessionCode}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // UI will update via monitorSession
            } else {
                alert('Error restarting quiz: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error restarting quiz');
        });
    });
    
    // Function to show results
    function showResults() {
        // In a real implementation, this would show detailed results
        document.getElementById('results-container').innerHTML = `
            <p>Quiz completed! Check the leaderboard for final results.</p>
            <a href="/leaderboard/${quizData.id}/view" class="btn primary-btn">View Leaderboard</a>
            <a href="/live_results/${sessionCode}" class="btn secondary-btn">View Live Results</a>
        `;
    }
});