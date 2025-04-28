let video;
let canvas;
let ctx;
let model;
let isModelLoaded = false;
let isCameraStarted = false;
let capturedFace = null;

// DOM Elements
const captureButton = document.getElementById('captureButton');
const loginButton = document.getElementById('loginButton');
const statusDiv = document.getElementById('status');

// Initialize the application
async function init() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');

    // Load the face detection model
    try {
        model = await faceLandmarksDetection.createDetector(
            faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
            {
                runtime: 'tfjs',
                refineLandmarks: true,
                maxFaces: 1
            }
        );
        isModelLoaded = true;
        updateStatus('Model loaded successfully', 'success');
        
        // Start camera automatically
        await startCamera();
    } catch (error) {
        updateStatus('Error loading model: ' + error.message, 'error');
    }

    // Event listeners
    captureButton.addEventListener('click', captureFace);
    loginButton.addEventListener('click', attemptLogin);
}

// Start the camera
async function startCamera() {
    try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia is not supported in this browser');
        }

        // List available cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available cameras:', videoDevices);

        if (videoDevices.length === 0) {
            throw new Error('No cameras found');
        }

        // Try to get camera access with specific constraints
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        });

        // Check if we got a valid stream
        if (!stream) {
            throw new Error('Failed to get camera stream');
        }

        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                resolve();
            };
        });

        isCameraStarted = true;
        updateStatus('Camera started', 'success');
        detectFaces();
    } catch (error) {
        console.error('Camera error:', error);
        updateStatus('Error accessing camera: ' + error.message, 'error');
    }
}

// Detect faces in real-time
async function detectFaces() {
    if (!isModelLoaded || !isCameraStarted) return;

    try {
        const faces = await model.estimateFaces(video);
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Draw face landmarks
        // faces.forEach(face => {
        //     const landmarks = face.keypoints;
        //     landmarks.forEach(point => {
        //         ctx.beginPath();
        //         ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI);
        //         ctx.fillStyle = 'red';
        //         ctx.fill();
        //     });
        // });
        drawMesh(faces , ctx)

        requestAnimationFrame(detectFaces);
    } catch (error) {
        console.error('Error detecting faces:', error);
    }
}

// Capture face for login
async function captureFace() {
    try {
        const faces = await model.estimateFaces(video);
        if (faces.length > 0) {
            capturedFace = faces[0];
            captureButton.disabled = true;
            loginButton.disabled = false;
            updateStatus('Face captured successfully', 'success');
        } else {
            updateStatus('No face detected', 'error');
        }
    } catch (error) {
        updateStatus('Error capturing face: ' + error.message, 'error');
    }
}

// Attempt login with captured face
async function attemptLogin() {
    if (!capturedFace) {
        updateStatus('No face captured', 'error');
        return;
    }

    try {
        const currentFaces = await model.estimateFaces(video);
        if (currentFaces.length === 0) {
            updateStatus('No face detected', 'error');
            return;
        }

        const currentFace = currentFaces[0];
        const similarity = compareFaces(capturedFace, currentFace);

        if (similarity > 0.8) {
            updateStatus('Login successful!', 'success');
            // Here you would typically redirect to the main application
        } else {
            updateStatus('Face not recognized', 'error');
        }
    } catch (error) {
        updateStatus('Error during login: ' + error.message, 'error');
    }
}

// Compare two faces and return similarity score
function compareFaces(face1, face2) {
    // This is a simple comparison based on keypoint distances
    // In a real application, you would use a more sophisticated face recognition model
    const landmarks1 = face1.keypoints;
    const landmarks2 = face2.keypoints;
    
    let totalDistance = 0;
    for (let i = 0; i < landmarks1.length; i++) {
        const dx = landmarks1[i].x - landmarks2[i].x;
        const dy = landmarks1[i].y - landmarks2[i].y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    
    const averageDistance = totalDistance / landmarks1.length;
    // Convert distance to similarity score (0 to 1)
    return Math.max(0, 1 - averageDistance / 100);
}

// Update status message
function updateStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + type;
}

// Initialize the application when the page loads
window.addEventListener('load', init); 