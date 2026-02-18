'use client';

import { useState, useCallback, useEffect } from 'react';
import Calendar from '@/components/Calendar';
import TodayCard from '@/components/TodayCard';
import WeaknessCard from '@/components/WeaknessCard';
import WorksheetView from '@/components/WorksheetView';
import DayDetailModal from '@/components/DayDetailModal';
import GradeSettings from '@/components/GradeSettings';
import CurriculumSelector from '@/components/CurriculumSelector';
import { CalendarDay, Problem, UserResponseData, UserSettings } from '@/lib/types';
import { fetchAIWorksheet } from '@/lib/api';
// import { generateMathProblems } from '@/lib/problemBank';
import LoadingOverlay from '@/components/LoadingOverlay'; // 로컬 백업 미사용

function generateDemoCalendarData(year: number, month: number): CalendarDay[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const records: CalendarDay[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date > today) continue;
    if ((date.getDay() === 0 || date.getDay() === 6) && Math.random() > 0.3) continue;
    if (Math.random() > 0.85) continue;

    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const totalCount = 10;
    const isCompleted = date < today || (date.getDate() === today.getDate() && Math.random() > 0.5);
    const correctCount = isCompleted ? Math.floor(Math.random() * 5) + 5 : Math.floor(Math.random() * 6);
    const answeredCount = isCompleted ? totalCount : Math.floor(Math.random() * totalCount);

    const topics = ['덧셈', '뺄셈', '곱셈', '나눗셈', '분수', '방정식', '도형', '백분율']
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    records.push({
      id: `ws-${dateStr}`,
      date: dateStr,
      isCompleted,
      score: isCompleted ? Math.round((correctCount / totalCount) * 100) : null,
      totalCount,
      correctCount,
      answeredCount,
      topics,
    });
  }
  return records;
}

const DEMO_WEAKNESSES = [
  { topic: '분수', count: 7, avgSeverity: 3.8, errorTypes: ['CALCULATION_ERROR', 'CONCEPT_GAP'] },
  { topic: '방정식', count: 5, avgSeverity: 3.2, errorTypes: ['PROCESS_ERROR', 'FORMULA_ERROR'] },
  { topic: '나눗셈', count: 3, avgSeverity: 2.1, errorTypes: ['CALCULATION_ERROR', 'CARELESS'] },
  { topic: '도형', count: 2, avgSeverity: 1.5, errorTypes: ['CONCEPT_GAP'] },
];

