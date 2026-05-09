// script.js

lucide.createIcons();

// ================= THEME TOGGLE =================

let isDark = true;

function toggleTheme() {

    isDark = !isDark;

    const body = document.getElementById("body");
    const icon = document.getElementById("theme-icon");

    body.className = isDark
        ? "dark-mode transition-colors duration-500 font-sans overflow-x-hidden"
        : "light-mode transition-colors duration-500 font-sans overflow-x-hidden";

    icon.setAttribute("data-lucide", isDark ? "sun" : "moon");

    lucide.createIcons();
}

// ================= FILE HANDLING =================

const fileInput = document.getElementById("file-input");
const preview = document.getElementById("preview");
const loader = document.getElementById("loader");
const resultContainer = document.getElementById("result-container");

fileInput.addEventListener("change", function (e) {

    const file = e.target.files[0];

    if (file) {

        const reader = new FileReader();

        reader.onload = function (event) {

            preview.src = event.target.result;

            runAISimulation();
        };

        reader.readAsDataURL(file);
    }
});

// ================= DRAG & DROP =================

const dropZone = document.getElementById("drop-zone");

["dragenter", "dragover"].forEach(eventName => {

    dropZone.addEventListener(eventName, (e) => {

        e.preventDefault();
        dropZone.classList.add("border-cyan-400");
    });
});

["dragleave", "drop"].forEach(eventName => {

    dropZone.addEventListener(eventName, (e) => {

        e.preventDefault();
        dropZone.classList.remove("border-cyan-400");
    });
});

dropZone.addEventListener("drop", (e) => {

    const files = e.dataTransfer.files;

    if (files.length) {

        fileInput.files = files;

        const reader = new FileReader();

        reader.onload = function (event) {

            preview.src = event.target.result;

            runAISimulation();
        };

        reader.readAsDataURL(files[0]);
    }
});

// ================= AI SIMULATION =================

async function runAISimulation(file) {
    loader.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    // Create a FormData object to send the image
    const formData = new FormData();
    formData.append('file', file);

    try {
        // Send request to your Flask Backend
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        // Update UI with real AI results
        document.getElementById('prediction').innerText = data.prediction;
        document.getElementById('accuracy-text').innerText = data.confidence + "%";
        document.getElementById('accuracy-bar').style.width = data.confidence + "%";
        document.getElementById('info-text').innerText = data.info;

    } catch (error) {
        console.error("Error connecting to backend:", error);
        alert("Make sure your Flask server is running!");
        loader.classList.add('hidden');
    }
}

// Update the event listener to pass the 'file' object
fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            preview.src = event.target.result;
            runAISimulation(file); // Pass the actual file here
        }
        reader.readAsDataURL(file);
    }
});