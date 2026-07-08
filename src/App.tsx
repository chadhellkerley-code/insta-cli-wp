import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import {
  getUserProfile,
  ensureDemoDataSeeded,
  subscribeToAccounts,
  subscribeToChats,
  subscribeToAgents,
  subscribeToTeam
} from './lib/db-service';
import { UserProfile, WhatsAppAccount, Chat, Agent, TeamMember } from './types';
import LoginScreen from './components/LoginScreen';
import DashboardTab from './components/DashboardTab';
import AccountsTab from './components/AccountsTab';
import InboxTab from './components/InboxTab';
import AutomationsTab from './components/AutomationsTab';
import SettingsTab from './components/SettingsTab';

// Lucide Icons
import {
  LayoutDashboard,
  PhoneCall,
  MessageCircle,
  Cpu,
  Settings,
  LogOut,
  Sparkles,
  User,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { motion } from 'motion/react';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Real-time collections state
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Current active navigation tab
  const [activeTab, setActiveTab] = useState<string>('inbox');

  // Trigger seeding and listen to Firebase Auth State Change
  useEffect(() => {
    // Seed initial demo data (so first-time CEO registers see a gorgeous active CRM with chats)
    ensureDemoDataSeeded().then(() => {
      console.log("Instacli WP demo data verified / seeded successfully.");
    });

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile({
              id: user.uid,
              email: profile.email || user.email || '',
              name: profile.name || 'User',
              role: (profile.role as 'CEO' | 'SETTER') || 'CEO',
              permissions: profile.permissions || ['dashboard', 'accounts', 'inbox', 'automations', 'settings'],
              createdAt: profile.createdAt || new Date()
            });

            // Set initial active tab based on what they are allowed to access
            const allowed = profile.permissions || [];
            if (allowed.includes('inbox')) {
              setActiveTab('inbox');
            } else if (allowed.length > 0) {
              setActiveTab(allowed[0]);
            }
          } else {
            // Fallback CEO setup
            const fallbackProfile: UserProfile = {
              id: user.uid,
              email: user.email || '',
              name: user.displayName || user.email?.split('@')[0] || 'CEO',
              role: 'CEO',
              permissions: ['dashboard', 'accounts', 'inbox', 'automations', 'settings'],
              createdAt: new Date()
            };
            setUserProfile(fallbackProfile);
            setActiveTab('inbox');
          }
        } catch (e) {
          console.error("Auth loading failed:", e);
        }
      } else {
        // Only clear state if there isn't a manual "Demo login" state active
        // (This protects the fallback mock flow!)
        setUserProfile(current => {
          if (current?.id.startsWith('demo_')) {
            return current; // keep mock login
          }
          return null;
        });
      }
      setAuthLoading(false);
    });

    return () => unsubAuth();
  }, []);

  // Real-time Firestore subscriptions (activated when a user is logged in!)
  useEffect(() => {
    if (!userProfile) return;

    const unsubAccounts = subscribeToAccounts((data) => setAccounts(data));
    const unsubChats = subscribeToChats((data) => setChats(data));
    const unsubAgents = subscribeToAgents((data) => setAgents(data));
    const unsubTeam = subscribeToTeam((data) => setTeamMembers(data));

    return () => {
      unsubAccounts();
      unsubChats();
      unsubAgents();
      unsubTeam();
    };
  }, [userProfile]);

  const handleLogout = async () => {
    if (window.confirm("¿Seguro que deseas cerrar sesión?")) {
      await signOut(auth);
      setUserProfile(null);
    }
  };

  const handleLoginSuccess = (profile: UserProfile) => {
    setUserProfile(profile);
    const allowed = profile.permissions || [];
    if (allowed.includes('inbox')) {
      setActiveTab('inbox');
    } else if (allowed.length > 0) {
      setActiveTab(allowed[0]);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <Sparkles className="h-10 w-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-semibold text-slate-600">Cargando Instacli WP...</p>
        </div>
      </div>
    );
  }

  // Display beautiful Login interface if no active user
  if (!userProfile) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Multi-user role permissions restriction lists
  const isAllowed = (tabId: string) => {
    if (userProfile.role === 'CEO') return true;
    return userProfile.permissions.includes(tabId);
  };

  const navigationItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'accounts', label: 'Cuentas WA', icon: PhoneCall },
    { id: 'inbox', label: 'Inbox Chats', icon: MessageCircle },
    { id: 'automations', label: 'Agentes IA', icon: Cpu },
    { id: 'settings', label: 'Ajustes', icon: Settings },
  ].filter(item => isAllowed(item.id));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* 1. Header Toolbar */}
      <header className="bg-white text-slate-800 border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-xl font-bold shadow-lg shadow-indigo-150">
            WP
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-slate-800 flex items-center gap-2">
              Instacli WP
              <span className="text-[10px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full font-bold text-indigo-600">v1.2</span>
            </h1>
          </div>
        </div>

        {/* User profile info display */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
            <div className="p-1 bg-indigo-50 rounded-lg text-indigo-600">
              <User className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold leading-none flex items-center gap-1.5 text-slate-800">
                {userProfile.name}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                  userProfile.role === 'CEO'
                    ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}>
                  {userProfile.role}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-semibold truncate max-w-[150px]">{userProfile.email}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-2 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-400 hover:border-rose-100 border border-slate-200 rounded-xl transition cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Sidebar navigation */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-1 shrink-0">
          <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-3 mb-2">Menú de Navegación</p>
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-100/50'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Quick role alert footer */}
          <div className="mt-auto pt-4 border-t border-slate-100 pl-2">
            <div className="flex items-start gap-2 text-[10px] text-slate-400 font-semibold">
              <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
              <span>
                {userProfile.role === 'CEO'
                  ? 'Acceso administrativo completo.'
                  : 'Acceso restringido por el CEO.'}
              </span>
            </div>
          </div>
        </aside>

        {/* Content container */}
        <main className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && isAllowed('dashboard') && (
              <DashboardTab accounts={accounts} chats={chats} messages={[]} />
            )}

            {activeTab === 'accounts' && isAllowed('accounts') && (
              <AccountsTab accounts={accounts} />
            )}

            {activeTab === 'inbox' && isAllowed('inbox') && (
              <InboxTab accounts={accounts} chats={chats} agents={agents} />
            )}

            {activeTab === 'automations' && isAllowed('automations') && (
              <AutomationsTab agents={agents} />
            )}

            {activeTab === 'settings' && isAllowed('settings') && (
              <SettingsTab accounts={accounts} teamMembers={teamMembers} />
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
