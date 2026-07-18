import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import logoImg from '../Logo/logo.png';
import {
  ArrowLeft,
  Edit3,
  Film,
  Folder,
  FolderOpen,
  Home,
  Image as ImageIcon,
  LogOut,
  Mic2,
  Music,
  PenLine,
  Plus,
  RotateCcw,
  Search,
  Save,
  Trash2,
  Trophy,
  Upload,
  User,
  Users,
  Video,
  X,
} from 'lucide-react';


// ==================== TYPES ====================
type ContentType = 'meme-dialogue' | 'song-tune' | 'movie-meme';
type GameMode = 'individual' | 'team';
type GameScreen = 'loading' | 'home' | 'admin' | 'admin-login' | 'setup' | 'lobby' | 'playing' | 'reveal' | 'scoreboard';
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
  movie?: string;
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

// ==================== GUESS WHAT LOGO ====================
const GuessWhatLogo: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }> = ({ size = 80, className = '', style }) => (
  <img
    src={logoImg}
    alt="Guess What Logo"
    className={`rounded-2xl object-cover shadow-lg ${className}`}
    style={{ width: size, height: size, ...style }}
  />
);

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

function loadStats() {
  try {
    const d = localStorage.getItem('gv_stats');
    return d ? JSON.parse(d) : { gamesPlayed: 0, lastPlayed: null };
  } catch { return { gamesPlayed: 0, lastPlayed: null }; }
}

function saveStats(s: any) {
  localStorage.setItem('gv_stats', JSON.stringify(s));
}

