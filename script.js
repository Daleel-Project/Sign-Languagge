const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const canvasCtx = canvasElement.getContext("2d");
const outputDiv = document.getElementById("output");

let tracking = false;
let currentMode = 'EN'; // default mode
let ws;
let latestPrediction = "";

// إعداد Mediapipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// إعداد الكاميرا
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
camera.start();

// الدالة الرئيسية عند كل نتيجة من Mediapipe
function onResults(results) {
  canvasCtx.save();

  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0 || !tracking) {
    canvasCtx.restore();
    return;
  }
  
  const landmarks = results.multiHandLandmarks[0];

// حساب أبعاد البوكس بناءً على الصورة المقلوبة
const margin = 20;
const xs = landmarks.map(p => p.x * canvasElement.width);
const ys = landmarks.map(p => p.y * canvasElement.height);
const minX = Math.min(...xs) - margin;
const minY = Math.min(...ys) - margin;
const maxX = Math.max(...xs) + margin;
const maxY = Math.max(...ys) + margin;
const boxWidth = maxX - minX;
const boxHeight = maxY - minY;

// رسم البوكس البنفسجي
canvasCtx.strokeStyle = "#FF00FF";
canvasCtx.lineWidth = 4;
canvasCtx.strokeRect(minX, minY, boxWidth, boxHeight);

// رسم النص الأصفر
canvasCtx.font = "bold 26px 'cairo'";
canvasCtx.fillStyle = "yellow";
canvasCtx.save();
canvasCtx.scale(-1, 1);
canvasCtx.fillText(latestPrediction, -minX - canvasCtx.measureText(latestPrediction).width, minY - 10);
canvasCtx.restore();




  // تجهيز البيانات للإرسال
  let data_aux = [];
  const flippedLandmarks = landmarks.map(p => {
    return { x: 1 - p.x, y: p.y }; // flip x
  });
  
  const minLandmarkX = Math.min(...flippedLandmarks.map(p => p.x));
  const minLandmarkY = Math.min(...flippedLandmarks.map(p => p.y));
  flippedLandmarks.forEach(p => {
    data_aux.push(p.x - minLandmarkX);
    data_aux.push(p.y - minLandmarkY);
  });
  

  

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: "predict",
      landmarks: data_aux
    }));
  }
  

  canvasCtx.restore();
}

// الاتصال بـ WebSocket
function connectWebSocket() {
  ws = new WebSocket("ws://localhost:8000/ws");

  ws.onopen = () => {
    console.log("WebSocket connected.");
    ws.send(JSON.stringify({ type: "mode", value: currentMode }));
  };  

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.prediction) {
      latestPrediction = message.prediction;
      outputDiv.innerText = `Prediction: ${latestPrediction}`;
    }
  };

  ws.onclose = () => {
    console.log("WebSocket disconnected. Reconnecting in 2s...");
    setTimeout(connectWebSocket, 2000);
  };
}

connectWebSocket();

// تحكم بلوحة المفاتيح
document.addEventListener("keydown", (e) => {
  if (e.key === 's' || e.key === 'S') {
    tracking = !tracking;
  } else if (['1', '2', '3', '4'].includes(e.key)) {
    const modes = { '1': 'EN', '2': 'AR', '3': 'Words', '4': 'Numbers' };
    currentMode = modes[e.key];
    if (ws && ws.readyState === WebSocket.OPEN) {
      console.log("Will send this:", JSON.stringify({ type: "mode", value: currentMode }));
      ws.send(JSON.stringify({ type: "mode", value: currentMode }));
    }
  } else if (e.key === 'q' || e.key === 'Q') {
    tracking = false;
    if (ws) ws.close();
  }
});
