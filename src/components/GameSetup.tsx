import React, { useState } from 'react';
import { useGameStore } from '../store';
import type { ContentType } from '../types';
import { ArrowLeft, Users, User, Gamepad2, Clock, Check, Plus, Trash2, MessageSquare, Music, Film } from 'lucide-react';

const GameSetup: React.FC = () => {
  const setScreen = useGameStore((s) => s.setScreen);
  const settings = useGameStore((s) => s.settings);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const addTeam = useGameStore((s) => s.addTeam);
  const removeTeam = useGameStore((s) => s.removeTeam);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);
  const setRounds = useGameStore((s) => s.setRounds);
  const setContentTypes = useGameStore((s) => s.setContentTypes);
  const setTimePerQuestion = useGameStore((s) => s.setTimePerQuestion);
  const startGame = useGameStore((s) => s.startGame);

  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerTeam, setNewPlayerTeam] = useState('');

  const toggleContentType = (type: ContentType) => {
    const current = settings.contentTypes;
    if (current.includes(type)) {
      if (current.length > 1) {
        setContentTypes(current.filter((t) => t !== type));
      }
    } else {
      setContentTypes([...current, type]);
    }
  };

  const handleAddTeam = () => {
    if (newTeamName.trim()) {
      addTeam(newTeamName.trim());
      setNewTeamName('');
    }
  };

  const handleAddPlayer = () => {
    if (newPlayerName.trim()) {
      addPlayer(newPlayerName.trim(), settings.mode === 'team' ? newPlayerTeam : undefined);
      setNewPlayerName('');
      setNewPlayerTeam('');
    }
  };

  const canStart = settings.contentTypes.length > 0 && settings.totalRounds > 0;

  return (
    <div className="min-h-screen bg-animated p-4 sm:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 animate-slideDown">
          <button onClick={() => setScreen('home')} className="w-10 h-10 rounded-xl glass flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold gradient-text font-outfit">Game Setup</h1>
            <p className="text-white/40 text-sm">Configure your game session</p>
          </div>
        </div>

        {/* Game Mode Selection */}
        <div className="game-card p-6 mb-6 animate-slideUp">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Gamepad2 className="w-5 h-5 text-neon-purple" /> Game Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                settings.mode === 'individual'
                  ? 'border-neon-purple bg-neon-purple/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
              onClick={() => setGameMode('individual')}
            >
              <User className={`w-8 h-8 ${settings.mode === 'individual' ? 'text-neon-purple' : 'text-white/30'}`} />
              <span className="font-semibold">Individual</span>
              <span className="text-xs text-white/40">Everyone plays solo</span>
            </button>
            <button
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                settings.mode === 'team'
                  ? 'border-neon-pink bg-neon-pink/10'
                  : 'border-white/10 hover:border-white/20'
              }`}
              onClick={() => setGameMode('team')}
            >
              <Users className={`w-8 h-8 ${settings.mode === 'team' ? 'text-neon-pink' : 'text-white/30'}`} />
              <span className="font-semibold">Team Play</span>
              <span className="text-xs text-white/40">Compete as teams</span>
            </button>
          </div>
        </div>

        {/* Game Categories */}
        <div className="game-card p-6 mb-6 animate-slideUp stagger-1">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-neon-cyan" /> Game Categories</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { type: 'meme-dialogue' as ContentType, icon: <MessageSquare className="w-6 h-6" />, label: 'Meme Dialogues', color: 'neon-purple' },
              { type: 'song-tune' as ContentType, icon: <Music className="w-6 h-6" />, label: 'Song Tunes', color: 'neon-pink' },
              { type: 'movie-meme' as ContentType, icon: <Film className="w-6 h-6" />, label: 'Movie Memes', color: 'neon-cyan' },
            ].map((cat) => (
              <button
                key={cat.type}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 relative overflow-hidden ${
                  settings.contentTypes.includes(cat.type)
                    ? 'border-white/30 bg-white/10'
                    : 'border-white/5 hover:border-white/15'
                }`}
                onClick={() => toggleContentType(cat.type)}
              >
                {settings.contentTypes.includes(cat.type) && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-neon-green" />
                  </div>
                )}
                <div className={`text-${cat.color}`}>{cat.icon}</div>
                <span className="font-semibold text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Game Settings */}
        <div className="game-card p-6 mb-6 animate-slideUp stagger-2">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-neon-green" /> Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Number of Rounds: <span className="text-neon-purple font-bold">{settings.totalRounds}</span>
              </label>
              <input
                type="range"
                min={1}
                max={20}
                value={settings.totalRounds}
                onChange={(e) => setRounds(parseInt(e.target.value))}
                className="w-full accent-purple-500"
              />
              <div className="flex justify-between text-xs text-white/20 mt-1">
                <span>1</span><span>10</span><span>20</span>
              </div>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Time per Question: <span className="text-neon-pink font-bold">{settings.timePerQuestion}s</span>
              </label>
              <input
                type="range"
                min={10}
                max={60}
                step={5}
                value={settings.timePerQuestion}
                onChange={(e) => setTimePerQuestion(parseInt(e.target.value))}
                className="w-full accent-pink-500"
              />
              <div className="flex justify-between text-xs text-white/20 mt-1">
                <span>10s</span><span>30s</span><span>60s</span>
              </div>
            </div>
          </div>
        </div>

        {/* Teams or Players */}
        {settings.mode === 'team' ? (
          <div className="game-card p-6 mb-6 animate-slideUp stagger-3">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-neon-pink" /> Teams</h2>
            
            {/* Add team */}
            <div className="flex gap-2 mb-4">
              <input className="input-glass flex-1" placeholder="Team name..." value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()} />
              <button className="btn-primary px-4" onClick={handleAddTeam}><Plus className="w-5 h-5" /></button>
            </div>
            
            {/* Team list */}
            <div className="space-y-2">
              {settings.teams.map((team) => (
                <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <span className="text-2xl">{team.emoji}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-medium flex-1">{team.name}</span>
                  <button onClick={() => removeTeam(team.id)} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {settings.teams.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">Add at least 2 teams to play</p>
            )}
          </div>
        ) : (
          <div className="game-card p-6 mb-6 animate-slideUp stagger-3">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5 text-neon-blue" /> Players (Optional)</h2>
            <p className="text-white/40 text-sm mb-4">Add player names for personalized score tracking. Leave empty to play without tracking individual names.</p>
            
            <div className="flex gap-2 mb-4">
              <input className="input-glass flex-1" placeholder="Player name..." value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()} />
              <button className="btn-primary px-4" onClick={handleAddPlayer}><Plus className="w-5 h-5" /></button>
            </div>
            
            <div className="space-y-2">
              {settings.players.map((player) => (
                <div key={player.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                  <span className="text-lg">👤</span>
                  <span className="font-medium flex-1">{player.name}</span>
                  <button onClick={() => removePlayer(player.id)} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {settings.players.length === 0 && (
              <p className="text-white/30 text-sm text-center py-4">No players added — scores will be tracked anonymously</p>
            )}
          </div>
        )}

        {/* Start Button */}
        <button
          className={`w-full py-4 rounded-xl text-lg font-bold transition-all flex items-center justify-center gap-3 ${
            canStart
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 active:scale-[0.98]'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
          onClick={startGame}
          disabled={!canStart}
        >
          <Gamepad2 className="w-6 h-6" />
          {settings.mode === 'team' ? 'Start Team Battle' : 'Start Game'}
        </button>
      </div>
    </div>
  );
};

export default GameSetup;
