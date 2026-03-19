export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  provider: 'local' | 'google';
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  loginCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  table?: Record<string, unknown>[] | null;
  chart?: Record<string, unknown> | null;
  proactivo?: string | null;
  context?: string | null;
  intermediateSteps?: string[];
  fallbackUsed?: boolean;
  adkError?: string;
}

export interface Conversation {
  _id: string;
  title: string;
  userId: string;
  messages: Message[];
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrackingEvent {
  _id: string;
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ChatSuggestion {
  id: string;
  text: string;
  category: string;
  isDefault?: boolean;
}
