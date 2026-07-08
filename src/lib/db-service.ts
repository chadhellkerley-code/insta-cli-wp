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
import { WhatsAppAccount, Chat, Message, Agent, TeamMember, CRMStats } from '../types';

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

// Seeder function to trigger beautiful demo data
export async function ensureDemoDataSeeded() {
  const chatSnap = await getDocs(collection(db, 'chats'));
  if (chatSnap.empty) {
    // Let's seed 4 active WhatsApp-style conversations!
    const sampleChats = [
      {
        id: 'chat_1',
        accountId: 'demo_acc_1',
        contactName: 'Alejandro Ramos',
        contactPhone: '+34 612 345 678',
        contactAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
        lastMessage: 'Me interesa saber el precio mensual',
        lastMessageTime: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)), // 5 mins ago
        lastOnline: 'Online',
        tags: ['Interested', 'New Lead'],
        unreadCount: 1,
        stage: 1,
        isAIActive: true
      },
      {
        id: 'chat_2',
        accountId: 'demo_acc_1',
        contactName: 'Lucía Fernández',
        contactPhone: '+54 9 11 5432 1098',
        contactAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
        lastMessage: 'Gracias, ya agendé la reunión en el calendario',
        lastMessageTime: Timestamp.fromDate(new Date(Date.now() - 40 * 60 * 1000)), // 40 mins ago
        lastOnline: 'last seen 15m ago',
        tags: ['Objective Met', 'Client'],
        unreadCount: 0,
        stage: 3,
        isAIActive: true
      },
      {
        id: 'chat_3',
        accountId: 'demo_acc_2',
        contactName: 'Carlos Gómez',
        contactPhone: '+52 55 1234 5678',
        contactAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&q=80',
        lastMessage: 'No me interesa en este momento, gracias.',
        lastMessageTime: Timestamp.fromDate(new Date(Date.now() - 4 * 3600 * 1000)), // 4 hours ago
        lastOnline: 'last seen 2h ago',
        tags: ['Uninterested'],
        unreadCount: 0,
        stage: 1,
        isAIActive: false
      },
      {
        id: 'chat_4',
        accountId: 'demo_acc_1',
        contactName: 'Mariana Silva',
        contactPhone: '+55 11 98765-4321',
        contactAvatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
        lastMessage: '¿Tienen integraciones con otros sistemas CRM?',
        lastMessageTime: Timestamp.fromDate(new Date(Date.now() - 24 * 3600 * 1000)), // 1 day ago
        lastOnline: 'last seen 1d ago',
        tags: ['Follow Up'],
        unreadCount: 0,
        stage: 2,
        isAIActive: true
      }
    ];

    for (const chat of sampleChats) {
      await setDoc(doc(db, 'chats', chat.id), chat);
    }

    // Seed messages
    const sampleMessages = [
      // Chat 1
      { chatId: 'chat_1', accountId: 'demo_acc_1', sender: 'contact', text: 'Hola, vi su anuncio sobre automatizaciones de WhatsApp.', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 30 * 60 * 1000)), status: 'seen' },
      { chatId: 'chat_1', accountId: 'demo_acc_1', sender: 'me', text: '¡Hola! Qué gusto saludarte. Sí, en Instacli WP ayudamos a empresas a triplicar sus ventas usando agentes de IA automatizados que atienden tu WhatsApp 24/7 de forma súper humana.', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 25 * 60 * 1000)), status: 'seen' },
      { chatId: 'chat_1', accountId: 'demo_acc_1', sender: 'me', text: 'Te paso un pequeño video explicativo de 1 minuto.', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 1000)), status: 'seen' },
      { chatId: 'chat_1', accountId: 'demo_acc_1', sender: 'me', text: 'Ver demo de video', type: 'video', mediaUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', timestamp: Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 1000)), status: 'seen' },
      { chatId: 'chat_1', accountId: 'demo_acc_1', sender: 'contact', text: 'Me interesa saber el precio mensual', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000)), status: 'delivered' },

      // Chat 2
      { chatId: 'chat_2', accountId: 'demo_acc_1', sender: 'contact', text: 'Hola, ¿cómo agendo la llamada demo?', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 3 * 3600 * 1000)), status: 'seen' },
      { chatId: 'chat_2', accountId: 'demo_acc_1', sender: 'me', text: '¡Excelente Lucía! Te comparto nuestro enlace directo de Calendly para elegir el día y hora que mejor te acomode.', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 2 * 3600 * 1000)), status: 'seen' },
      { chatId: 'chat_2', accountId: 'demo_acc_1', sender: 'contact', text: 'Gracias, ya agendé la reunión en el calendario', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 40 * 60 * 1000)), status: 'seen' },

      // Chat 3
      { chatId: 'chat_3', accountId: 'demo_acc_2', sender: 'contact', text: 'Quiero información', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 5 * 3600 * 1000)), status: 'seen' },
      { chatId: 'chat_3', accountId: 'demo_acc_2', sender: 'me', text: 'Hola Carlos. Te comento sobre nuestros planes CRM con IA.', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 4.5 * 3600 * 1000)), status: 'seen' },
      { chatId: 'chat_3', accountId: 'demo_acc_2', sender: 'contact', text: 'No me interesa en este momento, gracias.', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 4 * 3600 * 1000)), status: 'seen' },

      // Chat 4
      { chatId: 'chat_4', accountId: 'demo_acc_1', sender: 'contact', text: 'Hola, ¿tienen demo?', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 25 * 3600 * 1000)), status: 'seen' },
      { chatId: 'chat_4', accountId: 'demo_acc_1', sender: 'me', text: 'Hola Mariana, claro que sí. Te adjunto un audio explicando los alcances.', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 24.5 * 3600 * 1000)), status: 'seen' },
      { chatId: 'chat_4', accountId: 'demo_acc_1', sender: 'me', text: 'Audio descriptivo', type: 'audio', mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', timestamp: Timestamp.fromDate(new Date(Date.now() - 24.5 * 3600 * 1000)), status: 'seen' },
      { chatId: 'chat_4', accountId: 'demo_acc_1', sender: 'contact', text: '¿Tienen integraciones con otros sistemas CRM?', type: 'text', timestamp: Timestamp.fromDate(new Date(Date.now() - 24 * 3600 * 1000)), status: 'seen' }
    ];

    for (const msg of sampleMessages) {
      await addDoc(collection(db, 'messages'), {
        ...msg,
        timestamp: msg.timestamp
      });
    }

    // Seed default WhatsApp accounts
    const sampleAccounts = [
      { id: 'demo_acc_1', name: 'WhatsApp Ventas Latam', phoneNumber: '+34 600 000 000', token: 'MOCK_TOKEN', status: 'connected', connectedAt: Timestamp.now(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 3600 * 1000)) },
      { id: 'demo_acc_2', name: 'Atención Clientes', phoneNumber: '+52 55 0000 0000', token: 'MOCK_TOKEN', status: 'connected', connectedAt: Timestamp.now(), expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 3600 * 1000)) }
    ];
    for (const acc of sampleAccounts) {
      await setDoc(doc(db, 'accounts', acc.id), acc);
    }

    // Seed default AI agent
    const sampleAgent = {
      id: 'agent_1',
      name: 'Agente de Calificación Premium',
      minDelay: 2,
      maxDelay: 5,
      maxMedia: 2,
      isActive: true,
      stages: [
        {
          id: 'stage_1',
          name: 'Etapa 1: Saludo e Interés',
          messages: [
            { id: 'stg_m1', type: 'text', content: '¡Hola! Bienvenido a Instacli WP. Te saluda nuestro asistente automático.', delaySeconds: 2 },
            { id: 'stg_m2', type: 'text', content: '¿Te gustaría agendar una demostración en vivo de nuestro software CRM?', delaySeconds: 3 }
          ]
        },
        {
          id: 'stage_2',
          name: 'Etapa 2: Compartir Beneficios',
          messages: [
            { id: 'stg_m3', type: 'text', content: 'Perfecto. Nuestro CRM te permite delegar tus ventas y atención en una IA que aprende de tus clientes.', delaySeconds: 2 },
            { id: 'stg_m4', type: 'audio', content: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', delaySeconds: 5 }
          ]
        }
      ],
      followUps: [
        { id: 'flw_1', delayHours: 1, delayMinutes: 30, type: 'text', content: 'Hola, ¿pudiste revisar el video que te envié antes?' }
      ],
      geminiApiKey: '',
      aiPrompt: 'Llevar de forma natural la conversación hacia agendar una llamada. Ser muy amigable, resolver dudas con simpatía y brevedad. Si el cliente tiene dudas de integraciones, dile que contamos con Webhooks directos.',
      createdAt: Timestamp.now()
    };
    await setDoc(doc(db, 'agents', 'agent_1'), sampleAgent);

    // Seed global settings
    await setDoc(doc(db, 'globalSettings', 'config'), {
      telegramToken: '',
      telegramChatId: '',
      telegramEnabled: false
    });
  }
}
