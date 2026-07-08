import React from 'react';
import { Chat, Message, WhatsAppAccount, CRMStats } from '../types';
import {
  Users,
  MessageSquare,
  Send,
  ArrowDownLeft,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  TrendingUp,
  Clock
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface DashboardTabProps {
  accounts: WhatsAppAccount[];
  chats: Chat[];
  messages: Message[];
}

export default function DashboardTab({ accounts, chats, messages }: DashboardTabProps) {
  const totalAccounts = accounts.length;

  // Helper to safely get time from potentially mocked/Firestore timestamps
  const getTime = (ts: any) => {
    if (!ts) return 0;
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts.toDate === 'function') return ts.toDate().getTime();
    return new Date(ts).getTime();
  };

  // Sentiment counters based on chat tags
  let interestedCount = chats.filter(c => c.tags.some(t => t.toLowerCase().includes('interes') || t.toLowerCase() === 'client')).length;
  let uninterestedCount = chats.filter(c => c.tags.some(t => t.toLowerCase().includes('no interes') || t.toLowerCase().includes('uninterest'))).length;
  let repliedCount = chats.filter(c => c.lastMessage !== '').length;
  let objectiveMetCount = chats.filter(c => c.tags.some(t => t.toLowerCase().includes('met') || t.toLowerCase().includes('agendado') || t.toLowerCase().includes('objetivo'))).length;

  // Flow data for charts
  const conversionData = [
    { name: 'Nuevos', cantidad: chats.length, fill: '#38bdf8' },
    { name: 'Respondidos', cantidad: repliedCount, fill: '#fbbf24' },
    { name: 'Interesados', cantidad: interestedCount, fill: '#6366f1' },
    { name: 'No Interesados', cantidad: uninterestedCount, fill: '#f87171' },
    { name: 'Citas Agendadas', cantidad: objectiveMetCount, fill: '#a78bfa' }
  ];

  // Dynamic flow chart data (Last 7 days)
  const now = new Date();
  const getDayName = (d: Date) => d.toLocaleDateString('es-ES', { weekday: 'short' });
  const chartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    const dayStart = new Date(d.setHours(0,0,0,0)).getTime();
    const dayEnd = new Date(d.setHours(23,59,59,999)).getTime();
    const dayMessages = messages.filter(m => {
      const t = getTime(m.timestamp);
      return t >= dayStart && t <= dayEnd;
    });

    return {
      name: getDayName(d),
      Recibidos: dayMessages.filter(m => m.sender === 'contact').length,
      Enviados: dayMessages.filter(m => m.sender === 'me').length
    };
  });

  // Today stats
  const todayStart = new Date(new Date(now).setHours(0,0,0,0)).getTime();
  const receivedToday = messages.filter(m => getTime(m.timestamp) >= todayStart && m.sender === 'contact').length;
  const sentToday = messages.filter(m => getTime(m.timestamp) >= todayStart && m.sender === 'me').length;
  const totalToday = receivedToday + sentToday;

  const responseRate = (receivedToday > 0) ? ((sentToday / receivedToday) * 100).toFixed(1) : 0;

  // Historical periods
  const msInDay = 24 * 60 * 60 * 1000;
  const getPeriodCount = (days: number) => {
    const start = now.getTime() - (days * msInDay);
    return messages.filter(m => getTime(m.timestamp) >= start).length;
  };

  const yesterdayCount = messages.filter(m => {
    const t = getTime(m.timestamp);
    const yesterdayStart = todayStart - msInDay;
    return t >= yesterdayStart && t < todayStart;
  }).length;

  const totalNet = messages.length;
  const interestRate = chats.length > 0 ? ((interestedCount / chats.length) * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Panel de Control</h1>
          <p className="text-sm text-slate-500">Métricas en tiempo real y rendimiento de tus agentes de WhatsApp.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
          <Clock className="h-4 w-4 text-slate-400" />
          <span>Actualizado hace unos segundos</span>
        </div>
      </div>

      {/* Main Stats Row - Bento Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuentas WhatsApp</p>
            <h3 className="text-2xl font-bold text-slate-800">{totalAccounts} Conectadas</h3>
            <p className="text-xs text-indigo-600 font-medium">● Canales Activos</p>
          </div>
          <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
            <Users className="h-6 w-6 text-indigo-600" />
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recibidos Hoy</p>
            <h3 className="text-2xl font-bold text-slate-800">{receivedToday} Mensajes</h3>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
            <MessageSquare className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tasa de Respuesta</p>
            <h3 className="text-2xl font-bold text-slate-800">{responseRate}%</h3>
          </div>
          <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
            <ThumbsUp className="h-6 w-6 text-amber-500" />
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white p-5 rounded-2xl border border-slate-150 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Objetivos Cumplidos</p>
            <h3 className="text-2xl font-bold text-slate-800">{objectiveMetCount} Citas</h3>
          </div>
          <div className="bg-violet-50 p-3 rounded-xl border border-violet-100">
            <CheckCircle className="h-6 w-6 text-violet-500" />
          </div>
        </div>
      </div>

      {/* Historical Messages Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Histórico de Flujo de Mensajería</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-500">Ayer</p>
            <p className="text-xl font-bold text-slate-700">{yesterdayCount}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-500">Últimos 7 días</p>
            <p className="text-xl font-bold text-slate-700">{getPeriodCount(7)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-500">Últimos 14 días</p>
            <p className="text-xl font-bold text-slate-700">{getPeriodCount(14)}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
            <p className="text-xs font-semibold text-slate-500">Últimos 30 días</p>
            <p className="text-xl font-bold text-slate-700">{getPeriodCount(30)}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100/60 text-center">
            <p className="text-xs font-semibold text-indigo-600">Total Netos</p>
            <p className="text-xl font-bold text-indigo-700">{totalNet}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center col-span-2 sm:col-span-1">
            <p className="text-xs font-semibold text-slate-500">Interés Gral.</p>
            <p className="text-xl font-bold text-slate-700">{interestRate}%</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Area Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              Rendimiento de Conversación Semanal
            </h3>
            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Recibidos</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Enviados</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRecibidos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorEnviados" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                <Area type="monotone" dataKey="Recibidos" stroke="#38bdf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRecibidos)" />
                <Area type="monotone" dataKey="Enviados" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEnviados)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel/Sentiment distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <ThumbsUp className="h-5 w-5 text-indigo-600" />
            Distribución de Leads
          </h3>
          <div className="h-64 w-full flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={conversionData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" stroke="#94a3b8" fontSize={10} hide />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={80} />
                <Tooltip />
                <Bar dataKey="cantidad" radius={6} />
              </BarChart>
            </ResponsiveContainer>

            {/* Sentiment specific counters */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Interesados</p>
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-indigo-600">
                  <ThumbsUp className="h-3.5 w-3.5 shrink-0" />
                  <span>{interestedCount}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">No Interesa</p>
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-rose-600">
                  <ThumbsDown className="h-3.5 w-3.5 shrink-0" />
                  <span>{uninterestedCount}</span>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold text-slate-400 uppercase">Respondidos</p>
                <div className="flex items-center justify-center gap-1 text-xs font-bold text-blue-600">
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  <span>{repliedCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
