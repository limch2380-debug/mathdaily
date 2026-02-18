import os
import subprocess
import threading
import webbrowser
import time
import sys

def run_backend():
    print("🚀 Starting Backend...")
    os.chdir("server")
    subprocess.run(["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"], shell=True)

def run_frontend():
    print("🚀 Starting Frontend...")
    # Using npx next start if built, or next dev
    subprocess.run(["npx", "next", "dev", "-H", "0.0.0.0", "-p", "3000"], shell=True)

if __name__ == "__main__":
    print("========================================")
    print("   MathDaily Desktop Launcher")
    print("========================================")
    
    # 1. Start Backend in thread
    backend_thread = threading.Thread(target=run_backend, daemon=True)
    backend_thread.start()
    
    # 2. Wait a bit for backend
    time.sleep(3)
    
    # 3. Start Frontend in thread
    frontend_thread = threading.Thread(target=run_frontend, daemon=True)
    frontend_thread.start()
    
    # 4. Open Browser
    print("🌐 Opening browser at http://localhost:3000...")
    time.sleep(2)
    webbrowser.open("http://localhost:3000")
    
    print("\n[INFO] App is running. Do not close this window.")
    print("[INFO] Press Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        sys.exit(0)
