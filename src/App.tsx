import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2, Settings, Trophy, Music, Film, MessageSquare, Sparkles,
  Zap, Users, ArrowLeft, Plus, Edit2, Trash2, Save, X, Image,
  Search, User, Clock, Check, Play, SkipForward,
  Eye, RotateCcw, Home, Star
} from 'lucide-react';

// ==================== TYPES ====================
type ContentType = 'meme-dialogue' | 'song-tune' | 'movie-meme';
type GameMode = 'individual' | 'team';
type GameScreen = 'home' | 'admin' | 'setup' | 'lobby' | 'playing' | 'reveal' | 'scoreboard';

interface GameContent {
  id: string;
  type: ContentType;
  question: string;
  answer: string;
  options: string[];
  imageUrl?: string;
  audioHint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

interface Team {
  id: string; name: string; score: number; color: string; emoji: string;
}

interface Player {
  id: string; name: string; score: number; teamId?: string;
  streak: number; bestStreak: number; correctAnswers: number; totalAnswers: number;
}

// ==================== SAMPLE DATA ====================
const SAMPLE_CONTENT: GameContent[] = [
  { id: '1', type: 'meme-dialogue', question: 'What is the famous dialogue from this meme?', answer: 'This is fine', options: ['This is fine', 'Everything is okay', "I'm on fire", 'No worries'], difficulty: 'easy', points: 10 },
  { id: '2', type: 'meme-dialogue', question: 'Complete the meme: "One does not simply ___"', answer: 'Walk into Mordor', options: ['Walk into Mordor', 'Eat just one chip', 'Win at poker', 'Ignore this meme'], difficulty: 'easy', points: 10 },
  { id: '3', type: 'song-tune', question: '🎵 Identify this tune: "Dum dum da dum dum, da dum da dum..."', answer: 'Tum Hi Ho (Aashiqui 2)', options: ['Tum Hi Ho (Aashiqui 2)', 'Channa Mereya (Ae Dil)', 'Kal Ho Naa Ho', 'Tujhe Dekha Toh (DDLJ)'], audioHint: 'Slow romantic Bollywood tune from the 2013 blockbuster', difficulty: 'medium', points: 20 },
  { id: '4', type: 'song-tune', question: '🎵 "Never gonna give you up, never gonna let you down" — What is this internet phenomenon called?', answer: 'Rickrolling', options: ['Rickrolling', 'Trolling', 'Catfishing', 'Dabbing'], audioHint: 'The most famous internet prank song of all time', difficulty: 'easy', points: 10 },
  { id: '5', type: 'movie-meme', question: 'Which movie is referenced by the meme: "I am Groot"?', answer: 'Guardians of the Galaxy', options: ['Guardians of the Galaxy', 'Avengers: Endgame', 'Thor: Ragnarok', 'Spider-Man'], difficulty: 'easy', points: 10 },
  { id: '6', type: 'movie-meme', question: 'The "Matrix Red Pill vs Blue Pill" meme references what concept?', answer: 'Truth vs Ignorance / Free Will', options: ['Truth vs Ignorance / Free Will', 'Good vs Evil', 'Love vs Hate', 'Wealth vs Poverty'], difficulty: 'hard', points: 30 },
  { id: '7', type: 'song-tune', question: '🎵 "Na na na na, na na na na, hey hey hey, goodbye!" — Identify this anthem', answer: 'Na Na Hey Hey Kiss Him Goodbye', options: ['Na Na Hey Hey Kiss Him Goodbye', 'Celebration', 'We Will Rock You', 'Seven Nation Army'], audioHint: 'Classic stadium anthem tune', difficulty: 'medium', points: 20 },
  { id: '8', type: 'meme-dialogue', question: 'What phrase is associated with the "Stonks" meme?', answer: 'Stonks', options: ['Stonks', 'To the Moon', 'Buy High Sell Low', 'Diamond Hands'], difficulty: 'easy', points: 10 },
  { id: '9', type: 'movie-meme', question: 'The "Leonardo DiCaprio pointing at TV" meme is from which movie?', answer: 'Once Upon a Time in Hollywood', options: ['Once Upon a Time in Hollywood', 'The Wolf of Wall Street', 'Inception', 'Django Unchained'], difficulty: 'hard', points: 30 },
  { id: '10', type: 'song-tune', question: '🎵 "Baby Shark doo doo doo..." — What category is this?', answer: "Children's viral hit", options: ["Children's viral hit", 'K-Pop dance track', 'Reggaeton summer hit', 'EDM club banger'], audioHint: 'Super catchy kids song that broke YouTube records', difficulty: 'easy', points: 10 },
  { id: '11', type: 'meme-dialogue', question: 'The "Distracted Boyfriend" meme represents what?', answer: 'Temptation — Choosing something new over what you already have', options: ['Temptation — Choosing something new over what you already have', 'A guy who is lost', 'Shopping addiction', 'Bad photography skills'], difficulty: 'medium', points: 20 },
  { id: '12', type: 'movie-meme', question: 'This meme: "I am your father" — Which movie and character?', answer: 'Star Wars - Darth Vader', options: ['Star Wars - Darth Vader', 'The Lion King - Mufasa', 'Harry Potter - Snape', 'Terminator - T-800'], difficulty: 'easy', points: 10 },
];

const TEAM_COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#06b6d4', '#eab308', '#ef4444'];
const TEAM_EMOJIS = ['🦁', '🐉', '🦅', '🐺', '🦊', '🐯', '🦈', '🐙'];

// ==================== HELPERS ====================
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadContent(): GameContent[] {
  try {
    const d = localStorage.getItem('gv_content');
    return d ? JSON.parse(d) : SAMPLE_CONTENT;
  } catch { return SAMPLE_CONTENT; }
}

function saveContent(c: GameContent[]) {
  localStorage.setItem('gv_content', JSON.stringify(c));
}

function loadStats() {
  try {
    const d = localStorage.getItem('gv_stats');
    return d ? JSON.parse(d) : { gamesPlayed: 0, lastPlayed: null };
  } catch { return { gamesPlayed: 0, lastPlayed: null }; }
}

function saveStats(s: any) {
  localStorage.setItem('gv_stats', JSON.stringify(s));
}

// ==================== ANIMATED BACKGROUND ====================
const AnimatedBg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative min-h-screen" style={{ background: '#0a0a1a', color: '#ffffff', fontFamily: 'sans-serif' }}>
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
      background: `
        radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(236,72,153,0.1) 0%, transparent 50%),
        #0a0a1a
      `
    }} />
    <div className="relative z-10">{children}</div>
  </div>
);

