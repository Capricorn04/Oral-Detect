from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

app = Flask(__name__)
CORS(app)  # Allows your HTML file to talk to this server

# 1. Recreate the Model Architecture
model = models.efficientnet_b3(weights=None)
num_ftrs = model.classifier[1].in_features
model.classifier[1] = nn.Linear(num_ftrs, 2)  # 2 classes: Cancer/Non-Cancer

# 2. Load your .pth file
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.load_state_dict(torch.load("oral_cancer_model.pth", map_location=device))
model.to(device)
model.eval()

# 3. Define Image Preprocessing (Must match your training transforms)
transform = transforms.Compose([
    transforms.Resize((300, 300)),
    transforms.ToTensor(),
    transforms.Normalize(
        [0.485, 0.456, 0.406],
        [0.229, 0.224, 0.225]
    )
])

@app.route('/predict', methods=['POST'])
def predict():
    # Check if file exists
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']

    # Read and process image
    img_bytes = file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert('RGB')

    # Preprocess image
    input_tensor = transform(image).unsqueeze(0).to(device)

    # Predict
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, prediction = torch.max(probabilities, 0)

    conf_score = confidence.item() * 100
    pred_idx = prediction.item()

    # Decision Engine for Unlabelled Data
    if pred_idx == 0:  # Model predicts CANCER

        # Since we don't have labels for types,
        # categorize based on AI certainty
        if conf_score > 92:
            cancer_type = "Squamous Cell Carcinoma (Likely)"
            severity = "High / Advanced"
            recs = [
                "Urgent: Immediate biopsy required",
                "Consult an Oncologist today"
            ]
        else:
            cancer_type = "Potential Oral Malignancy"
            severity = "Moderate / Early Stage"
            recs = [
                "Specialist consultation within 48 hours",
                "Avoid all tobacco and alcohol"
            ]

        # Suggested Clinics (Static data for prototype)
        clinics = [
            {
                "name": "National Institute of Oncology",
                "address": "Medical District, Block A"
            },
            {
                "name": "City Advanced Dental Surgery",
                "address": "Downtown Health Plaza"
            }
        ]

    else:  # Model predicts NON-CANCER
        cancer_type = "Healthy Oral Tissue"
        severity = "None"
        recs = [
            "Maintain regular oral hygiene",
            "Routine checkup in 6 months"
        ]
        clinics = []

    # Final API Response
    return jsonify({
        'prediction': 'CANCER' if pred_idx == 0 else 'NON-CANCER',
        'type': cancer_type,
        'rating': severity,
        'confidence': round(conf_score, 2),
        'recommendations': recs,
        'clinics': clinics
    })

if __name__ == '__main__':
    app.run(port=5000, debug=True)