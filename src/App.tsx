import React, { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import logoImg from '../Logo/logo.png';
import { getQRCodeUrl } from './utils/qr';
import { MobileBuzzerView } from './components/MobileBuzzerView';
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
  Eye,
  Volume2,
  QrCode,
  Sparkles,
  Settings2,
  CheckCircle,
  Copy,
  Check,
} from 'lucide-react';
import type { CustomQuestionType, BuzzerEntry } from './types';

// ==================== TYPES ====================
type ContentType = 'meme-dialogue' | 'song-tune' | 'movie-meme' | string;
type GameMode = 'individual' | 'team';
type GameScreen = 'loading' | 'home' | 'admin' | 'admin-login' | 'setup' | 'lobby' | 'playing' | 'reveal' | 'scoreboard' | 'buzzer';
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
  answerAudioUrl?: string;
  answerAudioData?: string;
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

const DEFAULT_QUESTION_TYPES: CustomQuestionType[] = [
  { id: '1', key: 'meme-dialogue', label: 'Meme Dialogue', icon: '💬', color: '#a855f7', isSystem: true },
  { id: '2', key: 'song-tune', label: 'Song Tune', icon: '🎵', color: '#ec4899', isSystem: true },
  { id: '3', key: 'movie-meme', label: 'Movie Meme', icon: '🎬', color: '#06b6d4', isSystem: true },
];

const SAMPLE_CONTENT: GameContent[] = [];

const TEAM_COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#06b6d4', '#eab308', '#ef4444'];
const TEAM_EMOJIS = ['🦁', '🐉', '🦅', '🐺', '🦊', '🐯', '🦈', '🐙'];

function generateSessionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'GV-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

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

// Telegram helpers
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId.trim(), text: formattedText, parse_mode: 'HTML' }),
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

async function sendWaitlistToTelegram(name: string, email: string): Promise<{ success: boolean; error?: string }> {
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
    const cleanEmail = email.trim();
    const formattedText = `🚀 <b>New Waitlist Signup for Custom Game!</b>\n\n👤 <b>Name:</b> ${cleanName}\n📧 <b>Email:</b> ${cleanEmail}\n\n<i>This person has joined the waitlist to make their own game!</i>`;

    const response = await fetch(`https://api.telegram.org/bot${token.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId.trim(), text: formattedText, parse_mode: 'HTML' }),
    });

    if (!response.ok) {
      const errData = await response.json();
      return { success: false, error: errData.description || 'API request failed.' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Error sending Telegram waitlist signup:', err);
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
    answerAudioUrl: dbItem.answer_audio_url || undefined,
    answerAudioData: dbItem.answer_audio_url || undefined,
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
        <p className="text-sm text-white/50 whitespace-pre-line mb-6">{message}</p>
        <button className="w-full py-3 rounded-xl font-bold text-white" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={onOk}>
          Got it
        </button>
      </div>
    </div>
  );
};

const ImageWithSpinner: React.FC<{
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ src, alt, className = '', style }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
  }, [src]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`} style={style}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm z-10 p-4 min-h-[140px]">
          <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 border-r-pink-500 rounded-full animate-spin mb-2" />
          <span className="text-xs font-semibold text-white/70 animate-pulse">Loading image...</span>
        </div>
      )}
      {error ? (
        <div className="p-6 text-center text-xs text-white/40">
          <span>⚠️ Image failed to load</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'} ${className}`}
          style={style}
        />
      )}
    </div>
  );
};

const LoadingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

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

    return () => {
      clearInterval(timer);
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
          { icon: <span className="text-3xl">🎮</span>, title: 'Play Game', desc: 'Start session & join with mobile QR', action: () => onNavigate('setup') },
          { icon: <span className="text-3xl">🏆</span>, title: 'Scoreboard', desc: 'View scores & legends', action: () => onNavigate('scoreboard') },
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
    </div>
  );
};

