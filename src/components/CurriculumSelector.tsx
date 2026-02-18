'use client';

import { useState, useEffect } from 'react';
import { Chapter, Unit } from '@/lib/types';
import { fetchCurriculum } from '@/lib/api';

interface CurriculumSelectorProps {
    schoolLevel: string;
    grade: number;
    selectedChapterId?: number;
    selectedUnitId?: number;
    onUnitSelect: (chapterId: number | undefined, unitId: number | undefined) => void;
}

export default function CurriculumSelector({
    schoolLevel,
    grade,
    selectedChapterId,
    selectedUnitId,
    onUnitSelect
}: CurriculumSelectorProps) {
    const [chapters, setChapters] = useState<Chapter[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 커리큘럼 데이터 로딩
    useEffect(() => {
        const loadCurriculum = async () => {
            setLoading(true);
            setError(null);
            try {
                console.log(`Fetching curriculum for ${schoolLevel} grade ${grade}`);
                const data = await fetchCurriculum(schoolLevel, grade);
                console.log("Fetched Curriculum Data:", data);

                if (!data || data.length === 0) {
                    setError("해당 학년의 커리큘럼 데이터가 없습니다.");
                    setChapters([]);
                } else {
                    setChapters(data);
                }
            } catch (err) {
                console.error("Curriculum loading failed:", err);
                setError("커리큘럼을 불러오는데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };
        loadCurriculum();
    }, [schoolLevel, grade]);

    if (loading) return <div className="text-sm text-gray-400">커리큘럼 로딩 중...</div>;

    // 데이터 없음
    if (chapters.length === 0) {
        return (
            <div className="curriculum-selector empty">
                <p className="error-msg">{error || "선택 가능한 단원이 없습니다."}</p>
                <p className="tip-msg">설정에서 학년을 변경해보세요.</p>
            </div>
        );
    }

    return (
        <div className="curriculum-selector">
            <div className="select-group">
                <label>대단원 선택</label>
                <select
                    value={selectedChapterId || ''}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') onUnitSelect(undefined, undefined);
                        else onUnitSelect(Number(val), undefined);
                    }}
                    className="curriculum-select"
                >
                    <option value="">전체 범위 (종합)</option>
                    {chapters.map(ch => (
                        <option key={ch.id} value={ch.id}>{ch.name}</option>
                    ))}
                </select>
            </div>

            {selectedChapterId && (
                <div className="select-group animate-slide-up">
                    <label>소단원 선택 (집중 공략)</label>
                    <div className="unit-pills">
                        <button
                            className={`unit-pill ${!selectedUnitId ? 'active' : ''}`}
                            onClick={() => onUnitSelect(selectedChapterId, undefined)}
                        >
                            전체
                        </button>
                        {chapters.find(c => c.id === selectedChapterId)?.units.map(unit => (
                            <button
                                key={unit.id}
                                className={`unit-pill ${selectedUnitId === unit.id ? 'active' : ''}`}
                                onClick={() => onUnitSelect(selectedChapterId, unit.id)}
                            >
                                {unit.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
                .curriculum-selector {
                    background: var(--bg-tertiary);
                    padding: 16px;
                    border-radius: var(--radius-lg);
                    margin-bottom: 24px;
                    border: 1px solid var(--border-medium);
                }
                .curriculum-selector.empty {
                    text-align: center;
                    padding: 20px;
                }
                .error-msg { color: var(--color-error); font-size: 14px; margin-bottom: 4px; }
                .tip-msg { color: var(--text-muted); font-size: 12px; }

                .select-group {
                    margin-bottom: 16px;
                }
                .select-group:last-child {
                    margin-bottom: 0;
                }
                .select-group label {
                    display: block;
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-secondary);
                    margin-bottom: 8px;
                }
                .curriculum-select {
                    width: 100%;
                    padding: 10px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-medium);
                    background: var(--bg-primary);
                    color: var(--text-primary);
                    font-size: 14px;
                }
                .unit-pills {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .unit-pill {
                    padding: 6px 12px;
                    border-radius: var(--radius-full);
                    border: 1px solid var(--border-medium);
                    background: var(--bg-glass);
                    color: var(--text-secondary);
                    font-size: 13px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .unit-pill:hover {
                    background: var(--bg-glass-strong);
                    border-color: var(--border-active);
                }
                .unit-pill.active {
                    background: var(--accent-blue);
                    color: white;
                    border-color: var(--accent-blue);
                    box-shadow: var(--shadow-glow-blue);
                }
                .animate-slide-up {
                    animation: slideUp 0.3s ease-out;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
