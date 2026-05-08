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

function runAISimulation() {

    loader.classList.remove("hidden");
    resultContainer.classList.add("hidden");

    setTimeout(() => {

        loader.classList.add("hidden");
        resultContainer.classList.remove("hidden");

        // RANDOM DEMO RESULT

        const random = Math.random();

        if (random > 0.5) {

            document.getElementById("prediction").innerText =
                "Cancerous Patterns Detected";

            document.getElementById("accuracy-text").innerText =
                "95.8%";

            document.getElementById("accuracy-bar").style.width =
                "95.8%";

            document.getElementById("info-text").innerText =
                "AI analysis suggests possible Squamous Cell Carcinoma traits. Clinical examination and biopsy are recommended.";

        } else {

            document.getElementById("prediction").innerText =
                "No Significant Abnormalities";

            document.getElementById("accuracy-text").innerText =
                "98.2%";

            document.getElementById("accuracy-bar").style.width =
                "98.2%";

            document.getElementById("info-text").innerText =
                "AI analysis did not detect significant malignant patterns. Continue regular oral health monitoring.";
        }

        window.scrollTo({
            top: resultContainer.offsetTop - 100,
            behavior: "smooth"
        });

    }, 2500);
}