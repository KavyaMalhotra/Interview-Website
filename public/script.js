document.addEventListener("DOMContentLoaded", () => {
    console.log("✅ Script loaded successfully!");
    initializeRecording();
});

function initializeRecording() {
    console.log("🔄 Initializing recording setup...");
    
    const videoElement = document.getElementById("video");
    const startRecordBtn = document.getElementById("start-record");
    const stopRecordBtn = document.getElementById("stop-record");
    const nextQuestionBtn = document.querySelector("form button[type='submit']");
    const form = document.querySelector("form");


     // Stop execution if we are on the result page
     if (!videoElement || !startRecordBtn || !stopRecordBtn || !nextQuestionBtn || !form) {
        console.warn("⚠ Not on a recording page. Skipping initialization.");
        return;
    }


    if (!videoElement || !startRecordBtn || !stopRecordBtn || !nextQuestionBtn || !form) {
        console.error("❌ Missing one or more required elements!");
        return;
    }

    let mediaRecorder;
    let recordedChunks = [];
    let timer;
    
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
            console.log("✅ Camera and microphone access granted.");
            videoElement.srcObject = stream;
            mediaRecorder = new MediaRecorder(stream);
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunks.push(event.data);
                }
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
            mediaRecorder.start();
            console.log("🎥 Recording started...");
            startRecordBtn.disabled = true;
            stopRecordBtn.disabled = false;
            timer = setTimeout(() => {
                stopRecording();
                console.log("⏳ Time's up! Stopping recording...");
            }, 30000);
        }
    });

    stopRecordBtn.addEventListener("click", () => {
        stopRecording();
    });

    function stopRecording() {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            console.log("🛑 Recording stopped.");
            startRecordBtn.disabled = false;
            stopRecordBtn.disabled = true;
            clearTimeout(timer);
        }
    }

    function stopCamera() {
        const stream = videoElement.srcObject;
        if (stream) {
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoElement.srcObject = null;
            console.log("📷 Camera turned off.");
        }
    }

    const SERVER_URL = "http://localhost:3000";
    nextQuestionBtn.addEventListener("click", async (event) => {
        event.preventDefault();
        stopRecording();
        setTimeout(async () => {
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
                const response = await fetch(`${SERVER_URL}/next-question`, {
                    method: "POST",
                    body: formData,
                });
                if (!response.ok) {
                    throw new Error(`Upload failed: ${response.statusText}`);
                }
                console.log("✅ Upload successful!");
                
                stopCamera(); // Stop camera before switching pages
                
                const nextQuestionHtml = await response.text();
                document.body.innerHTML = nextQuestionHtml;
                
                console.log("🔄 Reloading script for next question...");
                setTimeout(() => {
                    initializeRecording(); // Reinitialize recording setup
                }, 500); 

            } catch (error) {
                console.error("❌ Upload error:", error);
                alert("⚠ Video upload failed! Please try again.");
            }
        }, 1000);
    });
}
