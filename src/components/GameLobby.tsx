import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store';
import { Play, Users, User, Zap, ArrowLeft } from 'lucide-react';

const GameLobby: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const settings = useGameStore((s) => s.settings);
  const startTimer = useGameStore((s) => s.startTimer);
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleStartGame = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      startTimer();
      setScreen('playing');
      return;
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, setScreen, startTimer]);

  return (
    <div className="min-h-screen bg-animated flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="animate-bounceIn">
              <span className="text-[12rem] font-black gradient-text leading-none">{countdown}</span>
            </div>
          </div>
        )}

        <div className="text-center mb-8 animate-slideDown">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass text-sm text-white/60 mb-4">
            <Zap className="w-4 h-4 text-neon-yellow" />
            Get Ready to Play!
          </div>
          <h1 className="text-4xl sm:text-5xl font-black font-outfit mb-2">
            {settings.mode === 'team' ? '⚔️ Team Battle' : '🎮 Game On!'}
          </h1>
          <p className="text-white/40">{settings.totalRounds} rounds • {settings.timePerQuestion}s per question</p>
        </div>

        {/* Players / Teams */}
        <div className="game-card p-6 mb-6 animate-scaleIn">
          {settings.mode === 'team' ? (
            <>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-neon-pink" /> Teams</h3>
              <div className="grid grid-cols-2 gap-3">
                {settings.teams.map((team) => (
                  <div key={team.id} className="p-4 rounded-xl flex items-center gap-3" style={{ background: `${team.color}15`, border: `1px solid ${team.color}30` }}>
                    <span className="text-3xl">{team.emoji}</span>
                    <div>
                      <p className="font-bold">{team.name}</p>
                      <p className="text-xs text-white/40">Score: 0</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-neon-blue" /> Players</h3>
              {settings.players.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {settings.players.map((player) => (
                    <div key={player.id} className="p-3 rounded-xl bg-white/5 flex items-center gap-2">
                      <span className="text-xl">👤</span>
                      <span className="font-medium text-sm">{player.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm text-center py-4">Playing anonymously — score tracking enabled</p>
              )}
            </>
          )}
        </div>

        {/* Categories */}
        <div className="flex items-center justify-center gap-3 mb-8 animate-slideUp">
          {settings.contentTypes.map((type) => (
            <div key={type} className="px-3 py-1.5 rounded-full glass text-xs">
              {type === 'meme-dialogue' ? '💬 Memes' : type === 'song-tune' ? '🎵 Songs' : '🎬 Movies'}
            </div>
          ))}
        </div>

        {/* Start button */}
        <button
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-3 animate-scaleIn"
          onClick={handleStartGame}
        >
          <Play className="w-6 h-6" />
          {countdown !== null ? 'Starting...' : 'Start Game!'}
        </button>

        {/* Back button */}
        <button
          className="w-full mt-3 py-3 text-white/40 hover:text-white/60 transition-colors text-sm flex items-center justify-center gap-2"
          onClick={() => setScreen('setup')}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Setup
        </button>
      </div>
    </div>
  );
};

export default GameLobby;
