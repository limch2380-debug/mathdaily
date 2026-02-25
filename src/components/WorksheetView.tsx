'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Problem, UserResponseData } from '@/lib/types';

interface WorksheetViewProps {
    worksheetId: string;
    problems: Problem[];
    existingResponses: UserResponseData[];
    onSubmitAnswer: (problemId: string, answer: string, timeSpent: number) => Promise<{
        isCorrect: boolean;
        correctAnswer?: string;
    }>;
    onBack: () => void;
    onComplete: (responses: UserResponseData[]) => void;
    onRetryIncorrect?: (incorrectProblems: Problem[]) => void;
    onGenerateSimilar?: (topics: string[]) => void;
}

interface AnswerState {
    [problemId: string]: {
        answer: string;
        submitted: boolean;
        isCorrect?: boolean;
        correctAnswer?: string;
        timeStarted: number;
    };
}

export default function WorksheetView({
    worksheetId,
    problems,
    existingResponses,
    onSubmitAnswer,
    onBack,
    onComplete,
    onRetryIncorrect,
    onGenerateSimilar,
}: WorksheetViewProps) {
    const [answers, setAnswers] = useState<AnswerState>(() => {
        const initial: AnswerState = {};
        problems.forEach(p => {
            const existing = existingResponses.find(r => r.problemId === p.id);
            if (existing) {
                initial[p.id] = {
                    answer: existing.userAnswer,
                    submitted: true,
                    isCorrect: existing.isCorrect,
                    correctAnswer: existing.isCorrect ? undefined : p.answer,
                    timeStarted: Date.now(),
                };
            } else {
                initial[p.id] = {
                    answer: '',
                    submitted: false,
                    timeStarted: Date.now(),
                };
            }
        });
        return initial;
    });

    const [currentIndex, setCurrentIndex] = useState(0);
    const [submitting, setSubmitting] = useState<string | null>(null);
    const [showCompletion, setShowCompletion] = useState(false);
    const optionsCacheRef = useRef<Record<string, string[]>>({}); // ★ 보기 캐시

    // ★ problems가 변경될 때만 상태 리셋 (retry, AI 생성 등)
    // existingResponses는 의존성에서 제거 — 답변 제출 시 리셋 방지
    useEffect(() => {
        const initial: AnswerState = {};
        problems.forEach(p => {
            initial[p.id] = {
                answer: '',
                submitted: false,
                timeStarted: Date.now(),
            };
        });
        setAnswers(initial);
        setCurrentIndex(0);
        setShowCompletion(false);
        setSubmitting(null);
        setSelectedOption(null);
        optionsCacheRef.current = {};
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [problems]);

    const answeredCount = Object.values(answers).filter(a => a.submitted).length;
    const correctCount = Object.values(answers).filter(a => a.submitted && a.isCorrect).length;

    // ★ 선택된 보기 (제출 전 하이라이트만)
    const [selectedOption, setSelectedOption] = useState<string | null>(null);

    // 문제 이동 시 선택 초기화
    const goToNext = useCallback(() => {
        setSelectedOption(null);
        setCurrentIndex(prev => prev + 1);
    }, []);

    const goToPrev = useCallback(() => {
        setSelectedOption(null);
        setCurrentIndex(prev => prev - 1);
    }, []);

    // ★ 보기 클릭 = 선택만 (제출하지 않음)
    const handleSelectOption = (option: string) => {
        const state = answers[problems[currentIndex].id];
        if (!state || state.submitted) return;
        setSelectedOption(option);
    };

    // ★ "정답 확인" 버튼 = 실제 제출
    const handleConfirmAnswer = async () => {
        const problem = problems[currentIndex];
        const state = answers[problem.id];
        if (!state || state.submitted || !selectedOption) return;

        setSubmitting(problem.id);
        const timeSpent = Math.round((Date.now() - state.timeStarted) / 1000);

        try {
            const result = await onSubmitAnswer(problem.id, selectedOption, timeSpent);
            setAnswers(prev => ({
                ...prev,
                [problem.id]: {
                    ...prev[problem.id],
                    answer: selectedOption,
                    submitted: true,
                    isCorrect: result.isCorrect,
                    correctAnswer: result.correctAnswer,
                },
            }));
        } catch (error) {
            console.error('Submit error:', error);
        } finally {
            setSubmitting(null);
        }
    };

    const getDifficultyClass = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'diff-easy';
            case 'hard': return 'diff-hard';
            default: return 'diff-medium';
        }
    };

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '쉬움';
            case 'hard': return '어려움';
            default: return '보통';
        }
    };

    // ★ 보기 캐시: 문제별로 한 번만 생성하여 재렌더링 시 변하지 않도록
    const getOptionsForProblem = useCallback((problem: Problem): string[] => {
        // 캐시에 이미 있으면 그대로 반환
        if (optionsCacheRef.current[problem.id]) {
            return optionsCacheRef.current[problem.id];
        }
        // 문제 자체에 옵션이 있으면 사용
        if (problem.options && problem.options.length >= 4) {
            optionsCacheRef.current[problem.id] = problem.options;
            return problem.options;
        }
        // fallback: 정답 기반 자동 생성
        const correct = problem.answer;
        const num = parseFloat(correct);
        const opts = [correct];
        if (!isNaN(num)) {
            const used = new Set([num]);
            while (opts.length < 4) {
                const offset = Math.floor(Math.random() * 5) + 1;
                const wrong = Math.random() > 0.5 ? num + offset : num - offset;
                if (!used.has(wrong)) {
                    used.add(wrong);
                    opts.push(Number.isInteger(num) ? wrong.toString() : wrong.toFixed(1));
                }
            }
        } else {
            opts.push(correct + '1', correct + '0', '없음');
        }
        // 셔플
        for (let i = opts.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        optionsCacheRef.current[problem.id] = opts;
        return opts;
    }, []);

    if (showCompletion) {
        const score = Math.round((correctCount / problems.length) * 100);
        return (
            <div className="worksheet-view">
                <button className="back-btn" onClick={onBack}>
                    ← 대시보드로 돌아가기
                </button>
                <div className="card completion-card">
                    <div className="completion-icon">
                        {score >= 90 ? '🏆' : score >= 70 ? '🎉' : score >= 50 ? '💪' : '📚'}
                    </div>
                    <div className="completion-score">{score}점</div>
                    <div className="completion-message">
                        {score >= 90 ? '완벽합니다!' : score >= 70 ? '잘 했어요!' : score >= 50 ? '조금만 더!' : '복습이 필요해요'}
                    </div>
                    <div className="completion-sub">
                        {problems.length}문제 중 {correctCount}개 정답 ({problems.length - correctCount}개 오답)
                    </div>

                    {/* 오답 요약 */}
                    {problems.length - correctCount > 0 && (
                        <div style={{ marginTop: '24px', textAlign: 'left' }}>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 700,
                                color: 'var(--text-primary)',
                                marginBottom: '12px',
                            }}>
                                📋 오답 요약
                            </div>
                            {problems
                                .filter(p => answers[p.id]?.submitted && !answers[p.id]?.isCorrect)
                                .map(p => (
                                    <div key={p.id} className="weakness-item" style={{ textAlign: 'left' }}>
                                        <div>
                                            <div className="weakness-topic" style={{ fontSize: '13px' }}>
                                                Q{p.orderNum}. {p.question}
                                            </div>
                                            <div className="weakness-detail" style={{ marginTop: '6px' }}>
                                                <span style={{ color: 'var(--accent-red)' }}>
                                                    내 답: {answers[p.id].answer}
                                                </span>
                                                <span style={{ margin: '0 8px', color: 'var(--text-muted)' }}>→</span>
                                                <span style={{ color: 'var(--accent-green)' }}>
                                                    정답: {p.answer}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="topic-tag">{p.topic}</span>
                                    </div>
                                ))}
                        </div>
                    )}

                    <div className="action-buttons-group">
                        <button className="dashboard-btn" onClick={onBack}>
                            🏠 대시보드로 가기
                        </button>

                        <button className="dashboard-btn" onClick={() => {
                            if (confirm('모든 진행 상태를 초기화하고 새로 시작하시겠습니까?')) {
                                window.location.href = '/'; // 강제 새로고침으로 세션 초기화 유도 (또는 props로 받은 onLogout 호출 가능)
                                localStorage.clear();
                            }
                        }} style={{ color: 'var(--accent-red)' }}>
                            🔄 새로 시작하기
                        </button>

                        {problems.length - correctCount > 0 && (
                            <>
                                <button className="retry-btn" onClick={() => {
                                    const incorrect = problems.filter(p => !answers[p.id]?.isCorrect);
                                    onRetryIncorrect?.(incorrect);
                                }}>
                                    🔄 틀린 문제 다시 풀기
                                </button>

                                <button className="ai-gen-btn" onClick={() => {
                                    const topics = Array.from(new Set(
                                        problems
                                            .filter(p => !answers[p.id]?.isCorrect)
                                            .map(p => p.topic)
                                    ));
                                    onGenerateSimilar?.(topics);
                                }}>
                                    🤖 AI 유사 문제 생성
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <style jsx>{`
                    .completion-card {
                        text-align: center;
                        padding: 40px;
                        max-width: 600px;
                        margin: 40px auto;
                    }
                    .action-buttons-group {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        margin-top: 32px;
                    }
                    .dashboard-btn, .retry-btn, .ai-gen-btn {
                        padding: 16px;
                        border-radius: 12px;
                        font-size: 16px;
                        font-weight: 700;
                        cursor: pointer;
                        border: none;
                        transition: all 0.2s ease;
                    }
                    .dashboard-btn {
                        background: var(--bg-tertiary);
                        color: var(--text-primary);
                        border: 1px solid var(--border-medium);
                    }
                    .retry-btn {
                        background: var(--accent-blue);
                        color: white;
                    }
                    .ai-gen-btn {
                        background: linear-gradient(135deg, #6366f1, #a855f7);
                        color: white;
                    }
                    .dashboard-btn:hover, .retry-btn:hover, .ai-gen-btn:hover {
                        transform: translateY(-2px);
                        filter: brightness(1.1);
                    }
                `}</style>
            </div>
        );
    }

    const currentProblem = problems[currentIndex];
    const currentState = answers[currentProblem.id];
    const isSubmitting = submitting === currentProblem.id;
    const options = getOptionsForProblem(currentProblem);

    return (
        <div className="worksheet-view presenter-mode">
            <div className="presenter-header">
                <button className="back-btn-minimal" onClick={onBack}>✕</button>
                <div className="presenter-progress text-center">
                    <span className="step-count">문제 {currentIndex + 1} / {problems.length}</span>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${((currentIndex + 1) / problems.length) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            <div className="problem-slide">
                <div key={currentProblem.id} className="problem-content">
                    <div className="problem-meta">
                        <span className="topic-pill">{currentProblem.topic}</span>
                        <span className={`difficulty-pill ${getDifficultyClass(currentProblem.difficulty)}`}>
                            {getDifficultyLabel(currentProblem.difficulty)}
                        </span>
                    </div>

                    <h2 className="problem-text">{currentProblem.question}</h2>

                    {/* SVG 시각화 영역 */}
                    {currentProblem.svg && (
                        <div className="presenter-svg-box" dangerouslySetInnerHTML={{ __html: currentProblem.svg }} />
                    )}

                    {/* ★ 객관식 4지선다 보기 */}
                    <div className="answer-section">
                        <div className="options-grid">
                            {options.map((option, idx) => {
                                const labels = ['①', '②', '③', '④'];
                                const isThisSelected = selectedOption === option;
                                const isSubmitted = currentState?.submitted;
                                const isCorrectOption = option === currentProblem.answer;
                                const wasUserAnswer = currentState?.answer === option;

                                let optionClass = 'option-btn';
                                if (isSubmitted) {
                                    if (isCorrectOption) {
                                        optionClass += ' correct-option';
                                    } else if (wasUserAnswer && !currentState?.isCorrect) {
                                        optionClass += ' wrong-option';
                                    } else {
                                        optionClass += ' disabled-option';
                                    }
                                } else if (isThisSelected) {
                                    optionClass += ' selected-option';
                                }

                                return (
                                    <button
                                        key={idx}
                                        className={optionClass}
                                        onClick={() => handleSelectOption(option)}
                                        disabled={!!isSubmitted || isSubmitting}
                                    >
                                        <span className="option-label">{labels[idx]}</span>
                                        <span className="option-text">{option}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ★ 제출 버튼 — 보기 선택 후 나타남 */}
                        {!currentState?.submitted && selectedOption && (
                            <button className="confirm-btn" onClick={handleConfirmAnswer} disabled={isSubmitting}>
                                {isSubmitting ? '채점 중...' : '✅ 정답 확인'}
                            </button>
                        )}

                        {currentState?.submitted && (
                            <div className={`result-message ${currentState.isCorrect ? 'correct' : 'incorrect'} animate-fade-in`}>
                                <div className="result-title">
                                    {currentState.isCorrect ? '✨ 정답입니다!' : '❌ 다시 한 번 생각해봐요'}
                                </div>
                                {!currentState.isCorrect && (
                                    <div className="correct-answer-hint">정답은 <strong>{currentProblem.answer}</strong> 입니다.</div>
                                )}
                                {currentProblem.explanation && (
                                    <div className="explanation-bubble">
                                        <strong>💡 해설:</strong> {currentProblem.explanation}
                                    </div>
                                )}

                                {currentIndex < problems.length - 1 ? (
                                    <button className="next-slide-btn" onClick={goToNext}>
                                        다음 문제로 이동 →
                                    </button>
                                ) : (
                                    <button className="next-slide-btn finish" onClick={() => setShowCompletion(true)}>
                                        결과 확인하기 🏆
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="presenter-nav">
                <button
                    className="nav-btn prev"
                    disabled={currentIndex === 0}
                    onClick={goToPrev}
                >
                    ← 이전
                </button>
                <div className="nav-dots">
                    {problems.map((_, i) => (
                        <div key={i} className={`dot ${i === currentIndex ? 'active' : ''} ${answers[problems[i].id]?.submitted ? 'completed' : ''}`} />
                    ))}
                </div>
                <button
                    className="nav-btn next"
                    disabled={currentIndex === problems.length - 1 || !currentState?.submitted}
                    onClick={goToNext}
                >
                    다음 →
                </button>
            </div>

            <style jsx>{`
                .presenter-mode {
                    max-width: 900px;
                    margin: 0 auto;
                    min-height: 80vh;
                    display: flex;
                    flex-direction: column;
                }
                .presenter-header {
                    display: flex;
                    align-items: center;
                    padding: 20px 0;
                    margin-bottom: 20px;
                }
                .back-btn-minimal {
                    background: none; border: none; color: var(--text-secondary);
                    font-size: 24px; cursor: pointer; padding: 10px;
                }
                .presenter-progress { flex: 1; }
                .step-count { font-weight: 700; color: var(--text-secondary); font-size: 14px; }
                .progress-track { background: var(--border-medium); height: 6px; border-radius: 3px; margin-top: 8px; overflow: hidden; }
                .progress-fill { background: var(--accent-blue); height: 100%; transition: width 0.4s ease; }

                .problem-slide {
                    flex: 1;
                    background: var(--bg-secondary);
                    border: 1px solid var(--border-medium);
                    border-radius: 24px;
                    padding: 40px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    box-shadow: var(--shadow-xl);
                }
                .problem-meta { display: flex; gap: 10px; margin-bottom: 20px; }
                .topic-pill { background: rgba(59, 130, 246, 0.1); color: var(--accent-blue); padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; }
                .difficulty-pill { padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 700; }
                
                .problem-text { font-size: 24px; font-weight: 800; line-height: 1.5; color: var(--text-primary); margin-bottom: 30px; text-align: center; }
                
                .presenter-svg-box {
                    background: #111827;
                    border-radius: 16px;
                    padding: 30px;
                    margin-bottom: 30px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 320px;
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .presenter-svg-box :global(svg) {
                    max-width: 100%;
                    height: auto;
                    max-height: 280px;
                    filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.2));
                }

                .answer-section { max-width: 600px; margin: 0 auto; width: 100%; }

                /* ★ 객관식 보기 그리드 */
                .options-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .option-btn {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    background: var(--bg-tertiary);
                    border: 2px solid var(--border-medium);
                    border-radius: 16px;
                    cursor: pointer;
                    font-size: 16px;
                    color: var(--text-primary);
                    transition: all 0.2s ease;
                    text-align: left;
                }
                .option-btn:hover:not(:disabled) {
                    border-color: var(--accent-blue);
                    background: rgba(59, 130, 246, 0.05);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
                }
                .option-label {
                    font-size: 18px;
                    font-weight: 800;
                    color: var(--accent-blue);
                    flex-shrink: 0;
                }
                .option-text {
                    font-weight: 600;
                    word-break: break-all;
                }
                .selected-option {
                    border-color: var(--accent-blue);
                    background: rgba(59, 130, 246, 0.1);
                }
                .correct-option {
                    border-color: var(--accent-green) !important;
                    background: rgba(16, 185, 129, 0.15) !important;
                    color: var(--accent-green);
                }
                .correct-option .option-label { color: var(--accent-green); }
                .wrong-option {
                    border-color: var(--accent-red) !important;
                    background: rgba(239, 68, 68, 0.15) !important;
                    color: var(--accent-red);
                }
                .wrong-option .option-label { color: var(--accent-red); }
                .disabled-option {
                    opacity: 0.4;
                    cursor: not-allowed;
                }
                .option-btn:disabled { cursor: not-allowed; }

                /* ★ 정답 확인 버튼 */
                .confirm-btn {
                    display: block;
                    width: 100%;
                    margin-top: 16px;
                    padding: 16px;
                    background: var(--accent-blue);
                    color: white;
                    border: none;
                    border-radius: 14px;
                    font-size: 18px;
                    font-weight: 800;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    animation: fadeIn 0.3s ease;
                }
                .confirm-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
                }
                .confirm-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .submitting-indicator {
                    text-align: center;
                    color: var(--text-secondary);
                    font-weight: 600;
                    padding: 8px;
                    animation: pulse 1s infinite;
                }
                @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

                .result-message { margin-top: 20px; padding: 20px; border-radius: 16px; text-align: center; }
                .result-message.correct { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); }
                .result-message.incorrect { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); }
                .result-title { font-size: 18px; font-weight: 800; margin-bottom: 8px; }
                .correct { color: var(--accent-green); }
                .incorrect { color: var(--accent-red); }
                .correct-answer-hint { font-size: 15px; margin-bottom: 8px; color: var(--text-secondary); }
                .explanation-bubble { margin: 15px 0; font-size: 14px; text-align: left; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; line-height: 1.6; }

                .next-slide-btn {
                    margin-top: 15px; background: var(--text-primary); color: var(--bg-primary);
                    border: none; border-radius: 12px; padding: 12px 24px; font-weight: 700; cursor: pointer;
                }
                .next-slide-btn.finish { background: var(--accent-blue); color: white; }

                .presenter-nav { display: flex; align-items: center; justify-content: space-between; padding: 30px 0; }
                .nav-btn { background: none; border: 1px solid var(--border-medium); color: var(--text-secondary); padding: 8px 16px; border-radius: 10px; cursor: pointer; font-weight: 600; }
                .nav-btn:disabled { opacity: 0.3; cursor: not-allowed; }
                .nav-dots { display: flex; gap: 8px; }
                .dot { width: 8px; height: 8px; border-radius: 4px; background: var(--border-medium); transition: all 0.3s ease; }
                .dot.active { width: 24px; background: var(--accent-blue); }
                .dot.completed { background: var(--accent-blue); opacity: 0.5; }

                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.4s ease forwards; }
            `}</style>
        </div>
    );
}