// ==================== QUESTION PREVIEW MODAL WITH PLAY & PAUSE ====================
const QuestionPreviewModal: React.FC<{ item: GameContent; onClose: () => void }> = ({ item, onClose }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [answerAudioPlaying, setAnswerAudioPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const answerAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const qAudio = item.audioData || item.audioUrl;
    if (qAudio) {
      const audio = new Audio(qAudio);
      audioRef.current = audio;
      audio.play().then(() => setAudioPlaying(true)).catch(() => {});
      audio.onended = () => { setAudioPlaying(false); setAudioPaused(false); };
    }

    return () => {
      document.body.style.overflow = 'unset';
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      if (answerAudioRef.current) { answerAudioRef.current.pause(); answerAudioRef.current = null; }
    };
  }, [item]);

  const playAnswerAudio = () => {
    const aAudio = item.answerAudioData || item.answerAudioUrl;
    if (!aAudio) return;
    if (audioRef.current) { audioRef.current.pause(); setAudioPlaying(false); setAudioPaused(false); }
    if (answerAudioRef.current) { answerAudioRef.current.pause(); }

    const audio = new Audio(aAudio);
    answerAudioRef.current = audio;
    setAnswerAudioPlaying(true);
    audio.play().then(() => setAnswerAudioPlaying(true)).catch(err => {
      console.error(err);
      setAnswerAudioPlaying(false);
    });
    audio.onended = () => { setAnswerAudioPlaying(false); answerAudioRef.current = null; };
  };

  const playQuestionAudio = () => {
    const qAudio = item.audioData || item.audioUrl;
    if (!qAudio) return;
    if (audioRef.current) { audioRef.current.pause(); }
    const audio = new Audio(qAudio);
    audioRef.current = audio;
    setAudioPlaying(true);
    setAudioPaused(false);
    audio.play().then(() => setAudioPlaying(true)).catch(console.error);
    audio.onended = () => { setAudioPlaying(false); setAudioPaused(false); };
  };

  const togglePauseQuestionAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
      setAudioPaused(true);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
      setAudioPaused(false);
    }
  };

  const handleReveal = () => {
    setIsRevealed(true);
    playAnswerAudio();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(14px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl rounded-3xl border border-purple-500/30 bg-slate-900/95 p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-500/20 text-purple-300 flex items-center gap-1.5 border border-purple-500/30">
              <Eye className="w-3.5 h-3.5" /> Question Test Preview
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
              {item.points} pts
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/10 text-white/70">
              {item.type}
            </span>
            {item.movie && (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                📁 {item.movie}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {(item.imageUrl || item.imageData) && (
            <div className="overflow-hidden rounded-2xl border border-white/10 flex items-center justify-center bg-black/20">
              <ImageWithSpinner src={item.imageUrl || item.imageData!} alt="Preview" className="max-h-[40vh] w-full object-contain rounded-2xl" />
            </div>
          )}

          {(item.videoUrl || item.videoData) && (
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
              <video src={item.videoUrl || item.videoData} controls className="max-h-[40vh] w-full object-contain rounded-2xl" />
            </div>
          )}

          {(item.audioUrl || item.audioData) && (
            <div className="p-5 rounded-2xl border border-purple-500/30 bg-purple-500/10 flex flex-col items-center gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{audioPlaying ? '🎵' : '🔇'}</span>
                <span className="text-sm font-bold text-purple-300">{audioPlaying ? 'Question Audio Playing' : audioPaused ? 'Question Audio Paused' : 'Question Audio Ready'}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={playQuestionAudio}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-cyan-200 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Volume2 className={`w-4 h-4 ${audioPlaying ? 'animate-bounce' : ''}`} />
                  <span>{audioPlaying ? 'Replay Audio' : '🔊 Play / Replay Audio'}</span>
                </button>
                <button
                  type="button"
                  onClick={togglePauseQuestionAudio}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-200 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>{audioPlaying ? '⏸️ Pause' : '▶️ Resume'}</span>
                </button>
              </div>
              {item.audioHint && (
                <div className="w-full text-center">
                  <button type="button" onClick={() => setShowHint(!showHint)} className="text-xs text-white/50 underline hover:text-white/80">
                    {showHint ? 'Hide Text Clue' : 'Show Text Clue'}
                  </button>
                  {showHint && <p className="mt-2 p-3 text-xs bg-white/5 rounded-xl border border-white/10 text-white/80">{item.audioHint}</p>}
                </div>
              )}
            </div>
          )}

          <h2 className="text-xl font-bold text-white text-center leading-snug">{item.question}</h2>

          {item.questionType === 'multiple-choice' && item.options && item.options.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              {item.options.map((opt, idx) => {
                const isCorrect = isRevealed && opt === item.answer;
                return (
                  <div key={idx} className={`p-3.5 rounded-xl border transition-all ${isCorrect ? 'bg-green-500/20 border-green-400 text-green-200 font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]' : 'bg-white/5 border-white/10 text-white/80'}`}>
                    <div className="flex items-center gap-2.5">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isCorrect ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-white/60'}`}>{isCorrect ? '✓' : String.fromCharCode(65 + idx)}</span>
                      <span className="text-sm">{opt}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!isRevealed ? (
            <button onClick={handleReveal} className="w-full py-3.5 rounded-xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
              👁️ Reveal Answer
            </button>
          ) : (
            <div className="p-5 rounded-2xl border-2 border-green-500/40 bg-green-500/10 text-center animate-fadeIn shadow-[0_0_20px_rgba(34,197,94,0.15)]">
              <div className="text-2xl mb-1">🎯</div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-green-400 mb-1">Correct Answer</h3>
              <p className="text-2xl font-black text-white">{item.answer}</p>
              {(item.answerAudioData || item.answerAudioUrl) && (
                <button
                  type="button"
                  onClick={playAnswerAudio}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)', boxShadow: '0 4px 15px rgba(16,185,129,0.3)' }}
                >
                  <Volume2 className={`w-4 h-4 ${answerAudioPlaying ? 'animate-bounce' : ''}`} />
                  <span>{answerAudioPlaying ? 'Playing Sound...' : '🔊 Replay Answer Audio'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors cursor-pointer">
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

// Preset suggested question prompts for quick-fill in content creator (sets question ONLY)
const SUGGESTED_QUESTION_PROMPTS: Record<string, string[]> = {
  'meme-dialogue': [
    'What is the famous dialogue from this meme?',
    'Complete the meme: "One does not simply ___"',
    'What phrase is associated with this meme?',
    'The "Distracted Boyfriend" meme represents what?',
    'What action is performed in this famous meme?',
  ],
  'song-tune': [
    '🎵 Identify this tune: "Tum hi ho, ab tum hi ho..."',
    '🎵 Identify the song: "Never gonna give you up..."',
    '🎵 "Na na na na, hey hey hey, goodbye!" — Name this song',
    '🎵 "Baby Shark doo doo..." — What song is this?',
    '🎵 Guess the movie or song played in this audio clip:',
  ],
  'movie-meme': [
    'Which movie is referenced by the meme: "I am Groot"?',
    'This meme: "I am your father" — Which movie and character?',
    'The "Leonardo DiCaprio pointing at TV" meme is from which movie?',
    'The "Matrix Red Pill vs Blue Pill" meme references what concept?',
    'Which movie scene is recreated in this meme?',
  ],
};

// ==================== ADMIN SCREEN ====================
const AdminScreen: React.FC<{
  content: GameContent[];
  questionTypes: CustomQuestionType[];
  onRefresh: () => Promise<void>;
  onRefreshTypes: () => Promise<void>;
  onBack: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  adminEmail: string | null;
}> = ({ content: initialContent, questionTypes, onRefresh, onRefreshTypes, onBack, isDark, onToggleTheme, onLogout, adminEmail }) => {
  const [content, setContent] = useState<GameContent[]>(initialContent);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [showMovieDropdown, setShowMovieDropdown] = useState(false);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeForm, setTypeForm] = useState({ key: '', label: '', icon: '🎯', color: '#a855f7' });
  const [editingTypeKey, setEditingTypeKey] = useState<string | null>(null);

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
    answerAudioData: '' as string,
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    points: 20,
    movie: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [answerAudioFile, setAnswerAudioFile] = useState<File | null>(null);

  const [uploading, setUploading] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameContent | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<GameContent | null>(null);
  const [alertInfo, setAlertInfo] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: '', message: '' });

  const folderScrollPosRef = useRef<number>(0);
  const [prevSelectedFolder, setPrevSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  useEffect(() => {
    if (prevSelectedFolder !== null && selectedFolder === null) {
      const savedY = folderScrollPosRef.current;
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedY, behavior: 'instant' as ScrollBehavior });
      });
    }
    setPrevSelectedFolder(selectedFolder);
  }, [selectedFolder]);

  useEffect(() => {
    if (showForm || showTypeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showForm, showTypeModal]);

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

  const isMediaUsedByOthers = (url: string | undefined, currentId: string | null) => {
    if (!url) return false;
    return content.some(item => item.id !== currentId && (
      item.imageUrl === url || item.imageData === url ||
      item.videoUrl === url || item.videoData === url ||
      item.audioUrl === url || item.audioData === url
    ));
  };

  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.label.trim()) {
      showAlert('Missing name', 'Please enter a name for the question type.');
      return;
    }

    const key = editingTypeKey || typeForm.key.trim().toLowerCase().replace(/[^a-z0-9]/g, '-') || typeForm.label.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');

    try {
      const payload = {
        key,
        label: typeForm.label.trim(),
        icon: typeForm.icon || '🎯',
        color: typeForm.color || '#a855f7',
        is_system: false,
      };

      const { error } = await supabase.from('question_types').upsert([payload]);
      if (error) {
        if (error.message?.includes('permission denied') || error.message?.includes('schema cache') || error.message?.includes('does not exist') || error.code === '42501') {
          showAlert(
            'Supabase Permission Required',
            `Supabase returned: "${error.message}"\n\n` +
            `To fix table permissions, run this in Supabase SQL Editor:\n\n` +
            `GRANT ALL ON TABLE public.question_types TO anon, authenticated, service_role;\n\n` +
            `We have saved your question type locally so you can continue immediately!`
          );
          await onRefreshTypes();
          setShowTypeModal(false);
          setTypeForm({ key: '', label: '', icon: '🎯', color: '#a855f7' });
          setEditingTypeKey(null);
          return;
        }
        throw error;
      }

      await onRefreshTypes();
      setShowTypeModal(false);
      setTypeForm({ key: '', label: '', icon: '🎯', color: '#a855f7' });
      setEditingTypeKey(null);
    } catch (err: any) {
      console.error('Error saving question type:', err);
      showAlert('Error saving type', err.message || 'Could not save question type.');
    }
  };

  const handleDeleteType = async (typeKey: string) => {
    try {
      const { error } = await supabase.from('question_types').delete().eq('key', typeKey);
      if (error) throw error;
      await onRefreshTypes();
    } catch (err: any) {
      console.error('Error deleting question type:', err);
      showAlert('Error deleting type', err.message || 'Could not delete question type.');
    }
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
      let answerAudioUrl = form.answerAudioData;

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

      if (imageFile) { imageUrl = await uploadToStorage(imageFile, 'img'); }
      if (videoFile) { videoUrl = await uploadToStorage(videoFile, 'vid'); }
      if (audioFile) { audioUrl = await uploadToStorage(audioFile, 'aud'); }
      if (answerAudioFile) { answerAudioUrl = await uploadToStorage(answerAudioFile, 'ans_aud'); }

      if (!form.imageData) imageUrl = '';
      if (!form.videoData) videoUrl = '';
      if (!form.audioData) audioUrl = '';
      if (!form.answerAudioData) answerAudioUrl = '';

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
        answer_audio_url: answerAudioUrl || null,
        difficulty: form.difficulty,
        points: form.points,
        movie: form.movie ? form.movie.trim() : null,
      };

      if (editId) {
        const originalItem = content.find(c => c.id === editId);
        if (originalItem) {
          const filesToDelete: string[] = [];
          if (originalItem.imageUrl && (imageFile || !form.imageData) && !isMediaUsedByOthers(originalItem.imageUrl, editId)) { const name = getFileNameFromUrl(originalItem.imageUrl); if (name) filesToDelete.push(name); }
          if (originalItem.videoUrl && (videoFile || !form.videoData) && !isMediaUsedByOthers(originalItem.videoUrl, editId)) { const name = getFileNameFromUrl(originalItem.videoUrl); if (name) filesToDelete.push(name); }
          if (originalItem.audioUrl && (audioFile || !form.audioData) && !isMediaUsedByOthers(originalItem.audioUrl, editId)) { const name = getFileNameFromUrl(originalItem.audioUrl); if (name) filesToDelete.push(name); }
          if (originalItem.answerAudioUrl && (answerAudioFile || !form.answerAudioData) && !isMediaUsedByOthers(originalItem.answerAudioUrl, editId)) { const name = getFileNameFromUrl(originalItem.answerAudioUrl); if (name) filesToDelete.push(name); }
          if (filesToDelete.length > 0) { await supabase.storage.from('game-media').remove(filesToDelete); }
        }

        const { error } = await supabase.from('game_content').update(dbPayload).eq('id', editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('game_content').insert([dbPayload]);
        if (error) throw error;
      }

      await onRefresh();
      setForm({ type: questionTypes[0]?.key || 'meme-dialogue', questionType: 'open-ended', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', answerAudioData: '', difficulty: 'medium', points: 20, movie: '' });
      setImageFile(null);
      setVideoFile(null);
      setAudioFile(null);
      setAnswerAudioFile(null);
      setShowForm(false);
      setEditId(null);
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
      imageData: item.imageUrl || item.imageData || '',
      videoData: item.videoUrl || item.videoData || '',
      audioData: item.audioUrl || item.audioData || '',
      audioHint: item.audioHint || '',
      answerAudioData: item.answerAudioUrl || item.answerAudioData || '',
      difficulty: item.difficulty,
      points: item.points,
      movie: item.movie || '',
    });
    setImageFile(null);
    setVideoFile(null);
    setAudioFile(null);
    setAnswerAudioFile(null);
    setIsCreatingFolder(!item.movie);
    setShowForm(true);
  };

  const handleFileUpload = async (type: 'image' | 'video' | 'audio' | 'answerAudio', e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (type === 'image') { setForm(f => ({ ...f, imageData: base64 })); setImageFile(file); }
      if (type === 'video') { setForm(f => ({ ...f, videoData: base64 })); setVideoFile(file); }
      if (type === 'audio') { setForm(f => ({ ...f, audioData: base64 })); setAudioFile(file); }
      if (type === 'answerAudio') { setForm(f => ({ ...f, answerAudioData: base64 })); setAnswerAudioFile(file); }
    } catch (err) {
      setAlertInfo({ open: true, title: 'Upload failed', message: 'Could not process the file.' });
    }
    setUploading(null);
  };

  const diffColor = (d: string) => d === 'easy' ? '#22c55e' : d === 'medium' ? '#eab308' : '#ef4444';
  const getTypeInfo = (k: string) => questionTypes.find(qt => qt.key === k) || { label: k, icon: '🎯', color: '#a855f7' };

  const renderQuestionCard = (item: GameContent) => {
    const tInfo = getTypeInfo(item.type);
    return (
      <div key={item.id} className="rounded-2xl border border-theme-card bg-theme-card p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-1">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ background: `${tInfo.color}20`, color: tInfo.color, border: `1px solid ${tInfo.color}40` }}>
            {tInfo.icon || '🎯'}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {item.movie && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 truncate max-w-[150px]" title={item.movie}><Folder className="w-3 h-3" /> {item.movie}</span>}
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: `${tInfo.color}20`, color: tInfo.color }}>{tInfo.label}</span>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: diffColor(item.difficulty) }}>{item.difficulty}</span>
          </div>
        </div>

        {(item.imageUrl || item.imageData) ? (
          <div className="mb-4 overflow-hidden rounded-3xl border border-white/10">
            <ImageWithSpinner src={item.imageUrl || item.imageData!} alt="Content preview" className="h-44 w-full object-cover" />
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
          {item.audioHint ? (
            <div className="rounded-2xl bg-white/5 p-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40 mb-1">Audio hint</div>
              <div>{item.audioHint}</div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>{item.points} pts</span>
            {(item.imageData || item.imageUrl) && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/15 text-purple-200"><ImageIcon className="w-3 h-3" /> Image</span>}
            {(item.videoData || item.videoUrl) && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-pink-500/15 text-pink-200"><Video className="w-3 h-3" /> Video</span>}
            {(item.audioData || item.audioUrl) && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cyan-500/15 text-cyan-200"><Music className="w-3 h-3" /> Audio</span>}
            {(item.answerAudioUrl || item.answerAudioData) && <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-200"><Mic2 className="w-3 h-3" /> Answer Audio</span>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreviewQuestion(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/15 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-500/25 transition cursor-pointer" title="Test question"><Eye className="w-4 h-4" /> Test</button>
            <button onClick={() => startEdit(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition cursor-pointer"><Edit3 className="w-4 h-4" /> Edit</button>
            <button onClick={() => setDeleteTarget(item)} className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 hover:bg-red-500/20 transition cursor-pointer"><Trash2 className="w-4 h-4" /> Delete</button>
          </div>
        </div>
      </div>
    );
  };

  const groupedContent = React.useMemo(() => {
    const movieGroups: { [movieName: string]: GameContent[] } = {};
    const independent: GameContent[] = [];

    filtered.forEach(item => {
      if (item.movie && item.movie.trim()) {
        const key = item.movie.trim();
        if (!movieGroups[key]) movieGroups[key] = [];
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
              const { error } = await supabase.from('game_content').delete().eq('id', deleteTarget.id);
              if (error) throw error;
              await onRefresh();
              setShowForm(false);
              setEditId(null);
            } catch (err: any) {
              showAlert('Error deleting', err.message || 'Failed to delete content.');
            }
          }
          setDeleteTarget(null);
        }}
      />
      <AlertModal open={alertInfo.open} title={alertInfo.title} message={alertInfo.message} onOk={() => setAlertInfo({ open: false, title: '', message: '' })} />

      {/* MANAGE QUESTION TYPES MODAL */}
      {showTypeModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)' }}>
          <div className="w-full max-w-lg rounded-3xl border border-white/15 bg-slate-950 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">Manage Question Types</h2>
              </div>
              <button onClick={() => { setShowTypeModal(false); setEditingTypeKey(null); }} className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {questionTypes.map(qt => (
                <div key={qt.key} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{qt.icon || '🎯'}</span>
                    <div>
                      <p className="font-bold text-sm text-white">{qt.label}</p>
                      <p className="text-[10px] text-white/40">Key: {qt.key} {qt.isSystem ? '(System)' : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!qt.isSystem && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTypeKey(qt.key);
                            setTypeForm({ key: qt.key, label: qt.label, icon: qt.icon || '🎯', color: qt.color || '#a855f7' });
                          }}
                          className="p-1.5 text-xs text-cyan-300 hover:bg-cyan-500/20 rounded-lg transition"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteType(qt.key)}
                          className="p-1.5 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSaveType} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                {editingTypeKey ? 'Edit Question Type' : '➕ Add New Question Type'}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-white/50 block mb-1">Name / Label</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bollywood Trivia"
                    value={typeForm.label}
                    onChange={e => setTypeForm({ ...typeForm, label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/15 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-white/50 block mb-1">Emoji / Icon</label>
                  <input
                    type="text"
                    placeholder="e.g. 🎬"
                    value={typeForm.icon}
                    onChange={e => setTypeForm({ ...typeForm, icon: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white/5 border border-white/15 text-white outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {editingTypeKey && (
                  <button type="button" onClick={() => { setEditingTypeKey(null); setTypeForm({ key: '', label: '', icon: '🎯', color: '#a855f7' }); }} className="px-3 py-1.5 text-xs rounded-xl bg-white/10 text-white/70">
                    Cancel
                  </button>
                )}
                <button type="submit" className="px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md">
                  {editingTypeKey ? 'Update Type' : 'Save New Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="w-10 h-10 rounded-xl flex items-center justify-center border border-theme-card bg-theme-card">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <GuessWhatLogo size={36} />
            <div>
              <h1 className="text-2xl font-bold"><GradientText>Admin Panel</GradientText></h1>
              <p className="text-white/40 text-sm">{adminEmail ? `Logged in as: ${adminEmail}` : 'Manage your game content'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setShowTypeModal(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl font-semibold text-purple-200 border border-purple-500/30 bg-purple-500/20 text-xs hover:bg-purple-500/30 transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4" /> Manage Question Types
            </button>
            <button onClick={onLogout} className="p-3 rounded-xl flex items-center justify-center hover:scale-105 transition-all shadow-md cursor-pointer border border-red-500/20 hover:bg-red-500/10 text-red-400" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
            <button
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-semibold text-white border-0 cursor-pointer transition-all hover:opacity-90 text-sm"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
              onClick={() => { setShowForm(true); setEditId(null); setForm({ type: questionTypes[0]?.key || 'meme-dialogue', questionType: 'open-ended', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', answerAudioData: '', difficulty: 'medium', points: 20, movie: selectedFolder && selectedFolder !== '__independent__' ? selectedFolder : '' }); setIsCreatingFolder(!selectedFolder || selectedFolder === '__independent__'); setImageFile(null); setVideoFile(null); setAudioFile(null); setAnswerAudioFile(null); }}
            >
              <Plus className="w-4 h-4" /> Add Content
            </button>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-xl" onClick={() => { setShowForm(false); setEditId(null); }} />
            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-[24px] sm:rounded-[32px] border border-white/10 bg-slate-950/95 shadow-[0_40px_120px_rgba(0,0,0,0.55)] flex flex-col animate-fadeIn">
              <div className="flex items-start justify-between gap-3 p-5 sm:p-6 border-b border-white/10 flex-shrink-0">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold">{editId ? 'Edit Content' : 'Add New Content'}</h2>
                  <p className="text-xs sm:text-sm text-white/50">Background is locked while editing. Save or delete when ready.</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (!form.question || !form.answer) {
                        showAlert('Missing information', 'Please enter at least a question and answer to preview.');
                        return;
                      }
                      setPreviewQuestion({
                        id: editId || 'temp-preview',
                        type: form.type,
                        questionType: form.questionType,
                        question: form.question,
                        answer: form.answer,
                        options: form.options.filter(Boolean),
                        imageData: form.imageData,
                        imageUrl: form.imageData,
                        videoData: form.videoData,
                        videoUrl: form.videoData,
                        audioData: form.audioData,
                        audioUrl: form.audioData,
                        audioHint: form.audioHint,
                        answerAudioData: form.answerAudioData,
                        answerAudioUrl: form.answerAudioData,
                        difficulty: form.difficulty,
                        points: form.points,
                        movie: form.movie,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-200 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all cursor-pointer shadow-md"
                  >
                    <Eye className="w-4 h-4" /> Preview
                  </button>
                  <button onClick={() => { setShowForm(false); setEditId(null); }} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-white/10 hover:bg-white/15 transition flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Question Type</label>
                    <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value as ContentType })}>
                      {questionTypes.map(qt => (
                        <option key={qt.key} value={qt.key} style={{ background: '#1a1a2e' }}>
                          {qt.icon || '🎯'} {qt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Format</label>
                    <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} value={form.questionType} onChange={e => setForm({ ...form, questionType: e.target.value as QuestionType })}>
                      <option value="multiple-choice" style={{ background: '#1a1a2e' }}>Multiple Choice</option>
                      <option value="open-ended" style={{ background: '#1a1a2e' }}>Open Ended</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Difficulty</label>
                    <select className="w-full rounded-xl px-4 py-3 text-white border-0 outline-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} value={form.difficulty} onChange={e => { const d = e.target.value as 'easy' | 'medium' | 'hard'; setForm({ ...form, difficulty: d, points: d === 'easy' ? 10 : d === 'medium' ? 20 : 30 }); }}>
                      <option value="easy" style={{ background: '#1a1a2e' }}>Easy (10 pts)</option>
                      <option value="medium" style={{ background: '#1a1a2e' }}>Medium (20 pts)</option>
                      <option value="hard" style={{ background: '#1a1a2e' }}>Hard (30 pts)</option>
                    </select>
                  </div>
                </div>

                {/* Question Input with Clickable Question Suggestion Chips right above */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label className="text-sm text-white/60 block">Question</label>
                    
                    {/* Clickable Question Suggestions List */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs text-pink-400 font-semibold flex items-center gap-1">
                        💡 Suggested:
                      </span>
                      {(SUGGESTED_QUESTION_PROMPTS[form.type] || SUGGESTED_QUESTION_PROMPTS['meme-dialogue'] || []).map((qText, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setForm({ ...form, question: qText })}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-200 hover:bg-pink-500/30 transition-all cursor-pointer truncate max-w-[210px]"
                          title={`Click to use question: "${qText}"`}
                        >
                          {qText}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <textarea
                    className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm"
                    rows={2}
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="Enter question or click a suggestion above..."
                    value={form.question}
                    onChange={e => setForm({ ...form, question: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1 block">Correct Answer</label>
                  <input className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} placeholder="The correct answer" value={form.answer} onChange={e => setForm({ ...form, answer: e.target.value })} />
                </div>

                {/* Movie / Folder Name Input with Autocomplete Suggestions Dropdown */}
                <div className="relative">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm text-white/60 block">Movie / Folder Name</label>
                    {availableFolders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowMovieDropdown(!showMovieDropdown)}
                        className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer font-medium"
                      >
                        {showMovieDropdown ? 'Hide Suggestions' : '💡 Select Existing Movie'}
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <input
                      className="w-full rounded-xl px-4 py-3 text-white outline-none text-sm pr-10"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                      placeholder="Type movie name (e.g. Marvel, Bollywood, Shrek) or pick from suggestions"
                      value={form.movie || ''}
                      onFocus={() => setShowMovieDropdown(true)}
                      onChange={e => {
                        setForm({ ...form, movie: e.target.value });
                        setShowMovieDropdown(true);
                      }}
                    />
                    {form.movie && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, movie: '' })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown Overlay */}
                  {showMovieDropdown && availableFolders.length > 0 && (
                    <div
                      className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl overflow-hidden shadow-2xl border border-purple-500/30 max-h-48 overflow-y-auto"
                      style={{ background: 'rgba(18, 18, 42, 0.98)', backdropFilter: 'blur(16px)' }}
                    >
                      <div className="p-2.5 border-b border-white/10 text-[11px] font-semibold text-purple-300 uppercase tracking-wider flex justify-between items-center bg-white/5">
                        <span>Suggested Movies ({availableFolders.filter(m => !form.movie || m.toLowerCase().includes(form.movie.toLowerCase())).length})</span>
                        <button type="button" onClick={() => setShowMovieDropdown(false)} className="text-white/40 hover:text-white">Close</button>
                      </div>
                      {availableFolders
                        .filter(m => !form.movie || m.toLowerCase().includes((form.movie || '').toLowerCase()))
                        .map(folderName => (
                          <div
                            key={folderName}
                            onClick={() => {
                              setForm({ ...form, movie: folderName });
                              setShowMovieDropdown(false);
                            }}
                            className="px-4 py-2.5 text-sm text-white/90 hover:bg-purple-500/20 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <span>🎬</span>
                              <span className="font-medium">{folderName}</span>
                            </span>
                            <span className="text-xs text-white/40">
                              {content.filter(c => c.movie?.trim() === folderName).length} items
                            </span>
                          </div>
                        ))}
                      {availableFolders.filter(m => !form.movie || m.toLowerCase().includes((form.movie || '').toLowerCase())).length === 0 && (
                        <div className="p-3 text-xs text-white/40 text-center">No matching existing movies. A new movie folder will be created: "{form.movie}"</div>
                      )}
                    </div>
                  )}
                </div>

                {form.questionType === 'multiple-choice' && (
                  <div>
                    <label className="text-sm text-white/60 mb-1 block">Options</label>
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2 mb-2">
                        <input className="flex-1 rounded-xl px-4 py-2.5 text-white outline-none text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }} placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const opts = [...form.options]; opts[i] = e.target.value; setForm({ ...form, options: opts }); }} />
                        <button className={`text-xs px-3 py-1.5 rounded-lg ${form.answer === opt ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-white/30'}`} onClick={() => setForm({ ...form, answer: opt })}>Set Answer</button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="text-sm text-white/60 mb-2 block">Upload Media</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <p className="text-xs text-white/40 mb-1">Question Audio</p>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                        <Upload className="w-3.5 h-3.5" /> {form.audioData ? 'Replace' : 'Upload'}
                        <input type="file" accept="audio/*" onChange={e => handleFileUpload('audio', e)} className="hidden" />
                      </label>
                      {form.audioData && (
                        <div className="mt-2">
                          <audio src={form.audioData} controls className="w-full h-8 rounded-lg" />
                          <button onClick={() => { setForm(f => ({ ...f, audioData: '' })); setAudioFile(null); }} className="text-xs text-red-400 mt-1">Remove</button>
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(34,197,94,0.08)' }}>
                      <SoftIcon icon={Music} color="#22c55e" className="mx-auto mb-2" />
                      <p className="text-xs text-white/40 mb-1">Answer Audio</p>
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs cursor-pointer" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
                        <Upload className="w-3.5 h-3.5" /> {form.answerAudioData ? 'Replace' : 'Upload'}
                        <input type="file" accept="audio/*" onChange={e => handleFileUpload('answerAudio', e)} className="hidden" />
                      </label>
                      {form.answerAudioData && (
                        <div className="mt-2">
                          <audio src={form.answerAudioData} controls className="w-full h-8 rounded-lg" />
                          <button onClick={() => { setForm(f => ({ ...f, answerAudioData: '' })); setAnswerAudioFile(null); }} className="text-xs text-red-400 mt-1">Remove</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {uploading && <p className="text-xs text-white/40 mt-2 text-center">Uploading {uploading}...</p>}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 justify-end p-5 sm:p-6 border-t border-white/10 bg-slate-950/95 flex-shrink-0">
                <button disabled={isSaving} className="px-5 py-2.5 rounded-xl font-semibold cursor-pointer transition-all hover:bg-white/10 text-sm" style={{ background: 'rgba(255,255,255,0.08)', color: 'white', opacity: isSaving ? 0.5 : 1 }} onClick={() => { setShowForm(false); setEditId(null); }}>
                  Cancel
                </button>
                <button disabled={isSaving} className="px-6 py-2.5 rounded-xl font-bold text-white text-sm cursor-pointer transition-all hover:opacity-90 shadow-lg" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={handleSubmit}>
                  {isSaving ? 'Saving...' : editId ? 'Update Content' : 'Save Content'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Filters & Restored Search Bar */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all"
              style={{
                background: filter === 'all' ? 'rgba(168,85,247,0.2)' : 'rgba(255,255,255,0.05)',
                border: filter === 'all' ? '1px solid rgba(168,85,247,0.4)' : '1px solid rgba(255,255,255,0.08)',
                color: filter === 'all' ? 'white' : 'rgba(255,255,255,0.4)',
              }}
              onClick={() => { setFilter('all'); setSelectedFolder(null); }}>
              All Types
            </button>
            {questionTypes.map(qt => (
              <button
                key={qt.key}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5"
                style={{
                  background: filter === qt.key ? `${qt.color}25` : 'rgba(255,255,255,0.05)',
                  border: filter === qt.key ? `1px solid ${qt.color}50` : '1px solid rgba(255,255,255,0.08)',
                  color: filter === qt.key ? 'white' : 'rgba(255,255,255,0.4)',
                }}
                onClick={() => { setFilter(qt.key); setSelectedFolder(null); }}>
                <span>{qt.icon || '🎯'}</span>
                <span>{qt.label}</span>
              </button>
            ))}
          </div>

          {/* Search Box Restored */}
          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder="Search question, answer, or folder..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-8 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-purple-500 transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
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
                  onClick={() => {
                    folderScrollPosRef.current = window.scrollY;
                    setSelectedFolder(movieName);
                  }}
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
                onClick={() => {
                  folderScrollPosRef.current = window.scrollY;
                  setSelectedFolder('__independent__');
                }}
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
                      onClick={() => { setShowForm(true); setEditId(null); setForm({ type: questionTypes[0]?.key || 'meme-dialogue', questionType: 'open-ended', question: '', answer: '', options: ['', '', '', ''], imageData: '', videoData: '', audioData: '', audioHint: '', answerAudioData: '', difficulty: 'medium', points: 20, movie: selectedFolder === '__independent__' ? '' : selectedFolder }); setIsCreatingFolder(selectedFolder === '__independent__'); setImageFile(null); setVideoFile(null); setAudioFile(null); setAnswerAudioFile(null); }}
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
      {previewQuestion && <QuestionPreviewModal item={previewQuestion} onClose={() => setPreviewQuestion(null)} />}
    </div>
  );
};

// ==================== GAME SETUP WITH REALTIME PLAYER JOIN & UNIQUE NAME CHECK ====================
const GameSetup: React.FC<{
  questionTypes: CustomQuestionType[];
  onBack: () => void;
  onStart: (settings: any) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}> = ({ questionTypes, onBack, onStart, isDark, onToggleTheme }) => {
  const [mode, setMode] = useState<GameMode>('individual');
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [timePerQ, setTimePerQ] = useState(30);
  const [categories, setCategories] = useState<ContentType[]>(['meme-dialogue', 'song-tune', 'movie-meme']);
  const questionTypesList: QuestionType[] = ['multiple-choice', 'open-ended'];
  const [newTeamName, setNewTeamName] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [sessionCode] = useState(() => generateSessionCode());

  // Realtime Mobile Join Listener in Setup
  useEffect(() => {
    const channelName = `session_${sessionCode.toUpperCase()}`;
    const channel = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    channel.on('broadcast', { event: 'player_join' }, (payload) => {
      if (!payload?.payload?.playerName) return;
      const cleanName = payload.payload.playerName.trim();
      const teamId = payload.payload.teamId;

      setPlayers((prev) => {
        // Enforce UNIQUE player names
        const exists = prev.some(p => p.name.toLowerCase() === cleanName.toLowerCase());
        if (exists) {
          channel.send({
            type: 'broadcast',
            event: 'name_rejected',
            payload: { playerName: cleanName, reason: 'Name taken' },
          });
          return prev;
        }

        channel.send({
          type: 'broadcast',
          event: 'player_approved',
          payload: { playerName: cleanName },
        });

        return [...prev, {
          id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
          name: cleanName,
          score: 0,
          teamId,
          streak: 0,
          bestStreak: 0,
          correctAnswers: 0,
          totalAnswers: 0,
        }];
      });
    });

    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionCode]);

  const toggleCat = (typeKey: string) => {
    if (categories.includes(typeKey) && categories.length <= 1) return;
    setCategories(prev => prev.includes(typeKey) ? prev.filter(c => c !== typeKey) : [...prev, typeKey]);
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
    const clean = newPlayerName.trim();
    if (players.some(p => p.name.toLowerCase() === clean.toLowerCase())) {
      setPlayerError(`Player name "${clean}" is already added!`);
      return;
    }
    setPlayers([...players, {
      id: Date.now().toString(), name: clean, score: 0,
      streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0,
    }]);
    setNewPlayerName('');
    setPlayerError('');
  };

  const handleStart = () => {
    let currentPlayers = [...players];
    let currentTeams = [...teams];

    if (mode === 'individual' && newPlayerName.trim()) {
      const pName = newPlayerName.trim();
      if (!currentPlayers.some(p => p.name.toLowerCase() === pName.toLowerCase())) {
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
      if (!currentTeams.some(t => t.name.toLowerCase() === tName.toLowerCase())) {
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

    if (mode === 'team' && currentTeams.length < 2) {
      setPlayerError('Please add at least 2 teams before starting.');
      return;
    }
    setPlayerError('');
    onStart({ mode, teams: currentTeams, players: currentPlayers, rounds: 999, playUnlimited: true, timePerQ, categories, questionTypes: questionTypesList, sessionId: sessionCode });
  };

  const getQRScanUrl = (team?: Team) => {
    let base = window.location.origin;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      base = 'https://guess-what-two.vercel.app';
    }
    let url = `${base}${window.location.pathname}?session=${sessionCode}`;
    if (team) {
      url += `&team=${team.id}&teamName=${encodeURIComponent(team.name)}&teamEmoji=${encodeURIComponent(team.emoji)}`;
    }
    return url;
  };

  const copyMobileLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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
              <p className="text-white/40 text-sm">Configure session & QR mobile buzzers</p>
            </div>
          </div>
        </div>

        {/* SESSION ID DISPLAY & GENERAL QR CODE */}
        <div className="rounded-2xl p-5 mb-6 border border-purple-500/30 bg-purple-500/10 text-center shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-1">
            <QrCode className="w-5 h-5 text-purple-400" />
            <span className="text-xs uppercase tracking-widest font-bold text-purple-300">Unique Game Session ID</span>
          </div>
          <p className="text-3xl font-black text-white font-mono tracking-widest mb-2">{sessionCode}</p>
          <p className="text-xs text-white/60">Players scan QR code to join & use phone as a live buzzer!</p>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#a855f7' }}>🎮</span> Game Mode</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { m: 'individual' as GameMode, icon: <span className="text-4xl">👤</span>, label: 'Individual Play', desc: 'Single session QR code for all players', color: '#a855f7' },
              { m: 'team' as GameMode, icon: <span className="text-4xl">👥</span>, label: 'Team Battle', desc: 'Unique QR code per team', color: '#ec4899' },
            ].map(item => (
              <button key={item.m} className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all cursor-pointer"
                style={{
                  borderColor: mode === item.m ? item.color : 'rgba(255,255,255,0.1)',
                  background: mode === item.m ? `${item.color}15` : 'transparent',
                }}
                onClick={() => setMode(item.m)}>
                <div style={{ color: mode === item.m ? item.color : 'rgba(255,255,255,0.3)' }}>{item.icon}</div>
                <span className="font-semibold">{item.label}</span>
                <span className="text-xs text-white/40 text-center">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><span style={{ color: '#06b6d4' }}>💬</span> Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {questionTypes.map(qt => (
              <button key={qt.key} className="p-4 rounded-xl border-2 flex flex-col items-center gap-2 relative transition-all cursor-pointer"
                style={{
                  borderColor: categories.includes(qt.key) ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.05)',
                  background: categories.includes(qt.key) ? 'rgba(255,255,255,0.1)' : 'transparent',
                }}
                onClick={() => toggleCat(qt.key)}>
                {categories.includes(qt.key) && <span className="absolute top-2 right-2 text-sm text-green-400">✓</span>}
                <span className="text-2xl">{qt.icon || '🎯'}</span>
                <span className="font-semibold text-sm text-center">{qt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {mode === 'team' ? (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><span style={{ color: '#ec4899' }}>👥</span> Teams & Unique Barcodes</h2>
            <p className="text-xs text-white/50 mb-4">Each team gets a unique QR barcode. Players scan their team's code to join.</p>
            <div className="flex gap-2 mb-4">
              <input className="flex-1 rounded-xl px-4 py-3 text-white outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                placeholder="Enter team name (e.g. Red Lions)" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTeam()} />
              <button className="px-4 rounded-xl text-white flex items-center justify-center cursor-pointer" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={addTeam}>
                ➕
              </button>
            </div>
            <div className="space-y-4">
              {teams.map(team => (
                <div key={team.id} className="p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4" style={{ background: `${team.color}15`, border: `1px solid ${team.color}40` }}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{team.emoji}</span>
                    <div>
                      <p className="font-bold text-white text-base">{team.name}</p>
                      <p className="text-xs text-white/50">Players scan code below to join this team</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <img src={getQRCodeUrl(getQRScanUrl(team), 110)} alt={`${team.name} QR`} className="w-20 h-20 rounded-xl border border-white/20 bg-white p-1 shadow-md" />
                    <button onClick={() => setTeams(teams.filter(t => t.id !== team.id))} className="text-white/30 hover:text-red-400 transition-colors p-2">
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
              {teams.length === 0 && <p className="text-white/30 text-sm text-center py-4">Add at least 2 teams to generate unique team barcodes.</p>}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><span style={{ color: '#3b82f6' }}>👤</span> Individual Game Session QR</h2>
            <p className="text-xs text-white/50 mb-4">All players scan this session QR code on their phone to join as solo players.</p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-6 rounded-2xl bg-white/5 border border-white/10 mb-4">
              <img src={getQRCodeUrl(getQRScanUrl(), 140)} alt="Session QR" className="w-32 h-32 rounded-2xl border-2 border-purple-500/40 bg-white p-2 shadow-2xl" />
              <div className="text-center sm:text-left space-y-2">
                <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">Scan with Phone Camera</p>
                <p className="text-sm font-semibold text-white">Join session as a player</p>
                <button
                  type="button"
                  onClick={() => copyMobileLink(getQRScanUrl())}
                  className="px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-purple-500/30 transition cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : '📋 Copy Mobile Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <input className="flex-1 rounded-xl px-4 py-3 text-white outline-none text-sm"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${playerError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}` }}
                placeholder="Or manually add player name on this screen..." value={newPlayerName} onChange={e => { setNewPlayerName(e.target.value); if (playerError) setPlayerError(''); }} onKeyDown={e => e.key === 'Enter' && addPlayer()} />
              <button className="px-4 rounded-xl text-white flex items-center justify-center cursor-pointer" style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }} onClick={addPlayer}>
                ➕
              </button>
            </div>
            {playerError && (
              <div className="mb-3 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/15 border border-red-500/30 text-red-300">
                ⚠️ {playerError}
              </div>
            )}

            {/* LIVE CONNECTED PLAYERS LIST */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                  👥 Connected Players ({players.length})
                </span>
                <span className="text-[10px] text-white/40">Realtime Updates</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 animate-fadeIn">
                    <span className="text-lg">👤</span>
                    <span className="font-bold text-white flex-1">{p.name}</span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 font-semibold border border-green-500/30">
                      Connected ✓
                    </span>
                    <button onClick={() => setPlayers(players.filter(pl => pl.id !== p.id))} className="text-white/30 hover:text-red-400 transition-colors p-1">
                      🗑️
                    </button>
                  </div>
                ))}
                {players.length === 0 && (
                  <p className="text-xs text-white/40 text-center py-4">No players connected yet. Scan QR code on mobile!</p>
                )}
              </div>
            </div>
          </div>
        )}

        <button
          className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.3)' }}
          onClick={handleStart}>
          🎮 {mode === 'team' ? 'Start Team Battle Session' : 'Start Individual Session'}
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
  onUpdatePlayers: (players: Player[]) => void;
}> = ({ settings, onStart, onBack, isDark, onToggleTheme, onUpdatePlayers }) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [lobbyPlayers, setLobbyPlayers] = useState<Player[]>(settings.players || []);

  const handleStart = () => setCountdown(3);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) { onStart(); return; }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, onStart]);

  // Realtime Player Join Listener in Lobby
  useEffect(() => {
    if (!settings.sessionId) return;
    const channelName = `session_${settings.sessionId.toUpperCase()}`;
    const channel = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    channel
      .on('broadcast', { event: 'player_join' }, (payload) => {
        if (!payload?.payload?.playerName) return;
        const cleanName = payload.payload.playerName.trim();
        const teamId = payload.payload.teamId;

        setLobbyPlayers((prev) => {
          const exists = prev.some(p => p.name.toLowerCase() === cleanName.toLowerCase());
          if (exists) {
            channel.send({
              type: 'broadcast',
              event: 'name_rejected',
              payload: { playerName: cleanName, reason: 'Name taken' },
            });
            return prev;
          }

          channel.send({
            type: 'broadcast',
            event: 'player_approved',
            payload: { playerName: cleanName },
          });

          const updated = [...prev, {
            id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
            name: cleanName,
            score: 0,
            teamId,
            streak: 0,
            bestStreak: 0,
            correctAnswers: 0,
            totalAnswers: 0,
          }];
          onUpdatePlayers(updated);
          return updated;
        });
      })
      .on('broadcast', { event: 'player_rejoin' }, (payload) => {
        // Page-refresh re-announce — re-add if not already present
        if (!payload?.payload?.playerName) return;
        const cleanName = payload.payload.playerName.trim();
        const teamId = payload.payload.teamId;

        setLobbyPlayers((prev) => {
          const exists = prev.some(p => p.name.toLowerCase() === cleanName.toLowerCase());
          if (exists) return prev; // Already in list, no-op

          const updated = [...prev, {
            id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5),
            name: cleanName,
            score: 0,
            teamId,
            streak: 0,
            bestStreak: 0,
            correctAnswers: 0,
            totalAnswers: 0,
          }];
          onUpdatePlayers(updated);
          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [settings.sessionId, onUpdatePlayers]);

  const getQRScanUrl = (team?: Team) => {
    let base = window.location.origin;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      base = 'https://guess-what-two.vercel.app';
    }
    let url = `${base}${window.location.pathname}?session=${settings.sessionId}`;
    if (team) {
      url += `&team=${team.id}&teamName=${encodeURIComponent(team.name)}&teamEmoji=${encodeURIComponent(team.emoji)}`;
    }
    return url;
  };

  const copyMobileLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative">
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontSize: '10rem', fontWeight: 900, background: 'linear-gradient(135deg, #a855f7, #ec4899, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {countdown}
          </div>
        </div>
      )}
      <div className="max-w-xl w-full">
        <div className="text-center mb-6 flex flex-col items-center">
          <GuessWhatLogo size={64} style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' }} />
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold text-purple-300 mb-2 border border-purple-500/30 bg-purple-500/15">
            🎮 SESSION ID: {settings.sessionId}
          </div>
          <h1 className="text-4xl sm:text-5xl font-black mb-2">{settings.mode === 'team' ? '⚔️ Team Battle' : '🎮 Game On!'}</h1>
          <p className="text-white/40">Scan barcodes below to connect phones as live buzzers</p>
        </div>

        <div className="rounded-2xl p-6 mb-6 border border-white/10 bg-white/5 text-center">
          {settings.mode === 'team' ? (
            <>
              <h3 className="text-sm font-bold text-pink-300 mb-3 uppercase tracking-wider">Team Barcodes</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {settings.teams.map((team: Team) => (
                  <div key={team.id} className="p-4 rounded-xl flex flex-col items-center gap-2 border" style={{ background: `${team.color}15`, borderColor: `${team.color}40` }}>
                    <span className="text-2xl">{team.emoji}</span>
                    <p className="font-bold text-white">{team.name}</p>
                    <img src={getQRCodeUrl(getQRScanUrl(team), 110)} alt={`${team.name} QR`} className="w-24 h-24 rounded-xl border border-white/20 bg-white p-1 shadow-md my-1" />
                    <button
                      type="button"
                      onClick={() => copyMobileLink(getQRScanUrl(team))}
                      className="text-[10px] text-purple-200 underline hover:text-white"
                    >
                      {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Session Barcode</h3>
              <img src={getQRCodeUrl(getQRScanUrl(), 140)} alt="Session QR" className="w-36 h-36 rounded-2xl border-2 border-purple-500/40 bg-white p-2 shadow-2xl" />
              <p className="text-xs text-white/60">Scan with phone camera to join & use phone buzzer</p>
              <button
                type="button"
                onClick={() => copyMobileLink(getQRScanUrl())}
                className="px-3.5 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-200 text-xs font-semibold flex items-center gap-1.5 hover:bg-purple-500/30 transition cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Link Copied to Clipboard!' : '📋 Copy Mobile Join Link'}</span>
              </button>
            </div>
          )}

          {/* REALTIME JOINED PLAYERS IN LOBBY */}
          <div className="mt-6 pt-4 border-t border-white/10 text-left">
            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
              📱 Joined Players ({lobbyPlayers.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {lobbyPlayers.map(p => (
                <span key={p.id} className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs font-bold text-white animate-fadeIn flex items-center gap-1">
                  <span>👤</span>
                  <span>{p.name}</span>
                </span>
              ))}
              {lobbyPlayers.length === 0 && (
                <p className="text-xs text-white/40">Waiting for players to scan QR code...</p>
              )}
            </div>
          </div>
        </div>

        <button className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-3 transition-all active:scale-[0.98] cursor-pointer"
          style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.3)' }} onClick={handleStart}>
          ▶️ {countdown !== null ? 'Starting...' : 'Start Game!'}
        </button>

        <button className="w-full mt-3 py-3 text-white/40 hover:text-white/60 transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer" onClick={onBack}>
          ⬅️ Back to Setup
        </button>
      </div>
    </div>
  );
};

// ==================== GAME PLAY WITH PLAY/PAUSE AUDIO & LIVE BUZZERS ====================
const GamePlay: React.FC<{
  question: GameContent & { shuffledOptions?: string[] };
  roundNumber: number;
  totalRounds: number;
  onNext: (winnerId: string | 'nobody') => void;
  onExit: () => void;
  players: Player[];
  teams: Team[];
  mode: GameMode;
  sessionId?: string;
  onPlayerJoined: (player: Player) => void;
}> = ({ question, roundNumber, totalRounds, onNext, onExit, players, teams, mode, sessionId, onPlayerJoined }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Audio state
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioPaused, setAudioPaused] = useState(false);
  const [answerAudioPlaying, setAnswerAudioPlaying] = useState(false);

  const [waveHeights, setWaveHeights] = useState<number[]>(Array(15).fill(4));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const answerAudioRef = useRef<HTMLAudioElement | null>(null);

  const [liveBuzzes, setLiveBuzzes] = useState<BuzzerEntry[]>([]);

  useEffect(() => {
    setIsRevealed(false);
    setSelectedWinnerId(null);
    setShowHint(false);
    setAnswerAudioPlaying(false);
    setAudioPaused(false);
    setLiveBuzzes([]);

    if (answerAudioRef.current) {
      answerAudioRef.current.pause();
      answerAudioRef.current = null;
    }
  }, [question.id]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setAudioPlaying(false);
    setAudioPaused(false);

    const qAudio = question.audioData || question.audioUrl;
    if (qAudio) {
      const audio = new Audio(qAudio);
      audioRef.current = audio;

      const playTimeout = setTimeout(() => {
        if (audioRef.current) {
          audio.play()
            .then(() => { setAudioPlaying(true); setAudioPaused(false); })
            .catch(err => console.error("Audio playback failed:", err));
        }
      }, 600);

      audio.onended = () => { setAudioPlaying(false); setAudioPaused(false); };

      return () => {
        clearTimeout(playTimeout);
        audio.pause();
        audioRef.current = null;
      };
    }
  }, [question.id]);

  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  useEffect(() => {
    if (!sessionId) return;

    const channelName = `session_${sessionId.toUpperCase()}`;
    const channel = supabase.channel(channelName, { config: { broadcast: { ack: true } } });

    channel
      .on('broadcast', { event: 'player_join' }, (payload) => {
        // Game is already in progress — reject ALL new joins
        if (!payload?.payload?.playerName) return;
        const cleanName = payload.payload.playerName.trim();
        channel.send({
          type: 'broadcast',
          event: 'name_rejected',
          payload: { playerName: cleanName, reason: 'Game started' },
        });
      })
      .on('broadcast', { event: 'player_rejoin' }, () => {
        // Page-refresh re-announce from already-joined player — no-op, they're already in the list
      })
      .on('broadcast', { event: 'player_buzz' }, (payload) => {
        // Realtime Buzz Event for ALL Players (1st, 2nd, 3rd...)
        if (!payload?.payload) return;
        const b: BuzzerEntry = payload.payload;

        setLiveBuzzes((prev) => {
          // Only prevent duplicate buzzes from the SAME player on the SAME question
          if (prev.some((entry) => entry.playerName.toLowerCase() === b.playerName.toLowerCase())) return prev;
          
          const updated = [...prev, b].sort((x, y) => x.timestamp - y.timestamp);

          const rank = updated.findIndex((e) => e.playerName.toLowerCase() === b.playerName.toLowerCase()) + 1;
          channel.send({
            type: 'broadcast',
            event: 'buzz_ack',
            payload: { playerName: b.playerName, rank },
          });

          return updated;
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Tell all phones the current question
          channel.send({
            type: 'broadcast',
            event: 'question_change',
            payload: { questionIndex: roundNumber - 1, questionId: question.id },
          });
          // Tell any non-joined phones that the game is locked
          channel.send({
            type: 'broadcast',
            event: 'game_locked',
            payload: {},
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, roundNumber, question.id]);

  // Audio Play & Pause Control Handlers
  const handleReplayQuestionAudio = () => {
    const qAudio = question.audioData || question.audioUrl;
    if (!qAudio) return;
    if (audioRef.current) { audioRef.current.pause(); }
    const audio = new Audio(qAudio);
    audioRef.current = audio;
    setAudioPlaying(true);
    setAudioPaused(false);
    audio.play().then(() => { setAudioPlaying(true); setAudioPaused(false); }).catch(console.error);
    audio.onended = () => { setAudioPlaying(false); setAudioPaused(false); };
  };

  const handleTogglePauseAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
      setAudioPaused(true);
    } else {
      audioRef.current.play();
      setAudioPlaying(true);
      setAudioPaused(false);
    }
  };

  useEffect(() => {
    if (!audioPlaying) {
      setWaveHeights(Array(15).fill(4));
      return;
    }
    const interval = setInterval(() => {
      setWaveHeights(Array.from({ length: 15 }, () => Math.floor(Math.random() * 32) + 8));
    }, 150);
    return () => clearInterval(interval);
  }, [audioPlaying]);

  const progress = ((roundNumber - 1) / totalRounds) * 100;
  const isMC = question.questionType === 'multiple-choice';

  // Display ALL teams and individual players under "Who Answered Correctly?" so host can award points directly!
  const displayEntities = mode === 'team'
    ? [...teams, ...players.filter(p => !teams.some(t => t.id === p.teamId))]
    : players;

  const playAnswerAudio = () => {
    const answerAudio = question.answerAudioData || question.answerAudioUrl;
    if (!answerAudio) return;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setAudioPlaying(false);
      setAudioPaused(false);
    }
    if (answerAudioRef.current) {
      answerAudioRef.current.pause();
      answerAudioRef.current = null;
    }
    const audio = new Audio(answerAudio);
    answerAudioRef.current = audio;
    setAnswerAudioPlaying(true);
    audio.play().then(() => setAnswerAudioPlaying(true)).catch(console.error);
    audio.onended = () => {
      setAnswerAudioPlaying(false);
      answerAudioRef.current = null;
    };
  };

  const handleRevealAnswer = () => {
    setIsRevealed(true);
    playAnswerAudio();
  };

  return (
    <div className="min-h-screen flex flex-col px-4 py-4">
      <div className="max-w-6xl lg:max-w-7xl w-full mx-auto relative">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <GuessWhatLogo size={24} />
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/10 text-white/70">
              Question {roundNumber}/{totalRounds}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-500/20 text-purple-300">
              {question.type}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-yellow-500/20 text-yellow-300">
              {question.points} pts
            </span>
            {sessionId && (
              <span className="text-xs px-3 py-1 rounded-full font-mono font-bold bg-purple-500/30 text-purple-200 border border-purple-500/40">
                🎮 GAME ID: {sessionId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onExit} className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 transition-colors bg-red-500/10 border border-red-500/20">
              🚪 Exit Game
            </button>
          </div>
        </div>

        {/* LIVE BUZZER ORDER DISPLAY (1st, 2nd, 3rd...) */}
        {liveBuzzes.length > 0 && (
          <div className="mb-4 p-4 rounded-2xl bg-gradient-to-r from-red-500/20 via-purple-500/20 to-pink-500/20 border border-red-500/30 backdrop-blur-xl shadow-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl animate-bounce">🚨</span>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Live Buzzer Order</h3>
              </div>
              <span className="text-xs text-white/50">{liveBuzzes.length} buzzed</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {liveBuzzes.map((b, idx) => (
                <div key={b.id || idx} className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 border border-white/15 text-xs font-bold whitespace-nowrap shadow-md">
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${idx === 0 ? 'bg-yellow-400 text-black font-black' : idx === 1 ? 'bg-slate-300 text-black' : 'bg-amber-600 text-white'}`}>
                    #{idx + 1}
                  </span>
                  <span className="text-white">{b.playerName}</span>
                  {b.teamName && (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-pink-500/30 text-pink-200">
                      {b.teamEmoji || '👥'} {b.teamName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Question & Media */}
          <div className="lg:col-span-8 space-y-5">
            <div className="w-full h-1.5 rounded-full mb-2 bg-white/10 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${progress}%` }} />
            </div>

            <div className="rounded-2xl p-6 lg:p-10 border border-theme-card bg-theme-card shadow-xl" style={{ backdropFilter: 'blur(10px)' }}>
              {question.imageData && (
                <div className="mb-4 rounded-xl overflow-hidden flex items-center justify-center bg-black/10 border border-theme-card">
                  <ImageWithSpinner src={question.imageData} alt="question" className="max-w-full max-h-[45vh] lg:max-h-[55vh] object-contain rounded-xl shadow-md" />
                </div>
              )}
              {question.videoData && (
                <div className="mb-4 rounded-xl overflow-hidden bg-black/10 border border-theme-card">
                  <video src={question.videoData} controls className="w-full max-h-[45vh] lg:max-h-[55vh] object-contain rounded-xl shadow-md" />
                </div>
              )}
              {(question.audioData || question.audioUrl) && (
                <div className="mb-6 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 relative overflow-hidden bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-purple-500/20">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center relative bg-gradient-to-r from-cyan-500 to-purple-500 shadow-lg shadow-cyan-500/20">
                    {audioPlaying ? <span className="text-2xl">🎵</span> : <span className="text-2xl">🔇</span>}
                  </div>

                  <div className="text-center space-y-2">
                    <p className="font-bold text-sm text-cyan-400 uppercase tracking-widest">
                      {audioPlaying ? 'Playing Question Audio' : audioPaused ? 'Question Audio Paused' : 'Question Audio Ready'}
                    </p>

                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      <button
                        type="button"
                        onClick={handleReplayQuestionAudio}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-cyan-200 bg-cyan-500/20 border border-cyan-500/30 hover:bg-cyan-500/30 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                      >
                        <Volume2 className={`w-4 h-4 ${audioPlaying ? 'animate-bounce' : ''}`} />
                        <span>{audioPlaying ? 'Replay Audio' : '🔊 Play / Replay Audio'}</span>
                      </button>

                      {audioRef.current && (audioPlaying || audioPaused) && (
                        <button
                          type="button"
                          onClick={handleTogglePauseAudio}
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-200 bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                        >
                          <span>{audioPlaying ? '⏸️ Pause Audio' : '▶️ Resume Audio'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-center gap-1.5 h-10 mt-1">
                    {waveHeights.map((h, idx) => (
                      <div key={idx} className="w-1.5 rounded-full bg-gradient-to-t from-cyan-400 to-purple-500 transition-all duration-150" style={{ height: `${h}px` }} />
                    ))}
                  </div>

                  {question.audioHint && (
                    <div className="mt-2 w-full max-w-md border-t border-white/5 pt-4 text-center">
                      <button type="button" onClick={() => setShowHint(!showHint)} className="text-xs text-white/40 hover:text-white/60 underline">
                        {showHint ? 'Hide Text Clue' : 'Show Text Clue'}
                      </button>
                      {showHint && <p className="text-sm text-white/70 mt-2 bg-white/5 p-3 rounded-xl border border-white/5">{question.audioHint}</p>}
                    </div>
                  )}
                </div>
              )}

              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold lg:font-extrabold text-center leading-snug">{question.question}</h2>

              <div className="flex items-center justify-center gap-1.5 mt-4">
                {[1, 2, 3].map(lvl => {
                  const active = question.difficulty === 'easy' ? lvl <= 1 : question.difficulty === 'medium' ? lvl <= 2 : true;
                  const c = question.difficulty === 'easy' ? '#22c55e' : question.difficulty === 'medium' ? '#eab308' : '#ef4444';
                  return <div key={lvl} className="w-2.5 h-2.5 rounded-full" style={{ background: active ? c : 'rgba(255,255,255,0.1)' }} />;
                })}
                <span className="text-xs text-white/30 ml-2 capitalize">{question.difficulty}</span>
              </div>
            </div>

            {isMC && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
                {(question.shuffledOptions || question.options || []).map((opt: string, idx: number) => {
                  const isCorrectOpt = isRevealed && opt === question.answer;
                  return (
                    <div key={idx} className={`p-4 lg:p-5 rounded-xl text-left transition-all duration-300 ${isCorrectOpt ? 'bg-green-500/20 border-2 border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-white/5 border border-white/10'}`}>
                      <div className="flex items-center gap-3">
                        <span className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center text-sm lg:text-base font-bold flex-shrink-0 ${isCorrectOpt ? 'bg-green-500/30 text-green-300 font-extrabold' : 'bg-white/10 text-white/50'}`}>
                          {isCorrectOpt ? '✓' : String.fromCharCode(65 + idx)}
                        </span>
                        <span className={`text-sm lg:text-base font-medium ${isCorrectOpt ? 'text-green-300 font-bold' : 'text-white/80'}`}>{opt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Answer Reveal & Host Player Selection */}
          <div className="lg:col-span-4 space-y-5">
            {!isRevealed ? (
              <div className="rounded-2xl p-8 text-center border border-white/10 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center min-h-[220px]">
                <div className="text-5xl mb-4">🔒</div>
                <button
                  type="button"
                  onClick={handleRevealAnswer}
                  className="w-full py-4 rounded-xl text-lg font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)', boxShadow: '0 8px 25px rgba(168,85,247,0.35)' }}>
                  👁️ Reveal Answer
                </button>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                <div className="rounded-2xl p-6 text-center border-2 border-green-500/40 bg-green-500/10 shadow-[0_0_30px_rgba(34,197,94,0.15)]">
                  <div className="text-3xl mb-1">🎯</div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-green-400 mb-1">The Correct Answer Is</h3>
                  <p className="text-2xl font-black text-white mb-1 break-words">{question.answer}</p>
                  <p className="text-xs text-yellow-400 font-semibold">⭐ Worth {question.points} Points ⭐</p>
                  {(question.answerAudioData || question.answerAudioUrl) && (
                    <button
                      type="button"
                      onClick={playAnswerAudio}
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }}
                    >
                      <Volume2 className={`w-4 h-4 ${answerAudioPlaying ? 'animate-bounce' : ''}`} />
                      <span>{answerAudioPlaying ? 'Playing Sound...' : '🔊 Replay Answer Audio'}</span>
                    </button>
                  )}
                </div>

                {/* Host Player/Team Selection */}
                <div className="rounded-2xl p-5 border border-white/10 bg-white/5 backdrop-blur-md">
                  <h3 className="text-sm font-bold text-center mb-1">Who Answered Correctly?</h3>
                  <p className="text-xs text-white/50 text-center mb-3">Select winner or "Nobody"</p>

                  <div className="grid grid-cols-2 gap-2.5 mb-4 max-h-60 overflow-y-auto pr-1">
                    <button
                      type="button"
                      onClick={() => setSelectedWinnerId('nobody')}
                      className={`p-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 cursor-pointer ${selectedWinnerId === 'nobody' ? 'border-red-500 bg-red-500/20 text-red-300 font-bold' : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10'}`}
                    >
                      <span className="text-lg">❌</span>
                      <span className="text-xs font-semibold">Nobody</span>
                    </button>

                    {displayEntities.map(e => {
                      const isTeam = 'emoji' in e;
                      const isSelected = selectedWinnerId === e.id;
                      const emoji = isTeam ? (e as Team).emoji : '👤';
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelectedWinnerId(e.id)}
                          className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 cursor-pointer ${isSelected ? 'border-green-500 bg-green-500/20 text-white font-bold' : 'border-white/10 bg-white/5 text-white/80 hover:bg-white/10'}`}
                        >
                          <span className="text-lg flex-shrink-0">{emoji}</span>
                          <span className="text-xs font-medium truncate">{e.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  <button
                    disabled={!selectedWinnerId}
                    className="w-full py-3.5 rounded-xl text-base font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #ec4899)',
                      opacity: selectedWinnerId ? 1 : 0.4,
                      cursor: selectedWinnerId ? 'pointer' : 'not-allowed',
                    }}
                    onClick={() => {
                      if (selectedWinnerId) {
                        onNext(selectedWinnerId);
                      }
                    }}>
                    {roundNumber < totalRounds ? 'Next Question ➡️' : 'See Final Results 🏆'}
                  </button>
                </div>
              </div>
            )}

            {/* Live Scores Sidebar */}
            <div className="bg-theme-card border border-theme-card rounded-2xl p-4" style={{ backdropFilter: 'blur(10px)' }}>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <h3 className="font-bold text-xs text-theme-main flex items-center gap-2">
                  <span className="text-yellow-400">🏆</span>
                  <span>Live Scores</span>
                </h3>
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                  {mode === 'team' ? 'Teams' : 'Players'}
                </span>
              </div>
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {(mode === 'team' ? teams : players).map(e => (
                  <div key={e.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base flex-shrink-0">
                        {('emoji' in e) ? (e as Team).emoji : '👤'}
                      </span>
                      <p className="text-xs font-semibold truncate text-white/90">{e.name}</p>
                    </div>
                    <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                      {e.score} pts
                    </span>
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

// ==================== FEEDBACK & WAITLIST MODAL ====================
const FeedbackModal: React.FC<{ open: boolean; onClose: () => void; currentScreen?: string; initialTab?: 'feedback' | 'waitlist' }> = ({ open, onClose, currentScreen, initialTab = 'feedback' }) => {
  const [activeModalTab, setActiveModalTab] = useState<'feedback' | 'waitlist'>(initialTab);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('General Feedback');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const categories = ['Suggest a Meme 🎭', 'Report a Bug 🐛', 'Game Suggestion 🎮', 'General Feedback 💬', 'Other ✨'];

  useEffect(() => {
    if (open) {
      setActiveModalTab(initialTab);
      setStatus('idle');
      setErrorMsg('');
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = 'unset';
      };
    }
  }, [open, initialTab]);

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
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

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setErrorMsg('');
    const result = await sendWaitlistToTelegram(name, email);
    if (result.success) {
      setStatus('success');
      setTimeout(() => { setStatus('idle'); setName(''); setEmail(''); onClose(); }, 2500);
    } else {
      setStatus('error');
      setErrorMsg(result.error || 'Failed to join waitlist.');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0" style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(14px)' }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl" style={{ background: 'linear-gradient(145deg, rgba(18,18,42,0.98), rgba(30,20,60,0.98))', border: '1px solid rgba(168,85,247,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="relative p-6 pb-4" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(236,72,153,0.1))' }}>
          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))', border: '1px solid rgba(168,85,247,0.4)' }}>
                {activeModalTab === 'feedback' ? '💬' : '🚀'}
              </div>
              <div>
                <h2 className="text-xl font-black text-white">
                  {activeModalTab === 'feedback' ? 'Share Feedback' : 'Create Your Game'}
                </h2>
                <p className="text-xs text-white/50">
                  {activeModalTab === 'feedback' ? 'Your thoughts help us improve!' : 'Join the waitlist to build custom games!'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative flex rounded-xl p-1 bg-black/30 border border-white/10">
            <button
              type="button"
              onClick={() => { setActiveModalTab('feedback'); setStatus('idle'); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeModalTab === 'feedback' ? 'bg-purple-600/80 text-white shadow-md' : 'text-white/50 hover:text-white/80'
              }`}
            >
              💬 Feedback
            </button>
            <button
              type="button"
              onClick={() => { setActiveModalTab('waitlist'); setStatus('idle'); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeModalTab === 'waitlist' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' : 'text-white/50 hover:text-white/80'
              }`}
            >
              🚀 Make Your Game
            </button>
          </div>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center animate-fadeIn">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-black text-white mb-2">
              {activeModalTab === 'waitlist' ? "You're on the Waitlist!" : 'Thanks!'}
            </h3>
            <p className="text-white/60 text-sm">
              {activeModalTab === 'waitlist' ? "We'll notify you as soon as custom game creation goes live!" : 'Your feedback has been sent successfully.'}
            </p>
          </div>
        ) : activeModalTab === 'feedback' ? (
          <form onSubmit={handleFeedbackSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Your Name <span className="text-white/30 font-normal">(optional)</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Anonymous Memer 🎭"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button key={cat} type="button" onClick={() => setCategory(cat)}
                    className="px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer"
                    style={{
                      background: category === cat ? 'linear-gradient(135deg, rgba(168,85,247,0.3), rgba(236,72,153,0.2))' : 'rgba(255,255,255,0.05)',
                      border: category === cat ? '1px solid rgba(168,85,247,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: category === cat ? '#e879f9' : 'rgba(255,255,255,0.6)',
                    }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Message <span className="text-red-400">*</span></label>
              <textarea
                required
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type your thoughts..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {status === 'error' && (
              <div className="p-3 rounded-xl text-sm text-red-300 bg-red-500/20 border border-red-500/30">
                ⚠️ {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'sending' || !message.trim()}
              className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
              {status === 'sending' ? 'Sending...' : '✈️ Send Feedback'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleWaitlistSubmit} className="p-6 space-y-4">
            <div className="p-4 rounded-2xl border border-pink-500/20 bg-pink-500/10 text-center">
              <p className="text-xs font-bold text-pink-300">Want to create custom meme games?</p>
              <p className="text-[11px] text-white/60 mt-1">Get early access when custom game builder launches!</p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Game Creator 🎮"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-white/50 block mb-1.5">Email Address <span className="text-red-400">*</span></label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            <button
              type="submit"
              disabled={status === 'sending' || !email.trim()}
              className="w-full py-4 rounded-xl font-bold text-white text-sm transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #ec4899, #a855f7)' }}>
              {status === 'sending' ? 'Joining...' : '🚀 Join Waitlist'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

// ==================== SCOREBOARD WITH 10-QUESTION RULE & STRICT HIGHEST SCORE RANKING ====================
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
  const [hofError, setHofError] = useState<string | null>(null);
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
      setHofError(null);
      supabase
        .from('scoreboard')
        .select('*')
        .gte('rounds', 10)
        .order('total_score', { ascending: false })
        .limit(20)
        .then(({ data, error }) => {
          setHofLoading(false);
          if (error) {
            console.error('[Hall of Fame] Fetch error:', error);
            setHofError(`Database error: ${error.message}`);
          } else {
            const sortedHof = (data || []).map(entry => {
              const results = entry.mode === 'team' ? (entry.team_results || []) : (entry.player_results || []);
              const calculatedWinnerScore = results.length > 0
                ? Math.max(...results.map((r: any) => r.score || 0))
                : entry.total_score;
              return { ...entry, calculatedWinnerScore };
            }).sort((a, b) => b.calculatedWinnerScore - a.calculatedWinnerScore);

            setHallOfFame(sortedHof);
          }
        });
    }
  }, [activeTab]);

  const sorted = scores.mode === 'team'
    ? [...scores.teams].sort((a, b) => b.score - a.score)
    : [...scores.players].sort((a, b) => b.score - a.score);
  const winner = sorted.length > 0 ? sorted[0] : null;

  const getMedal = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-4 py-6 relative overflow-hidden">
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
        <div className="flex justify-center mb-5">
          <GuessWhatLogo size={56} />
        </div>

        {winner && (
          <div className="text-center mb-6 relative">
            <div className="inline-block relative">
              <div className="text-7xl mb-2" style={{ filter: 'drop-shadow(0 0 20px rgba(234,179,8,0.6))' }}>🏆</div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-1">
              <span style={{ background: 'linear-gradient(135deg, #eab308, #f97316, #ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {winner.name} Wins! ({winner.score} pts)
              </span>
            </h1>
            <p className="text-white/50 text-sm">🎉 Crowned the Meme Champion!</p>
          </div>
        )}

        <div className="flex gap-2 mb-5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {([['match', '🎮 This Match'], ['halloffame', '🏆 Hall of Fame']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all cursor-pointer"
              style={{
                background: activeTab === tab ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'transparent',
                color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.45)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'match' && (
          <div>
            <div className="rounded-2xl p-5 mb-4 border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-black text-white flex items-center gap-2">
                  <span style={{ color: '#eab308' }}>⚡</span> Final Standings
                </h2>
                <span className="text-xs px-3 py-1 rounded-full font-semibold bg-yellow-500/20 text-yellow-300">
                  {winner ? `${winner.score} Top Score` : '0 pts'}
                </span>
              </div>

              {rounds < 10 && (
                <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-200 flex items-center gap-2">
                  <span>ℹ️</span>
                  <span>Notice: Only games with 10+ completed questions qualify for the All-Time Hall of Fame.</span>
                </div>
              )}

              <div className="space-y-2.5">
                {sorted.map((item, idx) => {
                  const isTeam = 'emoji' in item;
                  const teamItem = item as Team;
                  const itemColor = isTeam ? teamItem.color : '#a855f7';
                  const barPct = sorted[0]?.score ? (item.score / sorted[0].score) * 100 : 0;
                  const isWinner = idx === 0;

                  return (
                    <div key={item.id}
                      className="p-4 rounded-xl flex items-center gap-3 transition-all"
                      style={{
                        background: isWinner ? `linear-gradient(135deg, rgba(234,179,8,0.12), rgba(249,115,22,0.08))` : 'rgba(255,255,255,0.03)',
                        border: isWinner ? '1px solid rgba(234,179,8,0.35)' : '1px solid rgba(255,255,255,0.06)',
                      }}>
                      <div className="w-10 text-center">
                        <span className="text-2xl">{getMedal(idx)}</span>
                      </div>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: `${itemColor}20`, border: `1px solid ${itemColor}40` }}>
                        {isTeam ? teamItem.emoji : '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{item.name}</p>
                        <div className="mt-1.5 w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${itemColor}, ${itemColor}88)` }} />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-2xl font-black" style={{ color: itemColor }}>{item.score}</p>
                        <p className="text-[10px] text-white/30">pts</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <button
                className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                onClick={onPlayAgain}>
                <RotateCcw className="w-5 h-5" /> Play Again
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer bg-white/5 border border-white/10 text-white/70"
                  onClick={onNewSetup}>
                  <Users className="w-4 h-4" /> New Setup
                </button>
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer bg-white/5 border border-white/10 text-white/70"
                  onClick={onHome}>
                  <Home className="w-4 h-4" /> Home
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HALL OF FAME TAB WITH STRICT HIGHEST WINNER SCORE SORTING */}
        {activeTab === 'halloffame' && (
          <div>
            <div className="rounded-2xl p-5 mb-4 border border-white/10 bg-white/5 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌟</span>
                  <h2 className="font-black text-white">All-Time Hall of Fame Leaderboard</h2>
                </div>
                <span className="text-[11px] px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                  Matches with 10+ questions
                </span>
              </div>

              {hofLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <p className="text-white/40 text-sm">Loading hall of fame...</p>
                </div>
              ) : hofError ? (
                <div className="py-6 text-center text-xs text-red-300">
                  ⚠️ {hofError}
                </div>
              ) : hallOfFame.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-3">🏜️</div>
                  <p className="text-white/50 font-semibold">No 10+ question match records yet!</p>
                  <p className="text-xs text-white/30 mt-1">Play a game with at least 10 questions to enter the Hall of Fame.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {hallOfFame.map((entry, idx) => {
                    const rankColors = ['#eab308', '#94a3b8', '#f97316'];
                    const rankColor = idx < 3 ? rankColors[idx] : 'rgba(255,255,255,0.4)';
                    const playerResults = entry.player_results || [];
                    const teamResults = entry.team_results || [];
                    const results = entry.mode === 'team' ? teamResults : playerResults;
                    const scoreToDisplay = entry.calculatedWinnerScore || entry.total_score;

                    return (
                      <div key={entry.id || idx} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 text-center font-bold text-lg">
                            {getMedal(idx)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-white text-base truncate">{entry.winner_name}</p>
                            <p className="text-xs text-white/40">{entry.rounds} questions · Mode: {entry.mode}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xl font-black" style={{ color: rankColor }}>{scoreToDisplay} pts</p>
                            <p className="text-[10px] text-white/40">Winner Score</p>
                          </div>
                        </div>

                        {results && results.length > 0 && (
                          <div className="pt-2 border-t border-white/5 flex items-center gap-1.5 flex-wrap">
                            {results.map((r: any, rIdx: number) => (
                              <span key={rIdx} className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-white/80 font-medium">
                                {r.emoji ? `${r.emoji} ` : '👤 '}{r.name}: <strong className="text-purple-300">{r.score} pts</strong>
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
                className="w-full py-4 rounded-xl text-base font-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}
                onClick={onPlayAgain}>
                <RotateCcw className="w-5 h-5" /> Play Again
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer bg-white/5 border border-white/10 text-white/70"
                  onClick={onNewSetup}>
                  <Users className="w-4 h-4" /> New Setup
                </button>
                <button
                  className="py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer bg-white/5 border border-white/10 text-white/70"
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

        <button onClick={onBack} className="absolute top-6 left-6 w-10 h-10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors border border-theme-card bg-theme-card">
          <span className="text-xl">⬅️</span>
        </button>

        <div className="text-center mt-6 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-purple-500/10 border border-purple-500/20 overflow-hidden">
            <GuessWhatLogo size={48} />
          </div>
          <h1 className="text-3xl font-black mb-2"><GradientText>Admin Login</GradientText></h1>
          <p className="text-sm text-theme-muted">Sign in to manage game content</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5">Email Address</label>
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
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1.5">Password</label>
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
  const [questionTypes, setQuestionTypes] = useState<CustomQuestionType[]>(DEFAULT_QUESTION_TYPES);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Mobile Buzzer Route Check
  const [isMobileBuzzerRoute, setIsMobileBuzzerRoute] = useState(false);
  const [mobileParams, setMobileParams] = useState<{ code: string; teamId?: string; teamName?: string; teamEmoji?: string }>({ code: '' });

  const [isDark] = useState(true);
  const toggleTheme = () => { };

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const session = searchParams.get('session') || searchParams.get('join');
    if (session) {
      setIsMobileBuzzerRoute(true);
      setMobileParams({
        code: session,
        teamId: searchParams.get('team') || undefined,
        teamName: searchParams.get('teamName') || undefined,
        teamEmoji: searchParams.get('teamEmoji') || undefined,
      });
    }
  }, []);

  const navigateToScreen = (s: GameScreen) => {
    screenRef.current = s;
    setScreen(s);
    window.history.pushState({ screen: s }, '', window.location.href);
  };

  useEffect(() => {
    window.history.replaceState({ screen: 'loading' }, '', window.location.href);

    const handlePopState = () => {
      const currentScreen = screenRef.current;
      if (currentScreen === 'playing' || currentScreen === 'reveal') {
        window.history.pushState({ screen: currentScreen }, '', window.location.href);
        setShowExitConfirm(true);
        return;
      }
      if (currentScreen === 'home') return;

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

  const saveGameResults = async (players: Player[], teams: Team[], mode: GameMode, numRounds: number, totalScore: number, winnerName: string) => {
    if (numRounds < 10) {
      console.log(`[saveGameResults] Match ended with ${numRounds} questions. Minimum 10 questions required to qualify for Hall of Fame.`);
      return;
    }

    const allEntities = mode === 'team' ? teams : players;
    const sorted = [...allEntities].sort((a, b) => b.score - a.score);
    const winnerScore = sorted[0]?.score || 0;

    const payload = {
      mode,
      rounds: numRounds,
      total_score: winnerScore,
      winner_name: winnerName,
      player_results: mode === 'individual'
        ? players.map(p => ({ name: p.name, score: p.score, streak: p.streak, bestStreak: p.bestStreak, correctAnswers: p.correctAnswers, totalAnswers: p.totalAnswers }))
        : null,
      team_results: mode === 'team'
        ? teams.map(t => ({ name: t.name, score: t.score, color: t.color, emoji: t.emoji }))
        : null,
    };

    console.log('[saveGameResults] Inserting scoreboard record:', payload);
    const { data, error } = await supabase.from('scoreboard').insert([payload]).select();
    if (error) {
      console.error('[saveGameResults] Supabase insert error:', error.message);
    }
  };

  const refreshQuestionTypes = async () => {
    try {
      const { data, error } = await supabase.from('question_types').select('*').order('created_at', { ascending: true });
      if (error) {
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          console.warn('Supabase question_types table missing, using default types.');
          return;
        }
        throw error;
      }
      if (data && data.length > 0) {
        const mapped: CustomQuestionType[] = data.map(item => ({
          id: item.id,
          key: item.key,
          label: item.label,
          icon: item.icon || '🎯',
          color: item.color || '#a855f7',
          isSystem: item.is_system || false,
        }));
        setQuestionTypes(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch custom question types:', err);
    }
  };

  const refreshContent = async () => {
    try {
      const { data, error } = await supabase
        .from('game_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) { setContent(data.map(mapFromDb)); }
    } catch (err: any) {
      console.error('Error fetching game content from Supabase:', err);
      setFetchError(err.message || 'Failed to load content from Supabase.');
      setContent(loadContent());
    }
  };

  useEffect(() => {
    refreshContent();
    refreshQuestionTypes();
  }, []);

  const handleStartGame = (settings: any) => {
    setGameSettings(settings);
    const filtered = content.filter((c: GameContent) =>
      settings.categories.includes(c.type)
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

  const handleNext = (winnerId: string | 'nobody') => {
    const q = gameState.currentQuestion;
    const pts = q ? q.points : 0;
    let updatedPlayers = [...gameState.players];
    let updatedTeams = [...gameState.teams];

    if (winnerId !== 'nobody') {
      if (gameSettings.mode === 'team') {
        // If winnerId matches a team directly
        if (updatedTeams.some(t => t.id === winnerId)) {
          updatedTeams = updatedTeams.map(t => t.id === winnerId ? { ...t, score: t.score + pts } : t);
        } else {
          // If winnerId belongs to an individual player in a team
          const winnerPlayer = updatedPlayers.find(p => p.id === winnerId);
          if (winnerPlayer && winnerPlayer.teamId) {
            updatedTeams = updatedTeams.map(t => t.id === winnerPlayer.teamId ? { ...t, score: t.score + pts } : t);
          }
          updatedPlayers = updatedPlayers.map(p => p.id === winnerId ? { ...p, score: p.score + pts } : p);
        }
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

      const finalMode: GameMode = gameSettings?.mode || 'individual';
      const allEntities = finalMode === 'team' ? updatedTeams : updatedPlayers;
      const sorted = [...allEntities].sort((a, b) => b.score - a.score);
      const winnerName = sorted[0]?.name || 'Unknown';
      const totalScore = sorted.reduce((s, e) => s + e.score, 0);
      saveGameResults(updatedPlayers, updatedTeams, finalMode, gameState.questions.length, totalScore, winnerName);

      if (gameSettings?.sessionId) {
        supabase.channel(`session_${gameSettings.sessionId.toUpperCase()}`).send({
          type: 'broadcast', event: 'session_status', payload: { status: 'ended' }
        });
      }

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

    const finalMode: GameMode = gameSettings?.mode || 'individual';
    const allEntities = finalMode === 'team' ? gameState.teams : gameState.players;
    const sorted = [...allEntities].sort((a, b) => b.score - a.score);
    const winnerName = sorted[0]?.name || 'Unknown';
    const totalScore = sorted.reduce((s, e) => s + e.score, 0);
    saveGameResults(gameState.players, gameState.teams, finalMode, gameState.currentIdx, totalScore, winnerName);

    if (gameSettings?.sessionId) {
      supabase.channel(`session_${gameSettings.sessionId.toUpperCase()}`).send({
        type: 'broadcast', event: 'session_status', payload: { status: 'ended' }
      });
    }

    navigateToScreen('scoreboard');
  };

  const handlePlayAgain = () => {
    if (!gameSettings) return;

    const filtered = content.filter((c: GameContent) =>
      gameSettings.categories.includes(c.type)
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

  const showFAB = screen === 'home' && !showFeedback && !isMobileBuzzerRoute;

  if (isMobileBuzzerRoute) {
    return (
      <MobileBuzzerView
        sessionCode={mobileParams.code}
        teamIdFromUrl={mobileParams.teamId}
        teamNameFromUrl={mobileParams.teamName}
        teamEmojiFromUrl={mobileParams.teamEmoji}
      />
    );
  }

  return (
    <AnimatedBg isDark={isDark}>
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} currentScreen={screen} />

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
        questionTypes={questionTypes}
        onRefresh={refreshContent}
        onRefreshTypes={refreshQuestionTypes}
        onBack={() => navigate('home')}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onLogout={handleLogout}
        adminEmail={adminEmail}
      />}
      {screen === 'setup' && <GameSetup questionTypes={questionTypes} onBack={() => navigate('home')} onStart={handleStartGame} isDark={isDark} onToggleTheme={toggleTheme} />}
      {screen === 'lobby' && gameSettings && (
        <GameLobby
          settings={gameSettings}
          onStart={() => navigateToScreen('playing')}
          onBack={() => navigate('setup')}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onUpdatePlayers={(updated) => setGameState(prev => ({ ...prev, players: updated }))}
        />
      )}
      {screen === 'playing' && gameState.currentQuestion && (
        <GamePlay
          question={gameState.currentQuestion}
          roundNumber={gameState.currentIdx + 1}
          totalRounds={gameState.questions.length}
          onNext={handleNext}
          onExit={() => setShowExitConfirm(true)}
          players={gameState.players}
          teams={gameState.teams}
          mode={gameSettings?.mode || 'individual'}
          sessionId={gameSettings?.sessionId}
          onPlayerJoined={(newPlayer) => {
            setGameState(prev => ({
              ...prev,
              players: [...prev.players.filter(p => p.name.toLowerCase() !== newPlayer.name.toLowerCase()), newPlayer]
            }));
          }}
        />
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

      {showFAB && (
        <button
          id="feedback-fab"
          onClick={() => setShowFeedback(true)}
          className="fixed z-[150] flex items-center gap-2 font-bold text-white transition-all active:scale-95 hover:scale-105 select-none cursor-pointer"
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
