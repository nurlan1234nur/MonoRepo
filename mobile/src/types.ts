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
  _id?: string;
  id?: string;
  inviteCode: string;
  members: Member[] | string[];
  anniversary?: string | null;
}
