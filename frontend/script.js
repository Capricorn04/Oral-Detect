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

    // Show loader
    loader.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    // Create FormData
    const formData = new FormData();
    formData.append('file', file);

    try {

        // Send image to Flask backend
        const response = await fetch('http://127.0.0.1:5000/predict', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        // Hide loader and show results
        loader.classList.add('hidden');
        resultContainer.classList.remove('hidden');

        // ================= DISPLAY RESULTS =================

        // Prediction
        document.getElementById('prediction').innerText = data.prediction;

        // Confidence Score
        document.getElementById('accuracy-text').innerText =
            data.confidence + "%";

        document.getElementById('accuracy-bar').style.width =
            data.confidence + "%";

        // AI Insights Box
        document.getElementById('info-text').innerHTML = `
            <div class="mt-4 space-y-2">
                <p>
                    <strong>Detected Type:</strong> ${data.type}
                </p>

                <p>
                    <strong>Severity Rating:</strong>
                    <span class="${
                        data.rating.includes('High')
                            ? 'text-red-500'
                            : 'text-cyan-400'
                    }">
                        ${data.rating}
                    </span>
                </p>

                <div class="mt-3">
                    <strong>Recommendations:</strong>
                    <ul class="list-disc ml-5 mt-1 text-sm">
                        ${data.recommendations
                            .map(rec => `<li>${rec}</li>`)
                            .join('')}
                    </ul>
                </div>
            </div>
        `;

        // ================= CLINICS =================

        const clinicHTML = data.clinics.map(c => `
            <div class="p-3 rounded-xl border border-white/10 hover:border-cyan-400 transition">
                <p class="font-bold text-xs">${c.name}</p>
                <p class="text-[10px] opacity-50">${c.address}</p>
            </div>
        `).join('');

        document.getElementById('clinics').innerHTML = clinicHTML;

    } catch (error) {

        console.error("Error connecting to backend:", error);

        alert("Make sure your Flask server is running!");

        loader.classList.add('hidden');
    }
}