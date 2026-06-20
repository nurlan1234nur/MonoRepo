export type Theme = 'rose' | 'sunset' | 'ocean' | 'violet' | 'forest';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  status: string;
  theme: Theme;
  couple: string | null;
  recoveryEmail: string | null;
  streak: number;
  birthday: string;
}

export interface Member {
  _id: string;
  name: string;
  avatar: string;
  status?: string;
  email?: string;
  birthday?: string;
  lastSeenAt?: string | null;
  lastReadAt?: string | null;
}

export interface Couple {
  _id: string;
  inviteCode: string;
  members: Member[];
  anniversary: string | null;
}

export interface Message {
  _id: string;
  couple: string;
  sender: Member;
  text: string;
  imageUrl?: string;
  deleted?: boolean;
  special: boolean;
  createdAt: string;
}

export interface Mood {
  _id: string;
  user: Member;
  emoji: string;
  text: string;
  createdAt: string;
}

export interface Reaction {
  user: string;
  emoji: string;
}

export interface Moment {
  _id: string;
  couple: string;
  author: Member;
  imageUrl: string;
  caption: string;
  reactions: Reaction[];
  createdAt: string;
}

export interface Milestone {
  _id: string;
  couple: string;
  title: string;
  date: string;
  icon: string;
}

export interface DailyAnswer {
  _id: string;
  user: Member;
  date: string;
  questionIndex: number;
  text: string;
}

export interface DailyQuestion {
  date: string;
  question: string;
  questionIndex: number;
  answers: DailyAnswer[];
}

export interface DailyHistoryDay {
  date: string;
  question: string;
  questionIndex: number;
  answers: DailyAnswer[];
}

export interface Capsule {
  id: string;
  author: Member;
  unlockAt: string;
  createdAt: string;
  unlocked: boolean;
  text: string | null;
}

export interface Wish {
  _id: string;
  author: Member;
  text: string;
  completed: boolean;
  completedAt: string | null;
  completionApprovals: string[];
  deletionApprovals: string[];
  createdAt: string;
}

export interface WeeklySong {
  _id: string;
  weekStart: string;
  title: string;
  artist: string;
  url: string;
  thumbnailUrl: string;
  selectedBy: Member;
  createdAt: string;
  updatedAt: string;
}
