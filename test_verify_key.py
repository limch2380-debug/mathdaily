import os
from dotenv import load_dotenv
from openai import OpenAI

# .env에서 API 키 로드
load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
if not API_KEY:
    print("❌ OPENAI_API_KEY가 .env 파일에 설정되지 않았습니다.")
    exit(1)

print(f"🔑 Testing API Key: {API_KEY[:10]}...{API_KEY[-5:]}")

try:
    client = OpenAI(api_key=API_KEY)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Hello"}],
        timeout=10
    )
    print("✅ API Key Works! Response:", response.choices[0].message.content)
except Exception as e:
    print(f"❌ API Key Failed: {e}")
