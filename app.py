import mysql.connector
from flask import Flask, request, jsonify, render_template
import os
import uuid
from datetime import datetime
import json
from db_config import DB_CONFIG

app = Flask(__name__)

# In-memory storage for active quiz sessions
active_sessions = {}

def get_db_connection():
    """Create a database connection"""
    return mysql.connector.connect(**DB_CONFIG)

def init_db():
    """Initialize the database with required tables"""
    try:
        conn = mysql.connector.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password']
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute("CREATE DATABASE IF NOT EXISTS quiz_db")
        cursor.execute("USE quiz_db")
        
        # Create quizzes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quizzes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_code VARCHAR(10) UNIQUE
            )
        """)
        
        # Create questions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS questions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quiz_id INT NOT NULL,
                question_text TEXT NOT NULL,
                question_number INT DEFAULT 1,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            )
        """)
        
        # Create answers table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS answers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                question_id INT NOT NULL,
                answer_text VARCHAR(255) NOT NULL,
                image_url VARCHAR(500),
                is_correct BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
            )
        """)
        
        # Create participants table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS participants (
                id INT AUTO_INCREMENT PRIMARY KEY,
                quiz_id INT NOT NULL,
                participant_name VARCHAR(255) NOT NULL,
                session_code VARCHAR(10),
                is_host BOOLEAN DEFAULT FALSE,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
            )
        """)
        
        # Create responses table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS responses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                participant_id INT NOT NULL,
                question_id INT NOT NULL,
                answer_id INT,
                responded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
                FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
                FOREIGN KEY (answer_id) REFERENCES answers(id) ON DELETE SET NULL
            )
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        print("Database initialized successfully")
    except mysql.connector.Error as err:
        print(f"Error initializing database: {err}")
        return False
    return True

