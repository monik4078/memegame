// Content item types
export type ContentType = 'meme-dialogue' | 'song-tune' | 'movie-meme';

export interface GameContent {
  id: string;
  type: ContentType;
  question: string;
  answer: string;
  options: string[]; // multiple choice options including answer
  imageUrl?: string;  // for meme images
  audioHint?: string; // description for song tune
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  createdAt: number;
}

// Game modes
export type GameMode = 'individual' | 'team';
export type GameScreen = 'home' | 'admin' | 'setup' | 'lobby' | 'playing' | 'reveal' | 'scoreboard';

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
  byType: { memeDialogue: number; songTune: number; movieMeme: number };
  totalGamesPlayed: number;
  lastPlayed: string | null;
}
