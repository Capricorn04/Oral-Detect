from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import io

app = Flask(__name__)
CORS(app) # Allows your HTML file to talk to this server

# 1. Recreate the Model Architecture
model = models.efficientnet_b3(weights=None)
num_ftrs = model.classifier[1].in_features
model.classifier[1] = nn.Linear(num_ftrs, 2) # 2 classes: Cancer/Non-Cancer

# 2. Load your .pth file
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.load_state_dict(torch.load("oral_cancer_model.pth", map_location=device))
model.to(device)
model.eval()

# 3. Define Image Preprocessing (Must match your training transforms)
transform = transforms.Compose([
    transforms.Resize((300, 300)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    
    file = request.files['file']
    img_bytes = file.read()
    image = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    
    # Preprocess and Predict
    input_tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        outputs = model(input_tensor)
        probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
        confidence, prediction = torch.max(probabilities, 0)

    class_names = ['CANCER', 'NON CANCER']
    result = {
        'prediction': class_names[prediction.item()],
        'confidence': round(confidence.item() * 100, 2),
        'info': "Consult a specialist if 'CANCER' is detected." if prediction.item() == 0 else "No immediate signs detected."
    }
    return jsonify(result)

if __name__ == '__main__':
    app.run(port=5000, debug=True)