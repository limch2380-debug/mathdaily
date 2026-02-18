'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DashboardProps {
    user: { id: string; name: string };
    onStartStudy: (level: string) => void;
}

export default function DashboardView({ user, onStartStudy }: DashboardProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        fetch(`/api/dashboard?userId=${user.id}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user.id]);

    if (loading) {
        return (
            <div className="loading-container">
                <div className="loading-spinner" />
                <div className="loading-text">대시보드 로딩 중...</div>
            </div>
        );
    }

    const { stats, sessions } = data || { stats: { totalDays: 0, avgScore: 0, currentLevel: 'medium' }, sessions: [] };
    const safeStats = stats || { totalDays: 0, avgScore: 0, currentLevel: 'medium' };

    // 캘린더 로직
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const getSessionForDate = (day: number) => {
        const target = new Date(year, month, day);
        return sessions?.find((s: any) =>
            new Date(s.date).toDateString() === target.toDateString()
        );
    };

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

    const levelLabel = (level: string) => {
        if (level === 'hard') return '심화 (상)';
        if (level === 'easy') return '기초 (하)';
        return '보통 (중)';
    };

    const levelColor = (level: string) => {
        if (level === 'hard') return 'var(--accent-red)';
        if (level === 'easy') return 'var(--accent-green)';
        return 'var(--accent-amber)';
    };

    const scoreColor = (score: number) => {
        if (score >= 80) return 'score-high';
        if (score >= 50) return 'score-mid';
        return 'score-low';
    };

    return (
        <div className="app-container" style={{ maxWidth: '900px', margin: '0 auto' }}>
            {/* 헤더 */}
            <header className="header" style={{ marginBottom: '32px' }}>
                <div className="header-logo">
                    <div className="header-logo-icon">📐</div>
                    <div>
                        <h1>MathDaily</h1>
                        <p>안녕하세요, {user.name}님! 👋</p>
                    </div>
                </div>
                <button
                    className="start-btn"
                    onClick={() => onStartStudy(safeStats.currentLevel)}
                    style={{ padding: '14px 32px', borderRadius: '16px', fontSize: '16px' }}
                >
                    🚀 오늘의 문제 풀기
                </button>
            </header>

            {/* 학습 통계 카드 3개 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '28px' }}>
                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        📅 총 학습일
                    </div>
                    <div style={{
                        fontSize: '36px', fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {safeStats.totalDays || 0}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>일</div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        📊 평균 점수
                    </div>
                    <div style={{
                        fontSize: '36px', fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        background: 'linear-gradient(135deg, #10b981, #34d399)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>
                        {safeStats.avgScore || 0}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>점</div>
                </div>

                <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        🎯 현재 레벨
                    </div>
                    <div style={{
                        fontSize: '22px', fontWeight: 800,
                        color: levelColor(safeStats.currentLevel),
                        marginTop: '8px'
                    }}>
                        {levelLabel(safeStats.currentLevel)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                        AI 자동 조절
                    </div>
                </div>
            </div>

            {/* 학습 캘린더 */}
            <div className="card" style={{ padding: '28px' }}>
                <div className="card-header">
                    <div className="card-title">
                        <div className="card-title-icon blue">📆</div>
                        학습 캘린더
                    </div>
                </div>

                {/* 월 네비게이션 */}
                <div className="calendar-nav" style={{ justifyContent: 'center', marginBottom: '20px' }}>
                    <button className="calendar-nav-btn" onClick={prevMonth}>◀</button>
                    <span className="calendar-month-label">
                        {format(currentDate, 'yyyy년 M월', { locale: ko })}
                    </span>
                    <button className="calendar-nav-btn" onClick={nextMonth}>▶</button>
                </div>

                {/* 요일 헤더 */}
                <div className="calendar-grid" style={{ marginBottom: '8px' }}>
                    {dayNames.map(d => (
                        <div key={d} className="calendar-day-header" style={{
                            color: d === '일' ? 'var(--accent-red)' : d === '토' ? 'var(--accent-blue)' : 'var(--text-muted)'
                        }}>
                            {d}
                        </div>
                    ))}
                </div>

                {/* 날짜 그리드 */}
                <div className="calendar-grid">
                    {/* 빈 칸 */}
                    {Array.from({ length: firstDay }).map((_, i) => (
                        <div key={`empty-${i}`} className="calendar-day empty" />
                    ))}

                    {/* 날짜들 */}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const session = getSessionForDate(day);
                        const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                        const isSunday = new Date(year, month, day).getDay() === 0;
                        const isSaturday = new Date(year, month, day).getDay() === 6;

                        return (
                            <div
                                key={day}
                                className={`calendar-day ${isToday ? 'today' : ''} ${session ? 'completed' : ''}`}
                                style={{ minHeight: '64px' }}
                            >
                                <span className="calendar-day-num" style={{
                                    color: isToday ? 'var(--accent-blue)' :
                                        isSunday ? 'var(--accent-red)' :
                                            isSaturday ? 'var(--accent-blue)' : 'var(--text-primary)',
                                    fontSize: '15px'
                                }}>
                                    {day}
                                </span>
                                {session && (
                                    <>
                                        <span className="calendar-day-stamp">✅</span>
                                        <span className={`calendar-day-score ${scoreColor(session.score)}`}>
                                            {session.score}점
                                        </span>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 하단 안내 문구 */}
            <div style={{
                textAlign: 'center',
                padding: '24px',
                color: 'var(--text-muted)',
                fontSize: '13px'
            }}>
                최근 5회 평균 점수를 기반으로 AI가 난이도를 자동 조절합니다.
            </div>
        </div>
    );
}
