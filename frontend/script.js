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
            runAISimulation(file);
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
        const file = files[0];
        fileInput.files = files;

        const reader = new FileReader();

        reader.onload = function (event) {
            preview.src = event.target.result;
            runAISimulation(file);
        };

        reader.readAsDataURL(file);
    }
});

// ================= AI PREDICTION =================

async function runAISimulation(file) {
    // Show loader and hide previous results
    loader.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    // Create FormData for the image file
    const formData = new FormData();
    formData.append('file', file);

    try {
        // Send image to Flask backend
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Server Error");

        const data = await response.json();

        // Hide loader and show results container
        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        // ================= DISPLAY RESULTS =================

        // 1. Prediction Title
        document.getElementById('prediction').innerText = data.prediction;

        // 2. Confidence Score Display
        document.getElementById('accuracy-text').innerText = data.confidence + "%";
        document.getElementById('accuracy-bar').style.width = data.confidence + "%";

        // 3. AI Assistant & Metrics Box
        document.getElementById('info-text').innerHTML = `
            <div class="ai-response-box mb-6 p-4 rounded-xl border-l-4 border-cyan-500" 
                 style="background: rgba(6, 182, 212, 0.1);">
                <p class="text-sm" style="font-style: normal;">
                    <strong>AI Assistant:</strong> ${data.ai_chat_response}
                </p>
            </div>

            <div class="space-y-2 mb-4">
                <p><strong>Detected Type:</strong> ${data.type}</p>
                <p>
                    <strong>Severity Rating:</strong>
                    <span class="${data.rating.includes('High') ? 'text-red-500' : 'text-cyan-400'} font-bold">
                        ${data.rating}
                    </span>
                </p>
            </div>

            <div class="mt-4">
                <p class="font-bold mb-1">Recommendations:</p>
                <ul class="list-disc ml-5 text-sm opacity-80">
                    ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        `;

        // 4. Display Suggested Clinics
        const clinicBox = document.getElementById('clinics');
        if (data.clinics && data.clinics.length > 0) {
            clinicBox.innerHTML = data.clinics.map(clinic => `
                <div class="p-4 rounded-xl border border-white/10 bg-white/5 hover:border-cyan-400 transition mb-2">
                    <p class="font-bold text-sm">${clinic.name}</p>
                    <p class="text-xs opacity-50 italic">${clinic.address}</p>
                </div>
            `).join('');
        } else {
            clinicBox.innerHTML = `<p class="text-xs opacity-50 italic">No specific clinics required for this result.</p>`;
        }

        // Re-run Lucide icons for any newly injected HTML elements
        lucide.createIcons();

    } catch (error) {
        console.error("Connection Error:", error);
        alert("CRITICAL ERROR: Make sure your Flask server (app.py) is running!");
        loader.classList.add('hidden');
    }
}