// 프론트엔드 SVG 폴백 생성기 (여백 충분 & 중앙 정렬)
function generateFrontendSvg(topic: string, question: string): string {
  const numbers = question.match(/(-?\d+)/g);
  const nums = numbers ? numbers.map(Number) : [];

  const viewW = 400;
  const viewH = 300;
  const cx = viewW / 2;
  const cy = viewH / 2;

  // 테마 색상 및 폰트
  const strokeColor = "var(--text-primary)";
  const dimColor = "var(--text-secondary)";
  const accentColor = "var(--accent-blue)";
  const fontFamily = "var(--font-sans)";

  const defs = `
    <defs>
      <marker id="arrow-end" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
        <path d="M0,0 L7,3 L0,6" fill="none" stroke="${strokeColor}" stroke-width="1.5" />
      </marker>
      <marker id="arrow-start" markerWidth="8" markerHeight="8" refX="1" refY="3" orient="auto">
        <path d="M8,0 L1,3 L8,6" fill="none" stroke="${strokeColor}" stroke-width="1.5" />
      </marker>
    </defs>
  `;

  // ★ 수직선(Number Line) 감지 — 좌표평면보다 먼저 체크
  const isNumberLine = /수직선|수선|수 직선/.test(question) || /수직선|수선/.test(topic);
  if (isNumberLine && nums.length >= 2) {
    const minNum = Math.min(...nums) - 2;
    const maxNum = Math.max(...nums) + 2;
    const range = maxNum - minNum;
    const lineY = cy;
    const lineStartX = 40;
    const lineEndX = viewW - 40;
    const lineWidth = lineEndX - lineStartX;
    const scale = lineWidth / range;

    let ticksSvg = '';
    for (let i = Math.ceil(minNum); i <= Math.floor(maxNum); i++) {
      const px = lineStartX + (i - minNum) * scale;
      const isHighlighted = nums.includes(i);
      ticksSvg += `
        <line x1="${px}" y1="${lineY - 8}" x2="${px}" y2="${lineY + 8}" stroke="${isHighlighted ? accentColor : dimColor}" stroke-width="${isHighlighted ? 2.5 : 1.5}" />
        <text x="${px}" y="${lineY + 25}" text-anchor="middle" font-size="${isHighlighted ? '14px' : '12px'}" font-weight="${isHighlighted ? '800' : '400'}" fill="${isHighlighted ? accentColor : strokeColor}">${i}</text>
        ${isHighlighted ? `<circle cx="${px}" cy="${lineY}" r="5" fill="${accentColor}" />` : ''}
      `;
    }

    // 두 수 사이 구간 강조
    if (nums.length >= 2) {
      const px1 = lineStartX + (nums[0] - minNum) * scale;
      const px2 = lineStartX + (nums[1] - minNum) * scale;
      const leftX = Math.min(px1, px2);
      const rightX = Math.max(px1, px2);
      ticksSvg += `<rect x="${leftX}" y="${lineY - 4}" width="${rightX - leftX}" height="8" fill="${accentColor}" opacity="0.2" rx="4" />`;
    }

    return `
      <svg viewBox="0 0 ${viewW} ${viewH}" xmlns="http://www.w3.org/2000/svg" style="font-family: ${fontFamily};">
        ${defs}
        <line x1="${lineStartX - 10}" y1="${lineY}" x2="${lineEndX + 10}" y2="${lineY}" stroke="${strokeColor}" stroke-width="2" marker-start="url(#arrow-start)" marker-end="url(#arrow-end)"/>
        ${ticksSvg}
      </svg>
    `;
  }

  // 1. 좌표 및 점 추출
  const coordParts = question.match(/[A-Z]?\s?\(\s?(-?\d+)\s?,\s?(-?\d+)\s?\)/g);
  let coords: { label: string, x: number, y: number }[] = [];
  if (coordParts) {
    coords = coordParts.map(part => {
      const match = part.match(/([A-Z])?\s?\(\s?(-?\d+)\s?,\s?(-?\d+)\s?\)/);
      return {
        label: match?.[1] || "",
        x: parseInt(match?.[2] || "0"),
        y: parseInt(match?.[3] || "0")
      };
    });
  }

  // ★ 좌표평면 감지: "직선" 단독이 아닌 좌표/함수 관련 키워드만 매칭
  const isGraph = /그래프|좌표평면|좌표|함수|평행이동|이차함수/.test(topic) || /그래프|좌표평면|좌표|함수|평행이동|이차함수/.test(question);
  const isCircle = /(^|\s)원(\s|$|[.,!의])/.test(topic) || /(^|\s)원(\s|$|[.,!의])/.test(question);
  const isPoint = / 점 /.test(question) || (coords.length > 0);
  const isQuadratic = /x\^2|x²|x2|이차함수/.test(question) || /이차함수/.test(topic);

  // 그래프나 좌표점, 혹은 좌표계 위의 원인 경우
  if ((isGraph || isPoint || (isCircle && coords.length > 0)) && (coords.length > 0 || isQuadratic)) {
    // 동적 스케일 계산 (모든 점이 보이도록)
    let maxAbs = 5;
    coords.forEach(p => {
      maxAbs = Math.max(maxAbs, Math.abs(p.x), Math.abs(p.y));
    });
    if (isCircle && nums.length > 2) maxAbs = Math.max(maxAbs, Math.abs(nums[nums.length - 1]) + 2);

    const gridScale = Math.min(140 / maxAbs, 35);
    const originX = cx;
    const originY = cy;

    const pointsSvg = coords.map(p => {
      const px = originX + p.x * gridScale;
      const py = originY - p.y * gridScale;

      const projectionLines = `
        <line x1="${px}" y1="${py}" x2="${px}" y2="${originY}" stroke="${dimColor}" stroke-width="1" stroke-dasharray="3,3" />
        <line x1="${px}" y1="${py}" x2="${originX}" y2="${py}" stroke="${dimColor}" stroke-width="1" stroke-dasharray="3,3" />
        <text x="${px}" y="${originY + 15}" text-anchor="middle" font-size="10px" fill="${dimColor}">${p.x}</text>
        <text x="${originX - 12}" y="${py + 4}" text-anchor="end" font-size="10px" fill="${dimColor}">${p.y}</text>
      `;

      const labelX = p.x >= 0 ? 10 : -10;
      const labelY = p.y >= 0 ? -12 : 18;
      const textAnchor = p.x >= 0 ? "start" : "end";

      return `
        ${projectionLines}
        <circle cx="${px}" cy="${py}" r="5" fill="${accentColor}" />
        <text x="${px + labelX}" y="${py + labelY}" text-anchor="${textAnchor}" font-size="13px" font-weight="800" fill="${accentColor}">${p.label}(${p.x}, ${p.y})</text>
      `;
    }).join("");

    let curveSvg = "";
    if (isQuadratic) {
      const pathData = [];
      for (let i = -maxAbs - 2; i <= maxAbs + 2; i += 0.5) {
        const x_val = i;
        const y_val = 0.2 * x_val * x_val;
        const px = originX + x_val * gridScale;
        const py = originY - y_val * gridScale;
        if (px >= 20 && px <= viewW - 20 && py >= 20 && py <= viewH - 20) {
          pathData.push(`${pathData.length === 0 ? 'M' : 'L'}${px},${py}`);
        }
      }
      curveSvg = `<path d="${pathData.join(" ")}" fill="none" stroke="${accentColor}" stroke-width="2.5" opacity="0.8" />`;
    }

    let circleInGraph = "";
    if (isCircle && coords.length > 0) {
      const radius = (nums.find(n => n > 0 && !coords.some(p => p.x === n || p.y === n)) || 3);
      const px = originX + coords[0].x * gridScale;
      const py = originY - coords[0].y * gridScale;
      circleInGraph = `<circle cx="${px}" cy="${py}" r="${radius * gridScale}" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-width="2" />`;
    }

    return `
      <svg viewBox="0 0 ${viewW} ${viewH}" xmlns="http://www.w3.org/2000/svg" style="font-family: ${fontFamily};">
        ${defs}
        <path d="M 0,${cy} L ${viewW},${cy} M ${cx},0 L ${cx},${viewH}" stroke="${dimColor}" stroke-width="0.5" stroke-dasharray="4,4" opacity="0.3" />
        <line x1="30" y1="${cy}" x2="${viewW - 30}" y2="${cy}" stroke="${strokeColor}" stroke-width="2" marker-end="url(#arrow-end)"/>
        <line x1="${cx}" y1="${viewH - 30}" x2="${cx}" y2="30" stroke="${strokeColor}" stroke-width="2" marker-end="url(#arrow-end)"/>
        <text x="${viewW - 20}" y="${cy + 20}" text-anchor="middle" font-size="14px" font-weight="bold" fill="${strokeColor}">x</text>
        <text x="${cx - 18}" y="25" text-anchor="middle" font-size="14px" font-weight="bold" fill="${strokeColor}">y</text>
        <text x="${cx - 10}" y="${cy + 15}" text-anchor="middle" font-size="11px" fill="${strokeColor}">O</text>
        ${curveSvg}
        ${circleInGraph}
        ${pointsSvg}
      </svg>
    `;
  }

  // 기타 도형 처리
  const isRect = /사각형|직사각형|정사각형/.test(topic) || /사각형|직사각형|정사각형/.test(question);
  const isCircleShape = /(^|\s)원(\s|$|[.,!의])/.test(topic) || /(^|\s)원(\s|$|[.,!의])/.test(question);

  if (isRect) {
    const w = 180, h = 120;
    return `<svg viewBox="0 0 ${viewW} ${viewH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" fill="none" stroke="${strokeColor}" stroke-width="3" rx="4"/>
      <text x="${cx}" y="${cy - h / 2 - 15}" text-anchor="middle" fill="${strokeColor}" font-weight="bold">${nums[0] || 'a'}cm</text>
      <text x="${cx - w / 2 - 30}" y="${cy + 5}" text-anchor="middle" fill="${strokeColor}" font-weight="bold">${nums[1] || 'b'}cm</text>
    </svg>`;
  }

  if (isCircleShape) {
    const r = 80;
    return `<svg viewBox="0 0 ${viewW} ${viewH}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${strokeColor}" stroke-width="3"/>
      <line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${accentColor}" stroke-width="2" stroke-dasharray="4,2"/>
      <text x="${cx + r / 2}" y="${cy - 10}" text-anchor="middle" fill="${accentColor}" font-weight="bold">r = ${nums[0] || 'r'}</text>
    </svg>`;
  }

  // ★ 순수 계산/연산 문제는 SVG를 표시하지 않음 (빈 문자열 반환)
  return "";
}

