import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store';
import { Trophy, RotateCcw, Home, Star, Users } from 'lucide-react';

const Scoreboard: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const settings = useGameStore((s) => s.settings);
  const resetGame = useGameStore((s) => s.resetGame);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Confetti
  useEffect(() => {
    if (!showConfetti) return;
    const colors = ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#eab308', '#06b6d4', '#f97316', '#ef4444'];
    const confetti = document.createElement('div');
    confetti.className = 'confetti-container';
    
    for (let i = 0; i < 50; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDuration = `${2 + Math.random() * 3}s`;
      piece.style.animationDelay = `${Math.random() * 2}s`;
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${6 + Math.random() * 8}px`;
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      confetti.appendChild(piece);
    }
    document.body.appendChild(confetti);
    
    return () => {
      document.body.removeChild(confetti);
    };
  }, [showConfetti]);

  const sortedTeams = [...settings.teams].sort((a, b) => b.score - a.score);
  const sortedPlayers = [...settings.players].sort((a, b) => b.score - a.score);
  const totalScore = settings.mode === 'team' 
    ? sortedTeams.reduce((sum, t) => sum + t.score, 0)
    : sortedPlayers.reduce((sum, p) => sum + p.score, 0);

  const winner = settings.mode === 'team' ? sortedTeams[0] : sortedPlayers[0];

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  return (
    <div className="min-h-screen bg-animated flex items-center justify-center p-4">
      <div className="max-w-xl w-full">
        {/* Winner celebration */}
        {winner && (
          <div className="text-center mb-8 animate-bounceIn">
            <div className="text-7xl mb-4">🏆</div>
            <h1 className="text-4xl sm:text-5xl font-black gradient-text mb-2 font-outfit">
              {winner.name} Wins!
            </h1>
            {settings.mode === 'team' && (
              <p className="text-white/40">Team {'emoji' in winner ? (winner as any).emoji : ''} dominated the arena!</p>
            )}
            {settings.mode === 'individual' && (
              <p className="text-white/40">The ultimate GameVerse champion!</p>
            )}
          </div>
        )}

        {/* Scores */}
        <div className="game-card p-6 mb-6 animate-slideUp">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-neon-yellow" />
              Final Scores
            </h2>
            <span className="text-sm text-white/40">Total: {totalScore} pts</span>
          </div>

          {settings.mode === 'team' ? (
            <div className="space-y-3">
              {sortedTeams.map((team, idx) => (
                <div
                  key={team.id}
                  className={`p-4 rounded-xl flex items-center gap-4 ${
                    idx === 0 ? 'bg-gradient-to-r from-neon-yellow/20 to-neon-orange/20 border border-neon-yellow/30' : 'bg-white/5'
                  } animate-slideIn`}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <span className="text-2xl w-10 text-center">{getMedalEmoji(idx)}</span>
                  <span className="text-3xl">{team.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{team.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${sortedTeams[0]?.score ? (team.score / sortedTeams[0].score) * 100 : 0}%`, background: team.color }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl" style={{ color: team.color }}>{team.score}</p>
                    <p className="text-xs text-white/30">points</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedPlayers.length > 0 ? sortedPlayers.map((player, idx) => (
                <div
                  key={player.id}
                  className={`p-4 rounded-xl flex items-center gap-4 ${
                    idx === 0 ? 'bg-gradient-to-r from-neon-yellow/20 to-neon-orange/20 border border-neon-yellow/30' : 'bg-white/5'
                  } animate-slideIn`}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <span className="text-2xl w-10 text-center">{getMedalEmoji(idx)}</span>
                  <span className="text-xl">👤</span>
                  <div className="flex-1">
                    <p className="font-bold">{player.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {player.bestStreak >= 2 && (
                        <span className="badge bg-neon-orange/20 text-neon-orange text-xs">🔥 Best: {player.bestStreak}</span>
                      )}
                      {player.correctAnswers > 0 && (
                        <span className="badge bg-neon-green/20 text-neon-green text-xs">✓ {player.correctAnswers}/{player.totalAnswers}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl text-neon-purple">{player.score}</p>
                    <p className="text-xs text-white/30">points</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">Scores were tracked anonymously</p>
                  <p className="text-sm text-white/20 mt-1">Total Points Earned: {totalScore}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Game Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-slideUp stagger-1">
          <div className="game-card p-4 text-center">
            <p className="text-2xl font-bold gradient-text">{settings.totalRounds}</p>
            <p className="text-xs text-white/40">Rounds</p>
          </div>
          <div className="game-card p-4 text-center">
            <p className="text-2xl font-bold text-neon-pink">{totalScore}</p>
            <p className="text-xs text-white/40">Total Points</p>
          </div>
          <div className="game-card p-4 text-center">
            <p className="text-2xl font-bold text-neon-green">{settings.timePerQuestion}s</p>
            <p className="text-xs text-white/40">Per Question</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 animate-slideUp stagger-2">
          <button className="btn-primary w-full py-4 flex items-center justify-center gap-2" onClick={resetGame}>
            <RotateCcw className="w-5 h-5" />
            Play Again
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => setScreen('setup')}>
              <Users className="w-4 h-4" />
              New Setup
            </button>
            <button className="btn-secondary flex items-center justify-center gap-2" onClick={() => setScreen('home')}>
              <Home className="w-4 h-4" />
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
