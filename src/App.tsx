import React, { useState, useEffect, useRef } from 'react';
import {
  Gamepad2, Settings, Trophy, Music, Film, MessageSquare,
  Zap, Users, ArrowLeft, Plus, Edit2, Trash2, Save, X, Upload,
  Search, User, Clock, Check, Play, Eye, RotateCcw,
  Home, Star, LogOut, Mic, Video, Image, FileQuestion
} from 'lucide-react';

// ==================== TYPES ====================
type ContentType = 'meme-dialogue' | 'song-tune' | 'movie-meme';
type GameMode = 'individual' | 'team';
type GameScreen = 'loading' | 'home' | 'admin' | 'setup' | 'lobby' | 'playing' | 'reveal' | 'scoreboard';
type QuestionType = 'multiple-choice' | 'open-ended';

interface GameContent {
  id: string;
  type: ContentType;
  questionType: QuestionType;
  question: string;
  answer: string;
  options?: string[];
  imageUrl?: string;
  imageData?: string;
  videoUrl?: string;
  videoData?: string;
  audioUrl?: string;
  audioData?: string;
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

// Start with an empty content library. Admins add all questions/media themselves.
const SAMPLE_CONTENT: GameContent[] = [];

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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

// ==================== ANIMATED BACKGROUND ====================
const AnimatedBg: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative min-h-screen" style={{ background: '#0a0a1a', color: '#ffffff', fontFamily: 'system-ui, sans-serif', overflow: 'hidden' }}>
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

const GradientText: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <span
    className={className}
    style={{
      background: 'linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
    }}
  >
    {children}
  </span>
);

const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false, onConfirm, onCancel }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl" style={{ background: 'rgba(18,18,42,0.96)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: destructive ? 'rgba(239,68,68,0.15)' : 'rgba(168,85,247,0.18)' }}>
          {destructive ? <LogOut className="w-7 h-7 text-red-400" /> : <Check className="w-7 h-7 text-purple-400" />}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-white/50 mb-6">{message}</p>
        <div className="grid grid-cols-2 gap-3">
          <button className="py-3 rounded-xl font-semibold text-white/60" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="py-3 rounded-xl font-bold text-white" style={{ background: destructive ? 'linear-gradient(135deg, #ef4444, #f97316)' : 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
</div>
   );
 };

// ==================== ALERT MODAL ====================
const AlertModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  onOk: () => void;
}> = ({ open, title, message, onOk }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl" style={{ background: 'rgba(18,18,42,0.96)', border: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.18)' }}>
          <Star className="w-7 h-7 text-purple-400" />
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-sm text-white/50 mb-6">{message}</p>
        <button className="w-full py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={onOk}>
          Got it
        </button>
      </div>
    </div>
  );
};

// ==================== LOADING SCREEN ====================
const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [logoBounce, setLogoBounce] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 500);
          return 100;
        }
        return p + 2;
      });
    }, 30);

    const bounceTimer = setInterval(() => {
      setLogoBounce(b => !b);
    }, 600);

    return () => {
      clearInterval(timer);
      clearInterval(bounceTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: '#0a0a1a' }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse at 50% 50%, rgba(168,85,247,0.2) 0%, transparent 60%),
          radial-gradient(ellipse at 30% 70%, rgba(236,72,153,0.15) 0%, transparent 50%),
          #0a0a1a
        `
      }} />

      <div className="text-center relative z-10">
        <div className="mb-8" style={{ transform: logoBounce ? 'scale(1.05)' : 'scale(1)', transition: 'transform 0.6s ease' }}>
          <div className="relative inline-block">
            <div className="text-8xl sm:text-9xl font-black mb-2">
              <span style={{
                background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>G</span>
              <span style={{
                background: 'linear-gradient(135deg, #ec4899, #3b82f6)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>V</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-sm text-white/40 tracking-widest">
              GAMEVERSE
            </div>
          </div>
        </div>

        <div className="w-64 sm:w-80 mx-auto mb-4">
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #a855f7, #ec4899, #3b82f6)',
                boxShadow: `0 0 20px rgba(168,85,247,${0.3 + (progress / 200)})`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-white/30 mt-2">
            <span>Loading</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full"
              style={{ background: '#a855f7', animation: 'pulse 1s ease infinite', animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }`}</style>
      </div>
    </div>
  );
};

