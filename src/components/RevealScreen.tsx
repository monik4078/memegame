import React from 'react';
import { useGameStore } from '../store';
import type { GameContent } from '../types';
import { ArrowRight, PartyPopper, Star, Trophy } from 'lucide-react';

const RevealScreen: React.FC = () => {
  const settings = useGameStore((s) => s.settings);
  const question = useGameStore((s) => s.question);
  const roundNumber = useGameStore((s) => s.roundNumber);
  const nextQuestion = useGameStore((s) => s.nextQuestion);
  const endGame = useGameStore((s) => s.endGame);

  if (!question || !question.isRevealed) return null;
  const content = question.content as GameContent;
  const isCorrect = question.isCorrect;
  const selectedAnswer = question.selectedAnswer;

  const totalQuestions = settings.selectedContentIds.length;
  const progress = ((roundNumber) / totalQuestions) * 100;

  return (
    <div className="min-h-screen bg-animated flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Progress */}
        <div className="progress-bar mb-6">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Result Card */}
        <div className={`game-card p-8 text-center mb-6 animate-bounceIn ${isCorrect ? 'neon-glow-green' : ''}`}>
          {/* Big icon */}
          <div className="text-7xl mb-4">
            {isCorrect ? (
              <span className="animate-bounce">🎉</span>
            ) : (
              <span className="animate-shake">😅</span>
            )}
          </div>

          {/* Result text */}
          <h2 className={`text-3xl font-black mb-2 ${isCorrect ? 'text-neon-green' : 'text-neon-red'}`}>
            {isCorrect ? 'CORRECT!' : 'WRONG!'}
          </h2>

          {/* Points */}
          {isCorrect && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="w-5 h-5 text-neon-yellow animate-spin-slow" />
              <span className="text-xl font-bold text-neon-yellow">+{content.points} points!</span>
              <Star className="w-5 h-5 text-neon-yellow animate-spin-slow" />
            </div>
          )}

          {/* Answer reveal */}
          <div className={`p-4 rounded-xl mb-4 ${isCorrect ? 'bg-neon-green/10 border border-neon-green/30' : 'bg-neon-red/10 border border-neon-red/30'}`}>
            <p className="text-sm text-white/40 mb-1">Correct Answer:</p>
            <p className="text-lg font-bold text-neon-green">{content.answer}</p>
          </div>

          {/* If wrong, show what was selected */}
          {!isCorrect && selectedAnswer && (
            <div className="p-3 rounded-xl bg-white/5 mb-4">
              <p className="text-sm text-white/40 mb-1">You selected:</p>
              <p className="text-md text-neon-red line-through">{selectedAnswer}</p>
            </div>
          )}

          {/* Audio hint display */}
          {content.type === 'song-tune' && content.audioHint && (
            <div className="p-3 rounded-xl bg-neon-pink/10 border border-neon-pink/20 mb-4">
              <p className="text-xs text-neon-pink mb-1">🎵 Song Hint</p>
              <p className="text-sm text-white/60">{content.audioHint}</p>
            </div>
          )}
        </div>

        {/* Scores */}
        {settings.mode === 'team' ? (
          <div className="game-card p-4 mb-6 animate-slideUp">
            <h3 className="text-sm font-bold text-white/40 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-neon-yellow" /> Team Scores</h3>
            <div className="space-y-2">
              {[...settings.teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                <div key={team.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <span className="text-sm text-white/30 w-6">#{idx + 1}</span>
                  <span className="text-xl">{team.emoji}</span>
                  <span className="font-medium flex-1">{team.name}</span>
                  <span className="font-bold text-neon-yellow">{team.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        ) : settings.players.length > 0 ? (
          <div className="game-card p-4 mb-6 animate-slideUp">
            <h3 className="text-sm font-bold text-white/40 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-neon-yellow" /> Player Scores</h3>
            <div className="space-y-2">
              {[...settings.players].sort((a, b) => b.score - a.score).map((player, idx) => (
                <div key={player.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                  <span className="text-sm text-white/30 w-6">#{idx + 1}</span>
                  <span>👤</span>
                  <span className="font-medium flex-1">{player.name}</span>
                  <span className="font-bold text-neon-yellow">{player.score} pts</span>
                  {player.streak >= 2 && (
                    <span className="badge bg-neon-orange/20 text-neon-orange text-xs">🔥 {player.streak}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Next button */}
        {roundNumber < totalQuestions ? (
          <button className="btn-primary w-full py-4 flex items-center justify-center gap-2 animate-scaleIn" onClick={nextQuestion}>
            Next Question <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button className="btn-primary w-full py-4 flex items-center justify-center gap-2 animate-scaleIn" onClick={endGame}>
            <PartyPopper className="w-5 h-5" /> See Final Results
          </button>
        )}
      </div>
    </div>
  );
};

export default RevealScreen;
