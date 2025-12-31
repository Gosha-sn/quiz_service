# Quiz Application

A web application that allows users to create and take quizzes with image-based multiple-choice questions.

## Features

- Create quizzes with multiple-choice questions
- Add images to answer options
- Take quizzes with a 30-second timer per question
- Automatic display of correct answers after timer expires
- View quiz results

## Tech Stack

- Backend: Python (Flask)
- Database: MySQL
- Frontend: HTML, CSS, JavaScript

## Installation

1. Clone the repository
2. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```
3. Install and start MySQL server
4. Update database configuration in `app.py` if needed

## Configuration

Update the database configuration in `app.py`:
```python
DB_CONFIG = {
    'host': 'localhost',
    'user': 'your_mysql_username',
    'password': 'your_mysql_password',
    'database': 'quiz_db'
}
```

## Running the Application

1. Make sure MySQL server is running
2. Run the application:
   ```
   python app.py
   ```
3. Open your browser and go to `http://localhost:5000`

## Usage

1. Go to the main page
2. Create a new quiz by clicking "Create Quiz"
3. Add questions and answers with optional images
4. Share the quiz with others
5. Others can take the quiz and see results after completion

## Project Structure

```
quiz_app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── database_schema.sql    # Database schema
├── templates/             # HTML templates
│   ├── index.html         # Main page
│   ├── create_quiz.html   # Quiz creation page
│   ├── take_quiz.html     # Quiz taking page
│   └── results.html       # Results page
└── static/                # Static assets
    ├── css/
    │   └── style.css      # Styles
    ├── js/
    │   ├── main.js        # Main page JavaScript
    │   ├── create_quiz.js # Quiz creation JavaScript
    │   ├── take_quiz.js   # Quiz taking JavaScript
    │   └── results.js     # Results page JavaScript
    └── images/            # Image assets
```

## Database Schema

The application uses the following tables:
- `quizzes`: Stores quiz information
- `questions`: Stores questions for each quiz
- `answers`: Stores answer options for each question
- `participants`: Stores quiz participants
- `responses`: Stores participant answers to questions