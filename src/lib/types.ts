// ============================================
// 타입 정의
// ============================================

export type SchoolLevel = 'elementary' | 'middle' | 'high';
export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface UserSettings {
    schoolLevel: SchoolLevel;
    grade: number; // 1~6 for elementary, 1~3 for middle/high
    difficulty: DifficultyLevel;
    problemCount: number; // 기본 10
    selectedChapterId?: number; // 선택된 대단원
    selectedUnitId?: number;    // 선택된 소단원 (집중 훈련용)
}

export interface Unit {
    id: number;
    name: string;
}

export interface Chapter {
    id: number;
    name: string;
    units: Unit[];
}

export interface ProblemData {
    question: string;
    answer: string;
    topic: string;
    type: string;
    difficulty: DifficultyLevel;
    options?: string[];
    explanation?: string;
    svg?: string; // (선택) 문제와 함께 표시할 도형/그래프 SVG
}

export const SCHOOL_LABELS: Record<SchoolLevel, string> = {
    elementary: '초등학교',
    middle: '중학교',
    high: '고등학교',
};

export const GRADE_COUNTS: Record<SchoolLevel, number> = {
    elementary: 6,
    middle: 3,
    high: 3,
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
    easy: '기초',
    medium: '보통',
    hard: '심화',
};

export interface CalendarDay {
    id?: string;
    date: string;        // "2026-02-14"
    isCompleted: boolean;
    score: number | null;
    totalCount: number;
    correctCount: number;
    answeredCount: number;
    topics: string[];
}

export interface Problem {
    id: string;
    orderNum: number;
    question: string;
    answer: string;
    options: string[];
    type: string;
    topic: string;
    difficulty: string;
    explanation?: string;
    svg?: string; // (선택) 문제와 함께 표시할 도형/그래프 SVG
}

export interface Worksheet {
    id: string;
    userId: string;
    date: string;
    title: string;
    totalCount: number;
    isCompleted: boolean;
    score: number | null;
    difficulty: string;
    topics: string[];
    problems: Problem[];
    responses: UserResponseData[];
}

export interface UserResponseData {
    id: string;
    userId: string;
    worksheetId: string;
    problemId: string;
    userAnswer: string;
    isCorrect: boolean;
    timeSpentSec?: number;
}

export interface DailyTaskResult {
    worksheet: Worksheet;
    isNew: boolean;
    status: 'new' | 'in_progress' | 'completed';
    progress: {
        answered: number;
        total: number;
        percentage: number;
    };
}

export interface WeaknessTopicData {
    count: number;
    avgSeverity: number;
    errorTypes: string[];
}

export interface WeaknessSummary {
    totalUnresolved: number;
    byTopic: Record<string, WeaknessTopicData>;
    topWeaknesses: Array<{
        topic: string;
        count: number;
        avgSeverity: number;
        errorTypes: string[];
    }>;
}
