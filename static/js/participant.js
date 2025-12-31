document.addEventListener('DOMContentLoaded', function() {
    // Get the session code from the URL
    const sessionCode = window.location.pathname.split('/').pop();
    document.getElementById('session-code-display').textContent = sessionCode;
    
    // Get references to DOM elements
    const waitingArea = document.getElementById('waiting-area');
    const questionArea = document.getElementById('question-area');
    const resultsArea = document.getElementById('results-area');
    const currentQuestionText = document.getElementById('current-question-text');
    const answersContainer = document.getElementById('answers-container');
    const timerElement = document.getElementById('timer');
    const returnHomeBtn = document.getElementById('return-home-btn');
    const resultsContainer = document.getElementById('results-container');
    
    let quizData = null;
    let participantId = null;
    let isHost = false;
    let timer = null;
    let timeLeft = 30;
    
    // Get participant info from localStorage or prompt
    let participantName = localStorage.getItem('participantName');
    if (!participantName) {
        participantName = prompt('Please enter your name:');
        if (participantName) {
            localStorage.setItem('participantName', participantName);
        }
    }
    
    if (!participantName) {
        alert('A name is required to participate in the quiz');
        return;
    }
    
    // Join the session
    joinSession();
    
    // Function to join the session
    function joinSession() {
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
                participantId = data.participant_id;
                isHost = data.is_host;
                
                // Start monitoring the session
                monitorSession();
            } else {
                alert('Error joining session: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error joining session');
        });
    }
    
    // Function to monitor the session status
    function monitorSession() {
        // Check session status periodically
        setInterval(() => {
            fetch(`/session_status/${sessionCode}`)
                .then(response => response.json())
                .then(status => {
                    if (status.error) {
                        console.error('Session error:', status.error);
                        return;
                    }
                    
                    // Update UI based on session status
                    if (status.status === 'active') {
                        // Hide waiting area, show question area
                        waitingArea.classList.add('hidden');
                        questionArea.classList.remove('hidden');
                        resultsArea.classList.add('hidden');
                        
                        // Load quiz data if not already loaded
                        if (!quizData) {
                            loadQuiz();
                        }
                        
                        // Update question and answers
                        if (status.current_question < quizData.questions.length) {
                            showQuestion(status.current_question);
                        }
                    } else if (status.status === 'results') {
                        // Show results
                        resultsArea.classList.remove('hidden');
                        questionArea.classList.add('hidden');
                        waitingArea.classList.add('hidden');
                        showResults();
                    } else {
                        // Show waiting area
                        waitingArea.classList.remove('hidden');
                        questionArea.classList.add('hidden');
                        resultsArea.classList.add('hidden');
                    }
                })
                .catch(error => {
                    console.error('Error getting session status:', error);
                });
        }, 2000); // Update every 2 seconds
    }
    
    // Function to load the quiz
    function loadQuiz() {
        fetch(`/api/quiz_by_code/${sessionCode}`)
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
    
    // Function to show a question
    function showQuestion(index) {
        if (!quizData || index >= quizData.questions.length) {
            return;
        }
        
        const question = quizData.questions[index];
        
        // Display question
        currentQuestionText.textContent = question.question_text;
        
        // Create answer buttons
        answersContainer.innerHTML = '';
        question.answers.forEach(answer => {
            const answerBtn = document.createElement('button');
            answerBtn.className = 'answer-btn';
            answerBtn.dataset.answerId = answer.id;
            
            // Add image if available
            if (answer.image_url) {
                const img = document.createElement('img');
                img.src = answer.image_url;
                img.alt = answer.answer_text;
                img.className = 'answer-image';
                answerBtn.appendChild(img);
            }
            
            // Add answer text
            const textSpan = document.createElement('span');
            textSpan.textContent = answer.answer_text;
            answerBtn.appendChild(textSpan);
            
            // Add click event
            answerBtn.addEventListener('click', function() {
                if (timer) {
                    clearInterval(timer);
                }
                
                selectAnswer(answer.id, question.id);
            });
            
            answersContainer.appendChild(answerBtn);
        });
        
        // Start the timer
        startTimer();
    }
    
    // Function to start the timer
    function startTimer() {
        timeLeft = 30;
        timerElement.textContent = timeLeft;
        
        clearInterval(timer);
        timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
            }
        }, 1000);
    }
    
    // Function to select an answer
    function selectAnswer(answerId, questionId) {
        // Disable all answer buttons
        document.querySelectorAll('.answer-btn').forEach(btn => {
            btn.disabled = true;
        });
        
        // Submit the answer
        fetch('/submit_answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                participant_id: participantId,
                question_id: questionId,
                answer_id: answerId,
                session_code: sessionCode
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Show feedback
                alert('Answer submitted!');
            } else {
                alert('Error submitting answer');
            }
        })
        .catch(error => {
            console.error('Error submitting answer:', error);
            alert('Error submitting answer');
        });
    }
    
    // Function to show results
    function showResults() {
        clearInterval(timer);
        resultsContainer.innerHTML = '<p>Quiz completed! Thank you for participating.</p>';
    }
    
    // Event listener for return home button
    returnHomeBtn.addEventListener('click', function() {
        window.location.href = '/';
    });
});