'use client';

import { useState, useCallback } from 'react';
import { CalendarDay } from '@/lib/types';

interface CalendarProps {
    records: CalendarDay[];
    year: number;
    month: number;
    onMonthChange: (year: number, month: number) => void;
    onDayClick: (day: CalendarDay) => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월',
];

export default function Calendar({ records, year, month, onMonthChange, onDayClick }: CalendarProps) {
    const [hoveredDay, setHoveredDay] = useState<string | null>(null);

    const getDaysInMonth = useCallback(() => {
        const firstDay = new Date(year, month - 1, 1).getDay();
        const daysInMonth = new Date(year, month, 0).getDate();
        const days: (number | null)[] = [];

        // 빈 칸 (이전 달)
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }
        // 해당 달의 날짜
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }
        return days;
    }, [year, month]);

    const getRecordForDay = useCallback((day: number): CalendarDay | undefined => {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return records.find(r => r.date === dateStr);
    }, [records, year, month]);

    const isToday = useCallback((day: number): boolean => {
        const now = new Date();
        return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
    }, [year, month]);

    const getScoreColor = (score: number | null): string => {
        if (score === null) return '';
        if (score >= 80) return 'score-high';
        if (score >= 50) return 'score-mid';
        return 'score-low';
    };

    const getStamp = (record: CalendarDay | undefined): string => {
        if (!record) return '';
        if (record.isCompleted) {
            if (record.score !== null && record.score >= 90) return '🌟';
            if (record.score !== null && record.score >= 70) return '✅';
            return '📝';
        }
        if (record.answeredCount > 0) return '🔄';
        return '';
    };

    const days = getDaysInMonth();

    const handlePrev = () => {
        if (month === 1) {
            onMonthChange(year - 1, 12);
        } else {
            onMonthChange(year, month - 1);
        }
    };

    const handleNext = () => {
        if (month === 12) {
            onMonthChange(year + 1, 1);
        } else {
            onMonthChange(year, month + 1);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <span className="card-title-icon blue">📅</span>
                    학습 캘린더
                </div>
                <div className="calendar-nav">
                    <button className="calendar-nav-btn" onClick={handlePrev} aria-label="이전 달">
                        ◀
                    </button>
                    <span className="calendar-month-label">
                        {year}년 {MONTH_NAMES[month - 1]}
                    </span>
                    <button className="calendar-nav-btn" onClick={handleNext} aria-label="다음 달">
                        ▶
                    </button>
                </div>
            </div>

            <div className="calendar-grid">
                {/* 요일 헤더 */}
                {DAY_NAMES.map(name => (
                    <div key={name} className="calendar-day-header">{name}</div>
                ))}

                {/* 날짜 셀 */}
                {days.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} className="calendar-day empty" />;
                    }

                    const record = getRecordForDay(day);
                    const today = isToday(day);
                    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const stamp = getStamp(record);

                    let className = 'calendar-day';
                    if (today) className += ' today';
                    if (record) {
                        className += ' has-data';
                        if (record.isCompleted) className += ' completed';
                        else if (record.answeredCount > 0) className += ' in-progress';
                    }

                    return (
                        <div
                            key={dateStr}
                            className={className}
                            onClick={() => record && onDayClick(record)}
                            onMouseEnter={() => setHoveredDay(dateStr)}
                            onMouseLeave={() => setHoveredDay(null)}
                            title={record ? `점수: ${record.score ?? '-'}점 | ${record.correctCount}/${record.totalCount} 정답` : ''}
                        >
                            <span className="calendar-day-num">{day}</span>
                            {stamp && <span className="calendar-day-stamp">{stamp}</span>}
                            {record?.score !== null && record?.isCompleted && (
                                <span className={`calendar-day-score ${getScoreColor(record.score)}`}>
                                    {record.score}점
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* 범례 */}
            <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'center',
                marginTop: '16px',
                fontSize: '12px',
                color: 'var(--text-muted)'
            }}>
                <span>🌟 90점↑</span>
                <span>✅ 70점↑</span>
                <span>📝 완료</span>
                <span>🔄 진행중</span>
            </div>
        </div>
    );
}
