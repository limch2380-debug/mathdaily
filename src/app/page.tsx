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
  const [userResponses, setUserResponses] = useState<UserResponseData[]>([]);

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

  // 1. 초기 로드 시 로그인 및 세션 체크
  useEffect(() => {
    const savedUser = localStorage.getItem('mathdaily_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);

      // 세션 복구 (현재 문제들 및 진행 상태)
      const savedProblems = localStorage.getItem(`session_problems_${parsedUser.id}`);
      if (savedProblems) {
        setCurrentProblems(JSON.parse(savedProblems));

        const savedShowWorksheet = localStorage.getItem(`session_active_${parsedUser.id}`);
        if (savedShowWorksheet === 'true') {
          setShowWorksheet(true);
        }

        const savedResponses = localStorage.getItem(`session_responses_${parsedUser.id}`);
        if (savedResponses) {
          setUserResponses(JSON.parse(savedResponses));
        }

        const savedLevel = localStorage.getItem(`session_level_${parsedUser.id}`);
        if (savedLevel) {
          setSuggestedLevel(savedLevel);
        }
      }
    }
  }, []);

  // 세션 상태 변경 시 자동 저장
  useEffect(() => {
    if (user) {
      localStorage.setItem(`session_problems_${user.id}`, JSON.stringify(currentProblems));
      localStorage.setItem(`session_active_${user.id}`, showWorksheet.toString());
      localStorage.setItem(`session_responses_${user.id}`, JSON.stringify(userResponses));
      localStorage.setItem(`session_level_${user.id}`, suggestedLevel);
    }
  }, [user, currentProblems, showWorksheet, userResponses, suggestedLevel]);

  // 2. 로그인 핸들러
  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);

    // 로그인 시 해당 유저의 세션 복구 시도
    const savedProblems = localStorage.getItem(`session_problems_${loggedInUser.id}`);
    if (savedProblems) {
      setCurrentProblems(JSON.parse(savedProblems));

      const savedShowWorksheet = localStorage.getItem(`session_active_${loggedInUser.id}`);
      if (savedShowWorksheet === 'true') {
        setShowWorksheet(true);
      }

      const savedResponses = localStorage.getItem(`session_responses_${loggedInUser.id}`);
      if (savedResponses) {
        setUserResponses(JSON.parse(savedResponses));
      }

      const savedLevel = localStorage.getItem(`session_level_${loggedInUser.id}`);
      if (savedLevel) {
        setSuggestedLevel(savedLevel);
      }
    }
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

      // 세션 클리어
      localStorage.removeItem(`session_problems_${user.id}`);
      localStorage.removeItem(`session_active_${user.id}`);
      localStorage.removeItem(`session_responses_${user.id}`);
      setUserResponses([]);

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

  // 5. 틀린 문제 다시 풀기 핸들러
  const handleRetryIncorrect = (incorrectProblems: Problem[]) => {
    setCurrentProblems(incorrectProblems.map((p, idx) => ({ ...p, orderNum: idx + 1 })));
    setShowWorksheet(true);
  };

  // 6. AI 유사 문제 생성 핸들러
  const handleGenerateSimilar = async (topics: string[]) => {
    setIsLoading(true);
    setLoadingMessage(`취약한 ${topics.join(', ')} 주제의 유사 문제를 AI가 생성하고 있어요... 🤖`);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          count: topics.length * 2, // 주제당 2문제씩
          schoolLevel: userSettings.schoolLevel,
          grade: userSettings.grade,
          level: suggestedLevel,
          topics: topics // 특정 토픽 강조
        }),
      });

      if (!response.ok) throw new Error('AI Generation Failed');
      const data = await response.json();

      const mappedProblems = data.map((p: any, idx: number) => ({
        id: `similar-${Date.now()}-${idx}`,
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
      alert('유사 문제 생성에 실패했습니다.');
    } finally {
      setIsLoading(false);
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

    // 응답 누적
    const newResponse: UserResponseData = {
      problemId,
      userAnswer: answer,
      isCorrect,
      timeSpentSec: timeSpent
    };
    setUserResponses(prev => [...prev.filter(r => r.problemId !== problemId), newResponse]);

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
          existingResponses={userResponses}
          onSubmitAnswer={handleSubmitAnswer}
          onComplete={handleWorksheetComplete}
          onBack={handleBackToDashboard}
          onRetryIncorrect={handleRetryIncorrect}
          onGenerateSimilar={handleGenerateSimilar}
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