// ==================== GRADIENT TEXT ====================
const GradientText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={className}
    style={{
      background: 'linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}
  >
    {children}
  </span>
);

// ==================== HOME SCREEN ====================
const HomeScreen: React.FC<{ onNavigate: (s: GameScreen) => void; stats: { total: number; games: number } }> = ({ onNavigate, stats }) => {
  const emojis = [
    { e: '🎮', style: { top: '12%', left: '5%', animationDelay: '0s' } },
    { e: '🎵', style: { top: '25%', right: '10%', animationDelay: '1s' } },
    { e: '🎬', style: { bottom: '25%', left: '10%', animationDelay: '2s' } },
    { e: '😂', style: { bottom: '12%', right: '5%', animationDelay: '0.5s' } },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {emojis.map((item, i) => (
        <div key={i} className="absolute text-5xl opacity-10" style={item.style}>
          {item.e}
        </div>
      ))}

      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="relative">
            <Gamepad2 className="w-16 h-16" style={{ color: '#a855f7' }} />
            <Sparkles className="w-5 h-5 absolute -top-1 -right-1 text-yellow-400" />
          </div>
        </div>
        <h1 className="text-5xl sm:text-7xl font-black mb-3">
          <GradientText>GameVerse</GradientText>
        </h1>
        <p className="text-lg text-white/50 max-w-md mx-auto font-light">
          The Ultimate Social Gaming Arena — Host, Play & Dominate!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-10">
        {[
          { icon: <Gamepad2 className="w-7 h-7" style={{ color: '#a855f7' }} />, title: 'Play Game', desc: 'Start a new game session', action: () => onNavigate('setup') },
          { icon: <Settings className="w-7 h-7" style={{ color: '#3b82f6' }} />, title: 'Admin Panel', desc: 'Upload & manage content', action: () => onNavigate('admin') },
          { icon: <Trophy className="w-7 h-7" style={{ color: '#22c55e' }} />, title: 'Scoreboard', desc: 'View scores & leaders', action: () => onNavigate('scoreboard') },
        ].map((item, i) => (
          <div
            key={i}
            onClick={item.action}
            className="rounded-2xl p-6 text-center cursor-pointer hover:-translate-y-1 transition-all duration-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
              {item.icon}
            </div>
            <h3 className="font-bold text-lg mb-1">{item.title}</h3>
            <p className="text-white/40 text-sm">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-center text-white/30 text-xs font-semibold uppercase tracking-widest mb-4">Game Modes Available</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <MessageSquare className="w-5 h-5" style={{ color: '#a855f7' }} />, title: 'Meme Dialogues', desc: 'Guess the dialogue', bg: 'rgba(168,85,247,0.15)' },
            { icon: <Music className="w-5 h-5" style={{ color: '#ec4899' }} />, title: 'Song Tunes', desc: 'Identify the song', bg: 'rgba(236,72,153,0.15)' },
            { icon: <Film className="w-5 h-5" style={{ color: '#06b6d4' }} />, title: 'Movie Memes', desc: 'Guess the movie', bg: 'rgba(6,182,212,0.15)' },
          ].map((cat, i) => (
            <div key={i} className="rounded-xl p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cat.bg }}>
                {cat.icon}
              </div>
              <div>
                <h4 className="font-semibold text-sm">{cat.title}</h4>
                <p className="text-xs text-white/40">{cat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-6 text-white/30 text-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          <span>{stats.total} questions ready</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>{stats.games} games played</span>
        </div>
      </div>
    </div>
  );
};

// ==================== ADMIN SCREEN ====================
const AdminScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [content, setContent] = useState<GameContent[]>(loadContent);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    type: 'meme-dialogue' as ContentType,
    question: '',
    answer: '',
    options: ['', '', '', ''],
    imageUrl: '',
    audioHint: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 20,
  });

  const save = (data: GameContent[]) => {
    setContent(data);
    saveContent(data);
  };

  const filtered = content.filter(c => {
    const matchType = filter === 'all' || c.type === filter;
    const matchSearch = !search || c.question.toLowerCase().includes(search.toLowerCase()) || c.answer.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const handleSubmit = () => {
    if (!form.question.trim() || !form.answer.trim()) {
      alert('Please fill in question and answer!');
      return;
    }
    const cleanOpts = form.options.filter(o => o.trim());
    if (cleanOpts.length < 2) {
      alert('At least 2 options required!');
      return;
    }
    if (!cleanOpts.includes(form.answer)) {
      alert('Answer must be one of the options!');
      return;
    }

    if (editId) {
      save(content.map(c => c.id === editId ? { ...form, id: editId } as GameContent : c));
    } else {
      save([{ ...form, id: Date.now().toString() }, ...content] as GameContent[]);
    }
    setForm({ type: 'meme-dialogue', question: '', answer: '', options: ['', '', '', ''], imageUrl: '', audioHint: '', difficulty: 'medium', points: 20 });
    setShowForm(false);
    setEditId(null);
  };

  const startEdit = (item: GameContent) => {
    setEditId(item.id);
    setForm({
      type: item.type, question: item.question, answer: item.answer,
      options: [...item.options, '', '', '', ''].slice(0, 4),
      imageUrl: item.imageUrl || '', audioHint: item.audioHint || '',
      difficulty: item.difficulty, points: item.points,
    });
    setShowForm(true);
  };

  const diffColor = (d: string) => d === 'easy' ? '#22c55e' : d === 'medium' ? '#eab308' : '#ef4444';
  const typeEmoji = (t: string) => t === 'meme-dialogue' ? '💬' : t === 'song-tune' ? '🎵' : '🎬';
  const typeLabel = (t: string) => t === 'meme-dialogue' ? 'Meme' : t === 'song-tune' ? 'Song' : 'Movie';

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold"><GradientText>Admin Panel</GradientText></h1>
              <p className="text-white/40 text-sm">Manage your game content</p>
            </div>
          </div>
          <button
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white border-0 cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            onClick={() => { setShowForm(true); setEditId(null); setForm({ type: 'meme-dialogue', question: '', answer: '', options: ['', '', '', ''], imageUrl: '', audioHint: '', difficulty: 'medium', points: 20 }); }}
          >
            <Plus className="w-5 h-5" /> Add Content
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { n: content.length, label: 'Total', color: '#a855f7' },
            { n: content.filter(c => c.type === 'meme-dialogue').length, label: 'Memes', color: '#22c55e' },
            { n: content.filter(c => c.type === 'song-tune').length, label: 'Songs', color: '#ec4899' },
            { n: content.filter(c => c.type === 'movie-meme').length, label: 'Movies', color: '#06b6d4' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.n}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editId ? 'Edit Content' : 'Add New Content'}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Type</label>
                <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value as ContentType })}
                >
                  <option value="meme-dialogue" style={{ background: '#1a1a2e' }}>💬 Meme Dialogue</option>
                  <option value="song-tune" style={{ background: '#1a1a2e' }}>🎵 Song Tune</option>
                  <option value="movie-meme" style={{ background: '#1a1a2e' }}>🎬 Movie Meme</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Difficulty</label>
                <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  value={form.difficulty}
                  onChange={e => {
                    const d = e.target.value as 'easy' | 'medium' | 'hard';
                    setForm({ ...form, difficulty: d, points: d === 'easy' ? 10 : d === 'medium' ? 20 : 30 });
                  }}
                >
                  <option value="easy" style={{ background: '#1a1a2e' }}>😊 Easy (10 pts)</option>
                  <option value="medium" style={{ background: '#1a1a2e' }}>🤔 Medium (20 pts)</option>
                  <option value="hard" style={{ background: '#1a1a2e' }}>🔥 Hard (30 pts)</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-1 block">Question</label>
              <textarea className="w-full rounded-xl px-4 py-3 text-white outline-none" rows={2}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="Enter your question..."
                value={form.question}
                onChange={e => setForm({ ...form, question: e.target.value })}
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-1 block">Correct Answer</label>
              <input className="w-full rounded-xl px-4 py-3 text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="The correct answer"
                value={form.answer}
                onChange={e => setForm({ ...form, answer: e.target.value })}
              />
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-1 block">Options (include the correct answer)</label>
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-white/30 w-5">{i + 1}.</span>
                  <input className="flex-1 rounded-xl px-4 py-2.5 text-white outline-none text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const opts = [...form.options];
                      opts[i] = e.target.value;
                      setForm({ ...form, options: opts });
                    }}
                  />
                  <button
                    className={`text-xs px-3 py-1.5 rounded-lg transition-all ${form.answer === opt ? 'text-green-400 font-bold' : 'text-white/30'}`}
                    style={{ background: form.answer === opt ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }}
                    onClick={() => setForm({ ...form, answer: opt })}
                  >
                    {form.answer === opt ? '✓ Answer' : 'Set Answer'}
                  </button>
                </div>
              ))}
            </div>

            {form.type !== 'song-tune' && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-1 block flex items-center gap-2"><Image className="w-4 h-4" /> Image URL (optional)</label>
                <input className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  placeholder="https://..."
                  value={form.imageUrl || ''}
                  onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>
            )}

            {form.type === 'song-tune' && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-1 block flex items-center gap-2"><Music className="w-4 h-4" /> Audio Hint</label>
                <textarea className="w-full rounded-xl px-4 py-3 text-white outline-none" rows={2}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  placeholder="Describe the tune..."
                  value={form.audioHint || ''}
                  onChange={e => setForm({ ...form, audioHint: e.target.value })}
                />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button className="px-5 py-2.5 rounded-xl font-semibold cursor-pointer" style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                onClick={() => { setShowForm(false); setEditId(null); }}>
                Cancel
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                onClick={handleSubmit}>
                <Save className="w-4 h-4" /> {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Search / Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input className="w-full rounded-xl pl-10 pr-4 py-3 text-white outline-none text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'meme-dialogue', label: '💬 Memes' },
              { key: 'song-tune', label: '🎵 Songs' },
              { key: 'movie-meme', label: '🎬 Movies' },
            ].map(f => (
              <button key={f.key}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: filter === f.key ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                  border: filter === f.key ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: filter === f.key ? 'white' : 'rgba(255,255,255,0.4)',
                }}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/40">No content found. Add your first question!</p>
            </div>
          ) : filtered.map(item => (
            <div key={item.id} className="rounded-2xl p-4 flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                style={{
                  background: item.type === 'meme-dialogue' ? 'rgba(168,85,247,0.15)' : item.type === 'song-tune' ? 'rgba(236,72,153,0.15)' : 'rgba(6,182,212,0.15)',
                }}>
                {typeEmoji(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                    {typeLabel(item.type)}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: diffColor(item.difficulty) }}>
                    {item.difficulty}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
                    {item.points} pts
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{item.question}</p>
                <p className="text-xs text-white/30 mt-1">Answer: <span style={{ color: '#22c55e' }}>{item.answer}</span></p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => startEdit(item)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Edit2 className="w-4 h-4 text-white/40" />
                </button>
                <button onClick={() => { if (confirm('Delete?')) save(content.filter(c => c.id !== item.id)); }} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== GAME SETUP ====================
