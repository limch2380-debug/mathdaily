'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { UserSettings } from '@/lib/types';

interface DashboardProps {
    user: { id: string; name: string };
    settings: UserSettings;
    onSettingsChange: (settings: UserSettings) => void;
    onStartStudy: (level: string) => void;
    onLogout: () => void;
}

export default function DashboardView({ user, settings, onSettingsChange, onStartStudy, onLogout }: DashboardProps) {
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

    // 설정 변경 핸들러
    const handleChange = (key: keyof UserSettings, value: any) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="app-container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* 헤더 */}
            <header className="header" style={{ marginBottom: '32px' }}>
                <div className="header-logo">
                    <div className="header-logo-icon">📐</div>
                    <div>
                        <h1>MathDaily</h1>
                        <p>안녕하세요, {user.name}님! 👋</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="start-btn"
                        onClick={onLogout}
                        style={{
                            padding: '14px 24px',
                            borderRadius: '16px',
                            fontSize: '15px',
                            background: 'var(--bg-glass-strong)',
                            border: '1px solid var(--border-medium)',
                            color: 'var(--text-secondary)',
                            boxShadow: 'none'
                        }}
                    >
                        🔄 새로 시작하기
                    </button>
                    <button
                        className="start-btn"
                        onClick={() => onStartStudy(settings.difficulty || safeStats.currentLevel)}
                        style={{ padding: '14px 32px', borderRadius: '16px', fontSize: '16px' }}
                    >
                        🚀 오늘의 문제 풀기
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                {/* 왼쪽 영역: 통계 및 캘린더 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* 학습 통계 카드 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        <div className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>📅 총 학습일</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {safeStats.totalDays || 0}
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>📊 평균 점수</div>
                            <div style={{ fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-mono)', background: 'linear-gradient(135deg, #10b981, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {safeStats.avgScore || 0}
                            </div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '20px 12px' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>🎯 AI 추천 레벨</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: safeStats.currentLevel === 'hard' ? 'var(--accent-red)' : safeStats.currentLevel === 'easy' ? 'var(--accent-green)' : 'var(--accent-amber)', marginTop: '8px' }}>
                                {safeStats.currentLevel === 'hard' ? '심화 (상)' : safeStats.currentLevel === 'easy' ? '기초 (하)' : '보통 (중)'}
                            </div>
                        </div>
                    </div>

                    {/* 학습 캘린더 */}
                    <div className="card" style={{ padding: '24px' }}>
                        <div className="calendar-nav" style={{ justifyContent: 'center', marginBottom: '20px' }}>
                            <button className="calendar-nav-btn" onClick={prevMonth}>◀</button>
                            <span className="calendar-month-label">{format(currentDate, 'yyyy년 M월', { locale: ko })}</span>
                            <button className="calendar-nav-btn" onClick={nextMonth}>▶</button>
                        </div>
                        <div className="calendar-grid" style={{ marginBottom: '8px' }}>
                            {dayNames.map(d => (
                                <div key={d} className="calendar-day-header" style={{ color: d === '일' ? 'var(--accent-red)' : d === '토' ? 'var(--accent-blue)' : 'var(--text-muted)' }}>{d}</div>
                            ))}
                        </div>
                        <div className="calendar-grid">
                            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="calendar-day empty" />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const session = getSessionForDate(day);
                                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                                return (
                                    <div key={day} className={`calendar-day ${isToday ? 'today' : ''} ${session ? 'completed' : ''}`} style={{ minHeight: '50px' }}>
                                        <span className="calendar-day-num" style={{ fontSize: '14px' }}>{day}</span>
                                        {session && <span className="calendar-day-score" style={{ fontSize: '8px', padding: '1px 3px' }}>{session.score}점</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 오른쪽 영역: 학습 환경 설정 */}
                <div className="card" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
                    <div className="card-title" style={{ marginBottom: '24px' }}>
                        <div className="card-title-icon purple">⚙️</div>
                        학습 환경 설정
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* 1. 학교 급 */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>학교급</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                {['elementary', 'middle', 'high'].map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => handleChange('schoolLevel', level)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid ' + (settings.schoolLevel === level ? 'var(--accent-blue)' : 'var(--border-subtle)'),
                                            background: settings.schoolLevel === level ? 'var(--accent-blue-glow)' : 'var(--bg-glass)',
                                            color: settings.schoolLevel === level ? 'var(--text-primary)' : 'var(--text-muted)',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {level === 'elementary' ? '초등' : level === 'middle' ? '중등' : '고등'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 2. 학년 */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>학년</label>
                            <select
                                value={settings.grade}
                                onChange={(e) => handleChange('grade', parseInt(e.target.value))}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    borderRadius: '10px',
                                    border: '1px solid var(--border-subtle)',
                                    background: 'var(--bg-glass-strong)',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            >
                                {[1, 2, 3, 4, 5, 6].map(g => (
                                    <option key={g} value={g} style={{ background: 'var(--bg-secondary)' }}>{g}학년</option>
                                ))}
                            </select>
                        </div>

                        {/* 3. 난이도 */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>난이도 (AI 추천 포함)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                {['easy', 'medium', 'hard'].map((diff) => (
                                    <button
                                        key={diff}
                                        onClick={() => handleChange('difficulty', diff)}
                                        style={{
                                            padding: '8px',
                                            borderRadius: '8px',
                                            border: '1px solid ' + (settings.difficulty === diff ? 'var(--accent-amber)' : 'var(--border-subtle)'),
                                            background: settings.difficulty === diff ? 'var(--accent-amber-glow)' : 'var(--bg-glass)',
                                            color: settings.difficulty === diff ? 'var(--text-primary)' : 'var(--text-muted)',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {diff === 'easy' ? '기초' : diff === 'medium' ? '보통' : '심화'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* 4. 문제 수 */}
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>문제 수</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                                {[10, 20, 30].map((count) => (
                                    <button
                                        key={count}
                                        onClick={() => handleChange('problemCount', count)}
                                        style={{
                                            padding: '10px',
                                            borderRadius: '8px',
                                            border: '1px solid ' + (settings.problemCount === count ? 'var(--accent-purple)' : 'var(--border-subtle)'),
                                            background: settings.problemCount === count ? 'var(--accent-purple-glow)' : 'var(--bg-glass)',
                                            color: settings.problemCount === count ? 'var(--text-primary)' : 'var(--text-muted)',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            fontFamily: 'var(--font-mono)',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {count}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