// Standalone utility to send feedback to Telegram Bot
async function sendFeedbackToTelegram(name: string, category: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const token = (import.meta as any).env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = (import.meta as any).env.VITE_TELEGRAM_CHAT_ID;

    if (!token || !chatId || token === 'placeholder' || chatId === 'placeholder' || !token.trim() || !chatId.trim()) {
      return { 
        success: false, 
        error: 'Telegram bot credentials are not configured in the .env file. Please check VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID.' 
      };
    }

    const cleanName = name.trim() || 'Anonymous';
    const cleanMsg = message.trim();
    const formattedText = `💬 <b>New MemeGame Feedback!</b>\n\n👤 <b>Name:</b> ${cleanName}\n🏷️ <b>Category:</b> ${category}\n📝 <b>Message:</b>\n<i>${cleanMsg}</i>`;

    const response = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text: formattedText,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      return { success: false, error: errData.description || 'API request failed.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error sending Telegram feedback:', err);
    return { success: false, error: err.message || 'Network error occurred.' };
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

function getFileNameFromUrl(url: string | undefined): string | null {
  if (!url || !url.includes('/storage/v1/object/public/game-media/')) return null;
  const parts = url.split('/');
  const lastPart = parts[parts.length - 1];
  return lastPart.split('?')[0];
}

function mapFromDb(dbItem: any): GameContent {
  return {
    id: dbItem.id,
    type: dbItem.type,
    questionType: dbItem.question_type as QuestionType,
    question: dbItem.question,
    answer: dbItem.answer,
    options: dbItem.options || [],
    imageUrl: dbItem.image_url || undefined,
    imageData: dbItem.image_url || undefined,
    videoUrl: dbItem.video_url || undefined,
    videoData: dbItem.video_url || undefined,
    audioUrl: dbItem.audio_url || undefined,
    audioData: dbItem.audio_url || undefined,
    audioHint: dbItem.audio_hint || undefined,
    difficulty: dbItem.difficulty as 'easy' | 'medium' | 'hard',
    points: dbItem.points,
    movie: dbItem.movie || undefined,
  };
}

// ==================== ANIMATED BACKGROUND ====================
const AnimatedBg: React.FC<{ children: React.ReactNode; isDark: boolean }> = ({ children, isDark }) => (
  <div className="relative min-h-screen transition-colors duration-300"
    style={{
      background: isDark ? '#0a0a1a' : '#eef2ff',
      color: isDark ? '#ffffff' : '#0f172a',
      fontFamily: 'system-ui, sans-serif',
      overflow: 'hidden',
      '--bg-color': isDark ? '#0a0a1a' : '#eef2ff',
      '--text-color': isDark ? '#ffffff' : '#0f172a',
      '--text-muted': isDark ? 'rgba(255,255,255,0.5)' : 'rgba(15,23,42,0.65)',
      '--text-very-muted': isDark ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.45)',
      '--card-bg': isDark ? 'rgba(255,255,255,0.05)' : 'rgba(226,232,240,0.95)',
      '--card-border': isDark ? 'rgba(255,255,255,0.1)' : 'rgba(148,163,184,0.16)',
      '--modal-bg': isDark ? 'rgba(18,18,42,0.96)' : 'rgba(241,245,249,0.98)',
      '--input-bg': isDark ? 'rgba(255,255,255,0.06)' : 'rgba(226,232,240,0.88)',
      '--input-border': isDark ? 'rgba(255,255,255,0.12)' : 'rgba(148,163,184,0.28)',
    } as any}>
    <style>{`
      .text-theme-main { color: var(--text-color) !important; }
      .text-theme-muted { color: var(--text-muted) !important; }
      .text-theme-very-muted { color: var(--text-very-muted) !important; }
      .bg-theme-card { background-color: var(--card-bg) !important; }
      .border-theme-card { border-color: var(--card-border) !important; }
      .bg-theme-input { background-color: var(--input-bg) !important; border-color: var(--input-border) !important; }

      /* Override text-white opacity utilities when in light mode */
      ${!isDark ? `
        .text-white\\/30 { color: rgba(15, 23, 42, 0.35) !important; }
        .text-white\\/40 { color: rgba(15, 23, 42, 0.45) !important; }
        .text-white\\/55 { color: rgba(15, 23, 42, 0.55) !important; }
        .text-white\\/60 { color: rgba(15, 23, 42, 0.65) !important; }
        .text-white\\/70 { color: rgba(15, 23, 42, 0.75) !important; }
        .text-white\\/80 { color: rgba(15, 23, 42, 0.85) !important; }
        .text-white { color: #0f172a !important; }
        .bg-white\\/5 { background-color: rgba(0, 0, 0, 0.03) !important; }
        .bg-white\\/10 { background-color: rgba(0, 0, 0, 0.06) !important; }
        .bg-white\\/20 { background-color: rgba(0, 0, 0, 0.1) !important; }
        .bg-white\\/30 { background-color: rgba(0, 0, 0, 0.15) !important; }
        .border-white\\/10 { border-color: rgba(0, 0, 0, 0.08) !important; }
        .border-white\\/12 { border-color: rgba(0, 0, 0, 0.1) !important; }
      ` : ''}
    `}</style>
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
      background: isDark ? `
        radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(236,72,153,0.1) 0%, transparent 50%),
        #0a0a1a
      ` : `
        radial-gradient(ellipse at 20% 50%, rgba(168,85,247,0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.08) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 80%, rgba(236,72,153,0.05) 0%, transparent 50%),
        #f1f5f9
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

const contentIconMap = {
  'meme-dialogue': PenLine,
  'song-tune': Music,
  'movie-meme': Film,
} satisfies Record<ContentType, React.ComponentType<{ className?: string }>>;

const contentAccentMap = {
  'meme-dialogue': '#a855f7',
  'song-tune': '#ec4899',
  'movie-meme': '#06b6d4',
} satisfies Record<ContentType, string>;

const SoftIcon: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ icon: Icon, color = '#a855f7', size = 'md', className = '' }) => {
  const dims = size === 'sm' ? 'w-8 h-8 rounded-lg' : size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-11 h-11 rounded-xl';
  const iconSize = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  return (
    <span
      className={`${dims} inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      <Icon className={iconSize} />
    </span>
  );
};

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
          {destructive ? <span className="text-3xl">🚪</span> : <span className="text-3xl text-purple-400">✓</span>}
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
          <span className="text-3xl text-purple-400">⭐</span>
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
        <div className="mb-6 flex justify-center">
          <GuessWhatLogo
            size={160}
            style={{
              animation: 'logoEntrance 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, logoGlowPulse 3s ease-in-out infinite 1.2s'
            }}
          />
        </div>
        <div className="mb-8">
          <div className="text-3xl font-black tracking-tight text-white mb-2 animate-pulse" style={{ textShadow: '0 2px 10px rgba(168,85,247,0.3)' }}>
            Guess What?
          </div>
          <p className="text-sm text-white/50">
            Can you guess this <TypewriterText words={['meme', 'movie', 'song']} interval={2000} />?
          </p>
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
        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
          @keyframes logoEntrance {
            0% { opacity: 0; transform: scale(0.3) rotate(-15deg); }
            70% { opacity: 0.8; transform: scale(1.1) rotate(3deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @keyframes logoGlowPulse {
            0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 0 15px rgba(168, 85, 247, 0.4)); }
            50% { transform: translateY(-8px) scale(1.03); filter: drop-shadow(0 0 30px rgba(236, 72, 153, 0.7)); }
          }
        `}</style>
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
const HomeScreen: React.FC<{
  onNavigate: (s: GameScreen) => void;
  stats: { total: number; games: number };
  isDark: boolean;
  onToggleTheme: () => void;
}> = ({ onNavigate, stats, isDark, onToggleTheme }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 relative">
      {/* Corner Buttons */}
      <div className="absolute top-6 right-6 flex items-center gap-3 z-50">
        <button
          onClick={() => onNavigate('admin')}
          className="p-3 rounded-xl flex items-center gap-2 hover:scale-105 transition-all shadow-lg cursor-pointer border border-theme-card bg-theme-card"
        >
          <span className="text-xl">⚙️</span>
          <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--text-muted)' }}>Admin</span>
        </button>
      </div>

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
        <div className="flex justify-center mb-4">
          <GuessWhatLogo
            size={110}
            style={{
              animation: 'logoEntrance 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, logoFloat 6s ease-in-out infinite 1s'
            }}
          />
        </div>
        <h1 className="text-5xl sm:text-7xl font-black mb-3 tracking-tight">
          <span style={{
            background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>
            Guess
          </span>
          <span style={{
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginLeft: '0.5rem',
          }}>
            What?
          </span>
        </h1>
        <p className="text-lg max-w-md mx-auto font-light text-white/70">
          Can you guess this <TypewriterText words={['meme', 'movie', 'song']} interval={2500} />?
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl mb-10">
        {[
          { icon: <span className="text-3xl">🎮</span>, title: 'Play Game', desc: 'Start a new game session', action: () => onNavigate('setup') },
          { icon: <span className="text-3xl">🏆</span>, title: 'Scoreboard', desc: 'View scores & leaders', action: () => onNavigate('scoreboard') },
        ].map((item, i) => (
          <div key={i} onClick={item.action} className="rounded-2xl p-6 text-center cursor-pointer hover:-translate-y-2 transition-all duration-300 border border-theme-card bg-theme-card"
            style={{ backdropFilter: 'blur(10px)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
              {item.icon}
            </div>
            <h3 className="font-bold text-lg mb-1">{item.title}</h3>
            <p className="text-sm text-white/40">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-3xl">
        <h2 className="text-center text-xs font-semibold uppercase tracking-widest mb-4 text-white/30">Game Modes Available</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: <span className="text-xl">💬</span>, title: 'Meme Dialogues', desc: 'Guess the dialogue', bg: 'rgba(168,85,247,0.15)' },
            { icon: <span className="text-xl">🎵</span>, title: 'Song Tunes', desc: 'Identify the song', bg: 'rgba(236,72,153,0.15)' },
            { icon: <span className="text-xl">🎬</span>, title: 'Movie Memes', desc: 'Guess the movie', bg: 'rgba(6,182,212,0.15)' },
          ].map((cat, i) => (
            <div key={i} className="rounded-xl p-4 flex items-center gap-3 border border-theme-card bg-theme-card">
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
          <span className="text-sm">⚡</span>
          <span>{stats.total} questions ready</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">👥</span>
          <span>{stats.games} games played</span>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px) rotate(0deg); } 50% { transform: translateY(-20px) rotate(10deg); } }
        @keyframes logoFloat {
          0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.2)); }
          50% { transform: translateY(-10px) scale(1.02); filter: drop-shadow(0 0 20px rgba(236, 72, 153, 0.4)); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
};

// ==================== ADMIN SCREEN ====================
const AdminScreen: React.FC<{
  content: GameContent[];
  onRefresh: () => Promise<void>;
  onBack: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  adminEmail: string | null;
}> = ({ content: initialContent, onRefresh, onBack, isDark, onToggleTheme, onLogout, adminEmail }) => {
  const [content, setContent] = useState<GameContent[]>(initialContent);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [form, setForm] = useState({
    type: 'meme-dialogue' as ContentType,
    questionType: 'open-ended' as QuestionType,
    question: '',
    answer: '',
    options: ['', '', '', ''],
    imageData: '' as string,
    videoData: '' as string,
    audioData: '' as string,
    audioHint: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 20,
    movie: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameContent | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm]);

  const showAlert = (title: string, message: string) => setAlertInfo({ open: true, title, message });

  const filtered = content.filter(c => {
    const matchType = filter === 'all' || c.type === filter;
    const matchSearch = !search ||
      c.question.toLowerCase().includes(search.toLowerCase()) ||
      c.answer.toLowerCase().includes(search.toLowerCase()) ||
      (c.movie || '').toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const availableFolders = React.useMemo(() => (
    Array.from(new Set(content.map(item => item.movie?.trim()).filter(Boolean) as string[]))
      .sort((a, b) => a.localeCompare(b))
  ), [content]);

  const mediaLibrary = React.useMemo(() => {
    const seen = new Set<string>();
    const items: Array<{ kind: 'image' | 'video' | 'audio'; url: string; label: string; folder: string }> = [];
    content.forEach(item => {
      const folder = item.movie?.trim() || 'Independent Content';
      ([
        ['image', item.imageUrl || item.imageData],
        ['video', item.videoUrl || item.videoData],
        ['audio', item.audioUrl || item.audioData],
      ] as const).forEach(([kind, url]) => {
        if (!url || seen.has(`${kind}:${url}`)) return;
        seen.add(`${kind}:${url}`);
        items.push({ kind, url, label: item.question || item.answer || folder, folder });
      });
    });
    return items;
  }, [content]);

  const isMediaUsedByOthers = (url: string | undefined, currentId: string | null) => {
    if (!url) return false;
    return content.some(item => item.id !== currentId && (
      item.imageUrl === url || item.imageData === url ||
      item.videoUrl === url || item.videoData === url ||
      item.audioUrl === url || item.audioData === url
    ));
  };

  const handleSubmit = async () => {
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

    setIsSaving(true);

    try {
      let imageUrl = form.imageData;
      let videoUrl = form.videoData;
      let audioUrl = form.audioData;

      const uploadToStorage = async (file: File, prefix: string) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('game-media')
          .upload(fileName, file, { cacheControl: '3600' });

        if (error) throw error;

        const { data: publicUrlData } = supabase.storage
          .from('game-media')
          .getPublicUrl(data.path);

        return publicUrlData.publicUrl;
      };

      if (imageFile) {
        imageUrl = await uploadToStorage(imageFile, 'img');
      }
      if (videoFile) {
        videoUrl = await uploadToStorage(videoFile, 'vid');
      }
      if (audioFile) {
        audioUrl = await uploadToStorage(audioFile, 'aud');
      }

      if (!form.imageData) imageUrl = '';
      if (!form.videoData) videoUrl = '';
      if (!form.audioData) audioUrl = '';

      const dbPayload = {
        type: form.type,
        question_type: form.questionType,
        question: form.question,
        answer: form.answer,
        options: form.questionType === 'multiple-choice' ? form.options.filter(o => o.trim()) : null,
        image_url: imageUrl || null,
        video_url: videoUrl || null,
        audio_url: audioUrl || null,
        audio_hint: form.audioHint || null,
        difficulty: form.difficulty,
        points: form.points,
        movie: form.movie ? form.movie.trim() : null,
      };

      if (editId) {
        const originalItem = content.find(c => c.id === editId);
        if (originalItem) {
          const filesToDelete: string[] = [];
          if (originalItem.imageUrl && (imageFile || !form.imageData) && !isMediaUsedByOthers(originalItem.imageUrl, editId)) {
            const name = getFileNameFromUrl(originalItem.imageUrl);
            if (name) filesToDelete.push(name);
          }
          if (originalItem.videoUrl && (videoFile || !form.videoData) && !isMediaUsedByOthers(originalItem.videoUrl, editId)) {
            const name = getFileNameFromUrl(originalItem.videoUrl);
            if (name) filesToDelete.push(name);
          }
          if (originalItem.audioUrl && (audioFile || !form.audioData) && !isMediaUsedByOthers(originalItem.audioUrl, editId)) {
            const name = getFileNameFromUrl(originalItem.audioUrl);
            if (name) filesToDelete.push(name);
          }

          if (filesToDelete.length > 0) {
            await supabase.storage
              .from('game-media')
              .remove(filesToDelete);
          }
        }

        const { error } = await supabase
          .from('game_content')
          .update(dbPayload)
          .eq('id', editId);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('game_content')
          .insert([dbPayload]);
        
        if (error) throw error;
      }

      await onRefresh();

      setForm({ type: 'meme-dialogue', questionType: 'open-ended', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', difficulty: 'medium', points: 20, movie: '' });
      setImageFile(null);
      setVideoFile(null);
      setAudioFile(null);
      setShowForm(false);
      setEditId(null);
      setIsCreatingFolder(false);
    } catch (err: any) {
      console.error('Error saving content:', err);
      showAlert('Error saving', err.message || 'Failed to save content to Supabase.');
    } finally {
      setIsSaving(false);
    }
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
      movie: item.movie || '',
    });
    setImageFile(null);
    setVideoFile(null);
    setAudioFile(null);
    setIsCreatingFolder(!item.movie);
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
      if (type === 'image') {
        setForm(f => ({ ...f, imageData: base64 }));
        setImageFile(file);
      }
      if (type === 'video') {
        setForm(f => ({ ...f, videoData: base64 }));
        setVideoFile(file);
      }
      if (type === 'audio') {
        setForm(f => ({ ...f, audioData: base64 }));
        setAudioFile(file);
      }
    } catch (err) {
      setAlertInfo({ open: true, title: 'Upload failed', message: 'Could not process the file.' });
    }
    setUploading(null);
  };

  const diffColor = (d: string) => d === 'easy' ? '#22c55e' : d === 'medium' ? '#eab308' : '#ef4444';
  const typeLabel = (t: string) => t === 'meme-dialogue' ? 'Meme' : t === 'song-tune' ? 'Song' : 'Movie';

  const renderQuestionCard = (item: GameContent) => (
    <div key={item.id} className="rounded-2xl border border-theme-card bg-theme-card p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1">
      <div className="flex items-start justify-between gap-3 mb-4">
        <SoftIcon icon={contentIconMap[item.type]} color={contentAccentMap[item.type]} />
        <div className="flex flex-wrap items-center gap-2">
          {item.movie && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 truncate max-w-[150px]" title={item.movie}><Folder className="w-3 h-3" /> {item.movie}</span>}
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }}>{typeLabel(item.type)}</span>
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: diffColor(item.difficulty) }}>{item.difficulty}</span>
        </div>
      </div>

      {item.imageUrl || item.imageData ? (
        <div className="mb-4 overflow-hidden rounded-3xl border border-white/10">
          <img src={item.imageUrl || item.imageData} alt="Content preview" className="h-44 w-full object-cover" />
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-white/90 mb-3 break-words">{item.question}</h3>
      <div className="space-y-3 text-sm text-white/70">
        <div className="rounded-2xl bg-white/5 p-3">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-1">Correct answer</div>
          <div className="text-white/90">{item.answer}</div>
        </div>
        {item.questionType === 'multiple-choice' && item.options?.length ? (
          <div className="rounded-2xl bg-white/5 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-2">Options</div>
            <div className="flex flex-wrap gap-2">
              {item.options.map((opt, idx) => (
                <span key={idx} className={`rounded-full px-3 py-1 text-[11px] ${opt === item.answer ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-white/60'}`}>{opt}</span>
              ))}
            </div>
          </div>
        ) : null}
        {item.type === 'song-tune' && item.audioHint ? (
          <div className="rounded-2xl bg-white/5 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-1">Audio hint</div>
            <div>{item.audioHint}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>{item.points} pts</span>
          {item.imageData && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-200"><ImageIcon className="w-3 h-3" /> Image</span>}
          {item.videoData && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pink-500/15 text-pink-200"><Video className="w-3 h-3" /> Video</span>}
          {item.audioData && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-200"><Music className="w-3 h-3" /> Audio</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => startEdit(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition"><Edit3 className="w-4 h-4" /> Edit</button>
          <button onClick={() => setDeleteTarget(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 transition"><Trash2 className="w-4 h-4" /> Delete</button>
        </div>
      </div>
    </div>
  );

  const groupedContent = React.useMemo(() => {
    const movieGroups: { [movieName: string]: GameContent[] } = {};
    const independent: GameContent[] = [];

    filtered.forEach(item => {
      if (item.movie && item.movie.trim()) {
        const key = item.movie.trim();
        if (!movieGroups[key]) {
          movieGroups[key] = [];
        }
        movieGroups[key].push(item);
      } else {
        independent.push(item);
      }
    });

    const sortedMovieNames = Object.keys(movieGroups).sort((a, b) => a.localeCompare(b));
    return { movieGroups, sortedMovieNames, independent };
  }, [filtered]);

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6">
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete content?"
        message={deleteTarget ? `This will permanently remove: ${deleteTarget.question}` : ''}
        confirmLabel="Delete"
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            try {
              const { error } = await supabase
                .from('game_content')
                .delete()
                .eq('id', deleteTarget.id);
              if (error) throw error;

              const filesToDelete: string[] = [];
              if (deleteTarget.imageUrl && !isMediaUsedByOthers(deleteTarget.imageUrl, deleteTarget.id)) {
                const name = getFileNameFromUrl(deleteTarget.imageUrl);
                if (name) filesToDelete.push(name);
              }
              if (deleteTarget.videoUrl && !isMediaUsedByOthers(deleteTarget.videoUrl, deleteTarget.id)) {
                const name = getFileNameFromUrl(deleteTarget.videoUrl);
                if (name) filesToDelete.push(name);
              }
              if (deleteTarget.audioUrl && !isMediaUsedByOthers(deleteTarget.audioUrl, deleteTarget.id)) {
                const name = getFileNameFromUrl(deleteTarget.audioUrl);
                if (name) filesToDelete.push(name);
              }

              if (filesToDelete.length > 0) {
                await supabase.storage
                  .from('game-media')
                  .remove(filesToDelete);
              }

              await onRefresh();
              setShowForm(false);
              setEditId(null);
            } catch (err: any) {
              console.error('Error deleting content:', err);
              showAlert('Error deleting', err.message || 'Failed to delete content.');
            }
          }
          setDeleteTarget(null);
        }}
      />
      <AlertModal open={alertInfo.open} title={alertInfo.title} message={alertInfo.message} onOk={() => setAlertInfo({ open: false, title: '', message: '' })} />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center border border-theme-card bg-theme-card" style={{ backdropFilter: 'blur(10px)' }}>
              <ArrowLeft className="w-5 h-5" />
            </button>
            <GuessWhatLogo size={36} />
            <div>
              <h1 className="text-2xl font-bold"><GradientText>Admin Panel</GradientText></h1>
              <p className="text-white/40 text-sm">
                {adminEmail ? `Logged in as: ${adminEmail}` : 'Manage your game content'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogout}
              className="p-3 rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-md cursor-pointer border border-red-500/20 hover:bg-red-500/10 text-red-400"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
            <button
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white border-0 cursor-pointer transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
              onClick={() => { setShowForm(true); setEditId(null); setForm({ type: 'meme-dialogue', questionType: 'open-ended', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', difficulty: 'medium', points: 20, movie: selectedFolder && selectedFolder !== '__independent__' ? selectedFolder : '' }); setIsCreatingFolder(!selectedFolder || selectedFolder === '__independent__'); setImageFile(null); setVideoFile(null); setAudioFile(null); }}
            >
              <Plus className="w-4 h-4" /> Add Content
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { n: content.length, label: 'Total', color: '#a855f7' },
            { n: content.filter(c => c.type === 'meme-dialogue').length, label: 'Memes', color: '#22c55e' },
            { n: content.filter(c => c.type === 'song-tune').length, label: 'Songs', color: '#ec4899' },
            { n: content.filter(c => c.type === 'movie-meme').length, label: 'Movies', color: '#06b6d4' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-4 text-center border border-theme-card bg-theme-card">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.n}</p>
              <p className="text-xs text-white/40">{s.label}</p>
            </div>
          ))}
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
              className="absolute inset-0 bg-black/65 backdrop-blur-xl"
              onClick={() => { setShowForm(false); setEditId(null); }}
            />
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/10 bg-slate-950/95 shadow-[0_40px_120px_rgba(0,0,0,0.55)] flex flex-col animate-fadeIn">
              {/* Sticky Header */}
              <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-white/10 flex-shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{editId ? 'Edit Content' : 'Add New Content'}</h2>
                  <p className="text-xs sm:text-sm text-white/50">Background is locked while editing. Save or delete when ready.</p>
                </div>
                <button onClick={() => { setShowForm(false); setEditId(null); }} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/10 hover:bg-white/15 transition flex-shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Type</label>
                    <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ContentType })}>
                      <option value="meme-dialogue" style={{ background: '#1a1a2e' }}>Meme Dialogue</option>
                      <option value="song-tune" style={{ background: '#1a1a2e' }}>Song Tune</option>
                      <option value="movie-meme" style={{ background: '#1a1a2e' }}>Movie Meme</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Question Type</label>
                    <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      value={form.questionType} onChange={e => setForm({ ...form, questionType: e.target.value as QuestionType })}>
                      <option value="multiple-choice" style={{ background: '#1a1a2e' }}>Multiple Choice</option>
                      <option value="open-ended" style={{ background: '#1a1a2e' }}>Open Ended</option>
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
                      <option value="easy" style={{ background: '#1a1a2e' }}>Easy (10 pts)</option>
                      <option value="medium" style={{ background: '#1a1a2e' }}>Medium (20 pts)</option>
                      <option value="hard" style={{ background: '#1a1a2e' }}>Hard (30 pts)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Question</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[
                      form.type === 'meme-dialogue' ? 'Guess the dialogue' : form.type === 'song-tune' ? 'Guess the song' : 'Guess the movie name',
                      form.type === 'meme-dialogue' ? 'What is being said here?' : form.type === 'song-tune' ? 'Name this song' : 'Name this movie',
                      form.type === 'meme-dialogue' ? 'Complete the dialogue' : form.type === 'song-tune' ? 'Identify the song' : 'Which movie is this from?',
                      'What is this?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => setForm({ ...form, question: suggestion })}
                        className="text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105 cursor-pointer"
                        style={{ background: form.question === suggestion ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.06)', border: `1px solid ${form.question === suggestion ? 'rgba(168,85,247,0.6)' : 'rgba(255,255,255,0.12)'}`, color: form.question === suggestion ? '#c084fc' : 'rgba(255,255,255,0.6)' }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                  <textarea className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm" rows={2}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="Enter a custom question or pick a suggestion above..." value={form.question} onChange={e => setForm({ ...form, question: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1 block">Correct Answer</label>
                  <input className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="The correct answer" value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1 block">Folder</label>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                    <select
                      className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      value={isCreatingFolder ? '__new__' : (form.movie || '')}
                      onChange={e => {
                        if (e.target.value === '__new__') {
                          setIsCreatingFolder(true);
                          setForm({ ...form, movie: '' });
                          return;
                        }
                        setIsCreatingFolder(false);
                        setForm({ ...form, movie: e.target.value });
                      }}
                    >
                      <option value="" style={{ background: '#1a1a2e' }}>Independent Content</option>
                      {availableFolders.map(folder => (
                        <option key={folder} value={folder} style={{ background: '#1a1a2e' }}>{folder}</option>
                      ))}
                      <option value="__new__" style={{ background: '#1a1a2e' }}>Create new folder...</option>
                    </select>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition"
                      style={{ background: isCreatingFolder ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: isCreatingFolder ? '#c084fc' : 'rgba(255,255,255,0.65)' }}
                      onClick={() => {
                        setIsCreatingFolder(true);
                        setForm({ ...form, movie: '' });
                      }}
                    >
                      <Folder className="w-4 h-4" /> New
                    </button>
                  </div>
                  {isCreatingFolder && (
                    <input
                      className="mt-2 w-full rounded-xl px-4 py-3 text-white outline-none text-sm"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      placeholder="Type folder name, e.g. Shrek, Iron Man, Random Content"
                      value={form.movie || ''}
                      onChange={e => setForm({ ...form, movie: e.target.value })}
                    />
                  )}
                </div>

                {form.questionType === 'multiple-choice' && (
                  <div>
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

                <div>
                  <label className="text-sm text-white/60 mb-2 block">Upload Media (Optional)</label>
                  {mediaLibrary.length > 0 && (
                    <div className="mb-3 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <SoftIcon icon={FolderOpen} color="#38bdf8" size="sm" />
                        <div>
                          <p className="text-sm font-semibold text-white/80">Reuse existing media</p>
                          <p className="text-xs text-white/40">Pick an asset already uploaded for another question.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(['image', 'video', 'audio'] as const).map(kind => {
                          const items = mediaLibrary.filter(item => item.kind === kind);
                          const Icon = kind === 'image' ? ImageIcon : kind === 'video' ? Video : Music;
                          return (
                            <label key={kind} className="block">
                              <span className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-white/35">
                                <Icon className="w-3.5 h-3.5" /> {kind}
                              </span>
                              <select
                                className="w-full rounded-xl px-3 py-2.5 text-white outline-none text-xs"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                                value={kind === 'image' ? form.imageData : kind === 'video' ? form.videoData : form.audioData}
                                onChange={e => {
                                  const value = e.target.value;
                                  if (kind === 'image') {
                                    setForm(f => ({ ...f, imageData: value }));
                                    setImageFile(null);
                                  } else if (kind === 'video') {
                                    setForm(f => ({ ...f, videoData: value }));
                                    setVideoFile(null);
                                  } else {
                                    setForm(f => ({ ...f, audioData: value }));
                                    setAudioFile(null);
                                  }
                                }}
                              >
                                <option value="" style={{ background: '#1a1a2e' }}>No reused {kind}</option>
                                {items.map(item => (
                                  <option key={`${item.kind}:${item.url}`} value={item.url} style={{ background: '#1a1a2e' }}>
                                    {item.folder} - {item.label.slice(0, 44)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <SoftIcon icon={ImageIcon} color="#a855f7" className="mx-auto mb-2" />
                      <p className="text-xs text-white/40 mb-2">Image (max 5MB)</p>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
                        <Upload className="w-3.5 h-3.5" /> {form.imageData ? 'Replace' : 'Upload'}
                        <input type="file" accept="image/*" onChange={e => handleFileUpload('image', e)} className="hidden" />
                      </label>
                      {form.imageData && (
                        <div className="mt-2">
                          <img src={form.imageData} alt="preview" className="w-full h-20 object-cover rounded-lg" />
                          <button onClick={() => { setForm(f => ({ ...f, imageData: '' })); setImageFile(null); }} className="text-xs text-red-400 mt-1">Remove</button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <SoftIcon icon={Video} color="#ec4899" className="mx-auto mb-2" />
                      <p className="text-xs text-white/40 mb-2">Video (max 10MB)</p>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(236,72,153,0.15)', color: '#ec4899' }}>
                        <Upload className="w-3.5 h-3.5" /> {form.videoData ? 'Replace' : 'Upload'}
                        <input type="file" accept="video/*" onChange={e => handleFileUpload('video', e)} className="hidden" />
                      </label>
                      {form.videoData && (
                        <div className="mt-2">
                          <video src={form.videoData} className="w-full h-20 object-cover rounded-lg" />
                          <button onClick={() => { setForm(f => ({ ...f, videoData: '' })); setVideoFile(null); }} className="text-xs text-red-400 mt-1">Remove</button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <SoftIcon icon={Mic2} color="#06b6d4" className="mx-auto mb-2" />
                      <p className="text-xs text-white/40 mb-2">Audio (max 10MB)</p>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                        <Upload className="w-3.5 h-3.5" /> {form.audioData ? 'Replace' : 'Upload'}
                        <input type="file" accept="audio/*" onChange={e => handleFileUpload('audio', e)} className="hidden" />
                      </label>
                      {form.audioData && (
                        <div className="mt-2">
                          <audio src={form.audioData} controls className="w-full" />
                          <button onClick={() => { setForm(f => ({ ...f, audioData: '' })); setAudioFile(null); }} className="text-xs text-red-400 mt-1">Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {uploading && <p className="text-xs text-white/40 mt-2 text-center">Uploading {uploading}... Please wait</p>}
                </div>

                {form.type === 'song-tune' && (
                  <div>
                    <label className="text-sm text-white/60 mb-1 block flex items-center gap-2">🎵 Audio Hint / Lyrics</label>
                    <textarea className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm" rows={2}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      placeholder="Describe the tune or provide lyrics..." value={form.audioHint || ''} onChange={e => setForm({ ...form, audioHint: e.target.value })} />
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <div className="flex flex-wrap items-center gap-3 justify-end p-5 sm:p-6 border-t border-white/10 bg-slate-950/95 flex-shrink-0">
                <button disabled={isSaving} className="px-5 py-2.5 rounded-xl font-semibold cursor-pointer transition-all hover:bg-white/10 text-sm" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', opacity: isSaving ? 0.5 : 1 }}
                  onClick={() => { setShowForm(false); setEditId(null); }}>
                  Cancel
                </button>
                {editId && (
                  <button type="button" className="px-5 py-2.5 rounded-xl font-semibold transition-all hover:bg-red-500/20 text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#fda4af' }}
                    onClick={() => {
                      const currentItem = content.find(c => c.id === editId);
                      if (currentItem) {
                        setDeleteTarget(currentItem);
                      }
                    }}>
                    <span className="inline-flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete</span>
                  </button>
                )}
                <button disabled={isSaving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white cursor-pointer transition-all hover:opacity-90 text-sm"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', opacity: isSaving ? 0.7 : 1 }}
                  onClick={handleSubmit}>
                  <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : (editId ? 'Update' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
            <input className="w-full rounded-xl pl-10 pr-4 py-3 text-white outline-none text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
              placeholder="Search questions, answers, or folders..." value={search} onChange={e => { setSearch(e.target.value); setSelectedFolder(null); }} />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'meme-dialogue', label: 'Memes' },
              { key: 'song-tune', label: 'Songs' },
              { key: 'movie-meme', label: 'Movies' },
            ].map(f => (
              <button key={f.key} className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: filter === f.key ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                  border: filter === f.key ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  color: filter === f.key ? 'white' : 'rgba(255,255,255,0.4)',
                }}
                onClick={() => { setFilter(f.key); setSelectedFolder(null); }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <SoftIcon icon={Folder} color="#64748b" size="lg" className="mx-auto mb-4" />
            <p className="text-white/40">No content found. Add your first question!</p>
          </div>
        ) : selectedFolder === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groupedContent.sortedMovieNames.map(movieName => {
              const items = groupedContent.movieGroups[movieName];
              const firstWithImage = items.find(item => item.imageData || item.imageUrl);
              return (
                <button
                  key={movieName}
                  onClick={() => setSelectedFolder(movieName)}
                  className="group min-h-[170px] rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:-translate-y-1 hover:border-cyan-400/35 hover:bg-cyan-400/[0.07] shadow-[0_18px_60px_rgba(0,0,0,0.12)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <SoftIcon icon={Folder} color="#38bdf8" size="lg" />
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/60">
                      {items.length} {items.length === 1 ? 'question' : 'questions'}
                    </span>
                  </div>
                  <h2 className="mt-5 text-lg font-bold text-white truncate">{movieName}</h2>
                  <p className="mt-1 text-xs text-white/40 truncate">
                    {items.slice(0, 2).map(item => item.answer).join(' / ') || 'Open folder'}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs text-cyan-200/80">
                    {firstWithImage ? (
                      <img src={firstWithImage.imageData || firstWithImage.imageUrl} alt="" className="h-8 w-12 rounded-lg object-cover border border-white/10" />
                    ) : (
                      <span className="h-8 w-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center"><Film className="w-4 h-4" /></span>
                    )}
                    <span className="font-semibold">Open folder</span>
                  </div>
                </button>
              );
            })}

            {groupedContent.independent.length > 0 && (
              <button
                onClick={() => setSelectedFolder('__independent__')}
                className="group min-h-[170px] rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-all hover:-translate-y-1 hover:border-purple-400/35 hover:bg-purple-400/[0.07] shadow-[0_18px_60px_rgba(0,0,0,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <SoftIcon icon={Folder} color="#a855f7" size="lg" />
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/60">
                    {groupedContent.independent.length} {groupedContent.independent.length === 1 ? 'question' : 'questions'}
                  </span>
                </div>
                <h2 className="mt-5 text-lg font-bold text-white truncate">Independent Content</h2>
                <p className="mt-1 text-xs text-white/40">Questions without a folder</p>
                <div className="mt-4 flex items-center gap-2 text-xs text-purple-200/80">
                  <span className="h-8 w-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center"><FolderOpen className="w-4 h-4" /></span>
                  <span className="font-semibold">Open folder</span>
                </div>
              </button>
            )}
          </div>
        ) : (
          <div>
            {(() => {
              const folderName = selectedFolder === '__independent__' ? 'Independent Content' : selectedFolder;
              const folderItems = selectedFolder === '__independent__'
                ? groupedContent.independent
                : groupedContent.movieGroups[selectedFolder] || [];
              return (
                <>
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        onClick={() => setSelectedFolder(null)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 border border-white/10 hover:bg-white/20 transition"
                        title="Back to folders"
                      >
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                      <SoftIcon icon={FolderOpen} color={selectedFolder === '__independent__' ? '#a855f7' : '#38bdf8'} />
                      <div className="min-w-0">
                        <h2 className="text-xl font-bold text-white truncate">{folderName}</h2>
                        <p className="text-xs text-white/40">{folderItems.length} {folderItems.length === 1 ? 'question' : 'questions'} in this folder</p>
                      </div>
                    </div>
                    <button
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                      onClick={() => { setShowForm(true); setEditId(null); setForm({ type: 'meme-dialogue', questionType: 'open-ended', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', difficulty: 'medium', points: 20, movie: selectedFolder === '__independent__' ? '' : selectedFolder }); setIsCreatingFolder(selectedFolder === '__independent__'); setImageFile(null); setVideoFile(null); setAudioFile(null); }}
                    >
                      <Plus className="w-4 h-4" /> Add question
                    </button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {folderItems.map(item => renderQuestionCard(item))}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== GAME SETUP ====================
const GameSetup: React.FC<{
  onBack: () => void;
  onStart: (settings: any) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}> = ({ onBack, onStart, isDark, onToggleTheme }) => {
  const [mode, setMode] = useState<GameMode>('individual');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState(5);
  const [playUnlimited, setPlayUnlimited] = useState(false);
  const [timePerQ, setTimePerQ] = useState(30);
  const [categories, setCategories] = useState<ContentType[]>(['meme-dialogue', 'song-tune', 'movie-meme']);
  const questionTypes: QuestionType[] = ['multiple-choice', 'open-ended'];
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

  const [playerError, setPlayerError] = useState('');

  const handleStart = () => {
    let currentPlayers = [...players];
    let currentTeams = [...teams];

    if (mode === 'individual' && newPlayerName.trim()) {
      const pName = newPlayerName.trim();
      if (!currentPlayers.some(p => p.name === pName)) {
        currentPlayers.push({
          id: Date.now().toString(),
          name: pName,
          score: 0,
          streak: 0,
          bestStreak: 0,
          correctAnswers: 0,
          totalAnswers: 0,
        });
      }
    }

    if (mode === 'team' && newTeamName.trim()) {
      const tName = newTeamName.trim();
      if (!currentTeams.some(t => t.name === tName)) {
        const idx = currentTeams.length;
        currentTeams.push({
          id: Date.now().toString(),
          name: tName,
          score: 0,
          color: TEAM_COLORS[idx % TEAM_COLORS.length],
          emoji: TEAM_EMOJIS[idx % TEAM_EMOJIS.length],
        });
      }
    }

    if (mode === 'individual' && currentPlayers.length === 0) {
      setPlayerError('Please add at least one player name before starting.');
      return;
    }
    if (mode === 'team' && currentTeams.length < 2) {
      setPlayerError('Please add at least 2 teams before starting.');
      return;
    }
    setPlayerError('');
    onStart({ mode, teams: currentTeams, players: currentPlayers, rounds, playUnlimited, timePerQ, categories, questionTypes });
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center border border-theme-card bg-theme-card" style={{ backdropFilter: 'blur(10px)' }}>
              <span className="text-xl">⬅️</span>
            </button>
            <GuessWhatLogo size={36} />
            <div>
              <h1 className="text-2xl font-bold"><GradientText>Game Setup</GradientText></h1>
              <p className="text-white/40 text-sm">Configure your game session</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#a855f7' }}>🎮</span> Game Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { m: 'individual' as GameMode, icon: <span className="text-4xl">👤</span>, label: 'Individual', desc: 'Everyone plays solo', color: '#a855f7' },
              { m: 'team' as GameMode, icon: <span className="text-4xl">👥</span>, label: 'Team Play', desc: 'Compete as teams', color: '#ec4899' },
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
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#06b6d4' }}>💬</span> Categories</h2>
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
                {categories.includes(cat.type) && <span className="absolute top-2 right-2 text-sm text-green-400">✓</span>}
                <span className="text-2xl">{cat.emoji}</span>
                <span className="font-semibold text-sm text-center">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>


        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#22c55e' }}>⏰</span> Settings</h2>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <label className="text-sm text-white/60 block">Questions</label>
                <button
                  type="button"
                  onClick={() => setPlayUnlimited(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: playUnlimited ? 'rgba(34,197,94,0.16)' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${playUnlimited ? 'rgba(34,197,94,0.35)' : 'rgba(255,255,255,0.12)'}`,
                    color: playUnlimited ? '#22c55e' : 'rgba(255,255,255,0.6)',
                  }}
                >
                  {playUnlimited && <span>✓</span>}
                  Unlimited
                </button>
              </div>
              <input
                type="number"
                min={1}
                max={200}
                disabled={playUnlimited}
                value={rounds}
                onChange={e => setRounds(Math.max(1, Math.min(200, parseInt(e.target.value, 10) || 1)))}
                className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm disabled:opacity-45"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="Enter number of questions"
              />
              <p className="text-xs text-white/30 mt-2">
                {playUnlimited ? 'Game will use every matching question available.' : 'Enter the exact number of questions for this game.'}
              </p>
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
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#ec4899' }}>👥</span> Teams</h2>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 rounded-xl px-4 py-3 text-white outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="Enter team name (or start directly after typing)" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeam()} />
              <button className="px-4 rounded-xl text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={addTeam}>
                ➕
              </button>
            </div>
            <div className="space-y-2">
              {teams.map(team => (
                <div key={team.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span className="text-2xl">{team.emoji}</span>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="font-medium flex-1">{team.name}</span>
                  <button onClick={() => setTeams(teams.filter(t => t.id !== team.id))} className="text-white/30 hover:text-red-400 transition-colors">
                    🗑️
                  </button>
                </div>
              ))}
              {teams.length === 0 && <p className="text-white/30 text-sm text-center py-4">Add at least 2 teams</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#3b82f6' }}>👤</span> Players <span className="text-sm font-semibold" style={{ color: '#ef4444' }}>*Required</span></h2>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 rounded-xl px-4 py-3 text-white outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${playerError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}` }}
                placeholder="Enter player name (or start directly after typing)" value={newPlayerName} onChange={e => { setNewPlayerName(e.target.value); if (playerError) setPlayerError(''); }} onKeyDown={e => e.key === 'Enter' && addPlayer()} />
              <button className="px-4 rounded-xl text-white flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={addPlayer}>
                ➕
              </button>
            </div>
            {playerError && (
              <div className="mb-3 px-4 py-2.5 rounded-xl text-sm font-medium" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                ⚠️ {playerError}
              </div>
            )}
            <div className="space-y-2">
              {players.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <span>👤</span>
                  <span className="font-medium flex-1">{p.name}</span>
                  <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-white/30 hover:text-red-400 transition-colors">
                    🗑️
                  </button>
                </div>
              ))}
              {players.length === 0 && <p className="text-white/30 text-sm text-center py-4">Add at least one player name to start the game.</p>}
            </div>
          </div>
        )}

        <button
          className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.3)' }}
          onClick={handleStart}>
          🎮 {mode === 'team' ? 'Start Team Battle' : 'Start Game'}
        </button>
      </div>
    </div>
  );
};

// ==================== GAME LOBBY ====================
const GameLobby: React.FC<{
  settings: any;
  onStart: () => void;
  onBack: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}> = ({ settings, onStart, onBack, isDark, onToggleTheme }) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleStart = () => setCountdown(3);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { onStart(); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onStart]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '10rem', fontWeight: 900, background: 'linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {countdown}
          </div>
        </div>
      )}
      <div className="max-w-xl w-full">
        <div className="text-center mb-8 flex flex-col items-center">
          <GuessWhatLogo size={64} style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm text-white/60 mb-4 border border-theme-card bg-theme-card">
            ⚡ Get Ready to Play!
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-2">{settings.mode === 'team' ? '⚔️ Team Battle' : '🎮 Game On!'}</h1>
          <p className="text-white/40">{settings.playUnlimited ? 'Unlimited questions' : `${settings.rounds} rounds`} • {settings.timePerQ}s per question</p>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {settings.mode === 'team' ? (
            <>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#ec4899' }}>👥</span> Teams</h3>
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
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#3b82f6' }}>👤</span> Players</h3>
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
          ▶️ {countdown !== null ? 'Starting...' : 'Start Game!'}
        </button>

        <button className="w-full mt-3 py-3 text-white/40 hover:text-white/60 transition-colors text-sm flex items-center justify-center gap-2" onClick={onBack}>
          ⬅️ Back to Setup
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
  players: Player[];
  teams: Team[];
  mode: GameMode;
}> = ({ question, roundNumber, totalRounds, timePerQ, onReveal, onExit, players, teams, mode }) => {
  const [timeLeft, setTimeLeft] = useState(timePerQ);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showTurnSplash, setShowTurnSplash] = useState(true);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [waveHeights, setWaveHeights] = useState<number[]>(Array(15).fill(4));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setHasAnswered(false);
    setTimeLeft(timePerQ);
    setShowHint(false);
    setIsPaused(false);
    setShowTurnSplash(true);
  }, [question.id, timePerQ]);

  useEffect(() => {
    if (showTurnSplash) return;
    if (isPaused) return;
    if (hasAnswered) return;
    if (timeLeft <= 0) {
      setHasAnswered(true);
      onReveal();
      return;
    }
    timerRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, hasAnswered, isPaused, showTurnSplash, onReveal]);

  // Audio Playback Autoplay Logic (1-second delay after Turn Splash is dismissed)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioPlaying(false);

    if (question.audioData && !showTurnSplash) {
      const audio = new Audio(question.audioData);
      audioRef.current = audio;

      const playTimeout = setTimeout(() => {
        if (audioRef.current && !isPaused && !hasAnswered) {
          audio.play()
            .then(() => setAudioPlaying(true))
            .catch(err => {
              console.error("Audio playback failed or was blocked:", err);
            });
        }
      }, 1000);

      audio.onended = () => {
        setAudioPlaying(false);
      };

      return () => {
        clearTimeout(playTimeout);
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [question.id, showTurnSplash]);

  // Pause / Resume and Reveal handling for audio
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPaused || hasAnswered) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else if (!showTurnSplash) {
      audioRef.current.play()
        .then(() => setAudioPlaying(true))
        .catch(() => {});
    }
  }, [isPaused, hasAnswered, showTurnSplash]);

  // Audio Wave Visualizer animation interval
  useEffect(() => {
    if (!audioPlaying) {
      setWaveHeights(Array(15).fill(4));
      return;
    }
    const interval = setInterval(() => {
      setWaveHeights(
        Array.from({ length: 15 }, () => Math.floor(Math.random() * 32) + 8)
      );
    }, 150);
    return () => clearInterval(interval);
  }, [audioPlaying]);

  const progress = ((roundNumber - 1) / totalRounds) * 100;
  const timerPct = (timeLeft / timePerQ) * 100;
  const timerColor = timeLeft > 10 ? '#a855f7' : timeLeft > 5 ? '#eab308' : '#ef4444';
  const circumference = 2 * Math.PI * 26;
  const dashOffset = circumference * (1 - timerPct / 100);

  const typeLabel = (t: string) => t === 'meme-dialogue' ? 'Meme Dialogue' : t === 'song-tune' ? 'Song Tune' : 'Movie Meme';
  const isMC = question.questionType === 'multiple-choice';
  const QuestionTypeIcon = contentIconMap[question.type];

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

  const entities = mode === 'team' ? teams : players;
  const turnHolder = entities.length > 0 ? entities[(roundNumber - 1) % entities.length] : null;

  // Turn Splash Screen
  if (showTurnSplash && turnHolder) {
    const isTeam = mode === 'team';
    const borderCol = isTeam ? (turnHolder as Team).color : '#3b82f6';
    const bgCol = isTeam ? `${(turnHolder as Team).color}10` : 'rgba(59,130,246,0.1)';
    const emoji = isTeam ? (turnHolder as Team).emoji : '👤';

    return (
      <div className="min-h-screen flex items-center justify-center px-4 relative">
        <div className="max-w-xl w-full text-center p-8 rounded-3xl border animate-scaleIn bg-theme-card"
          style={{ borderColor: borderCol, background: bgCol, backdropFilter: 'blur(15px)' }}>
          <div className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center bg-white/10 text-5xl shadow-lg border border-white/20 animate-bounce">
            {emoji}
          </div>
          
          <p className="text-sm font-semibold uppercase tracking-wider text-theme-muted mb-2">
            {isTeam ? 'Team Turn' : 'Player Turn'}
          </p>
          
          <h1 className="text-4xl sm:text-5xl font-black mb-6 text-theme-main">
            {turnHolder.name}
          </h1>
          
          <p className="text-theme-muted mb-8 max-w-sm mx-auto text-sm">
            It's your turn to answer this question. Ready to show what you've got?
          </p>
          
          <button
            className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer animate-pulse"
            style={{ 
              background: `linear-gradient(135deg, ${borderCol}, #ec4899)`,
              boxShadow: `0 8px 25px ${borderCol}40`
            }} 
            onClick={() => setShowTurnSplash(false)}>
            ▶️ Reveal Question
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col px-4 py-4">
      <div className="max-w-6xl w-full mx-auto relative">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <GuessWhatLogo size={24} />
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
              Round {roundNumber}/{totalRounds}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7' }}>
              <span className="inline-flex items-center gap-1.5"><QuestionTypeIcon className="w-3.5 h-3.5" /> {typeLabel(question.type)}</span>
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>
              {question.points} pts
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: isMC ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)', color: isMC ? '#3b82f6' : '#22c55e' }}>
              {isMC ? '📋 MC' : '✍️ Open'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsPaused(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)' }}>
              ⏸️ Pause
            </button>
            <button onClick={onExit} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 transition-colors" style={{ background: 'rgba(239,68,68,0.1)' }}>
              🚪 Exit Game
            </button>
          </div>
        </div>

        {/* Mobile Live Score Tracer */}
        <div className="flex lg:hidden items-center gap-2 overflow-x-auto pb-3 mb-3 border-b border-white/10 scrollbar-none">
          {entities.map(e => (
            <div key={e.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold whitespace-nowrap">
              <span>{('emoji' in e) ? (e as Team).emoji : '👤'}</span>
              <span className="text-white/80 max-w-[80px] truncate">{e.name}</span>
              <span className="text-purple-400 font-bold">{e.score} pts</span>
              {(!('emoji' in e)) && (e as Player).streak > 0 && (
                <span className="text-[10px] text-orange-400 font-bold animate-pulse">🔥 {(e as Player).streak}</span>
              )}
            </div>
          ))}
        </div>

        {isPaused && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(12px)' }}>
            <div className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl" style={{ background: 'rgba(18,18,42,0.96)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.18)' }}>
                <span className="text-3xl">⏸️</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Game Paused</h3>
              <p className="text-sm text-white/50 mb-6">Timer is stopped. Resume when everyone is ready.</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 rounded-xl font-semibold text-red-300" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.22)' }} onClick={onExit}>
                  Exit
                </button>
                <button className="py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={() => setIsPaused(false)}>
                  ▶️ Resume
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main gameplay card & controls */}
          <div className="lg:col-span-3">
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

            <div className="rounded-2xl p-6 mb-4 border border-theme-card bg-theme-card" style={{ backdropFilter: 'blur(10px)' }}>
              {question.imageData && (
                <div className="mb-4 rounded-xl overflow-hidden flex items-center justify-center bg-black/10 border border-theme-card">
                  <img src={question.imageData} alt="question" className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-md" />
                </div>
              )}
              {question.videoData && (
                <div className="mb-4 rounded-xl overflow-hidden bg-black/10 border border-theme-card">
                  <video src={question.videoData} controls className="w-full max-h-[55vh] object-contain rounded-xl shadow-md" />
                </div>
              )}
              {question.audioData && (
                <div className="mb-6 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.08), rgba(168,85,247,0.08))',
                    border: '1px solid rgba(168,85,247,0.15)'
                  }}>
                  <div className="w-16 h-16 rounded-full flex items-center justify-center relative bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/20">
                    {audioPlaying ? (
                      <span className="text-2xl animate-bounce">🎵</span>
                    ) : (
                      <span className="text-2xl">🔇</span>
                    )}
                    {audioPlaying && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-cyan-500/30 animate-ping" />
                        <div className="absolute -inset-2 rounded-full border border-cyan-500/20 animate-pulse" />
                      </>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <p className="font-bold text-sm text-cyan-400 uppercase tracking-widest">
                      {audioPlaying ? 'Playing Audio Hint' : 'Get Ready to Listen...'}
                    </p>
                    <p className="text-xs text-white/50 mt-1">
                      {audioPlaying ? 'Listen carefully to the music' : 'Audio will start automatically'}
                    </p>
                  </div>

                  {/* Dynamic wave visualizer */}
                  <div className="flex items-end justify-center gap-1.5 h-10 mt-2">
                    {waveHeights.map((h, idx) => (
                      <div
                        key={idx}
                        className="w-1.5 rounded-full bg-gradient-to-t from-cyan-400 to-purple-500 transition-all duration-150"
                        style={{
                          height: `${h}px`,
                        }}
                      />
                    ))}
                  </div>

                  {question.audioHint && (
                    <div className="mt-2 w-full max-w-md border-t border-white/5 pt-4 text-center">
                      <button 
                        type="button" 
                        onClick={() => setShowHint(!showHint)} 
                        className="text-xs text-white/40 hover:text-white/60 underline transition-colors"
                      >
                        {showHint ? 'Hide Text Clue' : 'Show Text Clue'}
                      </button>
                      {showHint && (
                        <p className="text-sm text-white/70 mt-2 bg-white/5 p-3 rounded-xl border border-white/5 animate-slideDown">
                          {question.audioHint}
                        </p>
                      )}
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
                  👁️ Reveal Answer
                </button>
              </div>
            )}

            {isMC && !hasAnswered && (
              <button className="w-full py-3 rounded-xl font-semibold text-white/60 flex items-center justify-center gap-2 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                onClick={handleRevealClick}>
                👁️ Skip & Reveal
              </button>
            )}
          </div>

          {/* Desktop Live Score Tracer Sidebar */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="bg-theme-card border border-theme-card rounded-2xl p-4 sticky top-4" style={{ backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/10">
                <h3 className="font-bold text-sm text-theme-main flex items-center gap-2">
                  <span className="text-yellow-400">🏆</span>
                  <span>Live Scores</span>
                </h3>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  {mode === 'team' ? 'Teams' : 'Players'}
                </span>
              </div>
              <div className="space-y-2.5 max-h-[65vh] overflow-y-auto pr-1">
                {entities.map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-lg flex-shrink-0">
                        {('emoji' in e) ? (e as Team).emoji : '👤'}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate text-white/90">{e.name}</p>
                        {(!('emoji' in e)) && (e as Player).streak > 0 && (
                          <p className="text-[10px] text-orange-400 font-bold flex items-center gap-0.5 animate-pulse mt-0.5">
                            🔥 {(e as Player).streak} Streak
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <span className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        {e.score}
                      </span>
                      <span className="text-[10px] text-white/40 block">pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
  currentIdx: number;
  onNext: (winnerId: string | 'nobody') => void;
}> = ({ question, roundNumber, totalRounds, scores, currentIdx, onNext }) => {
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const progress = (roundNumber / totalRounds) * 100;
  const entities = scores.mode === 'team' ? scores.teams : scores.players;
  const turnHolder = entities.length > 0 ? entities[currentIdx % entities.length] : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6">
      <div className="max-w-xl w-full">
        <div className="flex justify-center mb-4">
          <GuessWhatLogo size={32} />
        </div>
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
            <span className="text-xl">⭐</span>
            <span className="text-xl font-bold text-yellow-400">Worth {question.points} points</span>
            <span className="text-xl">⭐</span>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {turnHolder ? (
            <>
              <h3 className="text-lg font-bold mb-2">Did they answer correctly?</h3>
              <div className="flex items-center justify-center gap-3 p-4 rounded-xl mb-6 bg-white/5 border border-white/10">
                <span className="text-3xl">
                  {('emoji' in turnHolder) ? (turnHolder as Team).emoji : '👤'}
                </span>
                <div className="text-left">
                  <p className="font-bold text-white text-lg">{turnHolder.name}</p>
                  <p className="text-xs text-white/50">{scores.mode === 'team' ? 'Team Turn' : "Player's Turn"}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setWinnerId('nobody')}
                  className={`py-4 px-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    winnerId === 'nobody'
                      ? 'border-red-500 bg-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl">❌</span>
                  <span className="font-bold text-red-400 text-sm sm:text-base">No, Incorrect</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setWinnerId(turnHolder.id)}
                  className={`py-4 px-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
                    winnerId === turnHolder.id
                      ? 'border-green-500 bg-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <span className="text-3xl">✅</span>
                  <span className="font-bold text-green-400 text-sm sm:text-base">Yes, Correct!</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-white/40 text-sm">No turn holder found</p>
          )}
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

// ==================== FEEDBACK MODAL ====================
const FeedbackModal: React.FC<{ open: boolean; onClose: () => void; currentScreen?: string }> = ({ open, onClose, currentScreen }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General Feedback');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const categories = ['Suggest a Meme 🎭', 'Report a Bug 🐛', 'Game Suggestion 🎮', 'General Feedback 💬', 'Other ✨'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    const result = await sendFeedbackToTelegram(name, category, message);
    if (result.success) {
      setStatus('success');
      setTimeout(() => { setStatus('idle'); setName(''); setCategory('General Feedback'); setMessage(''); onClose(); }, 2500);
    } else {
      setStatus('error');
      setErrorMsg(result.error || 'Failed to send feedback.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(145deg, rgba(18,18,42,0.98), rgba(30,20,60,0.98))', border: '1px solid rgba(168,85,247,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="relative p-6 pb-4" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.1))' }}>
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(168,85,247,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(236,72,153,0.2) 0%, transparent 50%)' }} />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))', border: '1px solid rgba(168,85,247,0.4)' }}>💬</div>
              <div>
                <h2 className="text-xl font-black text-white">Share Feedback</h2>
                <p className="text-xs text-white/50">Your thoughts help us improve!</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4 animate-bounce">🎉</div>
            <h3 className="text-2xl font-black text-white mb-2">Thanks!</h3>
            <p className="text-white/60">Your feedback has been sent successfully.</p>
            <div className="mt-4 text-4xl">✨</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Your Name <span className="text-white/30 normal-case font-normal">(optional)</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Anonymous Memer 🎭"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all focus:ring-2 focus:ring-purple-500/50"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all"
                    style={{
                      background: category === cat ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))' : 'rgba(255,255,255,0.05)',
                      border: category === cat ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: category === cat ? '#e879f9' : 'rgba(255,255,255,0.6)',
                      boxShadow: category === cat ? '0 0 15px rgba(168,85,247,0.2)' : 'none',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Message <span className="text-red-400">*</span></label>
              <textarea
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your thoughts, suggestions, or the meme you'd love to see..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none transition-all focus:ring-2 focus:ring-purple-500/50 resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {status === 'error' && (
              <div className="p-3 rounded-xl text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending' || !message.trim()}
              className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.35)' }}>
              {status === 'sending' ? (
                <><span className="animate-spin">⟳</span> Sending...</>
              ) : (
                <>✈️ Send Feedback</>
              )}
            </button>
          </form>
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
  isDark: boolean;
  onToggleTheme: () => void;
  onFeedback: () => void;
}> = ({ scores, rounds, timePerQ, onPlayAgain, onNewSetup, onHome, onFeedback }) => {
  const [activeTab, setActiveTab] = useState<'match' | 'halloffame'>('match');
  const [hallOfFame, setHallOfFame] = useState<any[]>([]);
  const [hofLoading, setHofLoading] = useState(false);
  const [confettiPieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#06b6d4'][Math.floor(Math.random() * 7)],
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 4,
      size: 6 + Math.random() * 8,
      isCircle: Math.random() > 0.5,
    }))
  );
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (activeTab === 'halloffame') {
      setHofLoading(true);
      supabase
        .from('scoreboard')
        .select('*')
        .order('total_score', { ascending: false })
        .limit(10)
        .then(({ data, error }) => {
          setHofLoading(false);
          if (!error && data) setHallOfFame(data);
        });
    }
  }, [activeTab]);

  const totalScore = scores.mode === 'team'
    ? scores.teams.reduce((s, t) => s + t.score, 0)
    : scores.players.reduce((s, p) => s + p.score, 0);
  const sorted = scores.mode === 'team'
    ? [...scores.teams].sort((a, b) => b.score - a.score)
    : [...scores.players].sort((a, b) => b.score - a.score);
  const winner = sorted.length > 0 ? sorted[0] : null;

  const getMedal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return iso; }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-6 relative overflow-hidden">
      {/* Confetti */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {confettiPieces.map(p => (
            <div key={p.id} style={{
              position: 'absolute', top: '-20px', left: `${p.left}%`,
              width: `${p.size}px`, height: `${p.size}px`,
              backgroundColor: p.color,
              borderRadius: p.isCircle ? '50%' : '2px',
              animation: `confettiFall ${p.duration}s ease-in ${p.delay}s both`,
            }} />
          ))}
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      <div className="max-w-2xl w-full relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-5">
          <GuessWhatLogo size={56} />
        </div>

        {/* Winner Banner */}
        {winner && (
          <div className="text-center mb-6 relative">
            <div className="inline-block relative">
              <div className="text-7xl mb-2" style={{ filter: 'drop-shadow(0 0 20px rgba(234,179,8,0.6))' }}>🏆</div>
              <div className="absolute -top-1 -right-1 text-2xl animate-bounce">✨</div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
              <span style={{ background: 'linear-gradient(135deg, #eab308, #f97316, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {winner.name} Wins!
              </span>
            </h1>
            <p className="text-white/50 text-sm">🎉 Crowned the Meme Champion!</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {([['match', '🎮 This Match'], ['halloffame', '🏆 Hall of Fame']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.45)',
                boxShadow: activeTab === tab ? '0 4px 15px rgba(168,85,247,0.35)' : 'none',
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* TAB: This Match */}
        {activeTab === 'match' && (
          <div>
            {/* Rankings */}
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-white flex items-center gap-2">
                  <span style={{ color: '#eab308' }}>⚡</span> Final Rankings
                </h2>
                <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308', border: '1px solid rgba(234,179,8,0.25)' }}>
                  {totalScore} pts total
                </span>
              </div>

              {sorted.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🎯</div>
                  <p className="text-white/40">No players or teams tracked.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {sorted.map((item, idx) => {
                    const isTeam = 'emoji' in item;
                    const teamItem = item as Team;
                    const playerItem = item as Player;
                    const itemColor = isTeam ? teamItem.color : '#a855f7';
                    const barPct = sorted[0]?.score ? (item.score / sorted[0].score) * 100 : 0;
                    const isWinner = idx === 0;

                    return (
                      <div key={item.id}
                        className="p-4 rounded-xl flex items-center gap-3 transition-all"
                        style={{
                          background: isWinner
                            ? `linear-gradient(135deg, rgba(234,179,8,0.12), rgba(249,115,22,0.08))`
                            : 'rgba(255,255,255,0.03)',
                          border: isWinner ? '1px solid rgba(234,179,8,0.35)' : '1px solid rgba(255,255,255,0.06)',
                          boxShadow: isWinner ? '0 0 20px rgba(234,179,8,0.12)' : 'none',
                        }}>

                        {/* Medal / Rank */}
                        <div className="w-10 text-center">
                          <span className="text-2xl">{getMedal(idx)}</span>
                        </div>

                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                          style={{ background: `${itemColor}20`, border: `1px solid ${itemColor}40` }}>
                          {isTeam ? teamItem.emoji : '👤'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {!isTeam && playerItem.bestStreak >= 2 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(249,115,22,0.2)', color: '#f97316' }}>🔥 {playerItem.bestStreak}x</span>
                            )}
                            {!isTeam && playerItem.correctAnswers > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>✓ {playerItem.correctAnswers}/{playerItem.totalAnswers}</span>
                            )}
                          </div>
                          <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${itemColor}, ${itemColor}88)`, boxShadow: `0 0 6px ${itemColor}60` }} />
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <p className="text-2xl font-black" style={{ color: itemColor, textShadow: `0 0 12px ${itemColor}60` }}>{item.score}</p>
                          <p className="text-[10px] text-white/30">pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { val: rounds, label: 'Rounds', color: '#a855f7', icon: '🎯' },
                { val: totalScore, label: 'Total Pts', color: '#ec4899', icon: '⚡' },
                { val: `${timePerQ}s`, label: 'Per Q', color: '#22c55e', icon: '⏱️' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="text-lg mb-0.5">{s.icon}</div>
                  <p className="text-xl font-black" style={{ color: s.color }}>{s.val}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Feedback prompt */}
            <div className="rounded-2xl p-4 mb-5 flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.08))', border: '1px solid rgba(168,85,247,0.25)' }} onClick={onFeedback}>
              <div className="text-2xl">💬</div>
              <div className="flex-1">
                <p className="font-bold text-white text-sm">Share your thoughts!</p>
                <p className="text-xs text-white/50">Suggest a meme, report an issue, or just say hi.</p>
              </div>
              <span className="text-white/40 text-lg">›</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 30px rgba(168,85,247,0.4)' }}
                onClick={onPlayAgain}>
                <RotateCcw className="w-5 h-5" /> Play Again
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                  onClick={onNewSetup}>
                  <Users className="w-4 h-4" /> New Setup
                </button>
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                  onClick={onHome}>
                  <Home className="w-4 h-4" /> Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: Hall of Fame */}
        {activeTab === 'halloffame' && (
          <div>
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)' }}>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🌟</span>
                <h2 className="font-black text-white">All-Time Leaderboard</h2>
              </div>

              {hofLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <p className="text-white/40 text-sm">Loading legends...</p>
                </div>
              ) : hallOfFame.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">🏜️</div>
                  <p className="text-white/50 font-semibold">No records yet!</p>
                  <p className="text-white/30 text-sm mt-1">Play a game to be the first legend.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {hallOfFame.map((entry, idx) => {
                    const rankColors = ['#eab308', '#94a3b8', '#f97316'];
                    const rankColor = idx < 3 ? rankColors[idx] : 'rgba(255,255,255,0.4)';
                    const results = entry.mode === 'team' ? (entry.team_results || []) : (entry.player_results || []);
                    const topResult = results.sort ? [...results].sort((a: any, b: any) => b.score - a.score)[0] : null;

                    return (
                      <div key={entry.id} className="p-4 rounded-xl" style={{ background: idx === 0 ? 'linear-gradient(135deg, rgba(234,179,8,0.12), rgba(249,115,22,0.08))' : 'rgba(255,255,255,0.03)', border: idx === 0 ? '1px solid rgba(234,179,8,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 text-center">
                            <span className="text-xl">{getMedal(idx)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white truncate">{entry.winner_name}</p>
                            <p className="text-xs text-white/40">{formatDate(entry.created_at)} · {entry.rounds} rounds · {entry.mode}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-black" style={{ color: rankColor }}>{entry.total_score}</p>
                            <p className="text-[10px] text-white/30">pts</p>
                          </div>
                        </div>
                        {topResult && (
                          <div className="mt-2 ml-13 flex items-center gap-1.5 flex-wrap">
                            {results.slice(0, 3).map((r: any) => (
                              <span key={r.name} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {r.emoji ? `${r.emoji} ` : ''}{r.name}: {r.score}pts
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 30px rgba(168,85,247,0.4)' }}
                onClick={onPlayAgain}>
                <RotateCcw className="w-5 h-5" /> Play Again
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                  onClick={onNewSetup}>
                  <Users className="w-4 h-4" /> New Setup
                </button>
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)' }}
                  onClick={onHome}>
                  <Home className="w-4 h-4" /> Home
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== ADMIN LOGIN ====================
const AdminLogin: React.FC<{
  onLoginSuccess: () => void;
  onBack: () => void;
}> = ({ onLoginSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (authErr) throw authErr;
      if (data.user) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials or login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
      <div className="max-w-md w-full rounded-2xl p-6 sm:p-8 shadow-2xl relative border border-theme-card bg-theme-card"
        style={{ backdropFilter: 'blur(10px)' }}>
        
        {/* Back Button */}
        <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors border border-theme-card bg-theme-card">
          <span className="text-xl">⬅️</span>
        </button>

        <div className="text-center mt-6 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-purple-500/10 border border-purple-500/20 overflow-hidden">
            <GuessWhatLogo size={48} />
          </div>
          <h1 className="text-3xl font-black mb-2"><GradientText>Admin Login</GradientText></h1>
          <p className="text-sm text-theme-muted" style={{ color: 'var(--text-muted)' }}>Sign in to manage game content</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>Email Address</label>
            <input
              type="email"
              required
              className="w-full rounded-xl px-4 py-3 outline-none text-sm transition-all focus:border-purple-500 border border-theme-card bg-theme-input"
              placeholder="admin@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-muted)' }}>Password</label>
            <input
              type="password"
              required
              className="w-full rounded-xl px-4 py-3 outline-none text-sm transition-all focus:border-purple-500 border border-theme-card bg-theme-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-95 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-6"
            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ==================== MAIN APP ====================
const App: React.FC = () => {
  const [screen, setScreen] = useState<GameScreen>('loading');
  const screenRef = useRef<GameScreen>('loading');
  const [content, setContent] = useState<GameContent[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showExitApp, setShowExitApp] = useState(false);

  const [isDark] = useState(true);
  const toggleTheme = () => {};

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Keep screenRef in sync with screen so popstate handler has current value
  const navigateToScreen = (s: GameScreen) => {
    screenRef.current = s;
    setScreen(s);
    // Push a new history entry so back button has something to intercept
    window.history.pushState({ screen: s }, '', window.location.href);
  };

  // Back-button / device back button interception
  useEffect(() => {
    // Seed the initial history entry
    window.history.replaceState({ screen: 'loading' }, '', window.location.href);

    const handlePopState = () => {
      const currentScreen = screenRef.current;

      // For active gameplay, intercept back and show exit game confirm
      if (currentScreen === 'playing' || currentScreen === 'reveal') {
        // Re-push the current state so next back press triggers again
        window.history.pushState({ screen: currentScreen }, '', window.location.href);
        setShowExitConfirm(true);
        return;
      }

      // For home screen, show exit app confirm
      if (currentScreen === 'home') {
        window.history.pushState({ screen: 'home' }, '', window.location.href);
        setShowExitApp(true);
        return;
      }

      // Parent screen map for all other screens
      const parentMap: Partial<Record<GameScreen, GameScreen>> = {
        'admin-login': 'home',
        'admin': 'home',
        'setup': 'home',
        'lobby': 'setup',
        'scoreboard': 'home',
        'loading': 'home',
      };
      const parent = parentMap[currentScreen] ?? 'home';
      screenRef.current = parent;
      setScreen(parent);
      window.history.replaceState({ screen: parent }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAdmin(!!session);
      setAdminEmail(session?.user?.email || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(!!session);
      setAdminEmail(session?.user?.email || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const [gameSettings, setGameSettings] = useState<any>(null);
  const [gameState, setGameState] = useState({
    players: [] as Player[],
    teams: [] as Team[],
    questions: [] as (GameContent & { shuffledOptions?: string[] })[],
    currentIdx: 0,
    currentQuestion: null as GameContent | null,
  });
  const [gameStats, setGameStats] = useState(loadStats);

  const navigate = (s: GameScreen) => navigateToScreen(s);

  // Save game results to Supabase scoreboard table
  const saveGameResults = async (players: Player[], teams: Team[], mode: GameMode, numRounds: number, totalScore: number, winnerName: string) => {
    try {
      await supabase.from('scoreboard').insert([{
        mode,
        rounds: numRounds,
        total_score: totalScore,
        winner_name: winnerName,
        player_results: mode === 'individual' ? players.map(p => ({ name: p.name, score: p.score, streak: p.streak, bestStreak: p.bestStreak, correctAnswers: p.correctAnswers, totalAnswers: p.totalAnswers })) : null,
        team_results: mode === 'team' ? teams.map(t => ({ name: t.name, score: t.score, color: t.color, emoji: t.emoji })) : null,
      }]);
    } catch (err) {
      console.error('Failed to save game results to Supabase scoreboard:', err);
    }
  };

  const refreshContent = async () => {
    try {
      const { data, error } = await supabase
        .from('game_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setContent(data.map(mapFromDb));
      }
    } catch (err: any) {
      console.error('Error fetching game content from Supabase:', err);
      setFetchError(err.message || 'Failed to load content from Supabase.');
      setContent(loadContent());
    }
  };

  useEffect(() => {
    refreshContent();
  }, []);

  const handleStartGame = (settings: any) => {
    setGameSettings(settings);
    const filtered = content.filter((c: GameContent) =>
      settings.categories.includes(c.type) && settings.questionTypes.includes(c.questionType || 'multiple-choice')
    );
    const questionLimit = settings.playUnlimited ? filtered.length : settings.rounds;
    const shuffled = shuffle(filtered).slice(0, questionLimit);
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
    navigateToScreen('lobby');
  };

  const handleReveal = () => navigateToScreen('reveal');

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

      // Save to Supabase
      const finalMode: GameMode = gameSettings?.mode || 'individual';
      const allEntities = finalMode === 'team' ? updatedTeams : updatedPlayers;
      const sorted = [...allEntities].sort((a, b) => b.score - a.score);
      const winnerName = sorted[0]?.name || 'Unknown';
      const totalScore = sorted.reduce((s, e) => s + e.score, 0);
      saveGameResults(updatedPlayers, updatedTeams, finalMode, gameState.questions.length, totalScore, winnerName);

      navigateToScreen('scoreboard');
    } else {
      setGameState(prev => ({
        ...prev, players: updatedPlayers, teams: updatedTeams,
        currentIdx: nextIdx, currentQuestion: prev.questions[nextIdx],
      }));
      navigateToScreen('playing');
    }
  };

  const confirmExitGame = () => {
    const stats = loadStats();
    stats.gamesPlayed += 1;
    stats.lastPlayed = new Date().toISOString();
    saveStats(stats);
    setGameStats(stats);
    setShowExitConfirm(false);

    // Save partial results to Supabase
    const finalMode: GameMode = gameSettings?.mode || 'individual';
    const allEntities = finalMode === 'team' ? gameState.teams : gameState.players;
    const sorted = [...allEntities].sort((a, b) => b.score - a.score);
    const winnerName = sorted[0]?.name || 'Unknown';
    const totalScore = sorted.reduce((s, e) => s + e.score, 0);
    saveGameResults(gameState.players, gameState.teams, finalMode, gameState.currentIdx + 1, totalScore, winnerName);

    navigateToScreen('scoreboard');
  };

  const handlePlayAgain = () => {
    if (!gameSettings) return;

    const filtered = content.filter((c: GameContent) =>
      gameSettings.categories.includes(c.type) && gameSettings.questionTypes.includes(c.questionType || 'multiple-choice')
    );
    const questionLimit = gameSettings.playUnlimited ? filtered.length : gameSettings.rounds;
    const shuffled = shuffle(filtered).slice(0, questionLimit);
    const questions = shuffled.map(q => ({
      ...q, shuffledOptions: q.options ? shuffle(q.options) : undefined,
    }));

    if (questions.length === 0) {
      setAlertInfo({ open: true, title: 'No questions available', message: 'Please add questions in the Admin panel before starting a game.' });
      return;
    }

    setGameState(prev => ({
      players: prev.players.map((p: Player) => ({ ...p, score: 0, streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0 })),
      teams: prev.teams.map((t: Team) => ({ ...t, score: 0 })),
      questions,
      currentIdx: 0,
      currentQuestion: questions[0],
    }));
    navigateToScreen('lobby');
  };

  const handleNewSetup = () => {
    setGameState({ players: [], teams: [], questions: [], currentIdx: 0, currentQuestion: null });
    navigateToScreen('setup');
  };

  const [alertInfo, setAlertInfo] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    navigate('home');
  };

  const scorecardRounds = gameState.questions.length
    ? Math.min(gameState.currentIdx + 1, gameState.questions.length)
    : (gameSettings?.rounds || 0);

  // Hide FAB on loading screen
  const showFAB = screen !== 'loading';

  return (
    <AnimatedBg isDark={isDark}>
      {/* Feedback Modal */}
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} currentScreen={screen} />

      {/* Exit App Confirmation */}
      <ConfirmModal
        open={showExitApp}
        title="Leave the game? 👋"
        message="You're about to exit. Your current session will not be saved. See you next time!"
        confirmLabel="Exit App"
        cancelLabel="Stay"
        destructive
        onCancel={() => setShowExitApp(false)}
        onConfirm={() => { setShowExitApp(false); window.history.go(-1); }}
      />

      <AlertModal open={alertInfo.open} title={alertInfo.title} message={alertInfo.message} onOk={() => setAlertInfo({ open: false, title: '', message: '' })} />
      <ConfirmModal
        open={showExitConfirm}
        title="Exit game?"
        message="The game will end now and your current scores will be shown on the score card."
        confirmLabel="Exit"
        destructive
        onCancel={() => setShowExitConfirm(false)}
        onConfirm={confirmExitGame}
      />

      {screen === 'loading' && <LoadingScreen onComplete={() => { screenRef.current = 'home'; setScreen('home'); window.history.replaceState({ screen: 'home' }, '', window.location.href); }} />}
      {screen === 'home' && <HomeScreen
        onNavigate={(s) => {
          if (s === 'admin') {
            if (isAdmin) { navigate('admin'); } else { navigate('admin-login'); }
          } else {
            navigate(s);
          }
        }}
        stats={{ total: content.length, games: gameStats.gamesPlayed }}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />}
      {screen === 'admin-login' && <AdminLogin
        onLoginSuccess={() => { setIsAdmin(true); navigate('admin'); }}
        onBack={() => navigate('home')}
      />}
      {screen === 'admin' && <AdminScreen
        content={content}
        onRefresh={refreshContent}
        onBack={() => navigate('home')}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        adminEmail={adminEmail}
      />}
      {screen === 'setup' && <GameSetup onBack={() => navigate('home')} onStart={handleStartGame} isDark={isDark} onToggleTheme={toggleTheme} />}
      {screen === 'lobby' && gameSettings && <GameLobby settings={gameSettings} onStart={() => navigateToScreen('playing')} onBack={() => navigate('setup')} isDark={isDark} onToggleTheme={toggleTheme} />}
      {screen === 'playing' && gameState.currentQuestion && (
        <GamePlay question={gameState.currentQuestion} roundNumber={gameState.currentIdx + 1} totalRounds={gameState.questions.length} timePerQ={gameSettings?.timePerQ || 30} onReveal={handleReveal} onExit={() => setShowExitConfirm(true)} players={gameState.players} teams={gameState.teams} mode={gameSettings?.mode || 'individual'} />
      )}
      {screen === 'reveal' && gameState.currentQuestion && (
        <RevealScreen question={gameState.currentQuestion} roundNumber={gameState.currentIdx + 1} totalRounds={gameState.questions.length} scores={{ players: gameState.players, teams: gameState.teams, mode: gameSettings?.mode || 'individual' }} currentIdx={gameState.currentIdx} onNext={handleNext} />
      )}
      {screen === 'scoreboard' && (
        <Scoreboard scores={{ players: gameState.players, teams: gameState.teams, mode: gameSettings?.mode || 'individual' }} rounds={scorecardRounds} timePerQ={gameSettings?.timePerQ || 30} onPlayAgain={handlePlayAgain} onNewSetup={handleNewSetup} onHome={() => navigate('home')} isDark={isDark} onToggleTheme={toggleTheme} onFeedback={() => setShowFeedback(true)} />
      )}

      {fetchError && (
        <div className="fixed bottom-20 left-4 right-4 z-50 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-200 text-sm flex justify-between items-center" style={{ backdropFilter: 'blur(8px)' }}>
          <span>{fetchError} (Using offline local backup)</span>
          <button onClick={() => setFetchError(null)} className="text-xs underline ml-2 hover:text-white transition-colors">Dismiss</button>
        </div>
      )}

      {/* Floating Feedback Button (FAB) */}
      {showFAB && (
        <button
          id="feedback-fab"
          onClick={() => setShowFeedback(true)}
          className="fixed z-[150] flex items-center gap-2 font-bold text-white transition-all active:scale-95 hover:scale-105 select-none"
          style={{
            bottom: '20px',
            right: '16px',
            padding: '10px 16px',
            borderRadius: '50px',
            background: 'linear-gradient(135deg, #a855f7, #ec4899)',
            boxShadow: '0 4px 20px rgba(168,85,247,0.5), 0 2px 8px rgba(0,0,0,0.3)',
            fontSize: '13px',
            letterSpacing: '0.01em',
          }}
          aria-label="Open feedback form"
        >
          <span>💬</span>
          <span>Feedback</span>
        </button>
      )}
    </AnimatedBg>
  );
};

export default App;
