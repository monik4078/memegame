import React, { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../store';
import type { GameContent } from '../types';
import { Volume2, VolumeX, SkipForward, Eye } from 'lucide-react';

const GamePlay: React.FC = () => {
  const settings = useGameStore((s) => s.settings);
  const question = useGameStore((s) => s.question);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const selectAnswer = useGameStore((s) => s.selectAnswer);
  const revealAnswer = useGameStore((s) => s.revealAnswer);
  const nextQuestion = useGameStore((s) => s.nextQuestion);
  const endGame = useGameStore((s) => s.endGame);

  const [timeLeft, setTimeLeft] = useState(question?.timeRemaining ?? 30);
  const [isMuted, setIsMuted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  const content = question?.content as GameContent | undefined;
  // Options are already shuffled in the store, use them directly
  const displayOptions = content?.options ?? [];

  // Timer
  useEffect(() => {
    if (hasAnswered) return;
    if (timeLeft <= 0) {
      setHasAnswered(true);
      revealAnswer();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, hasAnswered, revealAnswer]);

  // Reset state when question changes
  useEffect(() => {
    setHasAnswered(false);
    setTimeLeft(question?.timeRemaining ?? settings.timePerQuestion);
    setShowHint(false);
  }, [question?.currentIndex, question?.timeRemaining, settings.timePerQuestion]);

  const handleAnswer = useCallback((option: string) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    selectAnswer(option);
    // Auto reveal after short delay
    setTimeout(() => revealAnswer(), 600);
  }, [hasAnswered, selectAnswer, revealAnswer]);

  if (!content || !question) return null;

  const totalQuestions = settings.selectedContentIds.length;
  const progress = ((roundNumber - 1) / totalQuestions) * 100;

  const getTypeEmoji = (type: string) => {
    switch (type) {
      case 'meme-dialogue': return '💬';
      case 'song-tune': return '🎵';
      case 'movie-meme': return '🎬';
      default: return '❓';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'meme-dialogue': return 'Meme Dialogue';
      case 'song-tune': return 'Song Tune';
      case 'movie-meme': return 'Movie Meme';
      default: return 'Question';
    }
  };

  const timerPercent = (timeLeft / settings.timePerQuestion) * 100;
  const timerColor = timeLeft > 10 ? '#a855f7' : timeLeft > 5 ? '#eab308' : '#ef4444';

  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - timerPercent / 100);

  return (
    <div className="min-h-screen bg-animated flex flex-col p-4">
      {/* Top bar */}
      <div className="max-w-3xl w-full mx-auto">
        <div className="flex items-center justify-between mb-4 animate-slideDown">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-white/10 text-white/60">
              Round {roundNumber}/{totalQuestions}
            </span>
            <span className="badge bg-neon-purple/20 text-neon-purple">
              {getTypeEmoji(content.type)} {getTypeLabel(content.type)}
            </span>
            <span className="badge bg-neon-yellow/20 text-neon-yellow">
              {content.points} pts
            </span>
          </div>
          <button onClick={() => setIsMuted(!isMuted)} className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            {isMuted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white/60" />}
          </button>
        </div>

        {/* Progress bar */}
        <div className="progress-bar mb-4">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center mb-4 animate-scaleIn">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full" viewBox="0 0 60 60">
              <circle className="fill-none stroke-white/10" cx="30" cy="30" r="26" strokeWidth="3" />
              <circle
                cx="30" cy="30" r="26"
                fill="none"
                stroke={timerColor}
                strokeWidth="3"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold" style={{ color: timerColor }}>{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="game-card p-6 mb-4 animate-scaleIn">
          {/* Image if available */}
          {content.imageUrl && content.imageUrl !== '' && (
            <div className="mb-4 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center min-h-[180px]">
              <img src={content.imageUrl} alt="Meme" className="max-w-full max-h-[280px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-6xl opacity-30">🖼️</span>'; }} />
            </div>
          )}

          {/* Audio hint for songs */}
          {content.type === 'song-tune' && content.audioHint && (
            <div className={`mb-4 p-4 rounded-xl border transition-all ${showHint ? 'bg-neon-pink/10 border-neon-pink/20' : 'bg-white/5 border-white/10'}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎵</span>
                <span className="text-sm font-semibold text-neon-pink">Audio Clue</span>
                <button onClick={() => setShowHint(!showHint)} className="ml-auto text-xs text-white/40 hover:text-white/60 underline">
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>
              </div>
              {showHint ? (
                <p className="text-sm text-white/60 mt-1 animate-slideUp">{content.audioHint}</p>
              ) : (
                <div className="flex items-center gap-1 mt-2 h-6">
                  {[14, 22, 10, 18, 26, 12, 20, 16, 24, 8, 14].map((h, i) => (
                    <div key={i} className="w-1.5 bg-neon-pink/40 rounded-full animate-pulse" style={{ height: `${h}px`, animationDelay: `${i * 0.08}s` }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Question text */}
          <h2 className="text-xl sm:text-2xl font-bold text-center leading-snug">{content.question}</h2>

          {/* Difficulty dots */}
          <div className="flex items-center justify-center gap-1.5 mt-3">
            {[1, 2, 3].map((level) => {
              const isActive = content.difficulty === 'easy' ? level <= 1 : content.difficulty === 'medium' ? level <= 2 : level <= 3;
              const dotColor = content.difficulty === 'easy' ? 'bg-neon-green' : content.difficulty === 'medium' ? 'bg-neon-yellow' : 'bg-neon-red';
              return (
                <div key={level} className={`w-2.5 h-2.5 rounded-full transition-all ${isActive ? `${dotColor} shadow-lg` : 'bg-white/10'}`}
                  style={isActive ? { boxShadow: `0 0 8px ${content.difficulty === 'easy' ? 'rgba(34,197,94,0.5)' : content.difficulty === 'medium' ? 'rgba(234,179,8,0.5)' : 'rgba(239,68,68,0.5)'}` } : {}}
                />
              );
            })}
            <span className="text-xs text-white/30 ml-2 capitalize">{content.difficulty}</span>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {displayOptions.map((option, idx) => {
            const isSelected = hasAnswered && option === question.selectedAnswer;
            const isAnswer = hasAnswered && option === content.answer;
            const isWrong = hasAnswered && isSelected && option !== content.answer;

            return (
              <button
                key={`${content.id}-opt-${idx}`}
                className={`p-4 rounded-xl text-left transition-all duration-300 ${
                  isAnswer
                    ? 'bg-gradient-to-r from-neon-green/30 to-emerald-600/30 border-2 border-neon-green shadow-lg shadow-neon-green/10'
                    : isWrong
                    ? 'bg-red-500/20 border-2 border-neon-red opacity-70'
                    : hasAnswered
                    ? 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                    : 'game-card hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]'
                }`}
                onClick={() => handleAnswer(option)}
                disabled={hasAnswered}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${
                    isAnswer ? 'bg-neon-green/30 text-neon-green text-lg' :
                    isWrong ? 'bg-neon-red/30 text-neon-red' :
                    'bg-white/10 text-white/50'
                  }`}>
                    {isAnswer ? '✓' : isWrong ? '✗' : String.fromCharCode(65 + idx)}
                  </span>
                  <span className={`text-sm font-medium ${isAnswer ? 'text-neon-green' : isWrong ? 'text-neon-red line-through' : hasAnswered ? 'text-white/20' : 'text-white/80'}`}>
                    {option}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!hasAnswered && (
            <button className="btn-secondary flex-1 flex items-center justify-center gap-2" onClick={() => { setHasAnswered(true); revealAnswer(); }}>
              <Eye className="w-4 h-4" /> Skip & Reveal
            </button>
          )}
          {hasAnswered && question.isRevealed && roundNumber < totalQuestions && (
            <button className="btn-primary w-full flex items-center justify-center gap-2 text-lg" onClick={nextQuestion}>
              Next Question <SkipForward className="w-5 h-5" />
            </button>
          )}
          {hasAnswered && question.isRevealed && roundNumber >= totalQuestions && (
            <button className="btn-primary w-full flex items-center justify-center gap-2 text-lg" onClick={endGame}>
              🏆 See Final Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GamePlay;