// ==================== TYPEWRITER TEXT ====================
const TypewriterText: React.FC<{ words: string[]; interval: number }> = ({ words, interval }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentWord = words[currentIndex];
      
      if (isDeleting) {
        setDisplayedText(currentWord.substring(0, displayedText.length - 1));
        if (displayedText.length === 0) {
          setIsDeleting(false);
          setCurrentIndex((currentIndex + 1) % words.length);
        }
      } else {
        setDisplayedText(currentWord.substring(0, displayedText.length + 1));
        if (displayedText.length === currentWord.length) {
          setTimeout(() => setIsDeleting(true), 1000);
        }
      }
    }, isDeleting ? 100 : 150);

    return () => clearTimeout(timer);
  }, [displayedText, currentIndex, isDeleting, words, interval]);

  useEffect(() => {
    const cycleTimer = setTimeout(() => {
      if (displayedText.length === words[currentIndex].length && !isDeleting) {
        setTimeout(() => setIsDeleting(true), 1000);
      }
    }, interval);
    return () => clearTimeout(cycleTimer);
  }, [currentIndex, displayedText, isDeleting, words, interval]);

  return (
    <span
      style={{
        background: 'linear-gradient(135deg, #a855f7, #ec4899)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        display: 'inline-block',
        fontFamily: 'monospace',
      }}
    >
      {displayedText}
      <span style={{ opacity: 0.7, animation: 'blink 1s infinite' }}>|</span>
    </span>
  );
};

