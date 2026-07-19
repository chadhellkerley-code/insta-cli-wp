import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  onSnapshot,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { db } from './firebase';
import { WhatsAppAccount, Chat, Message, Agent, TeamMember, CRMStats, UserProfile } from '../types';

// Seed initial chats to make the CRM feel live and beautiful on first load
export async function seedInitialDataForUser(userId: string) {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userDocRef);
  } catch (e) {
    console.error("Error seeding:", e);
  }
}

// 1. User Profile Management
export async function createUserProfile(userId: string, data: { email: string; name: string; role: 'CEO' | 'SETTER'; permissions: string[] }) {
  await setDoc(doc(db, 'users', userId), {
    ...data,
    createdAt: Timestamp.now()
  });
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const docRef = doc(db, 'users', userId);
  await updateDoc(docRef, updates);
}

export async function getUserProfile(userId: string) {
  const docRef = doc(db, 'users', userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data();
  }
  return null;
}

// 2. WhatsApp Accounts Management
export function subscribeToAccounts(onUpdate: (accounts: WhatsAppAccount[]) => void) {
  const q = query(collection(db, 'accounts'), orderBy('connectedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const accounts: WhatsAppAccount[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      accounts.push({
        id: doc.id,
        name: data.name || '',
        phoneNumber: data.phoneNumber || '',
        token: data.token || '',
        status: data.status || 'connected',
        connectedAt: data.connectedAt?.toDate() || new Date(),
        expiresAt: data.expiresAt?.toDate() || new Date()
      });
    });
    onUpdate(accounts);
  });
}

export async function addWhatsAppAccount(account: Omit<WhatsAppAccount, 'id' | 'connectedAt' | 'expiresAt'>) {
  const connectedAt = Timestamp.now();
  // Set expiration to 60 days from now
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));

  await addDoc(collection(db, 'accounts'), {
    ...account,
    connectedAt,
    expiresAt,
    status: 'connected'
  });
}

export async function deleteWhatsAppAccount(accountId: string) {
  await deleteDoc(doc(db, 'accounts', accountId));
}

// 3. Chats Management
export function subscribeToChats(onUpdate: (chats: Chat[]) => void) {
  const q = query(collection(db, 'chats'), orderBy('lastMessageTime', 'desc'));
  return onSnapshot(q, (snap) => {
    const chats: Chat[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      chats.push({
        id: doc.id,
        accountId: data.accountId || '',
        contactName: data.contactName || '',
        contactPhone: data.contactPhone || '',
        contactAvatar: data.contactAvatar || '',
        lastMessage: data.lastMessage || '',
        lastMessageTime: data.lastMessageTime?.toDate() || new Date(),
        lastOnline: data.lastOnline || 'Online',
        tags: data.tags || [],
        unreadCount: data.unreadCount || 0,
        stage: data.stage || 0,
        assignedSetterId: data.assignedSetterId || '',
        isAIActive: data.isAIActive !== false
      });
    });
    onUpdate(chats);
  });
}

export async function updateChatTags(chatId: string, tags: string[]) {
  await updateDoc(doc(db, 'chats', chatId), { tags });
}

export async function updateChatStage(chatId: string, stage: number) {
  await updateDoc(doc(db, 'chats', chatId), { stage });
}

export async function updateChatAIStatus(chatId: string, isAIActive: boolean) {
  await updateDoc(doc(db, 'chats', chatId), { isAIActive });
}

export async function markChatAsRead(chatId: string) {
  await updateDoc(doc(db, 'chats', chatId), { unreadCount: 0 });
}

// 4. Messages Management
export function subscribeToMessages(chatId: string, onUpdate: (messages: Message[]) => void) {
  const q = query(
    collection(db, 'messages'),
    where('chatId', '==', chatId),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const messages: Message[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        chatId: data.chatId || '',
        accountId: data.accountId || '',
        sender: data.sender || 'contact',
        text: data.text || '',
        type: data.type || 'text',
        mediaUrl: data.mediaUrl || '',
        timestamp: data.timestamp?.toDate() || new Date(),
        status: data.status || 'sent'
      });
    });
    onUpdate(messages);
  });
}

export async function sendMessageToChat(message: Omit<Message, 'id' | 'timestamp'>) {
  const timestamp = Timestamp.now();

  // Add message to DB
  const docRef = await addDoc(collection(db, 'messages'), {
    ...message,
    timestamp
  });

  // Update last message in Chat
  const chatRef = doc(db, 'chats', message.chatId);
  await updateDoc(chatRef, {
    lastMessage: message.type === 'text' ? message.text : `[${message.type}] Attachment`,
    lastMessageTime: timestamp,
    unreadCount: message.sender === 'contact' ? 1 : 0
  });

  return docRef.id;
}

// 5. AI Agents Automations Management
export function subscribeToAgents(onUpdate: (agents: Agent[]) => void) {
  return onSnapshot(collection(db, 'agents'), (snap) => {
    const agents: Agent[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      agents.push({
        id: doc.id,
        name: data.name || '',
        minDelay: data.minDelay || 2,
        maxDelay: data.maxDelay || 5,
        maxMedia: data.maxMedia || 3,
        isActive: data.isActive || false,
        stages: data.stages || [],
        followUps: data.followUps || [],
        geminiApiKey: data.geminiApiKey || '',
        aiPrompt: data.aiPrompt || '',
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    onUpdate(agents);
  });
}

export async function addAgent(agent: Omit<Agent, 'id' | 'createdAt'>) {
  await addDoc(collection(db, 'agents'), {
    ...agent,
    createdAt: Timestamp.now()
  });
}

export async function updateAgent(agentId: string, updates: Partial<Agent>) {
  await updateDoc(doc(db, 'agents', agentId), updates);
}

export async function deleteAgent(agentId: string) {
  await deleteDoc(doc(db, 'agents', agentId));
}

// 6. Team Members Management
export function subscribeToTeam(onUpdate: (members: TeamMember[]) => void) {
  const q = query(collection(db, 'team'), orderBy('name', 'asc'));
  return onSnapshot(q, (snap) => {
    const members: TeamMember[] = [];
    snap.forEach((doc) => {
      const data = doc.data();
      members.push({
        id: doc.id,
        name: data.name || '',
        email: data.email || '',
        role: 'SETTER',
        permissions: data.permissions || [],
        allowedAccounts: data.allowedAccounts || []
      });
    });
    onUpdate(members);
  });
}

export async function addTeamMember(member: Omit<TeamMember, 'id'>) {
  await addDoc(collection(db, 'team'), member);
}

export async function deleteTeamMember(memberId: string) {
  await deleteDoc(doc(db, 'team', memberId));
}

// 7. Global Settings & Telegram Bot
export async function getGlobalSettings() {
  const snap = await getDoc(doc(db, 'globalSettings', 'config'));
  if (snap.exists()) {
    return snap.data();
  }
  return {
    telegramToken: '',
    telegramChatId: '',
    telegramEnabled: false
  };
}

export async function updateGlobalSettings(settings: { telegramToken: string; telegramChatId: string; telegramEnabled: boolean }) {
  await setDoc(doc(db, 'globalSettings', 'config'), settings);
}

