import React, { useState, useEffect, useRef } from 'react';
import { Chat, Message, WhatsAppAccount, Agent } from '../types';
import {
  sendMessageToChat,
  updateChatTags,
  updateChatStage,
  updateChatAIStatus,
  markChatAsRead,
  subscribeToMessages,
  getGlobalSettings
} from '../lib/db-service';
import {
  Search,
  Send,
  Plus,
  Phone,
  Tag,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Image as ImageIcon,
  Film,
  Mic,
  User,
  MessageCircleCode,
  X,
  Play,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InboxTabProps {
  accounts: WhatsAppAccount[];
  chats: Chat[];
  agents: Agent[];
}

export default function InboxTab({ accounts, chats, agents }: InboxTabProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState('All');

  // Chat input
  const [inputText, setInputText] = useState('');
  const [showAttachmentModal, setShowAttachmentModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');

  // Simulator input
  const [simulatorClientText, setSimulatorClientText] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Active chat
  const activeChat = chats.find(c => c.id === selectedChatId) || null;

  // Real-time messages subscription
  useEffect(() => {
    if (!selectedChatId) return;

    // We can subscribe to the messages of the active chat
    const unsub = subscribeToMessages(selectedChatId, (msgs: Message[]) => {
      setActiveMessages(msgs);
      // Automatically scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Mark chat as read
    markChatAsRead(selectedChatId);

    return () => unsub();
  }, [selectedChatId]);

  // Filter chats by search and tag
  const filteredChats = chats.filter(chat => {
    const matchesSearch = chat.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          chat.contactPhone.includes(searchQuery);

    if (selectedTagFilter === 'All') return matchesSearch;
    return matchesSearch && chat.tags.some(t => t.toLowerCase() === selectedTagFilter.toLowerCase());
  });

  // Get distinct list of all tags present in current chats
  const allAvailableTags = Array.from(new Set(chats.flatMap(c => c.tags)));

  // Handle outgoing manual message from CRM
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !selectedChatId || !activeChat) return;

    const textToSend = inputText;
    setInputText('');

    try {
      await sendMessageToChat({
        chatId: selectedChatId,
        accountId: activeChat.accountId,
        sender: 'me',
        text: textToSend,
        type: 'text',
        status: 'sent'
      });

      // Update message status simulated sequence
      // sent -> delivered -> seen
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Helper to send attachment
  const handleSendAttachment = async (type: 'image' | 'video' | 'audio', url: string, description: string) => {
    if (!selectedChatId || !activeChat) return;
    setShowAttachmentModal(false);

    try {
      await sendMessageToChat({
        chatId: selectedChatId,
        accountId: activeChat.accountId,
        sender: 'me',
        text: description,
        type: type,
        mediaUrl: url,
        status: 'sent'
      });
    } catch (err) {
      console.error("Error sending attachment:", err);
    }
  };

  // Handle addition of tag to contact
  const handleAddTag = async () => {
    if (!newTag.trim() || !activeChat) return;
    const updatedTags = Array.from(new Set([...activeChat.tags, newTag.trim()]));
    await updateChatTags(activeChat.id, updatedTags);
    setNewTag('');
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeChat) return;
    const updatedTags = activeChat.tags.filter(t => t !== tagToRemove);
    await updateChatTags(activeChat.id, updatedTags);
  };

  // --- AUTOMATIC AI RESPONSE PIPELINE (The CRM AI Agent logic) ---
  // When a simulated message is received, check if AI is active and respond after min/max delay
  const triggerAIAgentResponse = async (chatId: string, clientMessageText: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat || chat.isAIActive === false) return;

    // Find active agent
    const activeAgent = agents.find(a => a.isActive);
    if (!activeAgent) return;

    setIsAIGenerating(true);

    try {
      // 1. Fetch current chat messages history to provide contextual intelligence
      // Create simplified messages structure to send to Gemini
      const messagesHistory = activeMessages.map(m => ({
        sender: m.sender,
        text: m.text
      }));

      // Append the latest client text if it isn't in history yet
      messagesHistory.push({ sender: 'contact', text: clientMessageText });

      // Call our secure server-side Gemini Proxy endpoint!
      const response = await fetch('/api/gemini/agent-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messagesHistory,
          objectivePrompt: activeAgent.aiPrompt,
          learningLogs: [
            "Lead Alejandro Ramos: Interesado en automatizar ventas. La IA agendó la llamada explicándole los Webhooks.",
            "Lead Carlos Gómez: No interesado en este momento. La IA respondió con educación agradeciéndole.",
            "Lead Mariana Silva: Consultó sobre integraciones CRM. La IA explicó el soporte nativo."
          ],
          customApiKey: activeAgent.geminiApiKey
        })
      });

      const data = await response.json();
      const aiReplyText = data.reply || "¡Hola! Un gusto saludarte. ¿Cómo puedo ayudarte hoy?";

      // Simulate human typing delay
      const delayMs = Math.floor(Math.random() * (activeAgent.maxDelay - activeAgent.minDelay + 1) + activeAgent.minDelay) * 1000;

      setTimeout(async () => {
        await sendMessageToChat({
          chatId: chatId,
          accountId: chat.accountId,
          sender: 'me',
          text: aiReplyText,
          type: 'text',
          status: 'sent'
        });

        // Check if message implies high interest / meeting scheduled
        const textLower = aiReplyText.toLowerCase();
        if (textLower.includes('agend') || textLower.includes('calendly') || textLower.includes('llamada')) {
          // Send Telegram Alert!
          triggerTelegramNotification(chat.contactName, chat.contactPhone, "Interesado / Listo para agendar");
        }

        setIsAIGenerating(false);
      }, delayMs);

    } catch (err) {
      console.error("AI Agent failed:", err);
      setIsAIGenerating(false);
    }
  };

  // Helper to trigger Telegram agent alert
  const triggerTelegramNotification = async (clientName: string, clientPhone: string, status: string) => {
    try {
      const settings = await getGlobalSettings();
      if (!settings || !settings.telegramEnabled || !settings.telegramToken) return;

      const alertMsg = `🎯 <b>¡Lead Calificado Interesado!</b>\n\n👤 <b>Cliente:</b> ${clientName}\n📞 <b>Teléfono:</b> ${clientPhone}\n🏷️ <b>Estado:</b> ${status}\n\n<i>Instacli WP - CRM Automations Agent 🤖</i>`;

      await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: settings.telegramToken,
          chatId: settings.telegramChatId,
          message: alertMsg
        })
      });
    } catch (e) {
      console.error("Telegram alert dispatch failed:", e);
    }
  };

  // Simulated Client Incoming Message Trigger
  const handleTriggerSimulatedMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatorClientText.trim() || !selectedChatId || !activeChat) return;

    const text = simulatorClientText;
    setSimulatorClientText('');

    try {
      // 1. Send client message
      await sendMessageToChat({
        chatId: selectedChatId,
        accountId: activeChat.accountId,
        sender: 'contact',
        text: text,
        type: 'text',
        status: 'seen'
      });

      // 2. Trigger the active AI Agent response pipeline
      triggerAIAgentResponse(selectedChatId, text);
    } catch (err) {
      console.error("Simulator message error:", err);
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4 overflow-hidden font-sans relative">
      {/* 1. Chat List Sidebar */}
      <div className="w-80 md:w-96 bg-white border border-slate-200 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-150 space-y-3 bg-slate-50">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Inbox</h3>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar chat o número..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />
          </div>

          {/* Tags Filters */}
          <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              onClick={() => setSelectedTagFilter('All')}
              className={`px-3 py-1 rounded-lg font-bold shrink-0 transition cursor-pointer ${
                selectedTagFilter === 'All'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
              }`}
            >
              Todos
            </button>
            {['Interested', 'Uninterested', 'New Lead', 'Follow Up', 'Objective Met'].map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTagFilter(tag)}
                className={`px-3 py-1 rounded-lg font-bold shrink-0 transition cursor-pointer ${
                  selectedTagFilter.toLowerCase() === tag.toLowerCase()
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-150'
                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                }`}
              >
                {tag === 'Interested' ? 'Interesados' :
                 tag === 'Uninterested' ? 'No Interesa' :
                 tag === 'New Lead' ? 'Nuevos' :
                 tag === 'Follow Up' ? 'Seguimiento' : 'Citas'}
              </button>
            ))}
          </div>
        </div>

        {/* Chats scroll list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-1">
              <Phone className="h-8 w-8 mx-auto text-slate-300" />
              <p className="text-xs font-semibold">No se encontraron chats</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = chat.id === selectedChatId;
              const hasUnread = chat.unreadCount > 0;
              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChatId(chat.id)}
                  className={`p-4 flex items-start gap-3 cursor-pointer hover:bg-slate-50 transition border-l-4 ${
                    isSelected ? 'bg-indigo-50/30 border-indigo-600' : 'border-transparent'
                  }`}
                >
                  {/* Contact Avatar */}
                  <img
                    src={chat.contactAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'}
                    alt={chat.contactName}
                    className="w-11 h-11 rounded-full border border-slate-200 object-cover"
                    referrerPolicy="no-referrer"
                  />

                  {/* Summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-sm font-bold truncate ${hasUnread ? 'text-slate-900 font-extrabold' : 'text-slate-800'}`}>
                        {chat.contactName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${hasUnread ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                      {chat.lastMessage || 'Sin mensajes'}
                    </p>

                    {/* Chat tags badge preview */}
                    <div className="flex gap-1 mt-1.5 overflow-hidden">
                      {chat.tags.map(t => (
                        <span
                          key={t}
                          className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold tracking-tight ${
                            t.toLowerCase() === 'interested' ? 'bg-indigo-100 text-indigo-800' :
                            t.toLowerCase() === 'uninterested' ? 'bg-rose-100 text-rose-800' :
                            t.toLowerCase() === 'objective met' ? 'bg-violet-100 text-violet-800' :
                            'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {hasUnread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0 self-center" />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Chat Details View */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
        {activeChat ? (
          <>
            {/* Header */}
            <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeChat.contactAvatar}
                  alt={activeChat.contactName}
                  className="w-10 h-10 rounded-full border border-slate-200 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{activeChat.contactName}</h3>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-pulse" />
                    <span className="text-slate-500 font-semibold">{activeChat.lastOnline}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-400 font-mono">{activeChat.contactPhone}</span>
                  </div>
                </div>
              </div>

              {/* Tag and AI agent toggles */}
              <div className="flex items-center gap-2.5">
                {/* AI Agent Trigger Active Status */}
                <button
                  onClick={async () => {
                    await updateChatAIStatus(activeChat.id, !activeChat.isAIActive);
                  }}
                  className={`flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeChat.isAIActive !== false
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                  title="Activar/Desactivar agente automático de IA para este chat"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{activeChat.isAIActive !== false ? 'Agente Activo' : 'Agente Pausado'}</span>
                </button>

                {/* Manage Tags Button */}
                <button
                  onClick={() => setShowTagModal(true)}
                  className="p-1.5 hover:bg-slate-200 rounded-xl text-slate-500 hover:text-slate-800 border border-slate-250 bg-white transition cursor-pointer flex items-center gap-1 text-xs font-bold px-2.5"
                >
                  <Tag className="h-4 w-4" />
                  <span>Etiquetar</span>
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc]/50 relative">
              {/* WhatsApp background design element */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />

              <div className="relative space-y-4">
                {activeMessages.map((msg) => {
                  const isMe = msg.sender === 'me';
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl p-3.5 shadow-sm space-y-1 relative group ${
                          isMe
                            ? 'bg-indigo-600 text-white rounded-tr-none'
                            : 'bg-white text-slate-800 border border-slate-150 rounded-tl-none'
                        }`}
                      >
                        {/* Media message attachments */}
                        {msg.type === 'image' && (
                          <div className="rounded-xl overflow-hidden mb-2 border border-slate-200">
                            <img src={msg.mediaUrl} alt="Attachment" className="max-h-60 w-full object-cover" />
                          </div>
                        )}
                        {msg.type === 'video' && (
                          <div className="rounded-xl overflow-hidden mb-2 bg-black flex items-center justify-center p-2 border border-slate-200 relative">
                            <video src={msg.mediaUrl} controls className="max-h-60 w-full rounded-lg" />
                          </div>
                        )}
                        {msg.type === 'audio' && (
                          <div className="rounded-xl p-2 bg-slate-100 border border-slate-200 flex items-center gap-2 mb-1.5 text-slate-700">
                            <Volume2 className="h-5 w-5 text-indigo-600 shrink-0" />
                            <audio src={msg.mediaUrl} controls className="w-full h-8" />
                          </div>
                        )}

                        <p className="text-sm leading-relaxed">{msg.text}</p>

                        <div className="flex items-center justify-end gap-1 text-[10px] opacity-70">
                          <span>
                            {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          {isMe && (
                            <span>
                              {msg.status === 'seen' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-blue-800 font-extrabold" />
                              ) : msg.status === 'delivered' ? (
                                <CheckCheck className="h-3.5 w-3.5 text-slate-700" />
                              ) : (
                                <Check className="h-3.5 w-3.5 text-slate-700" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* AI Generation State indicator */}
            {isAIGenerating && (
              <div className="px-6 py-2 bg-indigo-50/80 border-t border-slate-150 flex items-center gap-2 text-xs font-semibold text-indigo-700 animate-pulse">
                <Sparkles className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Agente de Inteligencia Artificial escribiendo respuesta humana...</span>
              </div>
            )}

            {/* Footer Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-slate-50 border-t border-slate-150 flex items-center gap-3">
              {/* "+" Add Attachment Option */}
              <button
                type="button"
                onClick={() => setShowAttachmentModal(true)}
                className="p-2.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-xl transition cursor-pointer border border-slate-250"
                title="Adjuntar multimedia"
              >
                <Plus className="h-5 w-5" />
              </button>

              <input
                type="text"
                placeholder="Escribe un mensaje de WhatsApp..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm shadow-inner"
              />

              <button
                type="submit"
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer shadow shadow-indigo-150"
              >
                <Send className="h-5 w-5" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2 p-6">
            <MessageCircleCode className="h-12 w-12 text-slate-300 animate-bounce" />
            <p className="text-sm font-semibold text-slate-500">Bandeja de Entrada Instacli WP</p>
            <p className="text-xs text-slate-400 text-center max-w-xs">Selecciona un chat en la barra lateral para ver los mensajes y gestionar la conversación.</p>
          </div>
        )}
      </div>

      {/* 3. SIMULATOR PANEL (Absolutely crucial for testing without real integration!) */}
      {activeChat && (
        <div className="w-80 bg-slate-800 text-slate-100 border border-slate-700 rounded-2xl p-4 flex flex-col shrink-0 shadow-xl self-start h-[450px]">
          <div className="flex items-center gap-2 border-b border-slate-700 pb-3 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping" />
            <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Simulador de WhatsApp</h4>
          </div>

          <div className="flex-1 text-xs text-slate-300 space-y-3 flex flex-col justify-between">
            <p className="leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-700 text-slate-400 font-medium">
              Envía un mensaje de prueba simulando al cliente. Si el agente de IA está activo, el sistema responderá automáticamente con demora humana usando <b>Gemini AI</b>.
            </p>

            <form onSubmit={handleTriggerSimulatedMessage} className="space-y-2 pt-2 border-t border-slate-700">
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Mensaje del Cliente</label>
              <textarea
                rows={3}
                required
                value={simulatorClientText}
                onChange={(e) => setSimulatorClientText(e.target.value)}
                placeholder="Ej. Hola, quiero más info del CRM y precios."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs resize-none"
              />
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition cursor-pointer text-xs flex items-center justify-center gap-1"
              >
                <Play className="h-3 w-3" />
                <span>Simular Mensaje del Cliente</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MULTIMEDIA ATTACHMENT MODAL */}
      <AnimatePresence>
        {showAttachmentModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800">Enviar Archivo de WhatsApp</h3>
                <button onClick={() => setShowAttachmentModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleSendAttachment('image', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600', 'Te paso un folleto con los precios de Instacli WP.')}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center gap-3 transition text-left text-xs font-bold text-slate-700 hover:text-indigo-800"
                >
                  <ImageIcon className="h-5 w-5 text-blue-500 shrink-0" />
                  <div>
                    <p>Folleto de Precios (Imagen)</p>
                    <p className="text-[10px] font-medium text-slate-400">Imagen descriptiva en alta definición</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendAttachment('video', 'https://www.w3schools.com/html/mov_bbb.mp4', 'Aquí tienes el video demo de la plataforma.')}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center gap-3 transition text-left text-xs font-bold text-slate-700 hover:text-indigo-800"
                >
                  <Film className="h-5 w-5 text-rose-500 shrink-0" />
                  <div>
                    <p>Demo Explicativo (Video)</p>
                    <p className="text-[10px] font-medium text-slate-400">Video explicativo de 1 minuto</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSendAttachment('audio', 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', 'Te comparto una nota de audio explicativa.')}
                  className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl flex items-center gap-3 transition text-left text-xs font-bold text-slate-700 hover:text-indigo-800"
                >
                  <Mic className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p>Nota de Voz Comercial (Audio)</p>
                    <p className="text-[10px] font-medium text-slate-400">Audio descriptivo de WhatsApp</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TAGS MANAGEMENT MODAL */}
      <AnimatePresence>
        {showTagModal && activeChat && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800">Gestionar Etiquetas</h3>
                <button onClick={() => setShowTagModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Tag creation input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva etiqueta..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Agregar
                </button>
              </div>

              {/* Tag quick selection */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sugeridas / Existentes</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {['Interested', 'Uninterested', 'New Lead', 'Follow Up', 'Objective Met'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={async () => {
                        const updatedTags = Array.from(new Set([...activeChat.tags, tag]));
                        await updateChatTags(activeChat.id, updatedTags);
                      }}
                      className="px-2.5 py-1 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                    >
                      + {tag === 'Interested' ? 'Interesado' : tag === 'Uninterested' ? 'No Interesa' : tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* List of current tags with delete button */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Etiquetas del Contacto</p>
                {activeChat.tags.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin etiquetas asignadas.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {activeChat.tags.map(t => (
                      <span
                        key={t}
                        className="px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold rounded-lg flex items-center gap-1.5"
                      >
                        <span>{t}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(t)}
                          className="hover:bg-indigo-200 rounded p-0.5"
                        >
                          <X className="h-3.5 w-3.5 shrink-0 text-indigo-700" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
