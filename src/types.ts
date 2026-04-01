export type Subject = 'Math' | 'English' | 'Science' | 'History' | 'General';

export type Language = 'English' | 'Spanish' | 'French' | 'German' | 'Hindi' | 'Chinese';

export interface TimetableEntry {
  day: string;
  subject: Subject;
  topic: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlocked: boolean;
}

export interface UserProgress {
  age?: number;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  streak: number;
  lastActive: string; // ISO date
  language: Language;
  syllabus: string;
  timetable: TimetableEntry[];
  stats: {
    homeworkHelped: number;
    gamesPlayed: number;
    hintsUsed: number;
  };
  subjectProgress: Record<Subject, number>; // 0-100
  unlockedBadges: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  image?: string;
  stage?: 'mistake' | 'hint' | 'solution';
}

export const INITIAL_PROGRESS: UserProgress = {
  name: '',
  avatar: '👦',
  xp: 0,
  level: 1,
  streak: 0,
  lastActive: '',
  language: 'English',
  syllabus: '',
  timetable: [],
  stats: {
    homeworkHelped: 0,
    gamesPlayed: 0,
    hintsUsed: 0,
  },
  subjectProgress: {
    Math: 0,
    English: 0,
    Science: 0,
    History: 0,
    General: 0,
  },
  unlockedBadges: [],
};

export const BADGES: Badge[] = [
  { id: 'math-wizard', name: 'Math Wizard 🧙', icon: '🧙', description: 'Solve a math problem', unlocked: false },
  { id: 'grammar-ninja', name: 'Grammar Ninja 🥷', icon: '🥷', description: 'Solve an english problem', unlocked: false },
  { id: 'science-star', name: 'Science Star 🔬', icon: '🔬', description: 'Solve a science problem', unlocked: false },
  { id: 'history-hero', name: 'History Hero 🏛️', icon: '🏛️', description: 'Solve a history problem', unlocked: false },
  { id: 'hint-saver', name: 'Hint Saver 💡', icon: '💡', description: 'Solve with only 1 hint', unlocked: false },
  { id: 'on-fire', name: 'On Fire 🔥', icon: '🔥', description: '3 day streak', unlocked: false },
  { id: 'unstoppable', name: 'Unstoppable ⚡', icon: '⚡', description: '7 day streak', unlocked: false },
];

export const getLevelInfo = (xp: number) => {
  if (xp < 200) return { level: 1, title: 'Curious Learner 🌱', nextXp: 200 };
  if (xp < 400) return { level: 2, title: 'Smart Cookie 🍪', nextXp: 400 };
  if (xp < 700) return { level: 3, title: 'Brain Explorer 🔭', nextXp: 700 };
  if (xp < 1000) return { level: 4, title: 'Super Thinker 🧠', nextXp: 1000 };
  return { level: 5, title: 'Genius Kid 🚀', nextXp: 2000 };
};
