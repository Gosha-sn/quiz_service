document.addEventListener('DOMContentLoaded', function() {
    // Get the session code from the URL
    const sessionCode = window.location.pathname.split('/').pop();
    document.getElementById('session-code-display').textContent = sessionCode;
    
    // Generate QR code for the quiz link
    const quizUrl = `${window.location.origin}/quiz/${sessionCode}`;
    const qr = new QRious({
        element: document.getElementById('qr-code-canvas'),
        value: quizUrl,
        size: 200
    });
    
    // Get references to DOM elements
    const participantsList = document.getElementById('participants-list');
    const participantsCount = document.getElementById('participants-count');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const endQuizBtn = document.getElementById('end-quiz-btn');
    const quizArea = document.getElementById('quiz-area');
    const currentQuestionDisplay = document.getElementById('current-question-display');
    const answersDisplay = document.getElementById('answers-display');
    const responsesSummaryContainer = document.getElementById('responses-summary-container');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const showResultsBtn = document.getElementById('show-results-btn');
    const resultsArea = document.getElementById('results-area');
    const resultsContainer = document.getElementById('results-container');
    const restartQuizBtn = document.getElementById('restart-quiz-btn');
    
    let quizData = null;
    let currentQuestionIndex = 0;
    
    // Load quiz data
    loadQuizBySessionCode(sessionCode);
    
    // Monitor session status
    setInterval(monitorSession, 2000);
    
    // Function to load quiz by session code
    function loadQuizBySessionCode(code) {
        fetch(`/api/quiz_by_code/${code}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                quizData = data;
            })
            .catch(error => {
                console.error('Error loading quiz:', error);
                alert('Error loading quiz');
            });
    }
    
    // Function to monitor session status
    function monitorSession() {
        fetch(`/session_status/${sessionCode}`)
            .then(response => response.json())
            .then(status => {
                if (status.error) {
                    console.error('Session error:', status.error);
                    return;
                }
                
                // Update participants count
                participantsCount.textContent = status.participant_count || 0;
                
                // Update participants list
                updateParticipantsList(status.participants || []);
                
                // Update UI based on session status
                if (status.status === 'active') {
                    // Show quiz area
                    quizArea.classList.remove('hidden');
                    resultsArea.classList.add('hidden');
                    
                    // Show current question if available
                    if (quizData && status.current_question < quizData.questions.length) {
                        showQuestion(status.current_question);
                    }
                } else if (status.status === 'results') {
                    // Show results
                    resultsArea.classList.remove('hidden');
                    quizArea.classList.add('hidden');
                    showResults();
                } else {
                    // Show lobby controls
                    quizArea.classList.add('hidden');
                    resultsArea.classList.add('hidden');
                }
                
                // Update responses summary
                if (status.status === 'active') {
                    updateResponsesSummary(status.responses || {}, status.current_question || 0);
                }
            })
            .catch(error => {
                console.error('Error getting session status:', error);
            });
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
    
    // Function to show a question
    function showQuestion(index) {
        if (!quizData || index >= quizData.questions.length) {
            return;
        }
        
        const question = quizData.questions[index];
        
        // Display question text
        document.getElementById('current-question-text').textContent = question.question_text;
        
        // Display answers
        answersDisplay.innerHTML = '';
        question.answers.forEach(answer => {
            const answerDiv = document.createElement('div');
            answerDiv.className = 'answer-display';
            
            if (answer.image_url) {
                const img = document.createElement('img');
                img.src = answer.image_url;
                img.alt = answer.answer_text;
                img.className = 'answer-image';
                answerDiv.appendChild(img);
            }
            
            const textSpan = document.createElement('span');
            textSpan.textContent = answer.answer_text;
            answerDiv.appendChild(textSpan);
            
            answersDisplay.appendChild(answerDiv);
        });
    }
    
    // Function to update responses summary
    function updateResponsesSummary(responses, currentQuestion) {
        const currentQResponses = responses[currentQuestion] || {};
        const totalParticipants = document.querySelectorAll('#participants-list li:not(:first-child)').length; // Exclude "No participants yet" if present
        
        let responseCount = 0;
        for (const participantId in currentQResponses) {
            responseCount++;
        }
        
        responsesSummaryContainer.innerHTML = `
            <p><strong>Responses: ${responseCount}/${totalParticipants}</strong></p>
            <div class="responses-list">
                ${Object.entries(currentQResponses).map(([participantId, response]) => {
                    // In a real implementation, we would get participant name by ID
                    return `<div class="response-item">Participant responded</div>`;
                }).join('')}
            </div>
        `;
    }
    
    // Function to show results
    function showResults() {
        // In a real implementation, this would show detailed results
        resultsContainer.innerHTML = '<p>Quiz completed! Final results will be displayed here.</p>';
    }
    
    // Event listeners for buttons
    startQuizBtn.addEventListener('click', function() {
        fetch(`/start_quiz_now/${sessionCode}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // UI will update via monitorSession
            } else {
                alert('Error starting quiz: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error starting quiz');
        });
    });
    
    endQuizBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to end the quiz for all participants?')) {
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
                    quizArea.classList.add('hidden');
                    resultsArea.classList.remove('hidden');
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
    
    showResultsBtn.addEventListener('click', function() {
        fetch(`/end_quiz/${sessionCode}`, {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // UI will update via monitorSession
            } else {
                alert('Error showing results: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error showing results');
        });
    });
    
    restartQuizBtn.addEventListener('click', function() {
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
});