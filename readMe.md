# Interview Website

This is a simple interview platform that allows users to participate in an automated interview process. The website collects video responses to interview questions, processes the videos using a Python API to extract and transcribe speech, and scores the responses based on the presence of predefined keywords. The score is then displayed to the user at the end of the interview.

## Features
- Simple user interface for conducting an interview.
- Ability to upload video responses for each interview question.
- Speech-to-text transcription using Python's `speech_recognition` library.
- Automatic scoring of responses based on keyword matching.
- Real-time results at the end of the interview.

## Tech Stack
- **Frontend**: HTML, CSS, EJS
- **Backend**: Node.js, Express.js
- **Python API**: Flask
- **Database**: None (Currently no database, but can be added for storing results)
- **File Handling**: Multer (for video uploads)
- **Speech-to-Text**: Google Speech API (via `speech_recognition`)

## Setup Instructions

### 1. Install Dependencies
You need to install the dependencies for both the Node.js backend and the Python API.


#### Node.js Backend:
Navigate to the project folder and install the required packages:
```bash
npm install express multer axios form-data fs path
```

### Python API:

In the `python_api/` folder, create a `requirements.txt` file with the following contents:
```txt
flask
flask-cors
speechrecognition
pydub
requests
```

Then, install the dependencies using:
```bash
pip install -r requirements.txt
```
### 2. Install FFmpeg (Required for Audio Processing)
The Python API uses FFmpeg to extract audio from video files. You must install FFmpeg manually before running the application.

Install FFmpeg on your machine. Follow the installation guide for your platform: FFmpeg Installation Guide(https://ffmpeg.org/download.html).

After installing FFmpeg, run the following command to ensure it is properly installed:
```bash
ffmpeg -version
```
Then, install the ffmpeg Python package:
```bash
pip install ffmpeg
```
This step ensures that the Python API can use FFmpeg for audio extraction.

### 3. Run the Project
Start Node.js Backend:
In the root directory of the project, run the following command to start the server:
```bash
node index.js
```
This will start the Node.js backend on http://localhost:3000.

Start Python API:
In the python_api/ directory, run the following command to start the Flask API:
```bash
python app.py
```
This will start the Python API on http://127.0.0.1:5001.

### 4. Access the Interview Website
Open your browser and navigate to http://localhost:3000 to start the interview process.

### 5. Upload a Video
After submitting your initial details, the interview questions will be displayed one by one. For each question, upload a video response. The system will process the video, transcribe the speech, and provide a score based on keywords for the respective question.

## Database Setup

Create a PostgreSQL database and run the following query to create the `users` table:

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255)
);
```

## How It Works
1. The user starts the interview by visiting the homepage.
2. A set of predefined questions is shown to the user one by one.
3. The user uploads a video answer for each question.
4. The backend processes the video:
    - The video file is sent to a Python API, where it is extracted for audio.
    - The audio is transcribed into text.
    - The response is evaluated based on predefined keywords for each question.
5. The score for each response is accumulated.
6. At the end of the interview, the total score is displayed.


## Customization
- You can change the set of questions by modifying the questions array in the index.js file.
- You can also update the keyword list for each question in the Python API by modifying the keywords array in app.py.

  
## License
This project is open-source and available under the MIT License.
