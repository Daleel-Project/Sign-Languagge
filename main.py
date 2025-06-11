# run locally :
# uvicorn main:app --host 127.0.0.1 --port 8000 --reload

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
import pickle

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all models and label maps
model_ar_letters = pickle.load(open('./models/model_ar_letters.p', 'rb'))['model']
model_en_letters = pickle.load(open('./models/model_en_letters.p', 'rb'))['model']
model_words = pickle.load(open('./models/model_words.p', 'rb'))['model']
model_numbers = pickle.load(open('./models/model_numbers.p', 'rb'))['model']

from labels import labels_dicts # type: ignore
modes = {
    'EN': {'model': model_en_letters, 'labels': labels_dicts['EN']},
    'AR': {'model': model_ar_letters, 'labels': labels_dicts['AR']},
    'Words': {'model': model_words, 'labels': labels_dicts['Words']},
    'Numbers': {'model': model_numbers, 'labels': labels_dicts['Numbers']},
}

# Track connected clients and modes
clients = {}

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients[websocket] = 'EN'  # Default mode
    await websocket.send_json({"prediction": "Waiting for hand..."})
    try:
        while True:
            data = await websocket.receive_json()

            if 'type' not in data:
                continue

            # Change mode
            if data['type'] == 'mode':
                print("Changing mode to:", data['value'])
                if data['value'] in modes:
                    clients[websocket] = data['value']
                    await websocket.send_json({"status": "mode_changed", "mode": data['value']})

            # Prediction request
            elif data['type'] == 'predict':
                landmarks = data.get('landmarks')
                if landmarks and len(landmarks) == 42:
                    mode = clients.get(websocket, 'EN')
                    model = modes[mode]['model']
                    labels = modes[mode]['labels']

                    prediction = model.predict([np.asarray(landmarks)])
                    predicted_label = labels[int(prediction[0])]

                    await websocket.send_json({"prediction": predicted_label})
                else:
                    await websocket.send_json({"error": "Invalid landmarks"})

    except WebSocketDisconnect:
        del clients[websocket]
