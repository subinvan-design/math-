export interface Problem {
  story: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  source?: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface QuestZone {
  id: string;
  name: string;
  category: string;
  description: string;
  iconName: string;
  themeColor: string; // Tailwind class
  accentColor: string; // Tailwind bg class
  mascotQuote: string;
  defaultTheme: string;
}

export interface UserProfile {
  nickname: string;
  score: number;
  acorns: number;
  keys: string[]; // List of completed zone IDs
  level: number;
  streak: number;
}
