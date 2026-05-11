// script.js

// Initialize Lucide Icons on load
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

            // Trigger location-aware simulation
            getClinicRecommendations(file);
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
    e.preventDefault();

    const files = e.dataTransfer.files;

    if (files.length) {

        const file = files[0];

        // Sync the file input
        fileInput.files = files;

        const reader = new FileReader();

        reader.onload = function (event) {
            preview.src = event.target.result;

            // Trigger location-aware simulation
            getClinicRecommendations(file);
        };

        reader.readAsDataURL(file);
    }
});

// ================= GEOLOCATION WRAPPER =================

async function getClinicRecommendations(file) {

    // Show loader immediately
    loader.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    };

    if ("geolocation" in navigator) {

        navigator.geolocation.getCurrentPosition(

            // Success
            (position) => {
                runAISimulation(
                    file,
                    position.coords.latitude,
                    position.coords.longitude
                );
            },

            // Error / Denied / Timeout
            (error) => {
                console.warn(
                    "Location error, proceeding without GPS:",
                    error.message
                );

                runAISimulation(file, null, null);
            },

            geoOptions
        );

    } else {

        runAISimulation(file, null, null);
    }
}

// ================= AI PREDICTION =================

async function runAISimulation(file, lat, lon) {

    // Show loader and hide old results
    loader.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    // Create FormData
    const formData = new FormData();

    formData.append('file', file);

    if (lat && lon) {
        formData.append('lat', lat);
        formData.append('lon', lon);
    }

    try {

        // Send request to Flask backend
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error("Server Error");
        }

        const data = await response.json();

        // Hide loader and show results
        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        // ================= DISPLAY RESULTS =================

        // 1. Prediction
        document.getElementById('prediction').innerText =
            data.prediction;

        // 2. Confidence Score
        document.getElementById('accuracy-text').innerText =
            data.confidence + "%";

        document.getElementById('accuracy-bar').style.width =
            data.confidence + "%";

        // 3. AI Assistant + Metrics
        document.getElementById('info-text').innerHTML = `

            <div class="ai-response-box mb-6 p-4 rounded-xl border-l-4 border-cyan-500"
                 style="background: rgba(6, 182, 212, 0.1);">

                <p class="text-sm" style="font-style: normal;">
                    <strong>AI Assistant:</strong>
                    ${data.ai_chat_response}
                </p>

            </div>

            <div class="space-y-2 mb-4">

                <p>
                    <strong>Detected Type:</strong>
                    ${data.type}
                </p>

                <p>
                    <strong>Severity Rating:</strong>

                    <span class="${
                        data.rating.includes('High')
                            ? 'text-red-500'
                            : 'text-cyan-400'
                    } font-bold">

                        ${data.rating}

                    </span>
                </p>

            </div>

            <div class="mt-4">

                <p class="font-bold mb-1">
                    Recommendations:
                </p>

                <ul class="list-disc ml-5 text-sm opacity-80">

                    ${data.recommendations
                        .map(rec => `<li>${rec}</li>`)
                        .join('')}

                </ul>

            </div>
        `;

        // ==================================================
        // 4. DISPLAY CLINICS (UPDATED SECTION)
        // ==================================================

        // Locate the 'clinics' div in your HTML
        const clinicBox = document.getElementById('clinics');

        // If the array exists and has items, show them
        if (data.clinics && data.clinics.length > 0) {

            clinicBox.innerHTML = data.clinics.map(clinic => `

                <div class="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-400 transition mb-2">

                    <p class="font-bold text-sm text-cyan-400">
                        ${clinic.name}
                    </p>

                    <p class="text-xs opacity-60">
                        ${clinic.address}
                    </p>

                </div>

            `).join('');

        } else {

            clinicBox.innerHTML = `
                <p class="text-xs opacity-50 italic">
                    No clinical intervention required based on current screening.
                </p>
            `;
        }

        // Re-render Lucide Icons
        lucide.createIcons();

    } catch (error) {

        console.error("Connection Error:", error);

        alert(
            "CRITICAL ERROR: Make sure your Flask server (app.py) is running!"
        );

        loader.classList.add('hidden');
    }
}