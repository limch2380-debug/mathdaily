import os
import sys
import subprocess

def build():
    print("🛠️ Installing PyInstaller...")
    subprocess.run(["py", "-m", "pip", "install", "pyinstaller"], shell=True)
    
    print("🏗️ Building Executable...")
    cmd = [
        "py", "-m", "PyInstaller",
        "--onefile",
        "--name", "MathDaily_Launcher",
        "launcher.py"
    ]
    subprocess.run(cmd, shell=True)
    
    print("\n✅ Build complete! Check the 'dist' folder for MathDaily_Launcher.exe")

if __name__ == "__main__":
    build()
