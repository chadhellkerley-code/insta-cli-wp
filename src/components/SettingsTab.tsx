import React, { useState, useEffect } from 'react';
import { TeamMember, WhatsAppAccount, UserProfile } from '../types';
import {
  getGlobalSettings,
  updateGlobalSettings,
  subscribeToTeam,
  addTeamMember,
  deleteTeamMember,
  updateUserProfile
} from '../lib/db-service';
import {
  Send,
  Plus,
  Trash2,
  Check,
  UserPlus,
  Users,
  Settings,
  Sparkles,
  BellRing,
  ShieldCheck,
  CheckSquare,
  Square,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SettingsTabProps {
  accounts: WhatsAppAccount[];
  teamMembers: TeamMember[];
  userProfile: UserProfile;
}

export default function SettingsTab({ accounts, teamMembers, userProfile }: SettingsTabProps) {
  // Personal API Key States
  const [personalApiKey, setPersonalApiKey] = useState(userProfile.geminiApiKey || '');
  const [personalApiKeyLoading, setPersonalApiKeyLoading] = useState(false);
  const [personalApiKeyMsg, setPersonalApiKeyMsg] = useState('');

  // Telegram States
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramMsg, setTelegramMsg] = useState('');

  // Setter Add States
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Setter Permissions Checklist
  const [permissions, setPermissions] = useState<string[]>(['inbox']); // Always allow inbox by default
  const [allowedAccounts, setAllowedAccounts] = useState<string[]>([]);
  const [setterLoading, setSetterLoading] = useState(false);
  const [setterError, setSetterError] = useState('');
  const [setterSuccess, setSetterSuccess] = useState('');

  // Fetch Telegram Configurations on load
  useEffect(() => {
    async function loadTelegram() {
      const config = await getGlobalSettings();
      if (config) {
        setTelegramToken(config.telegramToken || '');
        setTelegramChatId(config.telegramChatId || '');
        setTelegramEnabled(config.telegramEnabled || false);
      }
    }
    loadTelegram();
  }, []);

  const handleSavePersonalApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalApiKeyLoading(true);
    setPersonalApiKeyMsg('');
    try {
      await updateUserProfile(userProfile.id, { geminiApiKey: personalApiKey });
      setPersonalApiKeyMsg('API Key guardada correctamente.');
      setTimeout(() => setPersonalApiKeyMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setPersonalApiKeyMsg('Error al guardar la API Key.');
    } finally {
      setPersonalApiKeyLoading(false);
    }
  };

  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setTelegramLoading(true);
    setTelegramMsg('');

    try {
      await updateGlobalSettings({
        telegramToken,
        telegramChatId,
        telegramEnabled
      });
      setTelegramMsg("✓ Configuración de Telegram guardada exitosamente.");
      setTimeout(() => setTelegramMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setTelegramMsg("Error al guardar.");
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!telegramToken || !telegramChatId) {
      setTelegramMsg("Error: Token y Chat ID son requeridos para hacer pruebas.");
      return;
    }
    setTelegramLoading(true);
    setTelegramMsg('');

    try {
      const response = await fetch('/api/telegram/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: telegramToken,
          chatId: telegramChatId,
          message: "🔔 <b>¡Prueba de Instacli WP exitosa!</b>\nEste es un mensaje de alerta del CRM para tus asesores de ventas."
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setTelegramMsg("✓ ¡Mensaje de prueba enviado exitosamente a tu canal de Telegram!");
      } else {
        throw new Error(data.error || "Failed to trigger proxy notification");
      }
    } catch (err: any) {
      console.error(err);
      setTelegramMsg(`Error de prueba: ${err.message || 'Verifica el token y chat ID.'}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleTogglePermission = (perm: string) => {
    if (permissions.includes(perm)) {
      // Keep inbox as mandatory unless they untoggle it
      setPermissions(permissions.filter(p => p !== perm));
    } else {
      setPermissions([...permissions, perm]);
    }
  };

  const handleAddSetter = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetterError('');
    setSetterSuccess('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setSetterError("Por favor completa todos los campos requeridos.");
      return;
    }

    setSetterLoading(true);
    try {
      // 1. In production CRM, we can register them in Firestore Team list
      // Setters log in with their email and password
      await addTeamMember({
        name,
        email,
        role: 'SETTER',
        permissions,
        allowedAccounts
      });

      setSetterSuccess(`¡Closer/Setter ${name} registrado y configurado con acceso seguro!`);
      setName('');
      setEmail('');
      setPassword('');
      setPermissions(['inbox']);
      setAllowedAccounts([]);
      setTimeout(() => {
        setShowAddForm(false);
        setSetterSuccess('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSetterError(err.message || "Error al agregar integrante.");
    } finally {
      setSetterLoading(false);
    }
  };

  const handleDeleteSetter = async (memberId: string) => {
    if (window.confirm("¿Estás seguro de que deseas revocar el acceso a este integrante del equipo?")) {
      try {
        await deleteTeamMember(memberId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const availableSections = [
    { id: 'dashboard', label: 'Panel Dashboard (Estadísticas)' },
    { id: 'accounts', label: 'Conexión de Cuentas (Vincular/Eliminar)' },
    { id: 'inbox', label: 'Inbox (WhatsApp Messenger y Chats)' },
    { id: 'automations', label: 'Automaciones (Agentes de IA)' },
    { id: 'settings', label: 'Configuraciones Generales' }
  ];

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ajustes Generales</h1>
        <p className="text-sm text-slate-500">Configura notificaciones instantáneas de Telegram y gestiona los accesos de tu equipo.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram notifications setup panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-150 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BellRing className="h-4.5 w-4.5 text-indigo-600" />
              Notificador en Telegram
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2.5 py-0.5 rounded-full">Alertas</span>
          </div>

          <form onSubmit={handleSaveTelegram} className="space-y-4 text-xs font-sans">
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Recibe avisos automáticos en tu grupo o canal privado de Telegram cada vez que un prospecto de WhatsApp sea calificado como <b>Interesado</b> o listo para agendar.
            </p>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Telegram Bot API Token</label>
              <input
                type="password"
                required
                value={telegramToken}
                onChange={(e) => setTelegramToken(e.target.value)}
                placeholder="5482930219:AAH9Zld903n..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-600 uppercase">Telegram Chat ID / Canal ID</label>
              <input
                type="text"
                required
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-100128392182"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:bg-white rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Enabled toggle checkbox */}
            <div className="flex items-center gap-2 py-1">
              <button
                type="button"
                onClick={() => setTelegramEnabled(!telegramEnabled)}
                className="text-slate-400 hover:text-indigo-600 cursor-pointer transition"
              >
                {telegramEnabled ? (
                  <CheckSquare className="h-5 w-5 text-indigo-600" />
                ) : (
                  <Square className="h-5 w-5 text-slate-400" />
                )}
              </button>
              <span className="font-bold text-slate-700 select-none">Activar notificaciones instantáneas</span>
            </div>

            {telegramMsg && (
              <div className="p-2.5 bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold rounded-xl">
                {telegramMsg}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={telegramLoading}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-bold rounded-xl transition text-[11px] cursor-pointer"
              >
                Probar Canal
              </button>
              <button
                type="submit"
                disabled={telegramLoading}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-[11px] cursor-pointer"
              >
                {telegramLoading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </form>
        </div>

        {/* Personal Gemini API Key Config */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-150 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-600" />
              API Key de Gemini
            </h3>
          </div>

          <form onSubmit={handleSavePersonalApiKey} className="space-y-4">
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Configura tu clave personal de Gemini AI para que los agentes utilicen tu propia cuenta para generar respuestas.
              Si dejas esto en blanco, se utilizará la clave por defecto de la aplicación (si está configurada).
            </p>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider">Tu Gemini API Key</label>
              <input
                type="password"
                required
                value={personalApiKey}
                onChange={(e) => setPersonalApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-250 focus:bg-white rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-xs transition"
              />
            </div>

            {personalApiKeyMsg && (
              <div className={`p-2.5 border text-[11px] font-bold rounded-xl ${personalApiKeyMsg.includes('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                {personalApiKeyMsg}
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={personalApiKeyLoading}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition text-[11px] cursor-pointer"
              >
                {personalApiKeyLoading ? "Guardando..." : "Guardar Clave"}
              </button>
            </div>
          </form>
        </div>

        {/* Closers / Setters Team Access Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-150 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-4.5 w-4.5 text-indigo-600" />
              Gestión de Closers y Setters
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-0.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir Miembro</span>
            </button>
          </div>

          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <form onSubmit={handleAddSetter} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 text-xs">
                  <h4 className="font-bold text-slate-800 flex items-center gap-1">
                    <UserPlus className="h-4 w-4 text-indigo-600" />
                    Registrar Integrante
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Nombre Completo</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Lucas Fernández"
                        className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Correo de Ingreso</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="lucas@correo.com"
                        className="w-full px-3 py-1.5 bg-white border border-slate-250 rounded-xl font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-0.5">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase">Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-3 pr-9 py-1.5 bg-white border border-slate-250 rounded-xl font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2 hover:text-slate-700 text-slate-400"
                        >
                          {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Section permissions checkboxes */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase">Secciones Permitidas (Roles de Acceso)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 bg-white p-3 rounded-xl border border-slate-200">
                      {availableSections.map(sec => {
                        const isGranted = permissions.includes(sec.id);
                        return (
                          <div
                            key={sec.id}
                            onClick={() => handleTogglePermission(sec.id)}
                            className="flex items-center gap-2 cursor-pointer py-1.5 hover:bg-slate-50 px-2 rounded-lg"
                          >
                            <button
                              type="button"
                              className="text-slate-400 hover:text-indigo-600 transition"
                            >
                              {isGranted ? (
                                <CheckSquare className="h-4.5 w-4.5 text-indigo-600" />
                              ) : (
                                <Square className="h-4.5 w-4.5 text-slate-300" />
                              )}
                            </button>
                            <span className="text-[11px] font-semibold text-slate-700 select-none">{sec.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {setterError && <div className="text-[10px] font-bold text-rose-500 bg-rose-50 border border-rose-100 p-2 rounded-lg">{setterError}</div>}
                  {setterSuccess && <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 p-2 rounded-lg">{setterSuccess}</div>}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={setterLoading}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                    >
                      {setterLoading ? "Guardando..." : "Guardar Asesor"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* List of current team members */}
          <div className="space-y-2">
            {teamMembers.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay closers o setters registrados todavía.
              </div>
            ) : (
              teamMembers.map((member) => (
                <div key={member.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
                  <div className="space-y-1 text-xs">
                    <h4 className="font-bold text-slate-800">{member.name}</h4>
                    <p className="text-[10px] font-semibold text-slate-400 font-mono">{member.email}</p>

                    {/* Perms display */}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {member.permissions.map(p => (
                        <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-md font-extrabold tracking-wider bg-indigo-50 border border-indigo-100 text-indigo-700">
                          {p.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteSetter(member.id)}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-transparent hover:border-rose-150 rounded-xl transition cursor-pointer"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
