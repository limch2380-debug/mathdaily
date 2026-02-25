'use client';

import { useState } from 'react';
import { UserSettings, SchoolLevel, DifficultyLevel, SCHOOL_LABELS, DIFFICULTY_LABELS, GRADE_COUNTS } from '@/lib/types';

interface GradeSettingsProps {
  currentSettings: UserSettings;
  onSave: (settings: UserSettings) => void;
  onCancel: () => void;
}

export default function GradeSettings({ currentSettings, onSave, onCancel }: GradeSettingsProps) {
  const [settings, setSettings] = useState<UserSettings>(currentSettings);

  const handleSchoolChange = (level: SchoolLevel) => {
    setSettings(prev => ({
      ...prev,
      schoolLevel: level,
      grade: 1, // 학교급 변경 시 학년 초기화
    }));
  };

  return (
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        <div className="settings-header">
          <h2>⚙️ 학습 설정</h2>
          <button className="close-btn" onClick={onCancel}>×</button>
        </div>

        <div className="settings-section">
          <label>학교급 선택</label>
          <div className="pill-group">
            {(Object.keys(SCHOOL_LABELS) as SchoolLevel[]).map((level) => (
              <button
                key={level}
                className={`pill-btn ${settings.schoolLevel === level ? 'active' : ''}`}
                onClick={() => handleSchoolChange(level)}
              >
                {SCHOOL_LABELS[level]}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <label>학년 선택</label>
          <div className="pill-group">
            {Array.from({ length: GRADE_COUNTS[settings.schoolLevel] }, (_, i) => i + 1).map((g) => (
              <button
                key={g}
                className={`pill-btn ${settings.grade === g ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, grade: g })}
              >
                {g}학년
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <label>문제 수 선택</label>
          <div className="pill-group">
            {[10, 20, 30].map((count) => (
              <button
                key={count}
                className={`pill-btn ${settings.problemCount === count ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, problemCount: count })}
              >
                {count}문제
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <label>난이도 설정</label>
          <div className="pill-group">
            {(Object.keys(DIFFICULTY_LABELS) as DifficultyLevel[]).map((diff) => (
              <button
                key={diff}
                className={`pill-btn ${settings.difficulty === diff ? 'active' : ''}`}
                onClick={() => setSettings({ ...settings, difficulty: diff })}
              >
                {DIFFICULTY_LABELS[diff]}
              </button>
            ))}
          </div>
          <p className="setting-desc">
            {settings.difficulty === 'easy' && '기초 개념 위주로 쉽게 구성됩니다.'}
            {settings.difficulty === 'medium' && '기본 문제와 응용 문제가 적절히 섞입니다.'}
            {settings.difficulty === 'hard' && '심화 문제 비율이 높아집니다.'}
          </p>
        </div>

        <div className="settings-actions">
          <button className="cancel-btn" onClick={onCancel}>취소</button>
          <button className="save-btn" onClick={() => onSave(settings)}>저장하기</button>
        </div>
      </div>

      <style jsx>{`
        .settings-modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          animation: fadeIn 0.2s ease;
        }
        .settings-modal {
          background: var(--bg-secondary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xl);
          padding: 32px;
          width: 100%;
          max-width: 500px;
          box-shadow: var(--shadow-lg);
          animation: slideUp 0.3s ease;
        }
        .settings-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        .settings-header h2 {
          font-size: 20px;
          font-weight: 700;
        }
        .settings-section {
          margin-bottom: 24px;
        }
        .settings-section label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
        }
        .pill-group {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .pill-btn {
          padding: 8px 16px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-medium);
          background: var(--bg-glass);
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        .pill-btn:hover {
          background: var(--bg-glass-strong);
          border-color: var(--border-active);
        }
        .pill-btn.active {
          background: var(--accent-blue);
          color: white;
          border-color: var(--accent-blue);
          box-shadow: var(--shadow-glow-blue);
        }
        .setting-desc {
          font-size: 12px;
          color: var(--text-muted);
          margin-top: 8px;
        }
        .settings-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
        }
        .cancel-btn {
          padding: 10px 20px;
          border-radius: var(--radius-md);
          background: transparent;
          border: 1px solid var(--border-medium);
          color: var(--text-secondary);
          cursor: pointer;
        }
        .save-btn {
          padding: 10px 24px;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          border: none;
          color: white;
          font-weight: 700;
          cursor: pointer;
          box-shadow: var(--shadow-glow-blue);
        }
      `}</style>
    </div>
  );
}
