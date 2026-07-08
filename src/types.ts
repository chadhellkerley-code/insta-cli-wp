export type UserRole = 'CEO' | 'SETTER';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  createdAt: any;
}

export interface WhatsAppAccount {
  id: string;
  name: string;
  phoneNumber: string;
  phoneNumberId: string;
  token: string;
  status: 'connected' | 'disconnected' | 'expired';
  connectedAt: any;
  expiresAt: any;
}

export interface Chat {
  id: string;
  accountId: string;
  contactName: string;
  contactPhone: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTime: any;
  lastOnline: string;
  tags: string[];
  unreadCount: number;
  stage: number; // current auto-response stage (0 = none, 1 = stage 1, etc.)
  assignedSetterId?: string;
  isAIActive?: boolean;
}

export interface Message {
  id: string;
  chatId: string;
  accountId: string;
  sender: 'me' | 'contact';
  text: string;
  type: 'text' | 'image' | 'video' | 'audio';
  mediaUrl?: string;
  timestamp: any;
  status: 'sent' | 'delivered' | 'seen';
}

export interface StageMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio';
  content: string;
  delaySeconds: number;
}

export interface Stage {
  id: string;
  name: string;
  messages: StageMessage[];
}

export interface FollowUp {
  id: string;
  delayHours: number;
  delayMinutes: number;
  type: 'text' | 'image' | 'video' | 'audio';
  content: string;
}

export interface Agent {
  id: string;
  name: string;
  minDelay: number;
  maxDelay: number;
  maxMedia: number;
  isActive: boolean;
  stages: Stage[];
  followUps: FollowUp[];
  geminiApiKey: string;
  aiPrompt: string;
  createdAt: any;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'SETTER';
  permissions: string[]; // ['dashboard', 'accounts', 'inbox', 'automations', 'settings']
  allowedAccounts: string[]; // empty array = all, or list of IDs
}

export interface CRMStats {
  totalAccounts: number;
  receivedToday: number;
  yesterday: number;
  sevenDays: number;
  fourteenDays: number;
  thirtyDays: number;
  netMessages: number;
  sent: number;
  received: number;
  replied: number;
  interested: number;
  uninterested: number;
}
