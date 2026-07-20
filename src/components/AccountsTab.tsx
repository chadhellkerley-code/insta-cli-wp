import React from 'react';
import { WhatsAppAccount } from '../types';
import { deleteWhatsAppAccount } from '../lib/db-service';
import { Trash2, Phone } from 'lucide-react';


interface AccountsTabProps {
  accounts: WhatsAppAccount[];
}

export default function AccountsTab({ accounts }: AccountsTabProps) {
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