// ==================== HOME SCREEN ====================
const HomeScreen: React.FC<{ onNavigate: (s: GameScreen) => void; stats: { total: number; games: number } }> = ({ onNavigate, stats }) => {
  const words = ['Game', 'Meme', 'Guess'];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative">
      {/* Corner Admin Button */}
      <button
        onClick={() => onNavigate('admin')}
        className="absolute top-6 right-6 p-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-transform z-50 shadow-lg"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}
      >
        <Settings className="w-5 h-5 text-white/70" />
        <span className="text-sm font-medium text-white/70 hidden sm:block">Admin</span>
      </button>

      {[
        { e: '🎮', style: { top: '12%', left: '5%' } },
        { e: '🎵', style: { top: '25%', right: '10%' } },
        { e: '🎬', style: { bottom: '25%', left: '10%' } },
        { e: '😂', style: { bottom: '12%', right: '5%' } },
        { e: '🏆', style: { top: '15%', left: '15%' } },
        { e: '⭐', style: { bottom: '20%', right: '15%' } },
      ].map((item, i) => (
        <div key={i} className="absolute text-4xl sm:text-5xl opacity-10"
          style={{ ...item.style, animation: `float 6s ease-in-out infinite`, animationDelay: `${i * 0.5}s` }}>
          {item.e}
        </div>
      ))}

      <div className="text-center mb-12">
        <h1 className="text-5xl sm:text-7xl font-black mb-3">
          <TypewriterText words={words} interval={2500} />
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginLeft: '0.5rem',
          }}>
            Verse
          </span>
        </h1>
        <p className="text-lg text-white/50 max-w-md mx-auto font-light">
          The Ultimate Social Gaming Arena — Host, Play & Dominate!
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-10">
        {[
          { icon: <Gamepad2 className="w-7 h-7" style={{ color: '#a855f7' }} />, title: 'Play Game', desc: 'Start a new game session', action: () => onNavigate('setup') },
          { icon: <Trophy className="w-7 h-7" style={{ color: '#22c55e' }} />, title: 'Scoreboard', desc: 'View scores & leaders', action: () => onNavigate('scoreboard') },
        ].map((item, i) => (
          <div key={i} onClick={item.action} className="rounded-2xl p-6 text-center cursor-pointer hover:-translate-y-2 transition-all duration-300"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
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

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(10deg); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
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
    questionType: 'multiple-choice' as QuestionType,
    question: '',
    answer: '',
    options: ['', '', '', ''],
    imageData: '' as string,
    videoData: '' as string,
    audioData: '' as string,
    audioHint: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 20,
  });

  const [uploading, setUploading] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GameContent | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  const showAlert = (title: string, message: string) => setAlertInfo({ open: true, title, message });

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
      showAlert('Missing fields', 'Please fill in question and answer!');
      return;
    }

    if (form.questionType === 'multiple-choice') {
      const cleanOpts = form.options.filter(o => o.trim());
      if (cleanOpts.length < 2) {
        showAlert('Not enough options', 'At least 2 options required for multiple choice!');
        return;
      }
      if (!cleanOpts.includes(form.answer)) {
        showAlert('Invalid answer', 'Answer must be one of the options!');
        return;
      }
    }

    const newItem: GameContent = {
      id: editId || Date.now().toString(),
      type: form.type,
      questionType: form.questionType,
      question: form.question,
      answer: form.answer,
      options: form.questionType === 'multiple-choice' ? form.options.filter(o => o.trim()) : undefined,
      imageData: form.imageData || undefined,
      videoData: form.videoData || undefined,
      audioData: form.audioData || undefined,
      audioHint: form.audioHint || undefined,
      difficulty: form.difficulty,
      points: form.points,
    };

    if (editId) {
      save(content.map(c => c.id === editId ? newItem : c));
    } else {
      save([newItem, ...content]);
    }
    setForm({ type: 'meme-dialogue', questionType: 'multiple-choice', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', difficulty: 'medium', points: 20 });
    setShowForm(false);
    setEditId(null);
  };

  const startEdit = (item: GameContent) => {
    setEditId(item.id);
    setForm({
      type: item.type,
      questionType: item.questionType || 'multiple-choice',
      question: item.question,
      answer: item.answer,
      options: item.options ? [...item.options, '', '', '', ''].slice(0, 4) : ['', '', '', ''],
      imageData: item.imageData || '',
      videoData: item.videoData || '',
      audioData: item.audioData || '',
      audioHint: item.audioHint || '',
      difficulty: item.difficulty,
      points: item.points,
    });
    setShowForm(true);
  };

  const handleFileUpload = async (type: 'image' | 'video' | 'audio', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = type === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      showAlert('File too large', `Max ${type === 'image' ? '5MB' : '10MB'} allowed.`);
      return;
    }
    setUploading(type);
    try {
      const base64 = await fileToBase64(file);
      if (type === 'image') setForm(f => ({ ...f, imageData: base64 }));
      if (type === 'video') setForm(f => ({ ...f, videoData: base64 }));
      if (type === 'audio') setForm(f => ({ ...f, audioData: base64 }));
    } catch (err) {
      setAlertInfo({ open: true, title: 'Upload failed', message: 'Could not process the file.' });
    }
    setUploading(null);
  };

  const diffColor = (d: string) => d === 'easy' ? '#22c55e' : d === 'medium' ? '#eab308' : '#ef4444';
  const typeEmoji = (t: string) => t === 'meme-dialogue' ? '💬' : t === 'song-tune' ? '🎵' : '🎬';
  const typeLabel = (t: string) => t === 'meme-dialogue' ? 'Meme' : t === 'song-tune' ? 'Song' : 'Movie';

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6">
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete content?"
        message={deleteTarget ? `This will permanently remove: ${deleteTarget.question}` : ''}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) save(content.filter(c => c.id !== deleteTarget.id));
          setDeleteTarget(null);
        }}
      >
      </ConfirmModal>
      <AlertModal open={alertInfo.open} title={alertInfo.title} message={alertInfo.message} onOk={() => setAlertInfo({ open: false, title: '', message: '' })} />
      <div className="max-w-4xl mx-auto">
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
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white border-0 cursor-pointer transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
            onClick={() => { setShowForm(true); setEditId(null); setForm({ type: 'meme-dialogue', questionType: 'multiple-choice', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', difficulty: 'medium', points: 20 }); }}
          >
            <Plus className="w-5 h-5" /> Add Content
          </button>
        </div>

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

        {showForm && (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{editId ? 'Edit Content' : 'Add New Content'}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="text-sm text-white/60 mb-1 block">Type</label>
                <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ContentType })}>
                  <option value="meme-dialogue" style={{ background: '#1a1a2e' }}>💬 Meme Dialogue</option>
                  <option value="song-tune" style={{ background: '#1a1a2e' }}>🎵 Song Tune</option>
                  <option value="movie-meme" style={{ background: '#1a1a2e' }}>🎬 Movie Meme</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Question Type</label>
                <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  value={form.questionType} onChange={e => setForm({ ...form, questionType: e.target.value as QuestionType })}>
                  <option value="multiple-choice" style={{ background: '#1a1a2e' }}>📋 Multiple Choice</option>
                  <option value="open-ended" style={{ background: '#1a1a2e' }}>✍️ Open Ended</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1 block">Difficulty</label>
                <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  value={form.difficulty} onChange={e => {
                    const d = e.target.value as 'easy' | 'medium' | 'hard';
                    setForm({ ...form, difficulty: d, points: d === 'easy' ? 10 : d === 'medium' ? 20 : 30 });
                  }}>
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
                placeholder="Enter your question..." value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} />
            </div>

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-1 block">Correct Answer</label>
              <input className="w-full rounded-xl px-4 py-3 text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="The correct answer" value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} />
            </div>

            {form.questionType === 'multiple-choice' && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-1 block">Options (include the correct answer)</label>
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-white/30 w-5">{i + 1}.</span>
                    <input className="flex-1 rounded-xl px-4 py-2.5 text-white outline-none text-sm"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      placeholder={`Option ${i + 1}`} value={opt} onChange={e => {
                        const opts = [...form.options];
                        opts[i] = e.target.value;
                        setForm({ ...form, options: opts });
                      }} />
                    <button className={`text-xs px-3 py-1.5 rounded-lg transition-all ${form.answer === opt ? 'text-green-400 font-bold' : 'text-white/30'}`}
                      style={{ background: form.answer === opt ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)' }}
                      onClick={() => setForm({ ...form, answer: opt })}>
                      {form.answer === opt ? '✓ Answer' : 'Set Answer'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4">
              <label className="text-sm text-white/60 mb-2 block">Upload Media (Optional)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Image className="w-6 h-6 mx-auto mb-2" style={{ color: '#a855f7' }} />
                  <p className="text-xs text-white/40 mb-2">Image (max 5MB)</p>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                    <Upload className="w-3 h-3" /> {form.imageData ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/*" onChange={e => handleFileUpload('image', e)} className="hidden" />
                  </label>
                  {form.imageData && (
                    <div className="mt-2">
                      <img src={form.imageData} alt="preview" className="w-full h-20 object-cover rounded-lg" />
                      <button onClick={() => setForm(f => ({ ...f, imageData: '' }))} className="text-xs text-red-400 mt-1">Remove</button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Video className="w-6 h-6 mx-auto mb-2" style={{ color: '#ec4899' }} />
                  <p className="text-xs text-white/40 mb-2">Video (max 10MB)</p>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
                    <Upload className="w-3 h-3" /> {form.videoData ? 'Replace' : 'Upload'}
                    <input type="file" accept="video/*" onChange={e => handleFileUpload('video', e)} className="hidden" />
                  </label>
                  {form.videoData && (
                    <div className="mt-2">
                      <video src={form.videoData} className="w-full h-20 object-cover rounded-lg" />
                      <button onClick={() => setForm(f => ({ ...f, videoData: '' }))} className="text-xs text-red-400 mt-1">Remove</button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <Mic className="w-6 h-6 mx-auto mb-2" style={{ color: '#06b6d4' }} />
                  <p className="text-xs text-white/40 mb-2">Audio (max 10MB)</p>
                  <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                    <Upload className="w-3 h-3" /> {form.audioData ? 'Replace' : 'Upload'}
                    <input type="file" accept="audio/*" onChange={e => handleFileUpload('audio', e)} className="hidden" />
                  </label>
                  {form.audioData && (
                    <div className="mt-2">
                      <audio src={form.audioData} controls className="w-full" />
                      <button onClick={() => setForm(f => ({ ...f, audioData: '' }))} className="text-xs text-red-400 mt-1">Remove</button>
                    </div>
                  )}
                </div>
              </div>
              {uploading && <p className="text-xs text-white/40 mt-2 text-center">Uploading {uploading}... Please wait</p>}
            </div>

            {form.type === 'song-tune' && (
              <div className="mb-4">
                <label className="text-sm text-white/60 mb-1 block flex items-center gap-2"><Music className="w-4 h-4" /> Audio Hint / Lyrics</label>
                <textarea className="w-full rounded-xl px-4 py-3 text-white outline-none" rows={2}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  placeholder="Describe the tune or provide lyrics..." value={form.audioHint || ''} onChange={e => setForm({ ...form, audioHint: e.target.value })} />
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button className="px-5 py-2.5 rounded-xl font-semibold cursor-pointer transition-all hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.08)', color: 'white' }}
                onClick={() => { setShowForm(false); setEditId(null); }}>
                Cancel
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white cursor-pointer transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                onClick={handleSubmit}>
                <Save className="w-4 h-4" /> {editId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input className="w-full rounded-xl pl-10 pr-4 py-3 text-white outline-none text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'meme-dialogue', label: '💬 Memes' },
              { key: 'song-tune', label: '🎵 Songs' },
              { key: 'movie-meme', label: '🎬 Movies' },
            ].map(f => (
              <button key={f.key} className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: filter === f.key ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                  border: filter === f.key ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: filter === f.key ? 'white' : 'rgba(255,255,255,0.4)',
                }}
                onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-white/40">No content found. Add your first question!</p>
            </div>
          ) : filtered.map(item => (
            <div key={item.id} className="rounded-2xl p-4 flex items-start gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: item.type === 'meme-dialogue' ? 'rgba(168,85,247,0.15)' : item.type === 'song-tune' ? 'rgba(236,72,153,0.15)' : 'rgba(6,182,212,0.15)' }}>
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
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: item.questionType === 'multiple-choice' ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)', color: item.questionType === 'multiple-choice' ? '#3b82f6' : '#22c55e' }}>
                    {item.questionType === 'multiple-choice' ? '📋 MC' : '✍️ Open'}
                  </span>
                </div>
                <p className="text-sm font-medium truncate">{item.question}</p>
                <p className="text-xs text-white/30 mt-1">Answer: <span style={{ color: '#22c55e' }}>{item.answer}</span></p>
                <div className="flex items-center gap-2 mt-2">
                  {item.imageData && <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">🖼️ Image</span>}
                  {item.videoData && <span className="text-xs px-2 py-0.5 rounded bg-pink-500/20 text-pink-400">🎬 Video</span>}
                  {item.audioData && <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400">🎵 Audio</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => startEdit(item)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <Edit2 className="w-4 h-4 text-white/40" />
                </button>
                <button onClick={() => setDeleteTarget(item)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-red-500/20" style={{ background: 'rgba(239,68,68,0.1)' }}>
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
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(['multiple-choice', 'open-ended']);
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');

  const toggleCat = (t: ContentType) => {
    if (categories.includes(t) && categories.length <= 1) return;
    setCategories(prev => prev.includes(t) ? prev.filter(c => c !== t) : [...prev, t]);
  };

  const toggleQType = (t: QuestionType) => {
    if (questionTypes.includes(t) && questionTypes.length <= 1) return;
    setQuestionTypes(prev => prev.includes(t) ? prev.filter(q => q !== t) : [...prev, t]);
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
    let finalPlayers = [...players];
    if (mode === 'individual' && finalPlayers.length === 0) {
      finalPlayers = [{ id: 'anon', name: 'Group Score', score: 0, streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0 }];
    }
    onStart({ mode, teams, players: finalPlayers, rounds, timePerQ, categories, questionTypes });
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

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Gamepad2 className="w-5 h-5" style={{ color: '#a855f7' }} /> Game Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { m: 'individual' as GameMode, icon: <User className="w-8 h-8" />, label: 'Individual', desc: 'Everyone plays solo', color: '#a855f7' },
              { m: 'team' as GameMode, icon: <Users className="w-8 h-8" />, label: 'Team Play', desc: 'Compete as teams', color: '#ec4899' },
            ].map(item => (
              <button key={item.m} className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all"
                style={{
                  borderColor: mode === item.m ? item.color : 'rgba(255,255,255,0.1)',
                  background: mode === item.m ? `${item.color}15` : 'transparent',
                }}
                onClick={() => setMode(item.m)}>
                <div style={{ color: mode === item.m ? item.color : 'rgba(255,255,255,0.3)' }}>{item.icon}</div>
                <span className="font-semibold">{item.label}</span>
                <span className="text-xs text-white/40">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><MessageSquare className="w-5 h-5" style={{ color: '#06b6d4' }} /> Categories</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { type: 'meme-dialogue' as ContentType, emoji: '💬', label: 'Meme Dialogues', color: '#a855f7' },
              { type: 'song-tune' as ContentType, emoji: '🎵', label: 'Song Tunes', color: '#ec4899' },
              { type: 'movie-meme' as ContentType, emoji: '🎬', label: 'Movie Memes', color: '#06b6d4' },
            ].map(cat => (
              <button key={cat.type} className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 relative transition-all"
                style={{
                  borderColor: categories.includes(cat.type) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)',
                  background: categories.includes(cat.type) ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
                onClick={() => toggleCat(cat.type)}>
                {categories.includes(cat.type) && <Check className="w-4 h-4 absolute top-2 right-2" style={{ color: '#22c55e' }} />}
                <span className="text-2xl">{cat.emoji}</span>
                <span className="font-semibold text-sm text-center">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileQuestion className="w-5 h-5" style={{ color: '#22c55e' }} /> Question Types</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { type: 'multiple-choice' as QuestionType, emoji: '📋', label: 'Multiple Choice', desc: 'Select from options', color: '#3b82f6' },
              { type: 'open-ended' as QuestionType, emoji: '✍️', label: 'Open Ended', desc: 'Host verifies answer', color: '#22c55e' },
            ].map(item => (
              <button key={item.type} className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 relative transition-all"
                style={{
                  borderColor: questionTypes.includes(item.type) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)',
                  background: questionTypes.includes(item.type) ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
                onClick={() => toggleQType(item.type)}>
                {questionTypes.includes(item.type) && <Check className="w-4 h-4 absolute top-2 right-2" style={{ color: '#22c55e' }} />}
                <span className="text-2xl">{item.emoji}</span>
                <span className="font-semibold text-sm">{item.label}</span>
                <span className="text-xs text-white/40">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

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

        {mode === 'team' ? (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="w-5 h-5" style={{ color: '#ec4899' }} /> Teams</h2>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 rounded-xl px-4 py-3 text-white outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="Team name..." value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeam()} />
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
                placeholder="Player name..." value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPlayer()} />
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
              {players.length === 0 && <p className="text-white/30 text-sm text-center py-4">If none added, a single generic Group Score will be tracked.</p>}
            </div>
          </div>
        )}

        <button
          className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.3)' }}
          onClick={handleStart}>
          <Gamepad2 className="w-6 h-6" /> {mode === 'team' ? 'Start Team Battle' : 'Start Game'}
        </button>
      </div>
    </div>
  );
};

// ==================== GAME LOBBY ====================
const GameLobby: React.FC<{ settings: any; onStart: () => void; onBack: () => void }> = ({ settings, onStart, onBack }) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleStart = () => setCountdown(3);

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
          <div style={{ fontSize: '10rem', fontWeight: 900, background: 'linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {settings.players.map((p: Player) => (
                  <div key={p.id} className="p-3 rounded-xl flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-xl">👤</span>
                    <span className="font-medium text-sm">{p.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <button className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.3)' }} onClick={handleStart}>
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
  onReveal: () => void;
  onExit: () => void;
}> = ({ question, roundNumber, totalRounds, timePerQ, onReveal, onExit }) => {
  const [timeLeft, setTimeLeft] = useState(timePerQ);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHasAnswered(false);
    setTimeLeft(timePerQ);
    setShowHint(false);
  }, [question.id, timePerQ]);

  useEffect(() => {
    if (hasAnswered) return;
    if (timeLeft <= 0) {
      setHasAnswered(true);
      onReveal();
      return;
    }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, hasAnswered, onReveal]);

  const progress = ((roundNumber - 1) / totalRounds) * 100;
  const timerPct = (timeLeft / timePerQ) * 100;
  const timerColor = timeLeft > 10 ? '#a855f7' : timeLeft > 5 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - timerPct / 100);

  const typeEmoji = (t: string) => t === 'meme-dialogue' ? '💬' : t === 'song-tune' ? '🎵' : '🎬';
  const typeLabel = (t: string) => t === 'meme-dialogue' ? 'Meme Dialogue' : t === 'song-tune' ? 'Song Tune' : 'Movie Meme';
  const isMC = question.questionType === 'multiple-choice';

  const handleRevealClick = () => {
    if (hasAnswered) return;
    setHasAnswered(true);
    onReveal();
  };

  const handleMCOptionClick = () => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setTimeout(() => onReveal(), 400); // slight delay just for visual feedback
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-4">
      <div className="max-w-2xl w-full mx-auto relative">
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
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: isMC ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)', color: isMC ? '#3b82f6' : '#22c55e' }}>
              {isMC ? '📋 MC' : '✍️ Open'}
            </span>
          </div>
          <button onClick={onExit} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 transition-colors" style={{ background: 'rgba(239,68,68,0.1)' }}>
            <LogOut className="w-4 h-4" /> Exit Game
          </button>
        </div>

        <div className="w-full h-1.5 rounded-full mb-4" style={{ background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #a855f7, #ec4899)' }} />
        </div>

        <div className="flex items-center justify-center mb-4">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
              <circle cx="30" cy="30" r="26" fill="none" stroke={timerColor} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: 'center', transition: 'stroke-dashoffset 1s linear' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xl font-bold" style={{ color: timerColor }}>{timeLeft}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {question.imageData && (
            <div className="mb-4 rounded-xl overflow-hidden flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <img src={question.imageData} alt="question" className="max-w-full max-h-[250px] object-contain" />
            </div>
          )}
          {question.videoData && (
            <div className="mb-4 rounded-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <video src={question.videoData} controls className="w-full max-h-[250px]" />
            </div>
          )}
          {question.audioData && (
            <div className="mb-4 p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.2)' }}><Mic className="w-6 h-6" style={{ color: '#06b6d4' }} /></div>
              <div className="flex-1"><audio src={question.audioData} controls className="w-full" /></div>
            </div>
          )}
          {question.type === 'song-tune' && question.audioHint && (
            <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.15)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🎵</span>
                <span className="text-sm font-semibold" style={{ color: '#ec4899' }}>Audio Clue</span>
                <button onClick={() => setShowHint(!showHint)} className="ml-auto text-xs text-white/40 hover:text-white/60 underline">{showHint ? 'Hide' : 'Show'} Hint</button>
              </div>
              {showHint ? <p className="text-sm text-white/60">{question.audioHint}</p> : <div className="flex items-center gap-1 h-6">{[14, 22, 10, 18, 26, 12, 20].map((h, i) => (<div key={i} className="w-1.5 rounded-full animate-pulse" style={{ height: `${h}px`, background: 'rgba(236,72,153,0.4)', animationDelay: `${i * 0.1}s` }} />))}</div>}
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

        {isMC ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {(question.shuffledOptions || question.options || []).map((opt: string, idx: number) => (
              <button key={idx} onClick={handleMCOptionClick} disabled={hasAnswered}
                className="p-4 rounded-xl text-left transition-all duration-300 hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', cursor: hasAnswered ? 'default' : 'pointer' }}>
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span className="text-sm font-medium text-white/80">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="mb-4 text-center">
            <div className="py-6 px-4 rounded-xl mb-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <p className="text-white/40 mb-1 font-semibold uppercase tracking-wider text-xs">Open Ended Question</p>
              <p className="text-sm text-white/60">Read the question aloud. When they answer, reveal to verify and award points.</p>
            </div>
            <button onClick={handleRevealClick} disabled={hasAnswered} className="w-full py-5 rounded-xl text-xl font-bold text-white transition-all active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.3)' }}>
              <Eye className="w-6 h-6 inline mr-2" /> Reveal Answer
            </button>
          </div>
        )}

        {isMC && !hasAnswered && (
          <button className="w-full py-3 rounded-xl font-semibold text-white/60 flex items-center justify-center gap-2 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={handleRevealClick}>
            <Eye className="w-4 h-4" /> Skip & Reveal
          </button>
        )}
      </div>
    </div>
  );
};

// ==================== REVEAL SCREEN ====================
const RevealScreen: React.FC<{
  question: GameContent;
  roundNumber: number;
  totalRounds: number;
  scores: { players: Player[]; teams: Team[]; mode: GameMode };
  onNext: (winnerId: string | 'nobody') => void;
}> = ({ question, roundNumber, totalRounds, scores, onNext }) => {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const progress = (roundNumber / totalRounds) * 100;
  const entities = scores.mode === 'team' ? scores.teams : scores.players;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="max-w-xl w-full">
        <div className="w-full h-1.5 rounded-full mb-6" style={{ background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #a855f7, #ec4899)' }} />
        </div>

        <div className="rounded-2xl p-6 sm:p-8 text-center mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-5xl mb-4">🎯</div>
          <h2 className="text-xl font-bold mb-3 text-white/60 uppercase tracking-widest">
            The Answer Is
          </h2>

          <div className="p-6 rounded-xl mb-4" style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid rgba(34,197,94,0.4)' }}>
            <p className="text-2xl sm:text-3xl font-black text-green-400">{question.answer}</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="text-xl font-bold text-yellow-400">Worth {question.points} points</span>
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h3 className="text-lg font-bold mb-4">Who gave the right answer?</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {entities.map(e => (
              <button key={e.id} onClick={() => setWinnerId(e.id)}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${winnerId === e.id ? 'border-green-400 bg-green-400/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                <span className="text-2xl">{('emoji' in e) ? (e as Team).emoji : '👤'}</span>
                <span className="font-semibold text-sm truncate w-full px-1">{e.name}</span>
              </button>
            ))}
            <button onClick={() => setWinnerId('nobody')}
              className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${winnerId === 'nobody' ? 'border-red-400 bg-red-400/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
              <span className="text-2xl">❌</span>
              <span className="font-semibold text-sm">Nobody</span>
            </button>
          </div>
        </div>

        <button
          disabled={!winnerId}
          className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            opacity: winnerId ? 1 : 0.4,
            cursor: winnerId ? 'pointer' : 'not-allowed',
            boxShadow: winnerId ? '0 8px 25px rgba(168,85,247,0.3)' : 'none'
          }}
          onClick={() => onNext(winnerId!)}>
          {roundNumber < totalRounds ? 'Next Question' : 'See Final Results'}
        </button>
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
  const totalScore = scores.mode === 'team' ? scores.teams.reduce((s, t) => s + t.score, 0) : scores.players.reduce((s, p) => s + p.score, 0);
  const sorted = scores.mode === 'team' ? [...scores.teams].sort((a, b) => b.score - a.score) : [...scores.players].sort((a, b) => b.score - a.score);
  const winner = sorted.length > 0 ? sorted[0] : null;
  const medal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="max-w-xl w-full">
        {winner && (
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h1 className="text-4xl sm:text-5xl font-black mb-2">
              <GradientText>{winner.name} Wins!</GradientText>
            </h1>
            <p className="text-white/40">{'emoji' in winner ? `${(winner as Team).emoji}` : '👤'} The champion!</p>
          </div>
        )}

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Final Scores</h2>
            <span className="text-sm text-white/40">Total: {totalScore} pts</span>
          </div>

          <div className="space-y-3">
            {sorted.map((item, idx) => (
              <div key={item.id} className="p-4 rounded-xl flex items-center gap-4" style={{ background: idx === 0 ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)', border: idx === 0 ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-2xl w-10 text-center">{medal(idx)}</span>
                <span className="text-3xl">{('emoji' in item) ? (item as Team).emoji : '👤'}</span>
                <div className="flex-1">
                  <p className="font-bold">{item.name}</p>
                  <div className="mt-1 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="h-full rounded-full" style={{ width: `${sorted[0]?.score ? (item.score / sorted[0].score) * 100 : 0}%`, background: ('color' in item) ? (item as Team).color : '#a855f7' }} />
                  </div>
                </div>
                <p className="font-bold text-xl" style={{ color: ('color' in item) ? (item as Team).color : '#a855f7' }}>{item.score}</p>
              </div>
            ))}
          </div>
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
          <button className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={onPlayAgain}>
            <RotateCcw className="w-5 h-5" /> Play Again
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="py-3 rounded-xl font-semibold text-white/60 flex items-center justify-center gap-2 transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={onNewSetup}>
              <Users className="w-4 h-4" /> New Setup
            </button>
            <button className="py-3 rounded-xl font-semibold text-white/60 flex items-center justify-center gap-2 transition-all" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} onClick={onHome}>
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
  const [screen, setScreen] = useState<GameScreen>('loading');
  const [gameSettings, setGameSettings] = useState<any>(null);
  const [gameState, setGameState] = useState({
    players: [] as Player[],
    teams: [] as Team[],
    questions: [] as (GameContent & { shuffledOptions?: string[] })[],
    currentIdx: 0,
    currentQuestion: null as GameContent | null,
  });
  const [gameStats, setGameStats] = useState(loadStats);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const navigate = (s: GameScreen) => setScreen(s);

  const handleStartGame = (settings: any) => {
    setGameSettings(settings);
    const latestContent = loadContent();
    const filtered = latestContent.filter((c: GameContent) =>
      settings.categories.includes(c.type) && settings.questionTypes.includes(c.questionType || 'multiple-choice')
    );
    const shuffled = shuffle(filtered).slice(0, settings.rounds);
    const questions = shuffled.map(q => ({
      ...q, shuffledOptions: q.options ? shuffle(q.options) : undefined,
    }));

    if (questions.length === 0) {
      setAlertInfo({ open: true, title: 'No questions available', message: 'Please add questions in the Admin panel before starting a game.' });
      return;
    }

    setGameState({
      players: settings.players || [],
      teams: settings.teams || [],
      questions,
      currentIdx: 0,
      currentQuestion: questions[0],
    });
    setScreen('lobby');
  };

  const handleReveal = () => setScreen('reveal');

  const handleNext = (winnerId: string | 'nobody') => {
    const q = gameState.currentQuestion;
    const pts = q ? q.points : 0;
    let updatedPlayers = [...gameState.players];
    let updatedTeams = [...gameState.teams];

    if (winnerId !== 'nobody') {
      if (gameSettings.mode === 'team') {
        updatedTeams = updatedTeams.map(t => t.id === winnerId ? { ...t, score: t.score + pts } : t);
      } else {
        updatedPlayers = updatedPlayers.map(p => p.id === winnerId ? { ...p, score: p.score + pts, correctAnswers: p.correctAnswers + 1, streak: p.streak + 1, bestStreak: Math.max(p.bestStreak, p.streak + 1) } : { ...p, streak: 0 });
      }
    } else if (gameSettings.mode !== 'team') {
      updatedPlayers = updatedPlayers.map(p => ({ ...p, streak: 0 }));
    }

    const nextIdx = gameState.currentIdx + 1;
    if (nextIdx >= gameState.questions.length) {
      const stats = loadStats();
      stats.gamesPlayed += 1;
      stats.lastPlayed = new Date().toISOString();
      saveStats(stats);
      setGameStats(stats);
      setGameState(prev => ({ ...prev, players: updatedPlayers, teams: updatedTeams }));
      setScreen('scoreboard');
    } else {
      setGameState(prev => ({
        ...prev, players: updatedPlayers, teams: updatedTeams,
        currentIdx: nextIdx, currentQuestion: prev.questions[nextIdx],
      }));
      setScreen('playing');
    }
  };

  const confirmExitGame = () => {
    setGameState({ players: [], teams: [], questions: [], currentIdx: 0, currentQuestion: null });
    setShowExitConfirm(false);
    setScreen('home');
  };

  const handlePlayAgain = () => {
    setGameState(prev => ({
      ...prev, currentIdx: 0, currentQuestion: prev.questions[0],
      players: prev.players.map((p: Player) => ({ ...p, score: 0, streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0 })),
      teams: prev.teams.map((t: Team) => ({ ...t, score: 0 })),
    }));
    setScreen('lobby');
  };

  const handleNewSetup = () => {
    setGameState({ players: [], teams: [], questions: [], currentIdx: 0, currentQuestion: null });
    setScreen('setup');
  };

  const [alertInfo, setAlertInfo] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  return (
    <AnimatedBg>
      <AlertModal open={alertInfo.open} title={alertInfo.title} message={alertInfo.message} onOk={() => setAlertInfo({ open: false, title: '', message: '' })} />
      <ConfirmModal
        open={showExitConfirm}
        title="Exit game?"
        message="Your current round progress will be lost and you will return to the home screen."
        confirmLabel="Exit"
        destructive
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={confirmExitGame}
      />
      {screen === 'loading' && <LoadingScreen onComplete={() => setScreen('home')} />}
      {screen === 'home' && <HomeScreen onNavigate={navigate} stats={{ total: loadContent().length, games: gameStats.gamesPlayed }} />}
      {screen === 'admin' && <AdminScreen onBack={() => navigate('home')} />}
      {screen === 'setup' && <GameSetup onBack={() => navigate('home')} onStart={handleStartGame} />}
      {screen === 'lobby' && gameSettings && <GameLobby settings={gameSettings} onStart={() => setScreen('playing')} onBack={() => navigate('setup')} />}
      {screen === 'playing' && gameState.currentQuestion && (
        <GamePlay question={gameState.currentQuestion} roundNumber={gameState.currentIdx + 1} totalRounds={gameState.questions.length} timePerQ={gameSettings?.timePerQ || 30} onReveal={handleReveal} onExit={() => setShowExitConfirm(true)} />
      )}
      {screen === 'reveal' && gameState.currentQuestion && (
        <RevealScreen question={gameState.currentQuestion} roundNumber={gameState.currentIdx + 1} totalRounds={gameState.questions.length} scores={{ players: gameState.players, teams: gameState.teams, mode: gameSettings?.mode || 'individual' }} onNext={handleNext} />
      )}
      {screen === 'scoreboard' && (
        <Scoreboard scores={{ players: gameState.players, teams: gameState.teams, mode: gameSettings?.mode || 'individual' }} rounds={gameSettings?.rounds || 5} timePerQ={gameSettings?.timePerQ || 30} onPlayAgain={handlePlayAgain} onNewSetup={handleNewSetup} onHome={() => setScreen('home')} />
      )}
    </AnimatedBg>
  );
};

export default App;