const GameSetup: React.FC<{ onBack: () => void; onStart: (settings: any) => void }> = ({ onBack, onStart }) => {
  const [mode, setMode] = useState<GameMode>('individual');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState(5);
  const [timePerQ, setTimePerQ] = useState(30);
  const [categories, setCategories] = useState<ContentType[]>(['meme-dialogue', 'song-tune', 'movie-meme']);
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');

  const toggleCat = (t: ContentType) => {
    if (categories.includes(t) && categories.length <= 1) return;
    setCategories(prev => prev.includes(t) ? prev.filter(c => c !== t) : [...prev, t]);
  };

  const addTeam = () => {
    if (!newTeamName.trim()) return;
    const idx = teams.length;
    setTeams([...teams, {
      id: Date.now().toString(), name: newTeamName.trim(), score: 0,
      color: TEAM_COLORS[idx % TEAM_COLORS.length], emoji: TEAM_EMOJIS[idx % TEAM_EMOJIS.length],
    }]);
    setNewTeamName('');
  };

  const addPlayer = () => {
    if (!newPlayerName.trim()) return;
    setPlayers([...players, {
      id: Date.now().toString(), name: newPlayerName.trim(), score: 0,
      streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0,
    }]);
    setNewPlayerName('');
  };

  const handleStart = () => {
    onStart({ mode, teams, players, rounds, timePerQ, categories });
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold"><GradientText>Game Setup</GradientText></h1>
            <p className="text-white/40 text-sm">Configure your game session</p>
          </div>
        </div>

        {/* Game Mode */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Gamepad2 className="w-5 h-5" style={{ color: '#a855f7' }} /> Game Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { m: 'individual' as GameMode, icon: <User className="w-8 h-8" />, label: 'Individual', desc: 'Everyone plays solo', color: '#a855f7' },
              { m: 'team' as GameMode, icon: <Users className="w-8 h-8" />, label: 'Team Play', desc: 'Compete as teams', color: '#ec4899' },
            ].map(item => (
              <button key={item.m}
                className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all"
                style={{
                  borderColor: mode === item.m ? item.color : 'rgba(255,255,255,0.1)',
                  background: mode === item.m ? `${item.color}15` : 'transparent',
                }}
                onClick={() => setMode(item.m)}
              >
                <div style={{ color: mode === item.m ? item.color : 'rgba(255,255,255,0.3)' }}>{item.icon}</div>
                <span className="font-semibold">{item.label}</span>
                <span className="text-xs text-white/40">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5" style={{ color: '#06b6d4' }} /> Categories</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: 'meme-dialogue' as ContentType, emoji: '💬', label: 'Meme Dialogues', color: '#a855f7' },
              { type: 'song-tune' as ContentType, emoji: '🎵', label: 'Song Tunes', color: '#ec4899' },
              { type: 'movie-meme' as ContentType, emoji: '🎬', label: 'Movie Memes', color: '#06b6d4' },
            ].map(cat => (
              <button key={cat.type}
                className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 relative transition-all"
                style={{
                  borderColor: categories.includes(cat.type) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)',
                  background: categories.includes(cat.type) ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
                onClick={() => toggleCat(cat.type)}
              >
                {categories.includes(cat.type) && <Check className="w-4 h-4 absolute top-2 right-2" style={{ color: '#22c55e' }} />}
                <span className="text-2xl">{cat.emoji}</span>
                <span className="font-semibold text-sm">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5" style={{ color: '#22c55e' }} /> Settings</h2>
          <div className="space-y-5">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Rounds: <span style={{ color: '#a855f7' }} className="font-bold">{rounds}</span></label>
              <input type="range" min={1} max={20} value={rounds} onChange={e => setRounds(parseInt(e.target.value))} className="w-full" style={{ accentColor: '#a855f7' }} />
              <div className="flex justify-between text-xs text-white/20 mt-1"><span>1</span><span>10</span><span>20</span></div>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-2 block">Time per Question: <span style={{ color: '#ec4899' }} className="font-bold">{timePerQ}s</span></label>
              <input type="range" min={10} max={60} step={5} value={timePerQ} onChange={e => setTimePerQ(parseInt(e.target.value))} className="w-full" style={{ accentColor: '#ec4899' }} />
              <div className="flex justify-between text-xs text-white/20 mt-1"><span>10s</span><span>30s</span><span>60s</span></div>
            </div>
          </div>
        </div>

        {/* Teams or Players */}
        {mode === 'team' ? (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" style={{ color: '#ec4899' }} /> Teams</h2>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 rounded-xl px-4 py-3 text-white outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="Team name..." value={newTeamName} onChange={e => setNewTeamName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTeam()}
              />
              <button className="px-4 rounded-xl text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={addTeam}>
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {teams.map(team => (
                <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-2xl">{team.emoji}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-medium flex-1">{team.name}</span>
                  <button onClick={() => setTeams(teams.filter(t => t.id !== team.id))} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {teams.length === 0 && <p className="text-white/30 text-sm text-center py-4">Add at least 2 teams</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5" style={{ color: '#3b82f6' }} /> Players <span className="text-sm text-white/30 font-normal">(Optional)</span></h2>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 rounded-xl px-4 py-3 text-white outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="Player name..." value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPlayer()}
              />
              <button className="px-4 rounded-xl text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={addPlayer}>
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span>👤</span>
                  <span className="font-medium flex-1">{p.name}</span>
                  <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-white/30 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {players.length === 0 && <p className="text-white/30 text-sm text-center py-4">No players added — scores tracked anonymously</p>}
            </div>
          </div>
        )}

        <button
          className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            boxShadow: '0 8px 25px rgba(168,85,247,0.3)',
          }}
          onClick={handleStart}
        >
          <Gamepad2 className="w-6 h-6" />
          {mode === 'team' ? 'Start Team Battle' : 'Start Game'}
        </button>
      </div>
    </div>
  );
};

// ==================== GAME LOBBY ====================
const GameLobby: React.FC<{ settings: any; onStart: () => void; onBack: () => void }> = ({ settings, onStart, onBack }) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleStart = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { onStart(); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onStart]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '10rem', fontWeight: 900, background: 'linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {countdown}
          </div>
        </div>
      )}
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-white/60 mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Zap className="w-4 h-4 text-yellow-400" /> Get Ready to Play!
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-2">{settings.mode === 'team' ? '⚔️ Team Battle' : '🎮 Game On!'}</h1>
          <p className="text-white/40">{settings.rounds} rounds • {settings.timePerQ}s per question</p>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {settings.mode === 'team' ? (
            <>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" style={{ color: '#ec4899' }} /> Teams</h3>
              <div className="grid grid-cols-2 gap-3">
                {settings.teams.map((team: Team) => (
                  <div key={team.id} className="p-4 rounded-xl flex items-center gap-3" style={{ background: `${team.color}15`, border: `1px solid ${team.color}30` }}>
                    <span className="text-3xl">{team.emoji}</span>
                    <div><p className="font-bold">{team.name}</p><p className="text-xs text-white/40">Score: 0</p></div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5" style={{ color: '#3b82f6' }} /> Players</h3>
              {settings.players.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {settings.players.map((p: Player) => (
                    <div key={p.id} className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <span className="text-xl">👤</span>
                      <span className="font-medium text-sm">{p.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm text-center py-4">Playing anonymously — scores tracked</p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 mb-8">
          {settings.categories.map((t: ContentType) => (
            <div key={t} className="px-3 py-1.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {t === 'meme-dialogue' ? '💬 Memes' : t === 'song-tune' ? '🎵 Songs' : '🎬 Movies'}
            </div>
          ))}
        </div>

        <button
          className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.3)' }}
          onClick={handleStart}
        >
          <Play className="w-6 h-6" /> {countdown !== null ? 'Starting...' : 'Start Game!'}
        </button>

        <button className="w-full mt-3 py-3 text-white/40 hover:text-white/60 transition-colors text-sm flex items-center justify-center gap-2" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" /> Back to Setup
        </button>
      </div>
    </div>
  );
};

// ==================== GAME PLAY ====================
const GamePlay: React.FC<{
  question: GameContent & { shuffledOptions?: string[] };
  roundNumber: number;
  totalRounds: number;
  timePerQ: number;
  onAnswer: (answer: string) => void;
  onReveal: () => void;
  onNext: () => void;
  onEnd: () => void;
  scores: { players: Player[]; teams: Team[]; mode: GameMode };
}> = ({ question, roundNumber, totalRounds, timePerQ, onAnswer, onReveal, onNext, onEnd }) => {
  const [timeLeft, setTimeLeft] = useState(timePerQ);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset per question
  useEffect(() => {
    setHasAnswered(false);
    setTimeLeft(timePerQ);
    setShowHint(false);
  }, [question.id, timePerQ]);

  // Timer
  useEffect(() => {
    if (hasAnswered) return;
    if (timeLeft <= 0) {
      setHasAnswered(true);
      onReveal();
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, hasAnswered, onReveal]);

  const handleAnswer = (opt: string) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    onAnswer(opt);
    setTimeout(() => onReveal(), 500);
  };

  const progress = ((roundNumber - 1) / totalRounds) * 100;
  const timerPct = (timeLeft / timePerQ) * 100;
  const timerColor = timeLeft > 10 ? '#a855f7' : timeLeft > 5 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - timerPct / 100);

  const typeEmoji = (t: string) => t === 'meme-dialogue' ? '💬' : t === 'song-tune' ? '🎵' : '🎬';
  const typeLabel = (t: string) => t === 'meme-dialogue' ? 'Meme Dialogue' : t === 'song-tune' ? 'Song Tune' : 'Movie Meme';

  return (
    <div className="min-h-screen flex flex-col px-4 py-4">
      <div className="max-w-2xl w-full mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
              Round {roundNumber}/{totalRounds}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
              {typeEmoji(question.type)} {typeLabel(question.type)}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
              {question.points} pts
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-1.5 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #a855f7, #ec4899)' }} />
        </div>

        {/* Timer */}
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle cx="30" cy="30" r="26" fill="none" stroke={timerColor} strokeWidth="3"
                strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold" style={{ color: timerColor }}>{timeLeft}</span>
            </div>
          </div>
        </div>

        {/* Question Card */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {question.imageUrl && (
            <div className="mb-4 rounded-xl overflow-hidden flex items-center justify-center min-h-[150px]" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <img src={question.imageUrl} alt="meme" className="max-w-full max-h-[250px] object-contain" onError={e => { (e.target as HTMLElement).style.display = 'none'; }} />
            </div>
          )}

          {question.type === 'song-tune' && question.audioHint && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎵</span>
                <span className="text-sm font-semibold" style={{ color: '#ec4899' }}>Audio Clue</span>
                <button onClick={() => setShowHint(!showHint)} className="ml-auto text-xs text-white/40 hover:text-white/60 underline">
                  {showHint ? 'Hide' : 'Show'} Hint
                </button>
              </div>
              {showHint ? (
                <p className="text-sm text-white/60">{question.audioHint}</p>
              ) : (
                <div className="flex items-center gap-1 h-6">
                  {[14, 22, 10, 18, 26, 12, 20].map((h, i) => (
                    <div key={i} className="w-1.5 rounded-full animate-pulse" style={{ height: `${h}px`, background: 'rgba(236,72,153,0.4)', animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              )}
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-bold text-center leading-snug">{question.question}</h2>

          <div className="flex items-center justify-center gap-1.5 mt-3">
            {[1, 2, 3].map(lvl => {
              const active = question.difficulty === 'easy' ? lvl <= 1 : question.difficulty === 'medium' ? lvl <= 2 : true;
              const c = question.difficulty === 'easy' ? '#22c55e' : question.difficulty === 'medium' ? '#eab308' : '#ef4444';
              return <div key={lvl} className="w-2.5 h-2.5 rounded-full" style={{ background: active ? c : 'rgba(255,255,255,0.1)' }} />;
            })}
            <span className="text-xs text-white/30 ml-2 capitalize">{question.difficulty}</span>
          </div>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {(question.shuffledOptions || question.options).map((opt: string, idx: number) => {
            const isCorrect = opt === question.answer;
            const _isWrong = hasAnswered && opt !== question.answer;
            void _isWrong;

            return (
              <button key={idx}
                onClick={() => handleAnswer(opt)}
                disabled={hasAnswered}
                className="p-4 rounded-xl text-left transition-all duration-300"
                style={{
                  background: hasAnswered && isCorrect ? 'rgba(34,197,94,0.15)' : hasAnswered && !isCorrect ? 'rgba(239,68,68,0.1)' : hasAnswered ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.05)',
                  border: hasAnswered && isCorrect ? '2px solid #22c55e' : hasAnswered && !isCorrect ? '2px solid rgba(239,68,68,0.3)' : hasAnswered ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(255,255,255,0.1)',
                  opacity: hasAnswered && !isCorrect ? 0.5 : 1,
                  cursor: hasAnswered ? 'default' : 'pointer',
                  transform: !hasAnswered ? 'translateY(0)' : 'translateY(0)',
                }}
                onMouseEnter={e => {
                  if (!hasAnswered) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.2)';
                  }
                }}
                onMouseLeave={e => {
                  if (!hasAnswered) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)';
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: hasAnswered && isCorrect ? 'rgba(34,197,94,0.25)' : hasAnswered && !isCorrect ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
                      color: hasAnswered && isCorrect ? '#22c55e' : hasAnswered && !isCorrect ? '#ef4444' : 'rgba(255,255,255,0.5)',
                      fontSize: hasAnswered ? '1.1rem' : '0.875rem',
                    }}>
                    {hasAnswered && isCorrect ? '✓' : hasAnswered && !isCorrect ? '✗' : String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-medium"
                    style={{
                      color: hasAnswered && isCorrect ? '#22c55e' : hasAnswered && !isCorrect ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.8)',
                      textDecoration: hasAnswered && !isCorrect ? 'line-through' : 'none',
                    }}>
                    {opt}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          {!hasAnswered && (
            <button className="flex-1 py-3 rounded-xl font-semibold text-white/60 flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => { setHasAnswered(true); onReveal(); }}>
              <Eye className="w-4 h-4" /> Skip & Reveal
            </button>
          )}
          {hasAnswered && roundNumber < totalRounds && (
            <button className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 4px 15px rgba(168,85,247,0.3)' }}
              onClick={onNext}>
              Next Question <SkipForward className="w-5 h-5" />
            </button>
          )}
          {hasAnswered && roundNumber >= totalRounds && (
            <button className="flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 4px 15px rgba(168,85,247,0.3)' }}
              onClick={onEnd}>
              🏆 See Final Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== REVEAL SCREEN ====================
const RevealScreen: React.FC<{
  question: GameContent;
  isCorrect: boolean;
  roundNumber: number;
  totalRounds: number;
  scores: { players: Player[]; teams: Team[]; mode: GameMode };
  onNext: () => void;
  onEnd: () => void;
}> = ({ question, isCorrect, roundNumber, totalRounds, scores, onNext, onEnd }) => {
  const progress = (roundNumber / totalRounds) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl w-full">
        <div className="w-full h-1.5 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #a855f7, #ec4899)' }} />
        </div>

        <div className="rounded-2xl p-8 text-center mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-7xl mb-4">{isCorrect ? '🎉' : '😅'}</div>
          <h2 className="text-3xl font-black mb-2" style={{ color: isCorrect ? '#22c55e' : '#ef4444' }}>
            {isCorrect ? 'CORRECT!' : 'WRONG!'}
          </h2>

          {isCorrect && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="text-xl font-bold text-yellow-400">+{question.points} points!</span>
              <Star className="w-5 h-5 text-yellow-400" />
            </div>
          )}

          <div className="p-4 rounded-xl mb-4" style={{ background: isCorrect ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
            <p className="text-sm text-white/40 mb-1">Correct Answer:</p>
            <p className="text-lg font-bold" style={{ color: '#22c55e' }}>{question.answer}</p>
          </div>

          {question.type === 'song-tune' && question.audioHint && (
            <div className="p-3 rounded-xl" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
              <p className="text-xs mb-1" style={{ color: '#ec4899' }}>🎵 Song Hint</p>
              <p className="text-sm text-white/60">{question.audioHint}</p>
            </div>
          )}
        </div>

        {/* Scores */}
        {scores.mode === 'team' && scores.teams.length > 0 && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-sm font-bold text-white/40 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> Team Scores</h3>
            <div className="space-y-2">
              {[...scores.teams].sort((a, b) => b.score - a.score).map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-sm text-white/30 w-6">#{i + 1}</span>
                  <span className="text-xl">{t.emoji}</span>
                  <span className="font-medium flex-1">{t.name}</span>
                  <span className="font-bold text-yellow-400">{t.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {scores.mode === 'individual' && scores.players.length > 0 && (
          <div className="rounded-2xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="text-sm font-bold text-white/40 mb-3 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-400" /> Player Scores</h3>
            <div className="space-y-2">
              {[...scores.players].sort((a, b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-sm text-white/30 w-6">#{i + 1}</span>
                  <span>👤</span>
                  <span className="font-medium flex-1">{p.name}</span>
                  <span className="font-bold text-purple-400">{p.score} pts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {roundNumber < totalRounds ? (
          <button className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            onClick={onNext}>
            Next Question <ArrowLeft className="w-5 h-5" style={{ transform: 'rotate(180deg)' }} />
          </button>
        ) : (
          <button className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            onClick={onEnd}>
            🏆 See Final Results
          </button>
        )}
      </div>
    </div>
  );
};

// ==================== SCOREBOARD ====================
const Scoreboard: React.FC<{
  scores: { players: Player[]; teams: Team[]; mode: GameMode };
  rounds: number;
  timePerQ: number;
  onPlayAgain: () => void;
  onNewSetup: () => void;
  onHome: () => void;
}> = ({ scores, rounds, timePerQ, onPlayAgain, onNewSetup, onHome }) => {
  const totalScore = scores.mode === 'team'
    ? scores.teams.reduce((s, t) => s + t.score, 0)
    : scores.players.reduce((s, p) => s + p.score, 0);

  const winner = scores.mode === 'team'
    ? [...scores.teams].sort((a, b) => b.score - a.score)[0]
    : scores.players.length > 0 ? [...scores.players].sort((a, b) => b.score - a.score)[0] : null;

  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl w-full">
        {winner && (
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">🏆</div>
            <h1 className="text-4xl sm:text-5xl font-black mb-2">
              <GradientText>{'name' in winner ? winner.name : 'Team'} Wins!</GradientText>
            </h1>
            <p className="text-white/40">{'emoji' in winner ? `${(winner as any).emoji}` : '👤'} The champion!</p>
          </div>
        )}

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Final Scores</h2>
            <span className="text-sm text-white/40">Total: {totalScore} pts</span>
          </div>

          {scores.mode === 'team' ? (
            <div className="space-y-3">
              {[...scores.teams].sort((a, b) => b.score - a.score).map((team, idx) => (
                <div key={team.id} className="p-4 rounded-xl flex items-center gap-4" style={{
                  background: idx === 0 ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                  border: idx === 0 ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span className="text-2xl w-10 text-center">{medal(idx)}</span>
                  <span className="text-3xl">{team.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold">{team.name}</p>
                    <div className="mt-1 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                      <div className="h-full rounded-full" style={{ width: `${scores.teams[0]?.score ? (team.score / scores.teams[0].score) * 100 : 0}%`, background: team.color }} />
                    </div>
                  </div>
                  <p className="font-bold text-xl" style={{ color: team.color }}>{team.score}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {scores.players.length > 0 ? [...scores.players].sort((a, b) => b.score - a.score).map((p, idx) => (
                <div key={p.id} className="p-4 rounded-xl flex items-center gap-4" style={{
                  background: idx === 0 ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                  border: idx === 0 ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.05)',
                }}>
                  <span className="text-2xl w-10 text-center">{medal(idx)}</span>
                  <span className="text-xl">👤</span>
                  <div className="flex-1">
                    <p className="font-bold">{p.name}</p>
                    {p.bestStreak >= 2 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>🔥 Best: {p.bestStreak}</span>}
                  </div>
                  <p className="font-bold text-xl text-purple-400">{p.score}</p>
                </div>
              )) : (
                <div className="text-center py-8">
                  <Star className="w-12 h-12 mx-auto mb-3 text-white/20" />
                  <p className="text-white/40">Scores tracked anonymously</p>
                  <p className="text-sm text-white/20 mt-1">Total: {totalScore} pts</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { n: rounds, label: 'Rounds', color: '#a855f7' },
            { n: totalScore, label: 'Total Points', color: '#ec4899' },
            { n: `${timePerQ}s`, label: 'Per Question', color: '#22c55e' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.n}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <button className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            onClick={onPlayAgain}>
            <RotateCcw className="w-5 h-5" /> Play Again
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="py-3 rounded-xl font-semibold text-white/60 flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={onNewSetup}>
              <Users className="w-4 h-4" /> New Setup
            </button>
            <button className="py-3 rounded-xl font-semibold text-white/60 flex items-center justify-center gap-2 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={onHome}>
              <Home className="w-4 h-4" /> Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('home');
  // Content is read directly from localStorage when needed
  const [gameSettings, setGameSettings] = useState<any>(null);
  const [gameState, setGameState] = useState({
    players: [] as Player[],
    teams: [] as Team[],
    questions: [] as (GameContent & { shuffledOptions?: string[] })[],
    currentIdx: 0,
    currentQuestion: null as GameContent | null,
    selectedAnswer: null as string | null,
    isCorrect: null as boolean | null,
    isRevealed: false,
  });
  const [gameStats, setGameStats] = useState(loadStats);

  const navigate = (s: GameScreen) => setScreen(s);

  const startGame = (settings: any) => {
    setGameSettings(settings);
    const latestContent = loadContent();
    const filtered = latestContent.filter((c: GameContent) => settings.categories.includes(c.type));
    const shuffled = shuffle(filtered).slice(0, settings.rounds);
    const questions = shuffled.map(q => ({
      ...q,
      shuffledOptions: shuffle(q.options),
    }));

    if (questions.length === 0) {
      alert('No content available! Add some in Admin first.');
      return;
    }

    setGameState({
      players: settings.players || [],
      teams: settings.teams || [],
      questions,
      currentIdx: 0,
      currentQuestion: questions[0],
      selectedAnswer: null,
      isCorrect: null,
      isRevealed: false,
    });
    setScreen('lobby');
  };

  const handleStartGame = () => {
    setScreen('playing');
  };

  const handleAnswer = (answer: string) => {
    const q = gameState.currentQuestion;
    if (!q) return;
    const correct = answer === q.answer;
    const pts = correct ? q.points : 0;

    const updatedPlayers = gameState.players.map((p: Player) => ({
      ...p,
      score: p.score + (correct ? pts : 0),
      streak: correct ? p.streak + 1 : 0,
      bestStreak: correct ? Math.max(p.bestStreak, p.streak + 1) : p.bestStreak,
      correctAnswers: correct ? p.correctAnswers + 1 : p.correctAnswers,
      totalAnswers: p.totalAnswers + 1,
    }));

    const updatedTeams = gameState.teams.map((t: Team) => ({
      ...t,
      score: t.score + (correct ? pts : 0),
    }));

    setGameState(prev => ({
      ...prev,
      selectedAnswer: answer,
      isCorrect: correct,
      players: updatedPlayers,
      teams: updatedTeams,
    }));
  };

  const handleReveal = () => {
    setGameState(prev => ({ ...prev, isRevealed: true }));
    setScreen('reveal');
  };

  const handleNext = () => {
    const nextIdx = gameState.currentIdx + 1;
    if (nextIdx >= gameState.questions.length) {
      handleEnd();
      return;
    }
    setGameState(prev => ({
      ...prev,
      currentIdx: nextIdx,
      currentQuestion: prev.questions[nextIdx],
      selectedAnswer: null,
      isCorrect: null,
      isRevealed: false,
    }));
    setScreen('playing');
  };

  const handleEnd = () => {
    const stats = loadStats();
    stats.gamesPlayed += 1;
    stats.lastPlayed = new Date().toISOString();
    saveStats(stats);
    setGameStats(stats);
    setScreen('scoreboard');
  };

  const handlePlayAgain = () => {
    setGameState(prev => ({
      ...prev,
      currentIdx: 0,
      currentQuestion: prev.questions[0],
      selectedAnswer: null,
      isCorrect: null,
      isRevealed: false,
      players: prev.players.map((p: Player) => ({ ...p, score: 0, streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0 })),
      teams: prev.teams.map((t: Team) => ({ ...t, score: 0 })),
    }));
    setScreen('lobby');
  };

  const handleNewSetup = () => {
    setGameState({
      players: [],
      teams: [],
      questions: [],
      currentIdx: 0,
      currentQuestion: null,
      selectedAnswer: null,
      isCorrect: null,
      isRevealed: false,
    });
    setScreen('setup');
  };

  const handleHome = () => {
    setScreen('home');
  };

  const totalContent = loadContent().length;

  return (
    <AnimatedBg>
      {screen === 'home' && (
        <HomeScreen onNavigate={navigate} stats={{ total: totalContent, games: gameStats.gamesPlayed }} />
      )}
      {screen === 'admin' && (
        <AdminScreen onBack={() => navigate('home')} />
      )}
      {screen === 'setup' && (
        <GameSetup onBack={() => navigate('home')} onStart={startGame} />
      )}
      {screen === 'lobby' && gameSettings && (
        <GameLobby settings={gameSettings} onStart={handleStartGame} onBack={() => navigate('setup')} />
      )}
      {screen === 'playing' && gameState.currentQuestion && (
        <GamePlay
          question={gameState.currentQuestion}
          roundNumber={gameState.currentIdx + 1}
          totalRounds={gameState.questions.length}
          timePerQ={gameSettings?.timePerQ || 30}
          onAnswer={handleAnswer}
          onReveal={handleReveal}
          onNext={handleNext}
          onEnd={handleEnd}
          scores={{ players: gameState.players, teams: gameState.teams, mode: gameSettings?.mode || 'individual' }}
        />
      )}
      {screen === 'reveal' && gameState.currentQuestion && (
        <RevealScreen
          question={gameState.currentQuestion}
          isCorrect={gameState.isCorrect || false}
          roundNumber={gameState.currentIdx + 1}
          totalRounds={gameState.questions.length}
          scores={{ players: gameState.players, teams: gameState.teams, mode: gameSettings?.mode || 'individual' }}
          onNext={handleNext}
          onEnd={handleEnd}
        />
      )}
      {screen === 'scoreboard' && (
        <Scoreboard
          scores={{ players: gameState.players, teams: gameState.teams, mode: gameSettings?.mode || 'individual' }}
          rounds={gameSettings?.rounds || 5}
          timePerQ={gameSettings?.timePerQ || 30}
          onPlayAgain={handlePlayAgain}
          onNewSetup={handleNewSetup}
          onHome={handleHome}
        />
      )}
    </AnimatedBg>
  );
};

export default App;
