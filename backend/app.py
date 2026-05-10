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
model.load_state_dict(torch.load("oral_cancer_model.pth", map_location=device))
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
# REPLACEMENT: Your API Key integrated into the new Client structure
client = genai.Client(api_key="insert api key here")

def get_conversational_advice(prediction, confidence, severity, cancer_type):
    prompt = (
        f"You are a professional medical AI assistant. Scan results: {prediction}. "
        f"Type: {cancer_type}. Severity: {severity}. Confidence: {confidence}%. "
        f"Write a short, empathetic, professional response for a patient. "
        f"Suggest next steps calmly and maintain a supportive tone."
    )
    
    try:
        # Use the updated 2026 stable model name
        response = client.models.generate_content(
            model="gemini-2.5-flash", # Updated from 1.5-flash (Retired)
            contents=prompt
        )
        
        if response.text:
            return response.text
        else:
            return "Analysis complete. Please review the clinical metrics below."

    except Exception as e:
        print(f"--- GENAI API ERROR: {e} ---")
        
        # Fallback logic remains for safety
        if prediction == "CANCER DETECTED":
            return (f"Our AI analysis has identified features consistent with {cancer_type}. "
                    "We recommend consulting a specialist for a potential biopsy.")
        else:
            return ("The scan did not detect immediate signs of malignancy. "
                    "Maintain regular dental checkups every 6 months.")

# --- 4. Prediction Route ---
@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    img_bytes = file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    
    # Run medical prediction through EfficientNet-B3
    input_tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, prediction = torch.max(probabilities, 0)

    conf_score = round(confidence.item() * 100, 2)
    pred_idx = prediction.item()
    pred_label = 'CANCER DETECTED' if pred_idx == 0 else 'NON-CANCER'

    # AI Logic for Insights and Severity
    if pred_idx == 0:  # Predicted as CANCER
        severity = "High / Advanced" if conf_score > 92 else "Moderate / Early Stage"
        cancer_type = "Squamous Cell Carcinoma (Likely)"
        recs = [
            "Urgent: Immediate biopsy required",
            "Consult an Oncology specialist today"
        ]
        clinics = [
            {"name": "National Oncology Center", "address": "Medical District, Block A"},
            {"name": "City Advanced Dental Surgery", "address": "Downtown Hub"}
        ]
    else:  # Predicted as NON-CANCER
        severity = "N/A"
        cancer_type = "Healthy Oral Tissue"
        recs = [
            "Maintain regular oral hygiene",
            "Routine screening checkup in 6 months"
        ]
        clinics = []

    # Get Conversational AI Response from the new SDK
    ai_chat_response = get_conversational_advice(pred_label, conf_score, severity, cancer_type)

    return jsonify({
        'prediction': pred_label,
        'type': cancer_type,
        'rating': severity,
        'confidence': conf_score,
        'recommendations': recs,
        'clinics': clinics,
        'ai_chat_response': ai_chat_response
    })

if __name__ == '__main__':
    # Start the Flask server on port 5000
    app.run(port=5000, debug=True)