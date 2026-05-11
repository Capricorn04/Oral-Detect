from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

# Using the modern 2026 SDK
from google import genai

app = Flask(__name__)
CORS(app)

# --- 1. EfficientNet Model Setup ---
model = models.efficientnet_b3(weights=None)

num_ftrs = model.classifier[1].in_features
model.classifier[1] = nn.Linear(num_ftrs, 2)

# Load local weights
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model.load_state_dict(
    torch.load("oral_cancer_model.pth", map_location=device)
)

model.to(device)
model.eval()

# --- 2. Image Preprocessing ---
transform = transforms.Compose([
    transforms.Resize((300, 300)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

# --- 3. Modern Conversational AI Setup ---
client = genai.Client(
    api_key="insert-your-2026-api-key-here"
)

# --- 4. Conversational AI Function ---
def get_conversational_advice(
    prediction,
    confidence,
    severity,
    cancer_type,
    location=None
):
    """Generates an empathetic response with nearby clinic suggestions."""

    location_context = (
        f"The user is at coordinates {location}. "
        if location else ""
    )

    prompt = (
        f"Professional medical AI assistant. {location_context}"
        f"Scan results: {prediction}. "
        f"Type: {cancer_type}. "
        f"Severity: {severity}. "
        f"Confidence: {confidence}%. "
        f"Recommend 2-3 real clinics nearby."
    )

    try:

        # Using lighter and more stable model
        response = client.models.generate_content(
            model="gemini-2.0-flash-lite",
            contents=prompt
        )

        if response.text:
            return response.text
        else:
            return "ERROR_FALLBACK"

    except Exception as e:

        print(f"--- GENAI API ERROR: {e} ---")

        # Return structured fallback trigger
        return "ERROR_FALLBACK"


# --- 5. Prediction Route ---
@app.route('/predict', methods=['POST'])
def predict():

    # ----------------------------------------
    # Validate Upload
    # ----------------------------------------
    if 'file' not in request.files:
        return jsonify({
            'error': 'No file uploaded'
        }), 400

    # ----------------------------------------
    # Image Processing
    # ----------------------------------------
    file = request.files['file']

    img_bytes = file.read()

    image = Image.open(
        io.BytesIO(img_bytes)
    ).convert('RGB')

    # ----------------------------------------
    # Model Prediction
    # ----------------------------------------
    input_tensor = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():

        outputs = model(input_tensor)

        probabilities = torch.nn.functional.softmax(
            outputs[0],
            dim=0
        )

        confidence, prediction = torch.max(
            probabilities,
            0
        )

    conf_score = round(
        confidence.item() * 100,
        2
    )

    pred_idx = prediction.item()

    pred_label = (
        'CANCER DETECTED'
        if pred_idx == 0
        else 'NON-CANCER'
    )

    # ----------------------------------------
    # AI Logic for Severity & Cancer Type
    # ----------------------------------------
    if pred_idx == 0:

        severity = (
            "High / Advanced"
            if conf_score > 92
            else "Moderate / Early Stage"
        )

        cancer_type = (
            "Squamous Cell Carcinoma (Likely)"
        )

    else:

        severity = "N/A"

        cancer_type = "Healthy Oral Tissue"

    # ----------------------------------------
    # Define Recommendations & Clinics
    # ----------------------------------------
    if pred_label == 'CANCER DETECTED':

        clinic_text = (
            "1. National Oncology Center (Medical Dist.)\n"
            "2. City Dental Surgery (Downtown)"
        )

        clinics = [
            {
                "name": "National Oncology Center",
                "address": "Medical District, Block A"
            },
            {
                "name": "City Advanced Dental Surgery",
                "address": "Downtown Hub"
            }
        ]

        recs = [
            "Urgent: Immediate biopsy required",
            "Consult an Oncology specialist today"
        ]

    else:

        clinic_text = "No immediate clinics required."

        clinics = []

        recs = [
            "Maintain regular oral hygiene",
            "Routine checkup in 6 months"
        ]

    # ----------------------------------------
    # Handle Location Data
    # ----------------------------------------
    lat = request.form.get('lat', None)
    lon = request.form.get('lon', None)

    location_str = None

    if (
        lat and lon
        and lat != "null"
        and lon != "null"
    ):
        location_str = f"{lat}, {lon}"

    # ----------------------------------------
    # Call Gemini AI
    # ----------------------------------------
    ai_chat_response = get_conversational_advice(
        pred_label,
        conf_score,
        severity,
        cancer_type,
        location_str
    )

    # ----------------------------------------
    # FORCED FALLBACK HANDLING
    # ----------------------------------------
    if (
        "ERROR_FALLBACK" in ai_chat_response
        or "summarizing" in ai_chat_response.lower()
    ):

        if pred_label == 'CANCER DETECTED':

            ai_chat_response = (
                f"AI ANALYSIS: {pred_label} ({conf_score}%). "
                f"Type: {cancer_type}. "
                f"RECOMMENDED CLINICS: {clinic_text}. "
                "Please visit these specialists immediately."
            )

        else:

            ai_chat_response = (
                "No immediate signs of malignancy detected. "
                "Maintain regular oral checkups."
            )

    # ----------------------------------------
    # Final JSON Response
    # ----------------------------------------
    return jsonify({

        'prediction': pred_label,

        'type': cancer_type,

        'rating': severity,

        'confidence': conf_score,

        'recommendations': recs,

        'clinics': clinics,

        'ai_chat_response': ai_chat_response
    })


# --- 6. Run Server ---
if __name__ == '__main__':
    app.run(
        port=5000,
        debug=True
    )