export default function Home() {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1);
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  // 학습 관련 상태
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);
  const [responses, setResponses] = useState<UserResponseData[]>([]);

  const [todayStatus, setTodayStatus] = useState<'new' | 'in_progress' | 'completed' | 'none'>('new');
  const [todayProgress, setTodayProgress] = useState({ answered: 0, total: 10, percentage: 0 });
  const [todayScore, setTodayScore] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);

  const [showSettings, setShowSettings] = useState(false);
  const [userSettings, setUserSettings] = useState<UserSettings>({
    schoolLevel: 'elementary',
    grade: 3,
    difficulty: 'medium',
    problemCount: 10,
    selectedChapterId: undefined,
    selectedUnitId: undefined
  });

  // API 에러 상태 (과금 한도 등)
  const [apiError, setApiError] = useState<'quota' | 'auth' | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const data = generateDemoCalendarData(currentYear, currentMonth);
    setCalendarData(data);

    let streakCount = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const found = data.find(d => d.date === dateStr && d.isCompleted);
      if (found || i === 0) {
        if (found) streakCount++;
        else break;
      } else {
        break;
      }
    }
    setStreak(streakCount);
  }, [currentYear, currentMonth]);

  const handleMonthChange = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  }, []);

  const handleDayClick = useCallback((day: CalendarDay) => {
    setSelectedDay(day);
  }, []);

  // 학습 시작
  const handleStartWorksheet = useCallback(async () => {
    if (todayStatus === 'in_progress' && currentProblems.length > 0) {
      setShowWorksheet(true);
      return;
    }

    setApiError(null); // 에러 초기화
    setIsLoading(true); // 로딩 시작
    setLoadingMessage("AI 유사 문제를 생성하고 있습니다... 🤖");
    let problemsData: any[] = []; // 타입 명시

    // 1. AI API 호출 시도
    try {
      console.log("Calling AI API with unitId:", userSettings.selectedUnitId);
      problemsData = await fetchAIWorksheet(
        'demo-user',
        userSettings.problemCount || 10,
        userSettings.selectedUnitId,
        userSettings.schoolLevel,
        userSettings.grade
      );
    } catch (e: any) {
      console.error("API Call Failed", e);
      if (e.message === "QUOTA_EXCEEDED") setApiError('quota');
      else if (e.message === "AUTH_ERROR") setApiError('auth');
      else setApiError(null);
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
    }

    if (problemsData && problemsData.length > 0) {
      const mapped = problemsData.map((p, idx) => ({
        id: `p-${Date.now()}-${idx}`,
        orderNum: idx + 1,
        question: p.question,
        answer: p.answer,
        options: p.options || [],
        type: p.type,
        topic: p.topic,
        difficulty: p.difficulty,
        explanation: p.explanation,
        svg: p.svg || generateFrontendSvg(p.topic, p.question)
      }));
      setCurrentProblems(mapped);
      setTodayStatus('in_progress');
      setTodayProgress({
        answered: 0,
        total: mapped.length,
        percentage: 0
      });
      setShowWorksheet(true);
      setResponses([]);
    }
  }, [todayStatus, currentProblems.length, userSettings]);

  const handleSubmitAnswer = useCallback(async (problemId: string, answer: string, timeSpent: number) => {
    const problem = currentProblems.find(p => p.id === problemId);
    if (!problem) throw new Error('Problem not found');

    const isCorrect = problem.answer.trim().toLowerCase() === answer.trim().toLowerCase();

    const response: UserResponseData = {
      id: `resp-${Date.now()}`,
      userId: 'demo-user',
      worksheetId: 'ws-today',
      problemId,
      userAnswer: answer,
      isCorrect,
      timeSpentSec: timeSpent,
    };

    setResponses(prev => [...prev, response]);

    const newAnswered = responses.length + 1;

    setTodayProgress({
      answered: newAnswered,
      total: currentProblems.length,
      percentage: Math.round((newAnswered / currentProblems.length) * 100),
    });

    await new Promise(resolve => setTimeout(resolve, 300));
    return { isCorrect, correctAnswer: isCorrect ? undefined : problem.answer };
  }, [currentProblems, responses]);

  const handleComplete = useCallback((score: number) => {
    setTodayStatus('completed');
    setTodayScore(score);
    setTodayProgress(prev => ({ ...prev, answered: prev.total, percentage: 100 }));
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setShowWorksheet(false);
  }, []);

  const handleRetryIncorrect = useCallback((incorrectProblems: Problem[]) => {
    // ★ 새 ID를 부여하여 React가 prop 변경을 감지하도록 함
    const newProblems = incorrectProblems.map((p, idx) => ({
      ...p,
      id: `retry-${Date.now()}-${idx}`,
      orderNum: idx + 1
    }));
    setCurrentProblems(newProblems);
    setResponses([]);
    setTodayStatus('in_progress');
    setTodayProgress({
      answered: 0,
      total: newProblems.length,
      percentage: 0
    });
    setShowWorksheet(true);
  }, []);

  const handleGenerateSimilar = useCallback(async (topics: string[]) => {
    setIsLoading(true);
    setLoadingMessage("AI가 틀린 문제를 파악하여 유사 문제를 생성 중입니다... 📝");
    setApiError(null);
    try {
      const problemsData = await fetchAIWorksheet(
        'demo-user',
        5,
        userSettings.selectedUnitId,
        userSettings.schoolLevel,
        userSettings.grade
      );

      if (problemsData && problemsData.length > 0) {
        const mapped = problemsData.map((p, idx) => ({
          id: `p-sim-${Date.now()}-${idx}`,
          orderNum: idx + 1,
          question: p.question,
          answer: p.answer,
          options: p.options || [],
          type: p.type,
          topic: p.topic,
          difficulty: p.difficulty,
          explanation: p.explanation,
          svg: p.svg || generateFrontendSvg(p.topic, p.question)
        }));

        setCurrentProblems(mapped);
        setResponses([]);
        setTodayStatus('in_progress');
        setTodayProgress({
          answered: 0,
          total: mapped.length,
          percentage: 0
        });
        setShowWorksheet(true);
      }
    } catch (e: any) {
      console.error("Failed to generate similar problems", e);
      if (e.message === "QUOTA_EXCEEDED") setApiError('quota');
      else if (e.message === "AUTH_ERROR") setApiError('auth');
    } finally {
      setIsLoading(false);
      setLoadingMessage(undefined);
    }
  }, [userSettings]);

  const totalCompleted = calendarData.filter(d => d.isCompleted).length;
  const avgScore = calendarData.filter(d => d.score !== null).length > 0
    ? Math.round(
      calendarData.filter(d => d.score !== null).reduce((sum, d) => sum + (d.score || 0), 0) /
      calendarData.filter(d => d.score !== null).length
    )
    : 0;

  if (showWorksheet) {
    return (
      <div className="app-container">
        {isLoading && <LoadingOverlay message={loadingMessage} />}
        {apiError && (
          <div className="error-banner floating">
            ⚠️ {apiError === 'quota'
              ? "AI 사용량이 초과되었습니다."
              : "AI 인증 오류가 발생했습니다."}
          </div>
        )}
        <WorksheetView
          worksheetId="ws-today"
          problems={currentProblems}
          existingResponses={responses}
          onSubmitAnswer={handleSubmitAnswer}
          onBack={handleBackToDashboard}
          onComplete={handleComplete}
          onRetryIncorrect={handleRetryIncorrect}
          onGenerateSimilar={handleGenerateSimilar}
        />
        <style jsx>{`
            .floating {
                position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      {isLoading && <LoadingOverlay message={loadingMessage} />}
      {/* ── 에러 배너 ── */}
      {apiError && (
        <div className="error-banner">
          ⚠️ {apiError === 'quota'
            ? "AI 사용량이 초과되었습니다."
            : "AI 인증 오류입니다. API 키를 확인해주세요."}
        </div>
      )}

      {/* ── 헤더 ── */}
      <header className="header">
        <div className="header-logo">
          <div className="header-logo-icon">📐</div>
          <div>
            <h1>MathDaily</h1>
            <p>매일 수학 학습지 · 스마트 취약점 케어</p>
          </div>
        </div>
        <div className="header-stats">
          <button className="settings-btn" onClick={() => setShowSettings(true)}>
            ⚙️ 설정 ({userSettings.grade}학년)
          </button>
          <div className="streak-display">
            <span className="streak-fire">🔥</span>
            <span className="streak-count">{streak}</span>
            <span className="streak-label">일 연속</span>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">{totalCompleted}</div>
            <div className="header-stat-label">완료 일수</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-value">{avgScore}점</div>
            <div className="header-stat-label">평균 점수</div>
          </div>
        </div>
      </header>

      {/* ── 대시보드 ── */}
      <div className="dashboard-grid">
        <Calendar
          records={calendarData}
          year={currentYear}
          month={currentMonth}
          onMonthChange={handleMonthChange}
          onDayClick={handleDayClick}
        />

        <div className="side-panel">
          <TodayCard
            status={todayStatus}
            progress={todayProgress}
            score={todayScore}
            onStart={handleStartWorksheet}
          />

          {/* 커리큘럼 선택기 */}
          <div className="card-glass" style={{ marginBottom: '20px' }}>
            <h3 className="section-title">🎯 집중 공략 (Drill)</h3>
            <CurriculumSelector
              schoolLevel={userSettings.schoolLevel}
              grade={userSettings.grade}
              selectedChapterId={userSettings.selectedChapterId}
              selectedUnitId={userSettings.selectedUnitId}
              onUnitSelect={(chapterId, unitId) => {
                setUserSettings(prev => ({
                  ...prev,
                  selectedChapterId: chapterId,
                  selectedUnitId: unitId
                }));
                if (unitId) {
                  setTodayStatus('new');
                  setResponses([]);
                  setCurrentProblems([]);
                }
              }}
            />
          </div>

          <WeaknessCard topWeaknesses={DEMO_WEAKNESSES} totalUnresolved={17} />
        </div>
      </div>

      {selectedDay && <DayDetailModal day={selectedDay} onClose={() => setSelectedDay(null)} />}

      {showSettings && (
        <GradeSettings
          currentSettings={userSettings}
          onSave={(newSettings) => {
            setUserSettings(newSettings);
            setShowSettings(false);
            setTodayStatus('new');
            setResponses([]);
            setCurrentProblems([]);
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}

      <style jsx>{`
        .error-banner {
            background: #ff4d4f;
            color: white;
            padding: 12px;
            text-align: center;
            font-weight: bold;
            border-radius: 8px;
            margin: 10px 20px;
            animation: fadeIn 0.5s ease-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .settings-btn {
          padding: 8px 16px;
          border-radius: var(--radius-full);
          background: var(--bg-glass);
          border: 1px solid var(--border-medium);
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .settings-btn:hover {
          background: var(--bg-glass-strong);
          color: var(--text-primary);
          border-color: var(--accent-blue);
        }
        .section-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 16px;
            color: var(--text-primary);
        }
        .card-glass {
            background: var(--bg-secondary);
            border: 1px solid var(--border-medium);
            border-radius: var(--radius-lg);
            padding: 20px;
            margin-bottom: 24px;
        }
      `}</style>
    </div>
  );
}
