'use client';
import { useState } from 'react';

export default function LoginView({ onLogin }: { onLogin: (user: any) => void }) {
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

            let data;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(`Server Error: ${text.substring(0, 50)}`);
            }

            if (!response.ok) {
                throw new Error(data.error || '오류가 발생했습니다.');
            }

            localStorage.setItem('mathdaily_user', JSON.stringify(data));
            onLogin(data);
        } catch (err: any) {
            console.error('[Login Error]:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            padding: '2rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '600px',
                backgroundColor: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: '40px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                padding: '3.5rem',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '3rem' }}>
                    <h1 style={{
                        fontSize: '5rem',
                        fontWeight: '900',
                        color: '#60a5fa',
                        marginBottom: '1rem',
                        letterSpacing: '-2px'
                    }}>
                        MathDaily
                    </h1>
                    <p style={{ fontSize: '1.5rem', color: '#94a3b8', fontWeight: '500' }}>
                        매일 만나는 AI 맞춤 수학 학습지
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <label style={{ fontSize: '1.5rem', fontWeight: '700', color: '#f1f5f9', marginLeft: '0.5rem' }}>
                            이름을 입력하세요
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="예: 홍길동"
                            style={{
                                width: '100%',
                                padding: '1.5rem 2rem',
                                fontSize: '2rem',
                                borderRadius: '24px',
                                border: '2px solid rgba(255, 255, 255, 0.1)',
                                backgroundColor: 'rgba(15, 23, 42, 0.5)',
                                color: 'white',
                                outline: 'none',
                                transition: 'all 0.2s'
                            }}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="animate-shake" style={{
                            padding: '1.2rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '20px',
                            color: '#f87171',
                            fontSize: '1.2rem',
                            fontWeight: '500',
                            textAlign: 'left'
                        }}>
                            ⚠️ {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '1.8rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            fontSize: '2rem',
                            fontWeight: '800',
                            borderRadius: '24px',
                            border: 'none',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                            transition: 'all 0.2s',
                            boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)'
                        }}
                    >
                        {isLoading ? '연결 중...' : '학습 시작하기'}
                    </button>
                </form>
            </div>
            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
                input:focus {
                    border-color: #3b82f6 !important;
                    background-color: rgba(15, 23, 42, 0.8) !important;
                    box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.1);
                }
                button:hover:not(:disabled) {
                    background-color: #2563eb;
                    transform: translateY(-2px);
                    box-shadow: 0 20px 30px -10px rgba(59, 130, 246, 0.6);
                }
                button:active:not(:disabled) {
                    transform: scale(0.98);
                }
            `}</style>
        </div>
    );
}
