document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Script loaded successfully!");
    initializeRecording();
});

function initializeRecording() {
    console.log("🔄 Initializing recording setup...");

    const videoElement = document.getElementById("video");
    const startRecordBtn = document.getElementById("start-record");
    const stopRecordBtn = document.getElementById("stop-record");
    const nextQuestionBtn = document.getElementById("submit-btn");
    const form = document.getElementById("question-form");

    // If required elements are missing, skip initialization.
    if (!videoElement || !startRecordBtn || !stopRecordBtn || !nextQuestionBtn || !form) {
        console.warn("⚠ Not on a recording page. Skipping initialization.");
        return;
    }

    let mediaRecorder;
    let recordedChunks = [];
    let timer;
    let uploadTriggered = false; // flag to avoid duplicate uploads
    let autoStopped = false;     // flag to indicate auto-stop by timer

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            console.log("✅ Camera and microphone access granted.");
            videoElement.srcObject = stream;
            mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
            };

            // When recording stops, we simply log it.
            mediaRecorder.onstop = () => {
                console.log("🛑 MediaRecorder stopped.");
                // Do not auto-upload; wait for the user to click "Next Question".
            };

            startRecordBtn.disabled = false;
        })
        .catch((error) => {
            console.error("❌ Camera/microphone error:", error);
            alert("⚠ Failed to access camera/microphone: " + error.message);
        });

    startRecordBtn.addEventListener("click", () => {
        if (mediaRecorder && mediaRecorder.state !== "recording") {
            recordedChunks = [];
            uploadTriggered = false; // reset flag when starting a new recording
            autoStopped = false;
            // Start recording with a timeslice to ensure ondataavailable fires periodically
            mediaRecorder.start(1000);
            console.log("🎥 Recording started...");
            startRecordBtn.disabled = true;
            stopRecordBtn.disabled = false;
            nextQuestionBtn.disabled = true; // Disable Next Question until recording stops
            timer = setTimeout(() => {
                console.log("⏳ Time's up! Auto-stopping recording...");
                autoStopped = true;
                stopRecording(); // This stops recording but does not auto-upload
                nextQuestionBtn.disabled = false; // Enable Next Question button for manual submission
                alert("Time is up! Please click 'Next Question' to continue.");
            }, 30000);
        }
    });

    stopRecordBtn.addEventListener("click", () => {
        clearTimeout(timer);
        stopRecording();
        nextQuestionBtn.disabled = false; // Enable Next Question button for manual submission
    });

    // Stop recording and clear timer.
    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            clearTimeout(timer);
            startRecordBtn.disabled = false;
            stopRecordBtn.disabled = true;
        }
    }

    // Upload the recorded video to the server.
    async function uploadVideo() {
        if (recordedChunks.length === 0) {
            console.error("❌ No recorded video found!");
            alert("⚠ No video recorded! Please record before proceeding.");
            return;
        }
        const blob = new Blob(recordedChunks, { type: "video/webm" });
        const file = new File([blob], "interview-video.webm", { type: "video/webm" });
        const formData = new FormData();
        formData.append("video", file);
        
        console.log("📤 Uploading video...");
        try {
            const response = await fetch("http://localhost:3000/next-question", {
                method: "POST",
                body: formData,
            });
            if (!response.ok) {
                throw new Error(`Upload failed: ${response.statusText}`);
            }
            console.log("✅ Upload successful!");
            stopCamera();
            // Redirect to /questions to reload the new question and reinitialize the script.
            window.location.href = "/questions";
        } catch (error) {
            console.error("❌ Upload error:", error);
            alert("⚠ Video upload failed! Please try again.");
        }
    }

    function stopCamera() {
        const stream = videoElement.srcObject;
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
            console.log("📷 Camera turned off.");
        }
    }

    // Manual "Next Question" button handler.
    nextQuestionBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        // If recording is in progress, stop it first.
        if (mediaRecorder && mediaRecorder.state === "recording") {
            stopRecording();
        }
        // Now manually trigger upload.
        await uploadVideo();
        uploadTriggered = true;
    });
}
