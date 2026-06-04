import { create } from 'zustand';
import type {
  GameContent,
  ContentType,
  GameMode,
  GameScreen,
  Team,
  Player,
  GameState,
  QuestionState,
  AdminStats,
} from './types';

const sampleContent: GameContent[] = [
  {
    id: '1', type: 'meme-dialogue', question: 'What is the famous dialogue from this meme?',
    answer: 'This is fine', options: ['This is fine', 'Everything is okay', "I'm on fire", 'No worries'],
    imageUrl: '', audioHint: '', difficulty: 'easy', points: 10, createdAt: Date.now(),
  },
  {
    id: '2', type: 'meme-dialogue', question: 'Complete the meme: "One does not simply ___"',
    answer: 'Walk into Mordor', options: ['Walk into Mordor', 'Eat just one chip', 'Win at poker', 'Ignore this meme'],
    imageUrl: '', audioHint: '', difficulty: 'easy', points: 10, createdAt: Date.now(),
  },
  {
    id: '3', type: 'song-tune', question: '🎵 Identify this tune: "Dum dum da dum dum, da dum da dum..."',
    answer: 'Tum Hi Ho (Aashiqui 2)', options: ['Tum Hi Ho (Aashiqui 2)', 'Channa Mereya', 'Kal Ho Naa Ho', 'Tujhe Dekha Toh'],
    imageUrl: '', audioHint: 'Slow romantic Bollywood tune', difficulty: 'medium', points: 20, createdAt: Date.now(),
  },
  {
    id: '4', type: 'song-tune', question: '🎵 Identify: "Never gonna give you up, never gonna let you down"',
    answer: 'Rickrolling', options: ['Rickrolling', 'Trolling', 'Catfishing', 'Dabbing'],
    imageUrl: '', audioHint: 'The most famous internet prank song', difficulty: 'easy', points: 10, createdAt: Date.now(),
  },
  {
    id: '5', type: 'movie-meme', question: 'Which movie is referenced by the meme: "I am Groot"?',
    answer: 'Guardians of the Galaxy', options: ['Guardians of the Galaxy', 'Avengers: Endgame', 'Thor: Ragnarok', 'Spider-Man'],
    imageUrl: '', audioHint: '', difficulty: 'easy', points: 10, createdAt: Date.now(),
  },
  {
    id: '6', type: 'movie-meme', question: 'This meme: "I am your father" — Which movie and character?',
    answer: 'Star Wars - Darth Vader', options: ['Star Wars - Darth Vader', 'The Lion King - Mufasa', 'Harry Potter - Snape', 'Terminator - T-800'],
    imageUrl: '', audioHint: '', difficulty: 'easy', points: 10, createdAt: Date.now(),
  },
  {
    id: '7', type: 'meme-dialogue', question: 'What phrase is associated with the "Stonks" meme?',
    answer: 'Stonks', options: ['Stonks', 'To the Moon', 'Buy High Sell Low', 'Diamond Hands'],
    imageUrl: '', audioHint: '', difficulty: 'easy', points: 10, createdAt: Date.now(),
  },
  {
    id: '8', type: 'movie-meme', question: 'The "Matrix Red Pill vs Blue Pill" meme references what concept?',
    answer: 'Truth vs Ignorance / Free Will', options: ['Truth vs Ignorance / Free Will', 'Good vs Evil', 'Love vs Hate', 'Wealth vs Poverty'],
    imageUrl: '', audioHint: '', difficulty: 'hard', points: 30, createdAt: Date.now(),
  },
  {
    id: '9', type: 'song-tune', question: '🎵 "Na na na na, na na na na, hey hey hey, goodbye!" — Identify this anthem',
    answer: 'Na Na Hey Hey Kiss Him Goodbye', options: ['Na Na Hey Hey Kiss Him Goodbye', 'Celebration', 'We Will Rock You', 'Seven Nation Army'],
    imageUrl: '', audioHint: 'Classic stadium anthem tune', difficulty: 'medium', points: 20, createdAt: Date.now(),
  },
  {
    id: '10', type: 'meme-dialogue', question: 'The "Distracted Boyfriend" meme represents what?',
    answer: 'Temptation — Choosing something new over what you already have', options: ['Temptation — Choosing something new over what you already have', 'A guy who is lost', 'Shopping addiction', 'Bad photography skills'],
    imageUrl: '', audioHint: '', difficulty: 'medium', points: 20, createdAt: Date.now(),
  },
  {
    id: '11', type: 'song-tune', question: '🎵 "Baby Shark doo doo doo..." — What category is this?',
    answer: "Children's viral hit", options: ["Children's viral hit", 'K-Pop dance track', 'Reggaeton summer hit', 'EDM club banger'],
    imageUrl: '', audioHint: 'Super catchy kids song that broke YouTube records', difficulty: 'easy', points: 10, createdAt: Date.now(),
  },
  {
    id: '12', type: 'movie-meme', question: 'The "Leonardo DiCaprio pointing at TV" meme is from which movie?',
    answer: 'Once Upon a Time in Hollywood', options: ['Once Upon a Time in Hollywood', 'The Wolf of Wall Street', 'Inception', 'Django Unchained'],
    imageUrl: '', audioHint: '', difficulty: 'hard', points: 30, createdAt: Date.now(),
  },
];

