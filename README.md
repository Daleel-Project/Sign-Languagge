## 🧠 How to Run Locally

1. **Clone the repo**  
   `git clone https://github.com/YourUsername/Sign-Language.git && cd Sign-Language`

2. **Install requirements**  
   `pip install -r requirements.txt`

3. **Run back-end server**  
   `uvicorn app:app --host 127.0.0.1 --port 8000 --reload`  
   ↪ WebSocket runs at: `ws://127.0.0.1:8000/ws`

4. **Run front-end**

   - **Option 1:** Open `index.html` in browser.
   - **Option 2:** Use VS Code + Live Server extension.

5. **Shortcuts**

   - `S` – Start/stop tracking  
   - `1` – English | `2` – Arabic  
   - `3` – Words | `4` – Numbers  
   - `Q` – Disconnect

✅ Make sure the webcam is allowed.  
✅ Backend server must be running before the frontend.