def check_and_add_columns():
    """Check if required columns exist in tables, add if missing"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if session_code column exists in quizzes table
        cursor.execute("SHOW COLUMNS FROM quizzes LIKE 'session_code'")
        result = cursor.fetchone()
        
        if not result:
            # Add session_code column if it doesn't exist
            cursor.execute("ALTER TABLE quizzes ADD COLUMN session_code VARCHAR(10) UNIQUE")
            print("Added session_code column to quizzes table")
        
        # Check if session_code column exists in participants table
        cursor.execute("SHOW COLUMNS FROM participants LIKE 'session_code'")
        result = cursor.fetchone()
        
        if not result:
            # Add session_code column if it doesn't exist
            cursor.execute("ALTER TABLE participants ADD COLUMN session_code VARCHAR(10)")
            print("Added session_code column to participants table")
        
        # Check if is_host column exists in participants table
        cursor.execute("SHOW COLUMNS FROM participants LIKE 'is_host'")
        result = cursor.fetchone()
        
        if not result:
            # Add is_host column if it doesn't exist
            cursor.execute("ALTER TABLE participants ADD COLUMN is_host BOOLEAN DEFAULT FALSE")
            print("Added is_host column to participants table")
        
        # Check if question_number column exists in questions table
        cursor.execute("SHOW COLUMNS FROM questions LIKE 'question_number'")
        result = cursor.fetchone()
        
        if not result:
            # Add question_number column if it doesn't exist
            cursor.execute("ALTER TABLE questions ADD COLUMN question_number INT DEFAULT 1")
            print("Added question_number column to questions table")
        
        cursor.close()
        conn.close()
        return True
    except mysql.connector.Error as err:
        print(f"Error checking/adding columns: {err}")
        return False

# Route to serve the main page (MyQuiz-like interface)
@app.route('/')
def index():
    return render_template('myquiz_index.html')

# Route to create a new quiz
@app.route('/create_quiz', methods=['GET', 'POST'])
def create_quiz():
    if request.method == 'POST':
        data = request.json
        title = data.get('title')
        description = data.get('description', '')
        questions = data.get('questions', [])
        
        # Generate a unique session code
        session_code = str(uuid.uuid4())[:6].upper()
        
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Insert the quiz
            cursor.execute(
                "INSERT INTO quizzes (title, description, session_code) VALUES (%s, %s, %s)",
                (title, description, session_code)
            )
            quiz_id = cursor.lastrowid
            
            # Insert questions and answers
            for idx, question_data in enumerate(questions):
                question_text = question_data.get('question')
                answers = question_data.get('answers', [])

                cursor.execute(
                    "INSERT INTO questions (quiz_id, question_text, question_number) VALUES (%s, %s, %s)",
                    (quiz_id, question_text, idx + 1)  # Use 1-based index for question number
                )
                question_id = cursor.lastrowid

                for answer_data in answers:
                    answer_text = answer_data.get('text')
                    image_url = answer_data.get('image', '')
                    is_correct = answer_data.get('is_correct', False)

                    cursor.execute(
                        "INSERT INTO answers (question_id, answer_text, image_url, is_correct) VALUES (%s, %s, %s, %s)",
                        (question_id, answer_text, image_url, is_correct)
                    )
            
            conn.commit()
            cursor.close()
            conn.close()
            
            return jsonify({'success': True, 'quiz_id': quiz_id, 'session_code': session_code})
        except mysql.connector.Error as err:
            print(f"Database error: {err}")
            return jsonify({'success': False, 'error': str(err)}), 500
    
    return render_template('create_quiz.html')

# Route to get all quizzes
@app.route('/quizzes')
def get_quizzes():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT id, title, description, created_at FROM quizzes")
        quizzes = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify(quizzes)
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500

# Route to delete a quiz
@app.route('/delete_quiz/<int:quiz_id>', methods=['DELETE'])
def delete_quiz(quiz_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete the quiz (and related questions, answers, participants, responses due to CASCADE)
        cursor.execute("DELETE FROM quizzes WHERE id = %s", (quiz_id,))
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'success': False, 'error': str(err)}), 500

# Route to get a specific quiz (API endpoint)
@app.route('/api/quiz/<int:quiz_id>')
def get_quiz(quiz_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get quiz details
        cursor.execute("SELECT id, title, description FROM quizzes WHERE id = %s", (quiz_id,))
        quiz = cursor.fetchone()
        
        if not quiz:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Get questions and answers for the quiz
        cursor.execute("""
            SELECT q.id, q.question_text, q.question_number,
                   a.id as answer_id, a.answer_text, a.image_url, a.is_correct
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            WHERE q.quiz_id = %s
            ORDER BY q.question_number, q.id, a.id
        """, (quiz_id,))
        
        results = cursor.fetchall()
        
        # Organize the data
        questions = {}
        for row in results:
            q_id = row['id']
            if q_id not in questions:
                questions[q_id] = {
                    'id': q_id,
                    'question_text': row['question_text'],
                    'question_number': row['question_number'],
                    'answers': []
                }
            
            if row['answer_id']:
                questions[q_id]['answers'].append({
                    'id': row['answer_id'],
                    'answer_text': row['answer_text'],
                    'image_url': row['image_url'],
                    'is_correct': row['is_correct']
                })
        
        quiz['questions'] = list(questions.values())
        
        cursor.close()
        conn.close()
        
        return jsonify(quiz)
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500

# Route to get quiz by session code
@app.route('/api/quiz_by_code/<session_code>')
def get_quiz_by_code(session_code):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get quiz details by session code
        cursor.execute("SELECT id, title, description FROM quizzes WHERE session_code = %s", (session_code,))
        quiz = cursor.fetchone()
        
        if not quiz:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Get questions and answers for the quiz
        cursor.execute("""
            SELECT q.id, q.question_text, q.question_number,
                   a.id as answer_id, a.answer_text, a.image_url, a.is_correct
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            WHERE q.quiz_id = %s
            ORDER BY q.question_number, q.id, a.id
        """, (quiz['id'],))
        
        results = cursor.fetchall()
        
        # Organize the data
        questions = {}
        for row in results:
            q_id = row['id']
            if q_id not in questions:
                questions[q_id] = {
                    'id': q_id,
                    'question_text': row['question_text'],
                    'question_number': row['question_number'],
                    'answers': []
                }
            
            if row['answer_id']:
                questions[q_id]['answers'].append({
                    'id': row['answer_id'],
                    'answer_text': row['answer_text'],
                    'image_url': row['image_url'],
                    'is_correct': row['is_correct']
                })
        
        quiz['questions'] = list(questions.values())
        
        cursor.close()
        conn.close()
        
        return jsonify(quiz)
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500

# Route to get leaderboard for a quiz
@app.route('/leaderboard/<int:quiz_id>')
def get_leaderboard(quiz_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get quiz details
        cursor.execute("SELECT title FROM quizzes WHERE id = %s", (quiz_id,))
        quiz = cursor.fetchone()
        if not quiz:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Calculate scores for each participant
        cursor.execute("""
            SELECT p.participant_name, 
                   COUNT(r.id) as total_questions,
                   SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
            FROM participants p
            LEFT JOIN responses r ON p.id = r.participant_id
            LEFT JOIN answers a ON r.answer_id = a.id
            WHERE p.quiz_id = %s
            GROUP BY p.id, p.participant_name
            ORDER BY correct_answers DESC, total_questions ASC
        """, (quiz_id,))
        
        leaderboard = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return jsonify({
            'quiz_title': quiz['title'],
            'leaderboard': leaderboard
        })
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500

# Route to join a quiz session
@app.route('/join_quiz', methods=['GET'])
def join_quiz_page():
    return render_template('join_quiz.html')

# Route for host to manage the quiz
@app.route('/host/<session_code>')
def host_quiz(session_code):
    return render_template('host.html')

# Route for participants to join the quiz
@app.route('/quiz/<session_code>')
def participant_quiz(session_code):
    return render_template('participant.html')

# Route to take a quiz (serves the quiz page) - for individual quizzes
@app.route('/quiz/<int:quiz_id>')
def take_quiz_page(quiz_id):
    return render_template('take_quiz.html')

# Route to view leaderboard
@app.route('/leaderboard/<int:quiz_id>/view')
def view_leaderboard(quiz_id):
    return render_template('leaderboard.html', quiz_id=quiz_id)

# Route to start a quiz session
@app.route('/start_session/<session_code>', methods=['POST'])
def start_session(session_code):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get quiz details by session code
        cursor.execute("SELECT id, title FROM quizzes WHERE session_code = %s", (session_code,))
        quiz = cursor.fetchone()
        
        if not quiz:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Quiz not found'}), 404
        
        # Get quiz questions to know the total
        cursor.execute("SELECT COUNT(*) as total_questions FROM questions WHERE quiz_id = %s", (quiz['id'],))
        total_questions_result = cursor.fetchone()
        total_questions = total_questions_result['total_questions'] if total_questions_result else 0
        
        # Create a session in memory
        active_sessions[session_code] = {
            'quiz_id': quiz['id'],
            'current_question': 0,
            'status': 'waiting',  # waiting, active, results
            'participants': [],
            'responses': {},  # Track responses for each question
            'total_questions': total_questions
        }
        
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'quiz_id': quiz['id']})
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'success': False, 'error': str(err)}), 500

# Route to join a quiz session
@app.route('/join_session/<session_code>', methods=['POST'])
def join_session(session_code):
    try:
        data = request.json
        participant_name = data.get('participant_name')
        is_host = data.get('is_host', False)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get quiz ID by session code
        cursor.execute("SELECT id FROM quizzes WHERE session_code = %s", (session_code,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Quiz not found'}), 404
        
        quiz_id = result[0]
        
        # Insert participant
        cursor.execute(
            "INSERT INTO participants (quiz_id, participant_name, session_code, is_host) VALUES (%s, %s, %s, %s)",
            (quiz_id, participant_name, session_code, is_host)
        )
        participant_id = cursor.lastrowid
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Add to active session if it exists, otherwise create it
        if session_code not in active_sessions:
            # Get total questions for the quiz to initialize the session
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total_questions FROM questions WHERE quiz_id = %s", (quiz_id,))
            total_questions_result = cursor.fetchone()
            total_questions = total_questions_result[0] if total_questions_result else 0
            cursor.close()
            conn.close()

            active_sessions[session_code] = {
                'quiz_id': quiz_id,
                'current_question': 0,
                'status': 'waiting',  # waiting, active, results
                'participants': [],
                'responses': {},  # Track responses for each question
                'total_questions': total_questions
            }

        # Add participant to the session
        participant_info = {
            'id': participant_id,
            'name': participant_name,
            'is_host': is_host,
            'score': 0  # Initialize score
        }
        active_sessions[session_code]['participants'].append(participant_info)

        return jsonify({'success': True, 'participant_id': participant_id, 'is_host': is_host})
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'success': False, 'error': str(err)}), 500

# Route to get quiz session status
@app.route('/session_status/<session_code>')
def get_session_status(session_code):
    if session_code in active_sessions:
        session = active_sessions[session_code]
        # Add participant count to the response
        session['participant_count'] = len(session['participants'])
        return jsonify(session)
    else:
        # If session doesn't exist, check if it's a valid quiz and create the session
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, title FROM quizzes WHERE session_code = %s", (session_code,))
        quiz = cursor.fetchone()
        cursor.close()
        conn.close()

        if quiz:
            # Create the session in memory
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total_questions FROM questions WHERE quiz_id = %s", (quiz['id'],))
            total_questions_result = cursor.fetchone()
            total_questions = total_questions_result[0] if total_questions_result else 0
            cursor.close()
            conn.close()

            active_sessions[session_code] = {
                'quiz_id': quiz['id'],
                'current_question': 0,
                'status': 'waiting',
                'participants': [],
                'responses': {},
                'total_questions': total_questions
            }

            session = active_sessions[session_code]
            session['participant_count'] = len(session['participants'])
            return jsonify(session)
        else:
            return jsonify({'error': 'Session not found'}), 404

# Route to get participant responses for the host
@app.route('/responses/<session_code>')
def get_responses(session_code):
    if session_code in active_sessions:
        session = active_sessions[session_code]
        responses = session.get('responses', {})
        current_question = session.get('current_question', 0)
        participants = session.get('participants', [])
        
        # Get participant names for the responses
        response_data = {
            'responses': responses,
            'current_question': current_question,
            'participants': participants
        }
        
        return jsonify(response_data)
    else:
        return jsonify({'error': 'Session not found'}), 404

# Route to start a quiz (for individual quizzes)
@app.route('/start_quiz/<int:quiz_id>', methods=['POST'])
def start_quiz(quiz_id):
    try:
        data = request.json
        participant_name = data.get('participant_name')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert participant
        cursor.execute(
            "INSERT INTO participants (quiz_id, participant_name) VALUES (%s, %s)",
            (quiz_id, participant_name)
        )
        participant_id = cursor.lastrowid
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True, 'participant_id': participant_id})
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'success': False, 'error': str(err)}), 500

# Route to submit an answer
@app.route('/submit_answer', methods=['POST'])
def submit_answer():
    try:
        data = request.json
        participant_id = data.get('participant_id')
        question_id = data.get('question_id')
        answer_id = data.get('answer_id')
        session_code = data.get('session_code')
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert the response
        cursor.execute(
            "INSERT INTO responses (participant_id, question_id, answer_id) VALUES (%s, %s, %s)",
            (participant_id, question_id, answer_id)
        )
        
        conn.commit()
        cursor.close()
        conn.close()
        
        # Update session responses if it's a live session
        if session_code and session_code in active_sessions:
            session = active_sessions[session_code]
            current_q = session.get('current_question', 0)
            
            if str(current_q) not in session['responses']:
                session['responses'][str(current_q)] = {}
            
            session['responses'][str(current_q)][str(participant_id)] = {
                'answer_id': answer_id,
                'timestamp': datetime.now().isoformat()
            }
        
        return jsonify({'success': True})
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'success': False, 'error': str(err)}), 500

# Route to get quiz results
@app.route('/quiz_results/<int:quiz_id>/<int:participant_id>')
def get_quiz_results(quiz_id, participant_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get participant info
        cursor.execute(
            "SELECT participant_name FROM participants WHERE id = %s AND quiz_id = %s",
            (participant_id, quiz_id)
        )
        participant = cursor.fetchone()
        
        if not participant:
            cursor.close()
            conn.close()
            return jsonify({'error': 'Participant not found'}), 404
        
        # Get all questions and answers for the quiz
        cursor.execute("""
            SELECT q.id as question_id, q.question_text, q.question_number,
                   a.id as answer_id, a.answer_text, a.is_correct,
                   r.answer_id as selected_answer_id
            FROM questions q
            LEFT JOIN answers a ON q.id = a.question_id
            LEFT JOIN responses r ON r.question_id = q.id AND r.participant_id = %s
            WHERE q.quiz_id = %s
            ORDER BY q.question_number, q.id, a.id
        """, (participant_id, quiz_id))
        
        results = cursor.fetchall()
        
        # Calculate score
        correct_answers = 0
        total_questions = 0
        for row in results:
            if row['selected_answer_id'] and row['is_correct']:
                correct_answers += 1
            if row['answer_id']:  # Count each question once
                total_questions += 1
        
        # Organize the data
        questions = {}
        for row in results:
            q_id = row['question_id']
            if q_id not in questions:
                questions[q_id] = {
                    'id': q_id,
                    'question_text': row['question_text'],
                    'question_number': row['question_number'],
                    'answers': [],
                    'selected_answer_id': row['selected_answer_id'],
                    'is_correct': False
                }
            
            if row['answer_id']:
                answer_info = {
                    'id': row['answer_id'],
                    'answer_text': row['answer_text'],
                    'is_correct': row['is_correct']
                }
                questions[q_id]['answers'].append(answer_info)
                
                # Check if this is the selected answer and if it's correct
                if row['selected_answer_id'] == row['answer_id'] and row['is_correct']:
                    questions[q_id]['is_correct'] = True
        
        quiz_results = {
            'participant_name': participant['participant_name'],
            'questions': list(questions.values()),
            'total_questions': total_questions,
            'correct_answers': correct_answers,
            'score': f"{correct_answers}/{total_questions}",
            'percentage': total_questions > 0 and round((correct_answers / total_questions) * 100, 1) or 0
        }
        
        cursor.close()
        conn.close()
        
        return jsonify(quiz_results)
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return jsonify({'error': str(err)}), 500

# Route to advance to next question
@app.route('/next_question/<session_code>', methods=['POST'])
def next_question(session_code):
    if session_code in active_sessions:
        session = active_sessions[session_code]
        total_questions = session.get('total_questions', 0)
        
        # Check if we're at the last question
        if session['current_question'] >= total_questions - 1:
            # End the quiz if it's the last question
            session['status'] = 'results'
            return jsonify({'success': True, 'status': 'quiz_ended', 'current_question': session['current_question']})
        else:
            # Move to next question
            session['current_question'] += 1
            session['status'] = 'active'  # Set to active when moving to next question
            return jsonify({'success': True, 'status': 'next_question', 'current_question': session['current_question']})
    else:
        return jsonify({'error': 'Session not found'}), 404

# Route to start the quiz (move from waiting to active)
@app.route('/start_quiz_now/<session_code>', methods=['POST'])
def start_quiz_now(session_code):
    if session_code in active_sessions:
        active_sessions[session_code]['status'] = 'active'
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Session not found'}), 404

# Route to end the quiz
@app.route('/end_quiz/<session_code>', methods=['POST'])
def end_quiz(session_code):
    if session_code in active_sessions:
        active_sessions[session_code]['status'] = 'results'
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Session not found'}), 404

# Route to get live quiz lobby
@app.route('/lobby/<session_code>')
def live_quiz_lobby(session_code):
    # Check if session exists
    if session_code not in active_sessions:
        # Try to create the session if it doesn't exist
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, title FROM quizzes WHERE session_code = %s", (session_code,))
        quiz = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not quiz:
            return "Quiz not found", 404
        
        # Create session in memory
        # Get total questions for the quiz
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total_questions FROM questions WHERE quiz_id = %s", (quiz['id'],))
        total_questions_result = cursor.fetchone()
        total_questions = total_questions_result[0] if total_questions_result else 0
        cursor.close()
        conn.close()
        
        active_sessions[session_code] = {
            'quiz_id': quiz['id'],
            'current_question': 0,
            'status': 'waiting',  # waiting, active, results
            'participants': [],
            'responses': {},  # Track responses for each question
            'total_questions': total_questions
        }
    
    return render_template('lobby.html', session_code=session_code)

# Route to get lobby participants
@app.route('/lobby_participants/<session_code>')
def get_lobby_participants(session_code):
    if session_code in active_sessions:
        participants = active_sessions[session_code]['participants']
        return jsonify({'participants': participants})
    else:
        return jsonify({'error': 'Session not found'}), 404

# Route to view live quiz results
@app.route('/live_results/<session_code>')
def live_quiz_results(session_code):
    if session_code not in active_sessions:
        return "Session not found", 404
    
    # Get quiz ID from session
    quiz_id = active_sessions[session_code]['quiz_id']
    
    # Get results from database
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get quiz details
        cursor.execute("SELECT title FROM quizzes WHERE id = %s", (quiz_id,))
        quiz = cursor.fetchone()
        if not quiz:
            cursor.close()
            conn.close()
            return "Quiz not found", 404
        
        # Calculate scores for each participant
        cursor.execute("""
            SELECT p.participant_name, 
                   COUNT(r.id) as total_questions,
                   SUM(CASE WHEN a.is_correct = 1 THEN 1 ELSE 0 END) as correct_answers
            FROM participants p
            LEFT JOIN responses r ON p.id = r.participant_id
            LEFT JOIN answers a ON r.answer_id = a.id
            WHERE p.session_code = %s
            GROUP BY p.id, p.participant_name
            ORDER BY correct_answers DESC, total_questions ASC
        """, (session_code,))
        
        leaderboard = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return render_template('live_results.html', 
                               session_code=session_code, 
                               quiz_title=quiz['title'], 
                               leaderboard=leaderboard)
    except mysql.connector.Error as err:
        print(f"Database error: {err}")
        return "Database error", 500

# Route to view all quizzes page
@app.route('/browse_quizzes')
def browse_quizzes():
    return render_template('browse_quizzes.html')

# Route to create a live quiz lobby (create a new session)
@app.route('/create_lobby', methods=['POST'])
def create_lobby():
    try:
        data = request.json
        quiz_id = data.get('quiz_id')
        
        # Get quiz details
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT session_code, title FROM quizzes WHERE id = %s", (quiz_id,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if not result:
            return jsonify({'error': 'Quiz not found'}), 404
        
        session_code = result['session_code']
        
        # Get total questions for the quiz
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as total_questions FROM questions WHERE quiz_id = %s", (quiz_id,))
        total_questions_result = cursor.fetchone()
        total_questions = total_questions_result[0] if total_questions_result else 0
        cursor.close()
        conn.close()
        
        # Initialize the session in memory
        if session_code not in active_sessions:
            active_sessions[session_code] = {
                'quiz_id': quiz_id,
                'current_question': 0,
                'status': 'waiting',  # waiting, active, results
                'participants': [],
                'responses': {},  # Track responses for each question
                'total_questions': total_questions
            }
        
        return jsonify({'success': True, 'session_code': session_code})
    except Exception as err:
        print(f"Error creating lobby: {err}")
        return jsonify({'error': str(err)}), 500

# Route to start lobby (initialize the lobby for a quiz)
@app.route('/start_lobby/<int:quiz_id>')
def start_lobby(quiz_id):
    # Get quiz details
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT session_code, title FROM quizzes WHERE id = %s", (quiz_id,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not result:
        return "Quiz not found", 404
    
    session_code = result['session_code']
    
    # Get total questions for the quiz
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as total_questions FROM questions WHERE quiz_id = %s", (quiz_id,))
    total_questions_result = cursor.fetchone()
    total_questions = total_questions_result[0] if total_questions_result else 0
    cursor.close()
    conn.close()
    
    # Initialize the session in memory
    if session_code not in active_sessions:
        active_sessions[session_code] = {
            'quiz_id': quiz_id,
            'current_question': 0,
            'status': 'waiting',  # waiting, active, results
            'participants': [],
            'responses': {},  # Track responses for each question
            'total_questions': total_questions
        }
    
    # Redirect to the lobby page
    return render_template('lobby.html', session_code=session_code)

# Route to generate QR code for lobby
@app.route('/qr_code/<session_code>')
def generate_qr_code(session_code):
    # In a real implementation, you would generate an actual QR code
    # For now, we'll return a placeholder response
    lobby_url = f"{request.url_root}quiz/{session_code}"
    return jsonify({
        'session_code': session_code,
        'qr_url': lobby_url,
        'message': 'QR code would be generated here in a full implementation'
    })

# Route to get session status (for participant monitoring)
@app.route('/get_session_status/<session_code>')
def get_session_status_detailed(session_code):
    if session_code in active_sessions:
        session = active_sessions[session_code]
        # Add participant count to the response
        session['participant_count'] = len(session['participants'])
        return jsonify(session)
    else:
        # If session doesn't exist, check if it's a valid quiz
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, title FROM quizzes WHERE session_code = %s", (session_code,))
        quiz = cursor.fetchone()
        cursor.close()
        conn.close()
        
        if quiz:
            # Create the session in memory
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as total_questions FROM questions WHERE quiz_id = %s", (quiz['id'],))
            total_questions_result = cursor.fetchone()
            total_questions = total_questions_result[0] if total_questions_result else 0
            cursor.close()
            conn.close()
            
            active_sessions[session_code] = {
                'quiz_id': quiz['id'],
                'current_question': 0,
                'status': 'waiting',
                'participants': [],
                'responses': {},
                'total_questions': total_questions
            }
            
            session = active_sessions[session_code]
            session['participant_count'] = len(session['participants'])
            return jsonify(session)
        else:
            return jsonify({'error': 'Session not found'}), 404

if __name__ == '__main__':
    print("Starting the application...")
    print("Make sure MySQL server is running before starting the application.")
    print("If MySQL is not installed, please install it first:")
    print("1. Download MySQL from https://dev.mysql.com/downloads/mysql/")
    print("2. Install and start the MySQL server")
    print("3. Update the DB_CONFIG in db_config.py with your MySQL credentials")
    print("4. Run: python app.py")
    print("\nThe application will be available at http://localhost:5000")
    
    # Initialize database
    if init_db():
        # Check and add required columns if needed
        check_and_add_columns()
        print("\nStarting the application...")
        app.run(debug=True, host='0.0.0.0', port=5000)
    else:
        print("\nFailed to initialize database. Please check your MySQL connection.")
        print("You can also use an alternative database like SQLite by modifying the code.")