import React, { useState } from 'react';
import { Agent, Stage, FollowUp, StageMessage } from '../types';
import { addAgent, updateAgent, deleteAgent } from '../lib/db-service';
import {
  Plus,
  Trash2,
  Sparkles,
  Clock,
  ChevronRight,
  Sliders,
  ToggleLeft,
  ToggleRight,
  FileText,
  Image as ImageIcon,
  Film,
  Mic,
  X,
  BrainCircuit,
  CheckCircle,
  ChevronDown,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AutomationsTabProps {
  agents: Agent[];
}

export default function AutomationsTab({ agents }: AutomationsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Form states for creating a new agent
  const [agentName, setAgentName] = useState('');
  const [minDelay, setMinDelay] = useState(2);
  const [maxDelay, setMaxDelay] = useState(5);
  const [maxMedia, setMaxMedia] = useState(3);
  const [loading, setLoading] = useState(false);

  // Expanded Stage index tracker
  const [expandedStageIndex, setExpandedStageIndex] = useState<number | null>(null);

  // Form states for adding stage messages
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [msgContent, setMsgContent] = useState('');
  const [msgDelay, setMsgDelay] = useState(3);
  const [showAddMsgForm, setShowAddMsgForm] = useState(false);

  // Form states for adding follow-ups
  const [followUpHours, setFollowUpHours] = useState(1);
  const [followUpMinutes, setFollowUpMinutes] = useState(0);
  const [followUpType, setFollowUpType] = useState<'text' | 'image' | 'video' | 'audio'>('text');
  const [followUpContent, setFollowUpContent] = useState('');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const activeAgent = agents.find(a => a.id === selectedAgentId) || agents[0] || null;

  // Create Agent
  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) return;

    setLoading(true);
    try {
      await addAgent({
        name: agentName,
        minDelay: Number(minDelay),
        maxDelay: Number(maxDelay),
        maxMedia: Number(maxMedia),
        isActive: false,
        stages: [
          {
            id: 'stg_1',
            name: 'Etapa 1: Saludo e Interés',
            messages: [
              { id: 'msg_' + Math.random().toString(36).substring(2, 7), type: 'text', content: '¡Hola! Qué gusto saludarte.', delaySeconds: 2 }
            ]
          }
        ],
        followUps: [],
        geminiApiKey: '',
        aiPrompt: 'Guiar al cliente a agendar una llamada. Ser amigable.'
      });
      setShowCreateModal(false);
      setAgentName('');
      setMinDelay(2);
      setMaxDelay(5);
      setMaxMedia(3);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle active agent status
  const handleToggleAgent = async (agent: Agent) => {
    // If we activate this agent, deactivate others to keep only one active
    if (!agent.isActive) {
      for (const a of agents) {
        if (a.id !== agent.id && a.isActive) {
          await updateAgent(a.id, { isActive: false });
        }
      }
    }
    await updateAgent(agent.id, { isActive: !agent.isActive });
  };

  // Update Gemini details
  const handleSaveGeminiDetails = async (agentId: string, api_key: string, prompt: string) => {
    await updateAgent(agentId, { geminiApiKey: api_key, aiPrompt: prompt });
  };

  // Add Stage to current agent
  const handleAddStage = async () => {
    if (!activeAgent) return;
    const nextStageIndex = activeAgent.stages.length + 1;
    const newStage: Stage = {
      id: 'stg_' + Math.random().toString(36).substring(2, 7),
      name: `Etapa ${nextStageIndex}: Seguimiento Contextual`,
      messages: []
    };
    const updatedStages = [...activeAgent.stages, newStage];
    await updateAgent(activeAgent.id, { stages: updatedStages });
  };

  // Add message within a stage
  const handleAddStageMessage = async () => {
    if (!activeAgent || !selectedStageId || !msgContent.trim()) return;

    const newMessage: StageMessage = {
      id: 'ms_' + Math.random().toString(36).substring(2, 7),
      type: msgType,
      content: msgContent,
      delaySeconds: Number(msgDelay)
    };

    const updatedStages = activeAgent.stages.map(stg => {
      if (stg.id === selectedStageId) {
        return {
          ...stg,
          messages: [...stg.messages, newMessage]
        };
      }
      return stg;
    });

    await updateAgent(activeAgent.id, { stages: updatedStages });
    setMsgContent('');
    setMsgDelay(3);
    setShowAddMsgForm(false);
  };

  // Delete message from stage
  const handleDeleteStageMessage = async (stageId: string, msgId: string) => {
    if (!activeAgent) return;
    const updatedStages = activeAgent.stages.map(stg => {
      if (stg.id === stageId) {
        return {
          ...stg,
          messages: stg.messages.filter(m => m.id !== msgId)
        };
      }
      return stg;
    });
    await updateAgent(activeAgent.id, { stages: updatedStages });
  };

  // Add Follow-up with delay in hours/mins
  const handleAddFollowUp = async () => {
    if (!activeAgent || !followUpContent.trim()) return;

    const newFollowUp: FollowUp = {
      id: 'fup_' + Math.random().toString(36).substring(2, 7),
      delayHours: Number(followUpHours),
      delayMinutes: Number(followUpMinutes),
      type: followUpType,
      content: followUpContent
    };

    const updatedFollowUps = [...activeAgent.followUps, newFollowUp];
    await updateAgent(activeAgent.id, { followUps: updatedFollowUps });
    setFollowUpContent('');
    setFollowUpHours(1);
    setFollowUpMinutes(0);
    setShowFollowUpForm(false);
  };

  // Delete follow up
  const handleDeleteFollowUp = async (fupId: string) => {
    if (!activeAgent) return;
    const updatedFollowUps = activeAgent.followUps.filter(f => f.id !== fupId);
    await updateAgent(activeAgent.id, { followUps: updatedFollowUps });
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (window.confirm("¿Deseas eliminar este agente de IA permanentemente?")) {
      await deleteAgent(agentId);
      setSelectedAgentId(null);
    }
  };

  // Simulated Machine Learning logs display
  const learningLogs = [
    { text: "Conversación Alejandro Ramos: Detectó interés en CRM. Adaptó respuesta para detallar APIs.", type: "success" },
    { text: "Conversación Carlos Gómez: Detectó objeción por falta de presupuesto. Registró el motivo del rechazo.", type: "rejection" },
    { text: "Conversación Mariana Silva: Pidió integraciones de Calendly. La IA propuso enlace directo.", type: "success" },
    { text: "Conversación Lucia Fernandez: Reunión agendada. Registrado como Objetivo Cumplido.", type: "success" }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 font-sans flex items-center gap-2">
            <BrainCircuit className="h-6 w-6 text-indigo-600" />
            Automatizaciones Inteligentes
          </h1>
          <p className="text-sm text-slate-500">Crea agentes conversacionales que responden de forma secuencial y por Inteligencia Artificial.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-150 cursor-pointer text-sm"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Crear Agente IA</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: Agents scroll-list */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Agentes Disponibles ({agents.length})</h3>

            {agents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay agentes creados. Presiona "Crear Agente IA".
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => {
                  const isSelected = activeAgent && activeAgent.id === agent.id;
                  return (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgentId(agent.id)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-indigo-50/30 border-indigo-500 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/60'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 truncate">{agent.name}</h4>
                        <p className="text-[10px] text-slate-400 font-semibold">{agent.stages.length} Etapas • {agent.followUps.length} Seguimientos</p>
                      </div>

                      {/* Toggle active / inactive */}
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleAgent(agent)}
                          className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                        >
                          {agent.isActive ? (
                            <ToggleRight className="h-6 w-6 text-indigo-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-transparent hover:border-rose-100 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Learning Logs Panel */}
          <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
            <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
              <BrainCircuit className="h-4.5 w-4.5 animate-pulse text-indigo-500" />
              Auto-Aprendizaje del Agente
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              La IA analiza cada cierre exitoso o rechazo para aprender el mejor camino conversacional y auto-perfeccionar sus respuestas.
            </p>

            <div className="space-y-2 text-[10px]">
              {learningLogs.map((log, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${log.type === 'success' ? 'bg-indigo-600' : 'bg-rose-500'}`} />
                  <p className="text-slate-300">{log.text}</p>
                </div>
              ))}
            </div>
            <div className="bg-indigo-950/20 border border-indigo-900/30 p-2.5 rounded-xl text-center">
              <span className="text-[10px] text-indigo-400 font-extrabold uppercase">✓ IA con Ajuste de Prompt Dinámico</span>
            </div>
          </div>
        </div>

        {/* Workspace: Agent Detail Editor */}
        <div className="lg:col-span-2 space-y-6">
          {activeAgent ? (
            <>
              {/* AI Gemini configurations section */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
                    Configuración de Inteligencia Artificial (Gemini)
                  </h3>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full">Automático</span>
                </div>

                <div className="space-y-4">
                  {/* Gemini API Key */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                      <span>Gemini API Key (Gratuita)</span>
                      <span className="text-[10px] text-slate-400 italic">Sustituye la API key por defecto de ser necesario</span>
                    </label>
                    <input
                      type="password"
                      value={activeAgent.geminiApiKey || ''}
                      onChange={(e) => handleSaveGeminiDetails(activeAgent.id, e.target.value, activeAgent.aiPrompt)}
                      placeholder="AIzaSy..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs font-mono"
                    />
                  </div>

                  {/* Prompt objective instruction */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Instrucciones y Objetivo del Agente de IA</label>
                    <textarea
                      rows={3}
                      value={activeAgent.aiPrompt || ''}
                      onChange={(e) => handleSaveGeminiDetails(activeAgent.id, activeAgent.geminiApiKey, e.target.value)}
                      placeholder="Ej. Guiar la conversación con simpatía para agendar una llamada. Si el cliente tiene dudas de precio, indícale que los planes inician en $49/mes."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Stages configurations list */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="h-4.5 w-4.5 text-indigo-600" />
                    Etapas de Respuesta ({activeAgent.stages.length})
                  </h3>
                  <button
                    onClick={handleAddStage}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition border border-slate-200 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar Etapa</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {activeAgent.stages.map((stage, idx) => {
                    const isExpanded = expandedStageIndex === idx;
                    return (
                      <div key={stage.id} className="border border-slate-150 rounded-xl overflow-hidden">
                        {/* Stage Accordion Header */}
                        <div
                          onClick={() => setExpandedStageIndex(isExpanded ? null : idx)}
                          className="px-4 py-3 bg-slate-50 border-b border-slate-150 hover:bg-slate-100/50 transition flex items-center justify-between cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 bg-slate-200 rounded-full text-slate-600 flex items-center justify-center text-[10px] font-extrabold">{idx + 1}</span>
                            <h4 className="text-xs font-bold text-slate-700">{stage.name}</h4>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <span>{stage.messages.length} Mensajes</span>
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" />}
                          </div>
                        </div>

                        {/* Stage expanded content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-4 bg-white space-y-4 overflow-hidden"
                            >
                              {/* Messages lists within Stage */}
                              {stage.messages.length === 0 ? (
                                <p className="text-xs text-slate-400">No hay mensajes configurados para esta etapa.</p>
                              ) : (
                                <div className="space-y-2">
                                  {stage.messages.map((m, mIdx) => (
                                    <div key={m.id} className="p-3 bg-slate-50 rounded-xl border border-slate-150 flex items-center justify-between gap-3 hover:bg-slate-100/50 transition">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                                          {m.type === 'text' && <FileText className="h-4 w-4 text-indigo-600" />}
                                          {m.type === 'image' && <ImageIcon className="h-4 w-4 text-blue-500" />}
                                          {m.type === 'video' && <Film className="h-4 w-4 text-rose-500" />}
                                          {m.type === 'audio' && <Mic className="h-4 w-4 text-amber-500" />}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-slate-700 truncate max-w-sm">{m.content}</p>
                                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> Delay de {m.delaySeconds}s desde mensaje anterior
                                          </p>
                                        </div>
                                      </div>

                                      <button
                                        onClick={() => handleDeleteStageMessage(stage.id, m.id)}
                                        className="p-1 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => {
                                    setSelectedStageId(stage.id);
                                    setShowAddMsgForm(true);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-xs font-bold rounded-lg transition cursor-pointer"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  <span>Agregar Mensaje</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Follow-ups time settings list */}
              <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-4.5 w-4.5 text-indigo-600" />
                    Seguimientos de Etapa por Tiempo ({activeAgent.followUps.length})
                  </h3>
                  <button
                    onClick={() => setShowFollowUpForm(true)}
                    className="flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition border border-slate-200 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Agregar Seguimiento</span>
                  </button>
                </div>

                {activeAgent.followUps.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin seguimientos por tiempo activos para este agente.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {activeAgent.followUps.map(fup => (
                      <div key={fup.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/30 transition flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                            <Clock className="h-3.5 w-3.5 text-indigo-600" />
                            <span>A los {fup.delayHours}h y {fup.delayMinutes}m de inactividad</span>
                          </div>
                          <p className="text-xs text-slate-500 italic">"{fup.content}"</p>
                        </div>
                        <button
                          onClick={() => handleDeleteFollowUp(fup.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 space-y-1 bg-white border border-slate-150 rounded-2xl">
              <BrainCircuit className="h-10 w-10 mx-auto text-slate-300" />
              <p className="text-sm font-semibold">Selecciona o crea un agente de IA para ver sus especificaciones.</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE NEW AGENT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800">Crear Nuevo Agente de IA</h3>
                <button onClick={() => setShowCreateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAgent} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Nombre del Agente</label>
                  <input
                    type="text"
                    required
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Ej. Agente Calificador de Bienes Raíces"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Delay Mínimo (segundos)</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={30}
                      value={minDelay}
                      onChange={(e) => setMinDelay(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 focus:outline-none text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Delay Máximo (segundos)</label>
                    <input
                      type="number"
                      required
                      min={2}
                      max={60}
                      value={maxDelay}
                      onChange={(e) => setMaxDelay(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 focus:outline-none text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Multimedia Máxima por Conversación</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10}
                    value={maxMedia}
                    onChange={(e) => setMaxMedia(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 focus:outline-none text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-750 text-sm font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition cursor-pointer"
                  >
                    Crear Agente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STAGE ADD MESSAGE SUB-MODAL */}
      <AnimatePresence>
        {showAddMsgForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800 font-sans">Agregar Mensaje a la Etapa</h3>
                <button onClick={() => setShowAddMsgForm(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Message type selection */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Tipo de Mensaje</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { type: 'text', label: 'Texto', icon: FileText },
                      { type: 'image', label: 'Foto', icon: ImageIcon },
                      { type: 'video', label: 'Video', icon: Film },
                      { type: 'audio', label: 'Audio', icon: Mic }
                    ].map(btn => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.type}
                          type="button"
                          onClick={() => setMsgType(btn.type as any)}
                          className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold flex flex-col items-center gap-1 cursor-pointer transition ${
                            msgType === btn.type
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message Content / URL */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">
                    {msgType === 'text' ? 'Texto del mensaje de WhatsApp' : 'Enlace / URL de Multimedia'}
                  </label>
                  {msgType === 'text' ? (
                    <textarea
                      rows={3}
                      required
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      placeholder="Hola, es un placer..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs resize-none"
                    />
                  ) : (
                    <input
                      type="url"
                      required
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                  )}
                </div>

                {/* Delay configuration */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Demora entre mensajes (segundos)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={msgDelay}
                    onChange={(e) => setMsgDelay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddMsgForm(false)}
                    className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddStageMessage}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOLLOW-UP ADD SUB-MODAL */}
      <AnimatePresence>
        {showFollowUpForm && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-800">Agregar Seguimiento</h3>
                <button onClick={() => setShowFollowUpForm(false)} className="p-1 hover:bg-slate-100 rounded-lg cursor-pointer text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Horas de Delay</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={120}
                      value={followUpHours}
                      onChange={(e) => setFollowUpHours(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-600 uppercase">Minutos de Delay</label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={59}
                      value={followUpMinutes}
                      onChange={(e) => setFollowUpMinutes(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Tipo</label>
                  <select
                    value={followUpType}
                    onChange={(e) => setFollowUpType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-750 text-xs focus:outline-none"
                  >
                    <option value="text">Texto Fijo</option>
                    <option value="image">Folleto / Imagen</option>
                    <option value="video">Folleto / Video</option>
                    <option value="audio">Mensaje de Voz (Audio)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">
                    {followUpType === 'text' ? 'Texto del mensaje de WhatsApp' : 'Enlace / URL de Multimedia'}
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={followUpContent}
                    onChange={(e) => setFollowUpContent(e.target.value)}
                    placeholder="Hola, ¿pudiste revisar el video que te envié antes?"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowFollowUpForm(false)}
                    className="px-4 py-2 bg-slate-150 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddFollowUp}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Agregar Seguimiento
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
