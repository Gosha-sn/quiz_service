document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters to extract quiz ID
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = window.location.pathname.split('/').pop(); // Get quiz ID from URL path
    
    if (!quizId) {
        alert('Quiz ID not found in URL');
        return;
    }
    
    // Get references to DOM elements
    const quizTitleElement = document.getElementById('quiz-title');
    const quizDescriptionElement = document.getElementById('quiz-description');
    const questionTextElement = document.getElementById('question-text');
    const answersContainer = document.getElementById('answers-container');
    const timerElement = document.getElementById('timer');
    const correctAnswerElement = document.getElementById('correct-answer');
    const correctAnswerTextElement = document.getElementById('correct-answer-text');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    
    let currentQuestionIndex = 0;
    let quizData = null;
    let participantId = null;
    let timer = null;
    let timeLeft = 30;
    
    // Load the quiz data
    loadQuiz(quizId);
    
    // Function to load the quiz
    function loadQuiz(id) {
        fetch(`/api/quiz/${id}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                
                quizData = data;
                
                // Display quiz info
                quizTitleElement.textContent = quizData.title;
                quizDescriptionElement.textContent = quizData.description || '';
                
                // Start the quiz
                startQuiz();
            })
            .catch(error => {
                console.error('Error loading quiz:', error);
                alert('Error loading quiz');
            });
    }
    
    // Function to start the quiz
    function startQuiz() {
        // Prompt for participant name
        const participantName = prompt('Please enter your name:');
        
        if (!participantName) {
            alert('A name is required to take the quiz');
            return;
        }
        
        // Register the participant
        fetch(`/start_quiz/${quizData.id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ participant_name: participantName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                participantId = data.participant_id;
                showQuestion(currentQuestionIndex);
            } else {
                alert('Error starting quiz');
            }
        })
        .catch(error => {
            console.error('Error starting quiz:', error);
            alert('Error starting quiz');
        });
    }
    
    // Function to show a question
    function showQuestion(index) {
        if (index >= quizData.questions.length) {
            // Quiz is finished
            showResults();
            return;
        }
        
        const question = quizData.questions[index];
        
        // Reset UI
        answersContainer.innerHTML = '';
        correctAnswerElement.classList.add('hidden');
        nextQuestionBtn.classList.add('hidden');
        
        // Display question
        questionTextElement.textContent = question.question_text;
        
        // Create answer buttons
        question.answers.forEach(answer => {
            const answerBtn = document.createElement('div');
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
        
        timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = timeLeft;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                // Time's up - show correct answer
                showCorrectAnswer();
            }
        }, 1000);
    }
    
    // Function to select an answer
    function selectAnswer(answerId, questionId) {
        // Submit the answer
        fetch('/submit_answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                participant_id: participantId,
                question_id: questionId,
                answer_id: answerId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Find the selected answer to check if it's correct
                const currentQuestion = quizData.questions[currentQuestionIndex];
                const selectedAnswer = currentQuestion.answers.find(a => a.id == answerId);
                
                // Highlight the selected answer
                document.querySelectorAll('.answer-btn').forEach(btn => {
                    btn.classList.remove('selected');
                    if (parseInt(btn.dataset.answerId) === answerId) {
                        btn.classList.add('selected');
                        if (selectedAnswer.is_correct) {
                            btn.classList.add('correct');
                        } else {
                            btn.classList.add('incorrect');
                        }
                    }
                });
                
                // Show correct answer after a short delay
                setTimeout(() => {
                    showCorrectAnswer();
                }, 1000);
            } else {
                alert('Error submitting answer');
            }
        })
        .catch(error => {
            console.error('Error submitting answer:', error);
            alert('Error submitting answer');
        });
    }
    
    // Function to show the correct answer
    function showCorrectAnswer() {
        clearInterval(timer);
        
        const currentQuestion = quizData.questions[currentQuestionIndex];
        const correctAnswer = currentQuestion.answers.find(a => a.is_correct);
        
        if (correctAnswer) {
            // Highlight correct answer
            document.querySelectorAll('.answer-btn').forEach(btn => {
                if (parseInt(btn.dataset.answerId) === correctAnswer.id) {
                    btn.classList.add('correct');
                }
            });
            
            // Show correct answer text
            correctAnswerTextElement.innerHTML = `
                ${correctAnswer.image_url ? `<img src="${correctAnswer.image_url}" alt="${correctAnswer.answer_text}" class="answer-image">` : ''}
                <span>${correctAnswer.answer_text}</span>
            `;
        }
        
        correctAnswerElement.classList.remove('hidden');
        nextQuestionBtn.classList.remove('hidden');
        
        // Add event listener to next question button
        nextQuestionBtn.onclick = function() {
            currentQuestionIndex++;
            if (currentQuestionIndex < quizData.questions.length) {
                showQuestion(currentQuestionIndex);
            } else {
                showResults();
            }
        };
    }
    
    // Function to show results
    function showResults() {
        clearInterval(timer);
        window.location.href = `/quiz_results/${quizData.id}/${participantId}`;
    }
});