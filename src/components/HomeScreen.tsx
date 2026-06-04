import React from 'react';
import { useGameStore } from '../store';
import { Gamepad2, Settings, Trophy, Music, Film, MessageSquare, Sparkles, Zap, Users } from 'lucide-react';

const HomeScreen: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const stats = useGameStore((s) => s.getStats());

  return (
    <div className="min-h-screen bg-animated flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 text-6xl animate-float opacity-20">🎮</div>
        <div className="absolute top-40 right-20 text-5xl animate-float opacity-15" style={{ animationDelay: '1s' }}>🎵</div>
        <div className="absolute bottom-40 left-20 text-5xl animate-float opacity-15" style={{ animationDelay: '2s' }}>🎬</div>
        <div className="absolute bottom-20 right-10 text-6xl animate-float opacity-20" style={{ animationDelay: '0.5s' }}>😂</div>
        <div className="absolute top-1/3 left-1/4 text-4xl animate-float opacity-10" style={{ animationDelay: '3s' }}>🏆</div>
        <div className="absolute top-1/4 right-1/3 text-4xl animate-float opacity-10" style={{ animationDelay: '1.5s' }}>⭐</div>
      </div>

      {/* Logo / Title */}
      <div className="text-center mb-12 animate-slideUp z-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="relative">
            <Gamepad2 className="w-16 h-16 text-neon-purple animate-pulse-glow" />
            <Sparkles className="w-6 h-6 text-neon-yellow absolute -top-2 -right-2 animate-bounce" />
          </div>
        </div>
        <h1 className="text-6xl sm:text-7xl font-black gradient-text mb-3 font-outfit">
          GameVerse
        </h1>
        <p className="text-lg text-white/60 max-w-md mx-auto font-light">
          The Ultimate Social Gaming Arena — Host, Play & Dominate!
        </p>
      </div>

      {/* Game Mode Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-10 animate-slideUp stagger-1 z-10">
        <div className="game-card p-5 text-center cursor-pointer group" onClick={() => setScreen('setup')}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Gamepad2 className="w-7 h-7 text-neon-purple" />
          </div>
          <h3 className="font-bold text-lg mb-1">Play Game</h3>
          <p className="text-white/40 text-sm">Start a new game session</p>
        </div>

        <div className="game-card p-5 text-center cursor-pointer group" onClick={() => setScreen('admin')}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Settings className="w-7 h-7 text-neon-blue" />
          </div>
          <h3 className="font-bold text-lg mb-1">Admin Panel</h3>
          <p className="text-white/40 text-sm">Upload & manage content</p>
        </div>

        <div className="game-card p-5 text-center cursor-pointer group" onClick={() => setScreen('scoreboard')}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-yellow-500/20 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
            <Trophy className="w-7 h-7 text-neon-green" />
          </div>
          <h3 className="font-bold text-lg mb-1">Scoreboard</h3>
          <p className="text-white/40 text-sm">View scores & leaders</p>
        </div>
      </div>

      {/* Game Types */}
      <div className="w-full max-w-3xl animate-slideUp stagger-2 z-10">
        <h2 className="text-center text-white/40 text-sm font-semibold uppercase tracking-widest mb-4">Game Modes Available</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-neon-purple" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Meme Dialogues</h4>
              <p className="text-xs text-white/40">Guess the dialogue</p>
            </div>
          </div>
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-pink/20 flex items-center justify-center flex-shrink-0">
              <Music className="w-5 h-5 text-neon-pink" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Song Tunes</h4>
              <p className="text-xs text-white/40">Identify the song</p>
            </div>
          </div>
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center flex-shrink-0">
              <Film className="w-5 h-5 text-neon-cyan" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Movie Memes</h4>
              <p className="text-xs text-white/40">Guess the movie</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats footer */}
      <div className="mt-8 animate-slideUp stagger-3 z-10">
        <div className="flex items-center gap-6 text-white/30 text-sm">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span>{stats.totalContent} questions ready</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{stats.totalGamesPlayed} games played</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;
