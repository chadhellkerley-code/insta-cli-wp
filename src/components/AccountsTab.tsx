import React, { useState } from 'react';
import { WhatsAppAccount } from '../types';
import { addWhatsAppAccount, deleteWhatsAppAccount } from '../lib/db-service';
import { Plus, Trash2, Key, HelpCircle, Phone, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AccountsTabProps {
  accounts: WhatsAppAccount[];
}

export default function AccountsTab({ accounts }: AccountsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [token, setToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !phoneNumber.trim() || !phoneNumberId.trim() || !token.trim()) {
      setError("Por favor completa los campos requeridos.");
      return;
    }

    setLoading(true);
    try {
      await addWhatsAppAccount({
        name: name,
        phoneNumber: phoneNumber,
        phoneNumberId: phoneNumberId,
        token: token,
        status: 'connected'
      });

      setSuccess("¡Cuenta de WhatsApp vinculada exitosamente! El token se renovará automáticamente.");
      setName('');
      setPhoneNumber('');
      setToken('');
      setPhoneNumberId('');
      setTimeout(() => {
        setShowAddForm(false);
        setSuccess('');
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error al conectar la cuenta. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas desvincular esta cuenta de WhatsApp?")) {
      try {
        await deleteWhatsAppAccount(id);
      } catch (err: any) {
        console.error("Delete account error:", err);
        alert("Error al eliminar la cuenta.");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cuentas Conectadas</h1>
          <p className="text-sm text-slate-500">Vincula tus líneas oficiales de WhatsApp Cloud API con renovación inteligente.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md shadow-indigo-150 cursor-pointer text-sm"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Vincular Nueva Cuenta</span>
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
            <div className="bg-slate-50 border border-slate-200/80 p-6 rounded-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                Vincular Canal de WhatsApp Business Cloud API
              </h3>

              <form onSubmit={handleAddAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Nombre Interno de la Cuenta</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Ej. Soporte Ventas Latam"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Número de Teléfono de WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Ej. +34 612 345 678"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase">Phone Number ID</label>
                  <input
                    type="text"
                    required
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                    placeholder="123456789012345"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
                    <span>Meta Cloud API Token (Acceso Temporal de 60 días o Permanente)</span>
                    <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Renovación Automática Activada
                    </span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-250 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                      placeholder="EAHBgM17vPZB0BA..."
                    />
                  </div>
                </div>

                {error && <div className="md:col-span-2 text-xs font-semibold text-rose-500 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">{error}</div>}
                {success && <div className="md:col-span-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl">{success}</div>}

                <div className="md:col-span-2 flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Conectando..." : "Vincular Cuenta"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Meta API setup guides */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-1.5 lg:col-span-2">
          <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
            <HelpCircle className="h-4.5 w-4.5 text-slate-400" />
            ¿Cómo obtener un Token de WhatsApp gratis?
          </h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Meta ofrece un nivel gratuito para la API de WhatsApp Business Cloud de hasta 1,000 conversaciones gratuitas al mes. Para conectar tu número oficial:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-500 space-y-1 pl-1">
            <li>Crea una cuenta de desarrollador en <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold">Meta Developers</a>.</li>
            <li>Crea una aplicación comercial e integra el producto "WhatsApp".</li>
            <li>Obtén tu identificador de número de teléfono y tu token temporal o de sistema permanente (válidos por 60 días o indefinidos).</li>
          </ul>
        </div>
        <div className="bg-indigo-50/50 border border-indigo-100/60 p-4 rounded-xl flex flex-col justify-between">
          <p className="text-xs text-slate-600 italic font-medium leading-relaxed">
            "Nuestra plataforma monitorea los tokens de acceso y gestiona la renovación automática periódica antes de que venzan para evitar interrupciones."
          </p>
          <div className="text-[10px] text-indigo-600 font-bold tracking-wider uppercase pt-2">
            ✓ Smart Token Keep-Alive
          </div>
        </div>
      </div>

      {/* Connected Accounts List */}
      <div className="bg-white rounded-2xl border border-slate-150 shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-150">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Cuentas Conectadas ({accounts.length})</h3>
        </div>

        {accounts.length === 0 ? (
          <div className="p-10 text-center text-slate-400 space-y-1">
            <Phone className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">No hay cuentas vinculadas</p>
            <p className="text-xs text-slate-400">Presiona "Vincular Nueva Cuenta" para empezar.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-150">
            {accounts.map((account) => {
              const daysLeft = Math.max(1, Math.round((account.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={account.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:bg-slate-50/40 transition">
                  <div className="flex items-center gap-3">
                    <div className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      <Phone className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        {account.name}
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] rounded-full font-bold">Activa</span>
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold">{account.phoneNumber}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Vinculado el: {account.connectedAt.toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-semibold text-slate-600">Renovación automática</div>
                      <div className="text-[11px] font-bold text-indigo-600">Token expira en {daysLeft} días (Autogestionado)</div>
                    </div>

                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-100 rounded-xl transition cursor-pointer"
                      title="Desvincular cuenta"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
