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
                // Don't show alert for this page as it's not critical
            });
    }

    // Function to display quizzes
    function displayQuizzes(quizzes) {
        quizzesContainer.innerHTML = '';

        if (quizzes.length === 0) {
            quizzesContainer.innerHTML = '<p class="no-quizzes">You haven\'t created any quizzes yet. <a href="/create_quiz">Create your first quiz!</a></p>';
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
                    <button class="btn create-lobby-btn" data-quiz-id="${quiz.id}">Create Lobby</button>
                    <button class="btn start-lobby-btn" data-quiz-id="${quiz.id}">Start Lobby</button>
                    <button class="btn view-leaderboard-btn" data-quiz-id="${quiz.id}">Leaderboard</button>
                    <button class="btn delete-quiz-btn" data-quiz-id="${quiz.id}">Delete</button>
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

        // Add event listeners to the "Create Lobby" buttons
        document.querySelectorAll('.create-lobby-btn').forEach(button => {
            button.addEventListener('click', function() {
                const quizId = this.getAttribute('data-quiz-id');
                createLobby(quizId);
            });
        });

        // Add event listeners to the "Start Lobby" buttons
        document.querySelectorAll('.start-lobby-btn').forEach(button => {
            button.addEventListener('click', function() {
                const quizId = this.getAttribute('data-quiz-id');
                window.location.href = `/start_lobby/${quizId}`;
            });
        });

        // Add event listeners to the "View Leaderboard" buttons
        document.querySelectorAll('.view-leaderboard-btn').forEach(button => {
            button.addEventListener('click', function() {
                const quizId = this.getAttribute('data-quiz-id');
                window.location.href = `/leaderboard/${quizId}/view`;
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

    // Function to create a lobby for a quiz
    function createLobby(quizId) {
        fetch('/create_lobby', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ quiz_id: quizId })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Redirect to the lobby page
                window.location.href = `/lobby/${data.session_code}`;
            } else {
                alert('Error creating lobby: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error creating lobby');
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