'use client';

import { useState, useCallback, useEffect } from 'react';
import WorksheetView from '@/components/WorksheetView';
import LoadingOverlay from '@/components/LoadingOverlay';
import LoginView from '@/components/LoginView';
import DashboardView from '@/components/DashboardView';
import { Problem, UserResponseData, UserSettings } from '@/lib/types';
import { fetchAIWorksheet } from '@/lib/api';

// 사용자 타입 정의
interface User {
  id: string;
  name: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [showWorksheet, setShowWorksheet] = useState(false);
  const [currentProblems, setCurrentProblems] = useState<Problem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>();
  const [apiError, setApiError] = useState<'quota' | 'auth' | null>(null);

  // 대시보드에서 제안받은 레벨 저장
  const [suggestedLevel, setSuggestedLevel] = useState('medium');

  // 설정 상태 (학년 등)
  const [userSettings, setUserSettings] = useState<UserSettings>({
    problemCount: 10,
    schoolLevel: 'elementary',
    grade: 3,
    difficulty: 'medium',
    selectedUnitId: undefined,
  });

  // 1. 초기 로드 시 로그인 체크
  useEffect(() => {
    const savedUser = localStorage.getItem('mathdaily_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // 2. 로그인 핸들러
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  // 3. 학습 시작 (대시보드에서 호출)
  const handleStartStudy = useCallback(async (level: string) => {
    setSuggestedLevel(level); // AI가 제안한 레벨 저장

    setApiError(null);
    setIsLoading(true);
    setLoadingMessage(`AI가 ${user?.name}님을 위한 맞춤 문제를 생성하고 있어요... 🤖\n(난이도: ${level === 'hard' ? '심화' : level === 'easy' ? '기초' : '보통'})`);

    try {
      // AI API 호출 (레벨 포함)
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: userSettings.problemCount,
          schoolLevel: userSettings.schoolLevel,
          grade: userSettings.grade,
          level: level // ★ 레벨 전달
        }),
      });

      if (!response.ok) throw new Error('AI Generation Failed');

      const data = await response.json();

      const mappedProblems = data.map((p: any, idx: number) => ({
        id: `p-${Date.now()}-${idx}`,
        orderNum: idx + 1,
        question: p.question,
        answer: p.answer,
        options: p.options || [],
        type: p.type,
        topic: p.topic,
        difficulty: p.difficulty,
        explanation: p.explanation,
        svg: p.svg,
      }));

      setCurrentProblems(mappedProblems);
      setShowWorksheet(true);

    } catch (e) {
      console.error(e);
      alert('문제 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user, userSettings]);

  // 4. 문제 풀이 완료 핸들러
  const handleWorksheetComplete = async (responses: UserResponseData[]) => {
    if (!user) return;

    // 점수 계산
    const correctCount = responses.filter(r => r.isCorrect).length;
    const score = Math.round((correctCount / responses.length) * 100);

    // 저장 API 호출
    try {
      await fetch('/api/study/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          date: new Date().toISOString().split('T')[0],
          score,
          totalCount: responses.length,
          level: suggestedLevel
        })
      });

      alert(`학습 완료! ${score}점입니다. 결과가 저장되었습니다.`);
      setShowWorksheet(false); // 대시보드로 복귀
      window.location.reload(); // 대시보드 갱신을 위해 리로드 (간편 구현)
    } catch (e) {
      console.error('Save failed', e);
      alert('결과 저장에 실패했습니다.');
      setShowWorksheet(false);
    }
  };

  const handleBackToDashboard = () => {
    if (confirm('학습을 중단하고 대시보드로 돌아가시겠습니까?')) {
      setShowWorksheet(false);
    }
  };

  // 렌더링 분기
  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  // 5. 답안 제출 핸들러 (WorksheetView용)
  const handleSubmitAnswer = async (problemId: string, answer: string, timeSpent: number) => {
    const problem = currentProblems.find(p => p.id === problemId);
    if (!problem) throw new Error('Problem not found');

    const isCorrect = problem.answer === answer; // 단순 문자열 비교
    return {
      isCorrect,
      correctAnswer: problem.answer
    };
  };

  // ... (handleWorksheetComplete is already compatible now)

  if (showWorksheet) {
    return (
      <>
        <WorksheetView
          worksheetId={`ws-${Date.now()}`}
          problems={currentProblems}
          existingResponses={[]}
          onSubmitAnswer={handleSubmitAnswer}
          onComplete={handleWorksheetComplete}
          onBack={handleBackToDashboard}
        />
        {isLoading && <LoadingOverlay message={loadingMessage} />}
      </>
    );
  }

  return (
    <>
      <DashboardView
        user={user}
        settings={userSettings}
        onSettingsChange={setUserSettings}
        onStartStudy={handleStartStudy}
      />
      {isLoading && <LoadingOverlay message={loadingMessage} />}
    </>
  );
}
