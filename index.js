import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import session from "express-session";
import passport from "./config/passport.js";
import bcrypt from "bcryptjs";
import pool from "./config/db.js";
import { sendVerificationEmail } from "./config/mailer.js";
import crypto from "crypto"; // To generate verification tokens

const app = express();
const PORT = 3000;
const PYTHON_API_URL = process.env.NODE_ENV === "production"
  ? "https://api-for-interview-website.onrender.com"
  : "http://127.0.0.1:5001/process";
const uploadFolder = "uploads/";

// Ensure upload folder exists
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const storage = multer.diskStorage({
  destination: uploadFolder,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `video_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// Interview questions
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
  "What is your greatest achievement?"
];

app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", "views");

// Session middleware
app.use(
  session({
    secret: //your secret key,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  })
);

// Initialize Passport for Google OAuth
app.use(passport.initialize());
app.use(passport.session());

// Home route - initialize interview session data
app.get("/", (req, res) => {
  req.session.currentQuestionIndex = 0;
  req.session.totalScore = 0;
  res.render("index", { user: req.session.user || null });
});

// Render register and login pages
app.get("/register", (req, res) => {
  res.render("register", { user: null });
});
app.get("/login", (req, res) => {
  res.render("login", { user: null });
});

// Standard Registration Route with Email Verification
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body; // Using 'name' from the form
  if (!name || name.trim() === "") {
    return res.send(
      `<script>alert("❌ Username is required."); window.location.href='/register';</script>`
    );
  }
  const username = name.trim();
  try {
    // Check if email already exists
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      return res.send(
        `<script>alert("❌ Email already registered!"); window.location.href='/register';</script>`
      );
    }
    // Hash the password and generate a verification token
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString("hex");
    // Insert user with verified = false
    await pool.query(
      "INSERT INTO users (username, email, password, verified, verification_token) VALUES ($1, $2, $3, $4, $5)",
      [username, email, hashedPassword, false, verificationToken]
    );
    // Send verification email
    await sendVerificationEmail(email, verificationToken);
    res.send(
      `<script>alert("✅ Registration Successful! Please check your email to verify your account."); window.location.href='/login';</script>`
    );
  } catch (err) {
    console.error("Registration error:", err);
    res.send(
      `<script>alert("❌ Error during registration."); window.location.href='/register';</script>`
    );
  }
});

// Verification Route
app.get("/verify/:token", async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query("SELECT * FROM users WHERE verification_token = $1", [token]);
    if (result.rows.length === 0) {
      return res.send(`<script>alert("❌ Invalid verification link."); window.location.href='/register';</script>`);
    }
    await pool.query("UPDATE users SET verified = TRUE, verification_token = NULL WHERE verification_token = $1", [token]);
    res.send(`<script>alert("✅ Email verified successfully!"); window.location.href='/login';</script>`);
  } catch (err) {
    console.error("Verification error:", err);
    res.send(`<script>alert("❌ Error verifying email."); window.location.href='/register';</script>`);
  }
});

// Standard Login Route with Verification Check
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length === 0) {
      return res.send(
        `<script>alert("❌ User not found."); window.location.href='/login';</script>`
      );
    }
    const user = userResult.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.send(
        `<script>alert("❌ Incorrect password."); window.location.href='/login';</script>`
      );
    }
    if (!user.verified) {
      return res.send(
        `<script>alert("❌ Please verify your email before logging in."); window.location.href='/login';</script>`
      );
    }
    req.session.user = { id: user.id, username: user.username, email: user.email };
    req.session.currentQuestionIndex = 0;
    req.session.totalScore = 0;
    res.render("questions", { question: questions[req.session.currentQuestionIndex], user: req.session.user });
  } catch (err) {
    console.error("Login error:", err);
    res.send(
      `<script>alert("❌ Error during login."); window.location.href='/login';</script>`
    );
  }
});

// ========================
// Google Login Routes
// ========================
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );
  
  app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    async (req, res) => {
      if (!req.user) {
        return res.redirect("/login");
      }
      const email = req.user.email;
      const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
      if (userResult.rows.length > 0) {
        // Log in the existing Google user
        const user = userResult.rows[0];
        req.session.user = { id: user.id, username: user.username, email: user.email };
        req.session.currentQuestionIndex = 0;
        req.session.totalScore = 0;
        // Redirect to a clean route that renders the questions page
        return res.redirect("/questions");
      } else {
        // If no account exists, redirect to register page (or show a message)
        return res.send(
          `<script>alert("❌ No account found. Please register first."); window.location.href='/register';</script>`
        );
      }
    }
  );
  
  // New route for rendering the questions page
  app.get("/questions", (req, res) => {
    if (!req.session.user) {
      return res.redirect("/login");
    }
  
    // Check if the currentQuestionIndex is 9, then redirect to /result
    if (req.session.currentQuestionIndex === 9) {
      return res.redirect("/result");
    }
  
    // Render the questions page if the index is not 9
    res.render("questions", { question: questions[req.session.currentQuestionIndex], user: req.session.user });
  });
  

// ========================
// Google Register Routes
// ========================
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/register" }),
  async (req, res) => {
    if (!req.user) {
      return res.redirect("/register");
    }
    const email = req.user.email;
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userResult.rows.length > 0) {
      return res.send(
        `<script>alert("❌ An account with this email already exists. Please log in."); window.location.href='/login';</script>`
      );
    } else {
      req.session.googleUser = { email };
      return res.render("google-setup", { email });
    }
  }
);

// Google Setup Route for New Users (Google users are automatically verified)
app.post("/google-setup", async (req, res) => {
  const { name, password } = req.body; // Use "name" from the form
  const email = req.session.googleUser?.email;
  if (!email) {
    return res.redirect("/register");
  }
  const username = name.trim();
  try {
    const userCheck = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (userCheck.rows.length > 0) {
      req.session.googleUser = null;
      return res.redirect("/login");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertResult = await pool.query(
      "INSERT INTO users (username, email, password, verified) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, email, hashedPassword, true]
    );
    req.session.googleUser = null;
    req.session.user = {
      id: insertResult.rows[0].id,
      username: insertResult.rows[0].username,
      email: insertResult.rows[0].email
    };
    req.session.currentQuestionIndex = 0;
    req.session.totalScore = 0;
    res.render("questions", { question: questions[req.session.currentQuestionIndex], user: req.session.user });
  } catch (err) {
    console.error("Google setup error:", err);
    res.send(`<script>alert("❌ Error during Google setup."); window.location.href='/google-setup';</script>`);
  }
});

// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// Interview functionality route
// in index.js (or wherever your routes live)
app.post("/next-question", upload.single("video"), async (req, res) => {
  // ▶️ FIRST: if we've already hit 10 questions, skip the upload check entirely
  if (req.session.currentQuestionIndex >= 10) {
    // optionally update DB here…
    if (req.session.user?.id) {
      await pool.query(
        "UPDATE users SET score = $1 WHERE id = $2",
        [req.session.totalScore, req.session.user.id]
      );
    }
    return res.redirect("/result");
  }

  // ▶️ THEN: normal flow—require a video
  if (!req.file) {
    console.error("❌ No video uploaded!");
    return res.status(400).send("❌ No video uploaded!");
  }

  try {
    console.log(`Processing video for Question ${req.session.currentQuestionIndex + 1}...`);
    // … your existing processing logic …
    const form = new FormData();
    form.append("video", fs.createReadStream(req.file.path));
    form.append("questionIndex", String(req.session.currentQuestionIndex));
    const response = await axios.post(PYTHON_API_URL, form, { headers: form.getHeaders() });
    req.session.totalScore += response.data.score;

    fs.unlink(req.file.path, () => {});

    req.session.currentQuestionIndex++;

    // ▶️ Check **again** after increment—if 10 now, go to result
    if (req.session.currentQuestionIndex >= 10) {
      if (req.session.user?.id) {
        await pool.query(
          "UPDATE users SET score = $1 WHERE id = $2",
          [req.session.totalScore, req.session.user.id]
        );
      }
      return res.redirect("/result");
    }

    // ▶️ Otherwise render next question
    return res.render("questions", {
      question: questions[req.session.currentQuestionIndex],
      user: req.session.user,
    });

  } catch (err) {
    console.error("❌ Python API Error:", err.message || err);
    fs.unlink(req.file.path, () => {});
    return res.status(500).send("⚠ Error processing video. Please try again.");
  }
});

// New: GET /result route to render your result.ejs
app.get("/result", (req, res) => {
  res.render("result", {
    score: req.session.totalScore,
    totalQuestions: 10,
    user: req.session.user,
  });
});



app.post("/restart", (req, res) => {
  req.session.currentQuestionIndex = 0;
  req.session.totalScore = 0;
  res.redirect("/questions"); // or wherever your first question lives
});


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
