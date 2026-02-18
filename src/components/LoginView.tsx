'use client';

import { useState } from 'react';

interface LoginViewProps {
    onLogin: (user: { id: string; name: string }) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('이름을 입력해야 시작할 수 있습니다.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmedName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '로그인 중 알 수 없는 오류가 발생했습니다.');
            }

            localStorage.setItem('mathdaily_user', JSON.stringify(data));
            onLogin(data);
        } catch (err: any) {
            setError(err.message);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
            <div className="w-full max-w-xl bg-white/80 backdrop-blur-xl rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-12 space-y-10 border border-white">
                <div className="text-center space-y-4">
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 tracking-tight">
                        MathDaily
                    </h1>
                    <p className="text-xl text-gray-500 font-medium">매일 만나는 AI 맞춤 수학 학습지</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="space-y-4">
                        <label htmlFor="name" className="text-xl font-bold text-gray-700 ml-2">
                            이름을 입력하세요
                        </label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="예: 홍길동"
                            className="w-full px-8 py-6 text-2xl rounded-3xl border-2 border-gray-100 focus:border-blue-500 focus:ring-8 focus:ring-blue-500/10 outline-none transition-all placeholder:text-gray-300 bg-white/50"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-shake">
                            <span className="text-red-500 text-lg font-medium">⚠️ {error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-2xl font-bold rounded-3xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-blue-500/40"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-3">
                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>확인 중...</span>
                            </div>
                        ) : '학습 시작하기'}
                    </button>
                </form>
            </div>

            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.2s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
}
