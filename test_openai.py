import os
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv('server/.env')

api_key = os.getenv("OPENAI_API_KEY")
print(f"🔑 Loaded API Key: {api_key[:10]}...{api_key[-5:] if api_key else 'None'}")

if not api_key:
    print("❌ API Key is missing!")
    exit(1)

client = AsyncOpenAI(api_key=api_key)

async def test_gpt():
    print("🚀 Sending request to GPT-4o-mini...")
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Hello! Just say 'Connection Successful' if you hear me."}
            ],
            timeout=10.0
        )
        print(f"✅ Response: {response.choices[0].message.content}")
        print("🎉 OpenAI Connection is working perfectly!")
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_gpt())
