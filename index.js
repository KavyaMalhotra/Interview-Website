// index.js
import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3000;
const PYTHON_API_URL = "http://127.0.0.1:5001/process";

// Ensure the upload directory exists
const uploadFolder = "uploads/";
if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: uploadFolder,
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `video_${Date.now()}${ext}`);
    },
});
const upload = multer({ storage });

const questions = [
    "Tell us about yourself.",
    "What are your strengths?",
    "What are your weaknesses?",
    "Why do you want this job?",
    "Where do you see yourself in 5 years?",
    "Tell us about a challenge you faced.",
    "Why should we hire you?",
    "What motivates you?",
    "Describe a time you worked in a team.",
    "What is your greatest achievement?",
];

let currentQuestionIndex = 0;
let totalScore = 0; // Total score

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", "views");

// Home Route - Reset session
app.get("/", (req, res) => {
    currentQuestionIndex = 0;
    totalScore = 0;
    res.render("index");
});

// Start Interview
app.post("/submit", (req, res) => {
    res.render("questions", { question: questions[currentQuestionIndex] });
});

// Handle Video Upload & AI Scoring
app.post("/next-question", upload.single("video"), async (req, res) => {
    console.log("🔍 Received request...");
    console.log("📂 req.file:", req.file);  // Check if file is received
    console.log("📩 req.body:", req.body);  // Check form data

    if (!req.file) {
        console.error("❌ No video uploaded!");
        return res.status(400).send("❌ No video uploaded!");
    }

    try {
        console.log(`📤 Processing video for Question ${currentQuestionIndex + 1}...`);

        // Send video to Python API
        const formData = new FormData();
        formData.append("video", fs.createReadStream(req.file.path));
        formData.append("questionIndex", currentQuestionIndex.toString());

        const pythonResponse = await axios.post(PYTHON_API_URL, formData, {
            headers: formData.getHeaders(),
        });

        const score = pythonResponse.data.score;
        totalScore += score;

        console.log(`✅ Score received: ${score}`);

        // Delete uploaded video file after processing
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error(`❌ Failed to delete video file: ${err.message}`);
                else console.log(`🗑️ Deleted: ${req.file.path}`);
            });
        }

        currentQuestionIndex++;

        // Move to next question or show results
        if (currentQuestionIndex < questions.length) {
            return res.render("questions", { question: questions[currentQuestionIndex] });
        }

        return res.render("result", { score: totalScore });

    } catch (error) {
        console.error("❌ Python API Error:", error.response?.data || error.message);

        // ✅ Only delete the file if `req.file` exists
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error(`❌ Failed to delete video file after error: ${err.message}`);
            });
        }

        return res.status(500).send("⚠ Error processing video. Please try again.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
