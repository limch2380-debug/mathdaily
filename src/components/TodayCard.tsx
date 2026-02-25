'use client';

interface TodayCardProps {
    status: 'new' | 'in_progress' | 'completed' | 'none';
    progress: {
        answered: number;
        total: number;
        percentage: number;
    };
    score?: number | null;
    onStart: () => void;
}

export default function TodayCard({ status, progress, score, onStart }: TodayCardProps) {
    const getStatusBadge = () => {
        switch (status) {
            case 'new':
                return <span className="today-status-badge badge-new">🆕 새로운 학습지</span>;
            case 'in_progress':
                return <span className="today-status-badge badge-progress">📝 진행 중</span>;
            case 'completed':
                return <span className="today-status-badge badge-done">✅ 완료</span>;
            default:
                return <span className="today-status-badge badge-new">📋 대기중</span>;
        }
    };

    const getButtonText = () => {
        switch (status) {
            case 'new': return '오늘의 학습 시작하기 →';
            case 'in_progress': return '이어서 풀기 →';
            case 'completed': return '결과 확인하기 →';
            default: return '학습지 생성하기 →';
        }
    };

    const getMotivation = () => {
        if (status === 'completed') {
            if (score !== null && score !== undefined) {
                if (score >= 90) return '🎉 대단해요! 최고의 성적이에요!';
                if (score >= 70) return '👏 잘 했어요! 조금만 더 노력해봐요!';
                return '💪 오늘의 실수를 내일의 성장으로!';
            }
        }
        if (status === 'in_progress') return '⏰ 아직 풀지 않은 문제가 남아있어요';
        return '📐 매일 꾸준히 풀면 실력이 쑥쑥!';
    };

    return (
        <div className="card today-card">
            <div className="card-header">
                <div className="card-title">
                    <span className="card-title-icon purple">📐</span>
                    오늘의 학습
                </div>
                {getStatusBadge()}
            </div>

            <div className="today-status">
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {getMotivation()}
                </span>
            </div>

            <div className="progress-bar-container">
                <div
                    className="progress-bar-fill"
                    style={{ width: `${progress.percentage}%` }}
                />
            </div>

            <div className="progress-text">
                <span>{progress.answered} / {progress.total} 문제</span>
                <span>{progress.percentage}%</span>
            </div>

            {status === 'completed' && score !== null && score !== undefined && (
                <div style={{ textAlign: 'center', margin: '16px 0 8px' }}>
                    <div style={{
                        fontSize: '42px',
                        fontWeight: 900,
                        fontFamily: 'var(--font-mono)',
                        background: score >= 80 ? 'var(--gradient-success)' : score >= 50 ? 'var(--gradient-warm)' : 'var(--gradient-danger)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                    }}>
                        {Math.round(score)}점
                    </div>
                </div>
            )}

            <button
                className={status === 'in_progress' ? 'continue-btn' : 'start-btn'}
                onClick={onStart}
            >
                {getButtonText()}
            </button>
        </div>
    );
}
