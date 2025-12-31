document.addEventListener('DOMContentLoaded', function() {
    // Get URL parameters to extract quiz ID and participant ID
    const pathParts = window.location.pathname.split('/');
    const quizId = pathParts[pathParts.length - 2];
    const participantId = pathParts[pathParts.length - 1];

    if (!quizId || !participantId) {
        alert('Quiz ID or Participant ID not found in URL');
        return;
    }

    // Get references to DOM elements
    const participantNameElement = document.getElementById('participant-name');
    const questionsResultsElement = document.getElementById('questions-results');

    // Load the quiz results
    loadResults(quizId, participantId);

    // Function to load the quiz results
    function loadResults(quizId, participantId) {
        fetch(`/quiz_results/${quizId}/${participantId}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }

                // Display participant name
                participantNameElement.textContent = data.participant_name;

                // Display questions and answers
                questionsResultsElement.innerHTML = '';
                data.questions.forEach(question => {
                    const questionDiv = document.createElement('div');
                    questionDiv.className = 'question-result';
                    
                    let questionHTML = `<h3>${question.question_text}</h3><div class="answers-container">`;
                    
                    question.answers.forEach(answer => {
                        let className = '';
                        if (!question.selected_answer_id) {
                            // No answer was selected
                            className = answer.is_correct ? 'answer-result correct' : 'answer-result';
                        } else if (!answer.is_correct && question.selected_answer_id == answer.id) {
                            // Selected wrong answer
                            className = 'answer-result incorrect';
                        } else if (answer.is_correct && question.selected_answer_id != answer.id) {
                            // Correct answer but not selected
                            className = 'answer-result correct';
                        } else if (answer.is_correct && question.selected_answer_id == answer.id) {
                            // Correct answer and selected
                            className = 'answer-result correct selected';
                        } else {
                            className = 'answer-result';
                        }
                        
                        questionHTML += `
                            <div class="${className}">
                                <input type="radio" disabled ${question.selected_answer_id == answer.id ? 'checked' : ''}>
                                ${answer.image_url ? `<img src="${answer.image_url}" alt="${answer.answer_text}" class="answer-image">` : ''}
                                <span>${answer.answer_text}</span>
                                ${answer.is_correct ? '<span class="correct-indicator"> (Correct)</span>' : ''}
                                ${question.selected_answer_id == answer.id ? '<span class="selected-indicator"> (Your Answer)</span>' : ''}
                            </div>
                        `;
                    });
                    
                    questionHTML += '</div>';
                    questionDiv.innerHTML = questionHTML;
                    questionsResultsElement.appendChild(questionDiv);
                });
            })
            .catch(error => {
                console.error('Error loading results:', error);
                alert('Error loading results');
            });
    }
});