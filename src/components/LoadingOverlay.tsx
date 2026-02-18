import React, { useEffect, useState } from 'react';

const LOADING_MESSAGES = [
  "AI 선생님이 학생의 수준을 분석하고 있습니다... 🧐",
  "최적의 문제를 선별하고 있습니다... ✍️",
  "사고력을 키워줄 문제를 작성 중입니다... 🧠",
  "거의 다 되었습니다! 잠시만 기다려주세요... 🚀"
];

interface LoadingOverlayProps {
  title?: string;
  message?: string;
}

export default function LoadingOverlay({ title, message }: LoadingOverlayProps) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500); // 2.5초마다 메시지 변경

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="math-spinner">
          <div className="symbol symbol-1">∫</div>
          <div className="symbol symbol-2">√</div>
          <div className="symbol symbol-3">π</div>
          <div className="symbol symbol-4">x²</div>
          <div className="center-dot"></div>
        </div>
        <h3 className="loading-title">{title || "MathDaily AI"}</h3>
        <p className="loading-message">{message || LOADING_MESSAGES[messageIndex]}</p>
      </div>

      <style jsx>{`
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(15, 23, 42, 0.85); /* 반투명 다크 배경 */
          backdrop-filter: blur(8px);
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          animation: fadeIn 0.3s ease-out;
        }

        .loading-content {
          text-align: center;
          color: white;
        }

        .math-spinner {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
        }

        .center-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 12px;
          height: 12px;
          background: #3b82f6;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 15px #3b82f6;
          animation: pulse 1.5s infinite;
        }

        .symbol {
          position: absolute;
          font-size: 24px;
          font-weight: bold;
          color: #60a5fa;
          opacity: 0;
          animation: orbit 3s linear infinite;
        }

        .symbol-1 { animation-delay: 0s; }
        .symbol-2 { animation-delay: -0.75s; }
        .symbol-3 { animation-delay: -1.5s; }
        .symbol-4 { animation-delay: -2.25s; }

        .loading-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 12px;
          background: linear-gradient(to right, #60a5fa, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .loading-message {
          font-size: 16px;
          color: #cbd5e1;
          min-height: 24px;
          animation: slideUp 0.5s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
          50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
        }

        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(40px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(40px) rotate(-360deg);
            opacity: 1;
          }
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
