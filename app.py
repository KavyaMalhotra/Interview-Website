import traceback
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import speech_recognition as sr
import time
from pydub import AudioSegment

app = Flask(__name__)
CORS(app)

# Define keywords for each question
keywords = [
    ["experience", "skills", "background"],
    ["strength", "capable", "good"],
    ["weakness", "improve", "challenge"],
    ["job", "company", "career"],
    ["future", "five years", "goal"],
    ["problem", "challenge", "solution"],
    ["hire", "value", "team"],
    ["motivation", "drive", "passion"],
    ["teamwork", "collaborate", "group"],
    ["achievement", "accomplishment", "success"],
]

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/process", methods=["POST"])
def process_video():
    try:
        if "video" not in request.files:
            return jsonify({"error": "No video uploaded"}), 400

        video_file = request.files["video"]
        filename = f"video-{int(time.time())}.webm"
        video_path = os.path.join(UPLOAD_FOLDER, filename)
        video_file.save(video_path)

        print(f"📂 Received video file: {video_path}")

        # Extract audio from video
        audio_path = extract_audio(video_path)
        print(f"🎵 Extracted audio path: {audio_path}")

        # Convert speech to text
        transcript = audio_to_text(audio_path)
        print(f"📝 Transcript: {transcript}")

        # Validate question index
        question_index = request.form.get("questionIndex")
        if question_index is None or not question_index.isdigit():
            return jsonify({"error": "Invalid question index"}), 400
        
        question_index = int(question_index)
        if question_index >= len(keywords):
            return jsonify({"error": "Question index out of range"}), 400

        score = evaluate_answer(transcript, question_index)
        print(f"✅ Calculated score: {score}")

        # Delete files after processing
        os.remove(video_path)
        os.remove(audio_path)

        return jsonify({"score": score, "transcript": transcript})

    except Exception as e:
        print("❌ Error:", str(e))
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

def extract_audio(video_path):
    audio_path = video_path.rsplit(".", 1)[0] + ".wav"
    audio = AudioSegment.from_file(video_path, format="webm")
    audio.export(audio_path, format="wav")
    return audio_path

def audio_to_text(audio_path):
    recognizer = sr.Recognizer()
    with sr.AudioFile(audio_path) as source:
        audio = recognizer.record(source)
        try:
            return recognizer.recognize_google(audio)
        except sr.UnknownValueError:
            return ""
        except sr.RequestError:
            return "Speech Recognition API unavailable"

def evaluate_answer(transcript, question_index):
    words = transcript.lower().split()
    return 1 if any(word in keywords[question_index] for word in words) else 0

if __name__ == "__main__":
    app.run(debug=True, port=5001)