const TEAM_COLORS = ['#a855f7', '#ec4899', '#3b82f6', '#22c55e', '#f97316', '#06b6d4', '#eab308', '#ef4444'];
const TEAM_EMOJIS = ['🦁', '🐉', '🦅', '🐺', '🦊', '🐯', '🦈', '🐙', '🔥', '⚡', '🎯', '🎮'];

function loadContent(): GameContent[] {
  try {
    const data = localStorage.getItem('gameverse_content');
    if (data) return JSON.parse(data);
  } catch { /* empty */ }
  return sampleContent;
}

function saveContent(content: GameContent[]) {
  localStorage.setItem('gameverse_content', JSON.stringify(content));
}

function loadStats(): AdminStats {
  try {
    const data = localStorage.getItem('gameverse_stats');
    if (data) return JSON.parse(data);
  } catch { /* empty */ }
  return { totalContent: 0, byType: { memeDialogue: 0, songTune: 0, movieMeme: 0 }, totalGamesPlayed: 0, lastPlayed: null };
}

function saveStats(stats: AdminStats) {
  localStorage.setItem('gameverse_stats', JSON.stringify(stats));
}

interface GameStore extends GameState {
  setScreen: (screen: GameScreen) => void;
  content: GameContent[];
  addContent: (content: Omit<GameContent, 'id' | 'createdAt'>) => void;
  updateContent: (content: GameContent) => void;
  deleteContent: (id: string) => void;
  getStats: () => AdminStats;
  setGameMode: (mode: GameMode) => void;
  addTeam: (name: string) => void;
  removeTeam: (id: string) => void;
  addPlayer: (name: string, teamId?: string) => void;
  removePlayer: (id: string) => void;
  setRounds: (rounds: number) => void;
  setContentTypes: (types: ContentType[]) => void;
  setTimePerQuestion: (time: number) => void;
  startGame: () => void;
  nextQuestion: () => void;
  selectAnswer: (answer: string) => void;
  revealAnswer: () => void;
  endGame: () => void;
  resetGame: () => void;
  startTimer: () => void;
  stopTimer: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  screen: 'home',
  settings: {
    mode: 'individual',
    teams: [],
    players: [],
    totalRounds: 5,
    contentTypes: ['meme-dialogue', 'song-tune', 'movie-meme'],
    timePerQuestion: 30,
    selectedContentIds: [],
  },
  question: null,
  isGameActive: false,
  roundNumber: 1,
  content: loadContent(),

  setScreen: (screen: GameScreen) => set({ screen }),

  addContent: (newContent) => {
    set((state) => {
      const item: GameContent = {
        ...newContent,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        createdAt: Date.now(),
      };
      const updated = [item, ...state.content];
      saveContent(updated);
      return { content: updated };
    });
  },

  updateContent: (updatedContent) => {
    set((state) => {
      const updated = state.content.map((c: GameContent) => c.id === updatedContent.id ? updatedContent : c);
      saveContent(updated);
      return { content: updated };
    });
  },

  deleteContent: (id: string) => {
    set((state) => {
      const updated = state.content.filter((c: GameContent) => c.id !== id);
      saveContent(updated);
      return { content: updated };
    });
  },

  getStats: () => {
    const content = get().content;
    return {
      totalContent: content.length,
      byType: {
        memeDialogue: content.filter((c: GameContent) => c.type === 'meme-dialogue').length,
        songTune: content.filter((c: GameContent) => c.type === 'song-tune').length,
        movieMeme: content.filter((c: GameContent) => c.type === 'movie-meme').length,
      },
      totalGamesPlayed: loadStats().totalGamesPlayed,
      lastPlayed: loadStats().lastPlayed,
    };
  },

  setGameMode: (mode: GameMode) => {
    set((state) => ({
      settings: { ...state.settings, mode, teams: mode === 'team' ? state.settings.teams : [] },
    }));
  },

  addTeam: (name: string) => {
    set((state) => {
      const idx = state.settings.teams.length;
      const newTeam: Team = {
        id: Date.now().toString(),
        name, score: 0,
        color: TEAM_COLORS[idx % TEAM_COLORS.length],
        emoji: TEAM_EMOJIS[idx % TEAM_EMOJIS.length],
      };
      return { settings: { ...state.settings, teams: [...state.settings.teams, newTeam] } };
    });
  },

