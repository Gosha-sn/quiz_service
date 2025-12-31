document.addEventListener('DOMContentLoaded', function() {
    const questionsContainer = document.getElementById('questions-container');
    const addQuestionBtn = document.getElementById('add-question-btn');
    const quizForm = document.getElementById('quiz-form');
    
    let questionCount = 0;
    
    // Add event listener to the "Add Question" button
    addQuestionBtn.addEventListener('click', addQuestion);
    
    // Add event listener to the form submit
    quizForm.addEventListener('submit', submitQuiz);
    
    // Function to add a new question
    function addQuestion() {
        questionCount++;
        const questionId = `question-${questionCount}`;
        
        const questionDiv = document.createElement('div');
        questionDiv.className = 'question-card';
        questionDiv.id = questionId;
        questionDiv.innerHTML = `
            <div class="form-group">
                <label for="question-text-${questionCount}">Question ${questionCount}:</label>
                <input type="text" id="question-text-${questionCount}" class="question-text" required placeholder="Enter question text...">
            </div>
            
            <div class="answers-container" id="answers-container-${questionCount}">
                <!-- Answers will be added here -->
            </div>
            
            <div class="form-group">
                <button type="button" class="btn secondary-btn add-answer-btn" data-question-id="${questionCount}">+ Add Answer</button>
                <button type="button" class="btn danger-btn remove-question-btn" data-question-id="${questionCount}">Remove Question</button>
            </div>
        `;
        
        questionsContainer.appendChild(questionDiv);
        
        // Add event listener to the new "Add Answer" button
        document.querySelector(`#${questionId} .add-answer-btn`).addEventListener('click', function() {
            addAnswer(questionCount);
        });
        
        // Add event listener to the new "Remove Question" button
        document.querySelector(`#${questionId} .remove-question-btn`).addEventListener('click', function() {
            removeQuestion(questionCount);
        });
    }
    
    // Function to add an answer to a question
    function addAnswer(questionId) {
        const answerCount = document.querySelectorAll(`#answers-container-${questionId} .answer-option`).length + 1;
        
        const answerDiv = document.createElement('div');
        answerDiv.className = 'answer-option';
        answerDiv.innerHTML = `
            <input type="text" class="answer-text" placeholder="Answer text..." required>
            <input type="text" class="answer-image" placeholder="Image URL (optional)">
            <label>
                <input type="checkbox" class="correct-answer"> Correct Answer
            </label>
            <button type="button" class="btn danger-btn remove-answer-btn">Remove</button>
        `;
        
        document.getElementById(`answers-container-${questionId}`).appendChild(answerDiv);
        
        // Add event listener to the new "Remove Answer" button
        answerDiv.querySelector('.remove-answer-btn').addEventListener('click', function() {
            this.parentElement.remove();
        });
    }
    
    // Function to remove a question
    function removeQuestion(questionId) {
        document.getElementById(`question-${questionId}`).remove();
    }
    
    // Function to submit the quiz
    function submitQuiz(event) {
        event.preventDefault();
        
        const title = document.getElementById('quiz-title').value;
        const description = document.getElementById('quiz-description').value;
        
        const questions = [];
        
        // Get all question containers
        document.querySelectorAll('.question-card').forEach((questionCard, index) => {
            const questionText = questionCard.querySelector('.question-text').value;
            
            if (!questionText) {
                alert(`Please enter a question for Question ${index + 1}`);
                return;
            }
            
            const answers = [];
            const answerElements = questionCard.querySelectorAll('.answer-option');
            
            if (answerElements.length < 2) {
                alert(`Question ${index + 1} must have at least 2 answers`);
                return;
            }
            
            let correctAnswerCount = 0;
            
            answerElements.forEach(answerElement => {
                const answerText = answerElement.querySelector('.answer-text').value;
                const image = answerElement.querySelector('.answer-image').value;
                const isCorrect = answerElement.querySelector('.correct-answer').checked;
                
                if (!answerText) {
                    alert(`Please enter an answer for Question ${index + 1}`);
                    return;
                }
                
                if (isCorrect) {
                    correctAnswerCount++;
                }
                
                answers.push({
                    text: answerText,
                    image: image,
                    is_correct: isCorrect
                });
            });
            
            if (correctAnswerCount !== 1) {
                alert(`Question ${index + 1} must have exactly one correct answer`);
                return;
            }
            
            questions.push({
                question: questionText,
                answers: answers
            });
        });
        
        if (questions.length === 0) {
            alert('Please add at least one question');
            return;
        }
        
        // Prepare the data to send
        const quizData = {
            title: title,
            description: description,
            questions: questions
        };
        
        // Show loading indicator
        const submitBtn = quizForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating...';
        submitBtn.disabled = true;
        
        // Send the data to the server
        fetch('/create_quiz', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(quizData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Quiz created successfully!');
                window.location.href = '/';
            } else {
                alert('Error creating quiz: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error creating quiz');
        })
        .finally(() => {
            // Restore button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        });
    }
});