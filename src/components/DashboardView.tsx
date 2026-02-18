'use client';

import { useEffect, useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // 기본 스타일
import { format } from 'date-fns';

interface DashboardProps {
    user: { id: string; name: string };
    onStartStudy: (level: string) => void;
}

export default function DashboardView({ user, onStartStudy }: DashboardProps) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/dashboard?userId=${user.id}`)
            .then(res => res.json())
            .then(setData)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [user.id]);

    if (loading) return <div className="p-8 text-center">로딩 중...</div>;

    const { stats, sessions } = data || {};
    const todaySession = sessions?.find((s: any) =>
        new Date(s.date).toDateString() === new Date().toDateString()
    );

    // 캘린더 타일 커스텀 (점수 표시)
    const tileContent = ({ date, view }: any) => {
        if (view !== 'month') return null;
        const session = sessions?.find((s: any) =>
            new Date(s.date).toDateString() === date.toDateString()
        );
        if (!session) return null;

        return (
            <div className="flex flex-col items-center mt-1">
                <span className={`text-xs font-bold ${session.score >= 80 ? 'text-blue-600' :
                        session.score >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                    {session.score}점
                </span>
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            {/* 상단 환영 메시지 */}
            <header className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        안녕하세요, {user.name}님! 👋
                    </h1>
                    <p className="text-gray-500 mt-1">
                        오늘도 10분 수학으로 실력을 키워보세요!
                    </p>
                </div>
                <button
                    onClick={() => onStartStudy(stats.currentLevel)}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-1"
                >
                    {todaySession ? '다시 풀기' : '오늘의 문제 풀기'}
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 1. 학습 통계 카드 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <h3 className="font-bold text-gray-700">나의 학습 현황</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 p-4 rounded-xl text-center">
                            <div className="text-sm text-blue-600 mb-1">총 학습일</div>
                            <div className="text-2xl font-bold text-blue-900">{stats?.totalDays || 0}일</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-xl text-center">
                            <div className="text-sm text-purple-600 mb-1">평균 점수</div>
                            <div className="text-2xl font-bold text-purple-900">{stats?.avgScore || 0}점</div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">현재 예상 레벨</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${stats.currentLevel === 'hard' ? 'bg-red-100 text-red-700' :
                                    stats.currentLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-green-100 text-green-700'
                                }`}>
                                {stats.currentLevel === 'hard' ? '심화 (상)' :
                                    stats.currentLevel === 'medium' ? '보통 (중)' : '기초 (하)'}
                            </span>
                        </div>
                        <p className="text-xs text-gray-400">
                            최근 5회 평균 점수를 기반으로 AI가 난이도를 자동 조절합니다.
                        </p>
                    </div>
                </div>

                {/* 2. 캘린더 */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-700 mb-4">학습 캘린더</h3>
                    <div className="calendar-wrapper">
                        <Calendar
                            locale="ko-KR"
                            tileContent={tileContent}
                            formatDay={(locale, date) => format(date, 'd')}
                            className="w-full border-none"
                        />
                    </div>
                </div>
            </div>

            <style jsx global>{`
        .calendar-wrapper {
          width: 100%;
          min-height: 300px;
        }
        .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
        }
        .react-calendar__tile {
          height: 80px;
          display: flex;
          flex-col;
          align-items: center;
          justify-content: flex-start;
          padding-top: 10px;
        }
        .react-calendar__tile--now {
          background: #eff6ff;
          border-radius: 8px;
        }
        .react-calendar__tile--active {
          background: #3b82f6 !important;
          color: white !important;
          border-radius: 8px;
        }
      `}</style>
        </div>
    );
}
