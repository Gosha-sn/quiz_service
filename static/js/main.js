document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
    const takeQuizBtn = document.getElementById('take-quiz-btn');
    const quizListSection = document.getElementById('quiz-list');
    const quizzesContainer = document.getElementById('quizzes-container');

    // Load quizzes on page load
    loadQuizzes();

    // Function to load quizzes from the server
    function loadQuizzes() {
        fetch('/quizzes')
            .then(response => response.json())
            .then(quizzes => {
                displayQuizzes(quizzes);
            })
            .catch(error => {
                console.error('Error loading quizzes:', error);
                alert('Error loading quizzes');
            });
    }

    // Function to display quizzes
    function displayQuizzes(quizzes) {
        quizzesContainer.innerHTML = '';

        if (quizzes.length === 0) {
            quizzesContainer.innerHTML = '<p>No quizzes available yet.</p>';
            return;
        }

        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-list-item';
            quizCard.innerHTML = `
                <div class="quiz-info">
                    <h3 class="quiz-title">${quiz.title}</h3>
                    <p class="quiz-description">${quiz.description || 'No description'}</p>
                </div>
                <div>
                    <button class="btn take-quiz-btn" data-quiz-id="${quiz.id}">Take Quiz</button>
                    <button class="btn secondary" onclick="window.location.href='/leaderboard/${quiz.id}/view'">Leaderboard</button>
                    <button class="delete-quiz-btn" data-quiz-id="${quiz.id}">Delete</button>
                </div>
            `;
            quizzesContainer.appendChild(quizCard);
        });

        // Add event listeners to the "Take Quiz" buttons
        document.querySelectorAll('.take-quiz-btn').forEach(button => {
            button.addEventListener('click', function() {
                const quizId = this.getAttribute('data-quiz-id');
                window.location.href = `/quiz/${quizId}`;
            });
        });

        // Add event listeners to the "Delete Quiz" buttons
        document.querySelectorAll('.delete-quiz-btn').forEach(button => {
            button.addEventListener('click', function() {
                const quizId = this.getAttribute('data-quiz-id');
                deleteQuiz(quizId);
            });
        });
    }

    // Function to delete a quiz
    function deleteQuiz(quizId) {
        if (confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
            fetch(`/delete_quiz/${quizId}`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Quiz deleted successfully');
                    loadQuizzes(); // Reload the quiz list
                } else {
                    alert('Error deleting quiz: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error deleting quiz');
            });
        }
    }
});