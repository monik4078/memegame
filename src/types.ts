// Content item types
export type ContentType = 'meme-dialogue' | 'song-tune' | 'movie-meme' | string;

export interface CustomQuestionType {
  id: string;
  key: string;
  label: string;
  icon?: string;
  color: string;
  isSystem?: boolean;
}

export interface GameContent {
  id: string;
  type: ContentType;
  questionType?: 'multiple-choice' | 'open-ended';
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
  createdAt?: number;
  movie?: string;
}

// Game modes
export type GameMode = 'individual' | 'team';
export type GameScreen = 'loading' | 'home' | 'admin' | 'admin-login' | 'setup' | 'lobby' | 'playing' | 'reveal' | 'scoreboard' | 'buzzer';

// Team
export interface Team {
  id: string;
  name: string;
  score: number;
  color: string;
  emoji: string;
}

// Player
export interface Player {
  id: string;
  name: string;
  score: number;
  teamId?: string;
  streak: number;
  bestStreak: number;
  correctAnswers: number;
  totalAnswers: number;
}

// Game settings
export interface GameSettings {
  mode: GameMode;
  teams: Team[];
  players: Player[];
  totalRounds: number;
  contentTypes: ContentType[];
  timePerQuestion: number;
  selectedContentIds: string[];
  sessionId?: string;
}

// Real-time Buzzer Press Entry
export interface BuzzerEntry {
  id: string;
  playerId: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  teamEmoji?: string;
  timestamp: number;
  questionIndex: number;
}

// Game Session
export interface GameSession {
  id: string;
  code: string; // e.g. "GV-8391"
  status: 'lobby' | 'playing' | 'ended';
  mode: GameMode;
  currentQuestionIndex: number;
}

// Current question state
export interface QuestionState {
  currentIndex: number;
  content: GameContent;
  selectedAnswer: string | null;
  isCorrect: boolean | null;
  timeRemaining: number;
  isRevealed: boolean;
}

// Game state
export interface GameState {
  screen: GameScreen;
  settings: GameSettings;
  question: QuestionState | null;
  isGameActive: boolean;
  roundNumber: number;
}

// Admin stats
export interface AdminStats {
  totalContent: number;
  byType: Record<string, number>;
  totalGamesPlayed: number;
  lastPlayed: string | null;
}
