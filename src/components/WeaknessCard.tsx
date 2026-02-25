'use client';

const ERROR_TYPE_LABELS: Record<string, { emoji: string; label: string }> = {
    CALCULATION_ERROR: { emoji: '🔢', label: '계산 실수' },
    CONCEPT_GAP: { emoji: '📚', label: '개념 부족' },
    MISREAD: { emoji: '👀', label: '문제 잘못 읽음' },
    TIME_PRESSURE: { emoji: '⏱️', label: '시간 부족' },
    CARELESS: { emoji: '😅', label: '부주의' },
    FORMULA_ERROR: { emoji: '📝', label: '공식 적용 오류' },
    PROCESS_ERROR: { emoji: '🔄', label: '풀이 과정 오류' },
    OTHER: { emoji: '❓', label: '기타' },
};

interface WeaknessCardProps {
    topWeaknesses: Array<{
        topic: string;
        count: number;
        avgSeverity: number;
        errorTypes: string[];
    }>;
    totalUnresolved: number;
}

export default function WeaknessCard({ topWeaknesses, totalUnresolved }: WeaknessCardProps) {
    const getSeverityColor = (severity: number): string => {
        if (severity >= 4) return 'var(--accent-red)';
        if (severity >= 3) return 'var(--accent-amber)';
        return 'var(--accent-blue)';
    };

    const getSeverityBar = (severity: number) => {
        const width = (severity / 5) * 100;
        return (
            <div style={{
                width: '60px',
                height: '4px',
                background: 'var(--bg-glass-strong)',
                borderRadius: '2px',
                overflow: 'hidden',
                marginTop: '4px',
            }}>
                <div style={{
                    width: `${width}%`,
                    height: '100%',
                    background: getSeverityColor(severity),
                    borderRadius: '2px',
                    transition: 'width 0.5s ease',
                }} />
            </div>
        );
    };

    if (topWeaknesses.length === 0) {
        return (
            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        <span className="card-title-icon red">🎯</span>
                        취약점 분석
                    </div>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">🎉</div>
                    <div className="empty-state-text">
                        아직 발견된 취약점이 없어요!<br />
                        학습지를 풀어보세요.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <div className="card-title">
                    <span className="card-title-icon red">🎯</span>
                    취약점 분석
                </div>
                <span style={{
                    fontSize: '12px',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--accent-red-glow)',
                    color: 'var(--accent-red)',
                }}>
                    {totalUnresolved}개
                </span>
            </div>

            {topWeaknesses.map((weakness, idx) => (
                <div key={weakness.topic} className="weakness-item">
                    <div>
                        <div className="weakness-topic">
                            <span style={{ marginRight: '6px' }}>
                                {idx === 0 ? '🔴' : idx === 1 ? '🟠' : '🟡'}
                            </span>
                            {weakness.topic}
                        </div>
                        <div className="weakness-detail">
                            {weakness.errorTypes.map(et => {
                                const info = ERROR_TYPE_LABELS[et] || { emoji: '❓', label: et };
                                return (
                                    <span key={et} className="error-type-tag" style={{ marginRight: '4px' }}>
                                        {info.emoji} {info.label}
                                    </span>
                                );
                            })}
                        </div>
                        {getSeverityBar(weakness.avgSeverity)}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div className="weakness-count">{weakness.count}회</div>
                        <div style={{
                            fontSize: '10px',
                            color: 'var(--text-muted)',
                            marginTop: '4px',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            심각도 {weakness.avgSeverity}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
