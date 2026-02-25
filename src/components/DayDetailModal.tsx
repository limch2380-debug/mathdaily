'use client';

import { CalendarDay } from '@/lib/types';

interface DayDetailModalProps {
    day: CalendarDay;
    onClose: () => void;
}

export default function DayDetailModal({ day, onClose }: DayDetailModalProps) {
    const scoreColor = day.score !== null
        ? day.score >= 80 ? 'var(--accent-green)'
            : day.score >= 50 ? 'var(--accent-amber)'
                : 'var(--accent-red)'
        : 'var(--text-muted)';

    return (
        <div className="day-detail-overlay" onClick={onClose}>
            <div className="day-detail-modal" onClick={e => e.stopPropagation()}>
                <div className="day-detail-header">
                    <div className="day-detail-date">
                        📅 {day.date}
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{ fontSize: '40px' }}>
                        {day.isCompleted
                            ? (day.score !== null && day.score >= 90 ? '🏆' : day.score !== null && day.score >= 70 ? '🎉' : '📝')
                            : day.answeredCount > 0 ? '🔄' : '📋'
                        }
                    </span>
                    <div style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        marginTop: '8px',
                        fontWeight: 600,
                    }}>
                        {day.isCompleted ? '학습 완료!' : day.answeredCount > 0 ? '진행 중...' : '미시작'}
                    </div>
                </div>

                <div className="day-detail-stats">
                    <div className="day-detail-stat">
                        <div className="day-detail-stat-value" style={{ color: scoreColor }}>
                            {day.score !== null ? `${Math.round(day.score)}` : '-'}
                        </div>
                        <div className="day-detail-stat-label">점수</div>
                    </div>
                    <div className="day-detail-stat">
                        <div className="day-detail-stat-value" style={{ color: 'var(--accent-blue)' }}>
                            {day.correctCount}/{day.totalCount}
                        </div>
                        <div className="day-detail-stat-label">정답/전체</div>
                    </div>
                    <div className="day-detail-stat">
                        <div className="day-detail-stat-value" style={{ color: 'var(--accent-purple)' }}>
                            {day.answeredCount}
                        </div>
                        <div className="day-detail-stat-label">풀이 수</div>
                    </div>
                    <div className="day-detail-stat">
                        <div className="day-detail-stat-value" style={{
                            color: day.totalCount > 0 && day.correctCount < day.totalCount
                                ? 'var(--accent-red)'
                                : 'var(--accent-green)'
                        }}>
                            {day.totalCount - day.correctCount}
                        </div>
                        <div className="day-detail-stat-label">오답 수</div>
                    </div>
                </div>

                {day.topics && day.topics.length > 0 && (
                    <div className="day-detail-topics">
                        {day.topics.map(topic => (
                            <span key={topic} className="topic-tag">{topic}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
