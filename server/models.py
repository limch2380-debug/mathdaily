from sqlalchemy import Column, String, Integer, Float, DateTime, Boolean, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True)
    grade = Column(Integer, default=1)
    school_level = Column(String, default='elementary') # elementary, middle, high
    difficulty_level = Column(Integer, default=1) # 1: 쉬움, 2: 보통, 3: 어려움, 4: 심화

# ── 커리큘럼 계층 구조 ──

class Chapter(Base):
    __tablename__ = 'chapters'
    id = Column(Integer, primary_key=True, autoincrement=True)
    school_level = Column(String) # elementary, middle, high
    grade = Column(Integer)       # 1~6 (초), 1~3 (중/고)
    name = Column(String)         # 단원명 (예: 수와 연산, 기하)
    units = relationship("Unit", back_populates="chapter")

class Unit(Base):
    __tablename__ = 'units'
    id = Column(Integer, primary_key=True, autoincrement=True)
    chapter_id = Column(Integer, ForeignKey('chapters.id'))
    name = Column(String)         # 소단원명 (예: 분수의 덧셈, 피타고라스 정리)
    chapter = relationship("Chapter", back_populates="units")

# ── 학습 데이터 ──

class UserKnowledge(Base):
    __tablename__ = 'user_knowledge'
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey('users.id'))
    unit_id = Column(Integer, ForeignKey('units.id')) # 특정 소단원에 대한 숙달도
    mastery = Column(Float, default=0.0)
    last_studied_at = Column(DateTime, default=datetime.utcnow)

class Question(Base):
    __tablename__ = 'questions'
    id = Column(String, primary_key=True)
    unit_id = Column(Integer, ForeignKey('units.id'), nullable=True) # 어떤 단원 문제인지
    difficulty = Column(Integer)
    type = Column(String) 
    content = Column(JSON) 
    created_at = Column(DateTime, default=datetime.utcnow)

class WeaknessLog(Base):
    __tablename__ = 'weakness_logs'
    id = Column(String, primary_key=True)
    user_id = Column(String)
    problem_id = Column(String)
    user_answer = Column(String)
    error_type = Column(String)
    reasoning_process = Column(Text)
    ai_advice = Column(String)
    severity = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