  removeTeam: (id: string) => {
    set((state) => ({
      settings: { ...state.settings, teams: state.settings.teams.filter((t: Team) => t.id !== id) },
    }));
  },

  addPlayer: (name: string, teamId?: string) => {
    set((state) => {
      const newPlayer: Player = { id: Date.now().toString(), name, score: 0, teamId, streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0 };
      return { settings: { ...state.settings, players: [...state.settings.players, newPlayer] } };
    });
  },

  removePlayer: (id: string) => {
    set((state) => ({
      settings: { ...state.settings, players: state.settings.players.filter((p: Player) => p.id !== id) },
    }));
  },

  setRounds: (rounds: number) => set((state) => ({ settings: { ...state.settings, totalRounds: rounds } })),
  setContentTypes: (types: ContentType[]) => set((state) => ({ settings: { ...state.settings, contentTypes: types } })),
  setTimePerQuestion: (time: number) => set((state) => ({ settings: { ...state.settings, timePerQuestion: time } })),

  startTimer: () => {
    set((state) => ({
      question: state.question ? { ...state.question, timeRemaining: state.settings.timePerQuestion } : null,
    }));
  },

  stopTimer: () => {
    // Timer is stopped by setting isRevealed
  },

  startGame: () => {
    const state = get();
    const filtered = state.content.filter((c: GameContent) => state.settings.contentTypes.includes(c.type));
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, state.settings.totalRounds);

    if (selected.length === 0) {
      alert('No content available! Add some content in the Admin panel first.');
      return;
    }

    // Shuffle options
    const firstQ = { ...selected[0], options: [...selected[0].options].sort(() => Math.random() - 0.5) };

    const questionState: QuestionState = {
      currentIndex: 0, content: firstQ, selectedAnswer: null, isCorrect: null,
      timeRemaining: state.settings.timePerQuestion, isRevealed: false,
    };

    set({
      screen: 'lobby',
      question: questionState,
      isGameActive: false,
      roundNumber: 1,
      settings: { ...state.settings, selectedContentIds: selected.map((c: GameContent) => c.id) },
    });
  },

  nextQuestion: () => {
    const state = get();
    const newIndex = (state.question?.currentIndex ?? 0) + 1;
    const selectedContent = state.content.filter((c: GameContent) =>
      state.settings.selectedContentIds.includes(c.id)
    );

    if (newIndex >= selectedContent.length) {
      get().endGame();
      return;
    }

    const content = { ...selectedContent[newIndex], options: [...selectedContent[newIndex].options].sort(() => Math.random() - 0.5) };

    set({
      screen: 'playing',
      roundNumber: newIndex + 1,
      question: {
        currentIndex: newIndex, content, selectedAnswer: null, isCorrect: null,
        timeRemaining: state.settings.timePerQuestion, isRevealed: false,
      },
    });
  },

  selectAnswer: (answer: string) => {
    const state = get();
    if (!state.question || state.question.isRevealed) return;

    const isCorrect = answer === state.question.content.answer;
    const points = isCorrect ? state.question.content.points : 0;

    set((state) => {
      const updatedPlayers = state.settings.players.map((p: Player) => ({
        ...p,
        score: p.score + (isCorrect ? points : 0),
        streak: isCorrect ? p.streak + 1 : 0,
        bestStreak: isCorrect ? Math.max(p.bestStreak, p.streak + 1) : p.bestStreak,
        correctAnswers: isCorrect ? p.correctAnswers + 1 : p.correctAnswers,
        totalAnswers: p.totalAnswers + 1,
      }));

      const updatedTeams = state.settings.teams.map((t: Team) => ({
        ...t,
        score: t.score + (isCorrect ? points : 0),
      }));

      return {
        question: { ...state.question!, selectedAnswer: answer, isCorrect },
        settings: { ...state.settings, players: updatedPlayers, teams: updatedTeams },
      };
    });
  },

  revealAnswer: () => {
    set((state) => ({
      screen: 'reveal',
      question: state.question ? { ...state.question, isRevealed: true } : null,
    }));
  },

  endGame: () => {
    const stats = loadStats();
    stats.totalGamesPlayed += 1;
    stats.lastPlayed = new Date().toISOString();
    saveStats(stats);

    set({ screen: 'scoreboard', isGameActive: false });
  },

  resetGame: () => {
    set((state) => ({
      screen: 'setup',
      settings: {
        ...state.settings,
        teams: state.settings.teams.map((t: Team) => ({ ...t, score: 0 })),
        players: state.settings.players.map((p: Player) => ({
          ...p, score: 0, streak: 0, bestStreak: 0, correctAnswers: 0, totalAnswers: 0,
        })),
      },
      question: null,
      isGameActive: false,
      roundNumber: 1,
    }));
  },
}));
