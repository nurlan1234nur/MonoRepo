export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  couple: string | null;
}

export interface Member {
  _id: string;
  name: string;
  avatar: string;
  email?: string;
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

export interface Capsule {
  id: string;
  author: Member;
  unlockAt: string;
  createdAt: string;
  unlocked: boolean;
  text: string | null;
}
