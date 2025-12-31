document.addEventListener('DOMContentLoaded', function() {
    // Get references to DOM elements
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
                quizzesContainer.innerHTML = '<p class="no-quizzes">Error loading quizzes. Please try again later.</p>';
            });
    }

    // Function to display quizzes
    function displayQuizzes(quizzes) {
        quizzesContainer.innerHTML = '';

        if (quizzes.length === 0) {
            quizzesContainer.innerHTML = '<p class="no-quizzes">No quizzes available yet.</p>';
            return;
        }

        quizzes.forEach(quiz => {
            const quizCard = document.createElement('div');
            quizCard.className = 'quiz-card';
            quizCard.innerHTML = `
                <div class="quiz-info">
                    <h3 class="quiz-title">${quiz.title}</h3>
                    <p class="quiz-description">${quiz.description || 'No description'}</p>
                    <div class="quiz-meta">
                        <span class="quiz-date">Created: ${new Date(quiz.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="quiz-actions">
                    <button class="btn take-quiz-btn" data-quiz-id="${quiz.id}">Take Quiz</button>
                    <button class="btn view-leaderboard-btn" data-quiz-id="${quiz.id}">Leaderboard</button>
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

        // Add event listeners to the "View Leaderboard" buttons
        document.querySelectorAll('.view-leaderboard-btn').forEach(button => {
            button.addEventListener('click', function() {
                const quizId = this.getAttribute('data-quiz-id');
                window.location.href = `/leaderboard/${quizId}/view`;
            });
        });
    }
});