import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUserProfile, getUserProfile } from '../lib/db-service';
import { UserProfile } from '../types';
import { KeyRound, Mail, User, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginScreenProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Try Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch user profile from firestore
      let profile = await getUserProfile(user.uid);

      if (!profile) {
        // Fallback or automatic CEO assignment if document doesn't exist
        profile = {
          id: user.uid,
          email: user.email || email,
          name: user.displayName || email.split('@')[0],
          role: 'CEO',
          permissions: ['dashboard', 'accounts', 'inbox', 'automations', 'settings'],
          createdAt: new Date()
        };
        await createUserProfile(user.uid, {
          email: profile.email,
          name: profile.name,
          role: profile.role,
          permissions: profile.permissions
        });
      }

      onLoginSuccess({
        id: user.uid,
        email: profile.email || email,
        name: profile.name || 'User',
        role: (profile.role as 'CEO' | 'SETTER') || 'CEO',
        permissions: profile.permissions || ['dashboard', 'accounts', 'inbox', 'automations', 'settings'],
        createdAt: profile.createdAt || new Date()
      });
    } catch (err: any) {
      console.error("Auth Error:", err);
      // Give a helpful, human message
      let msg = "Error al iniciar sesión. Verifica tus datos.";
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = "Correo o contraseña incorrectos.";
      } else if (err.code === 'auth/network-request-failed') {
        msg = "Error de conexión. Inténtalo nuevamente.";
      } else {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!name.trim()) {
      setError("Por favor, ingresa tu nombre.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // New registrations via this screen are always CEOs (as requested: "cuando una persona quiera ingresar y ser como CEO")
      const newProfile = {
        email: email,
        name: name,
        role: 'CEO' as const,
        permissions: ['dashboard', 'accounts', 'inbox', 'automations', 'settings']
      };

      await createUserProfile(user.uid, newProfile);

      onLoginSuccess({
        id: user.uid,
        ...newProfile,
        createdAt: new Date()
      });
    } catch (err: any) {
      console.error("Registration Error:", err);
      let msg = "Error al registrar la cuenta.";
      if (err.code === 'auth/email-already-in-use') {
        msg = "Este correo ya está registrado.";
      } else if (err.code === 'auth/weak-password') {
        msg = "La contraseña debe tener al menos 6 caracteres.";
      } else {
        msg = err.message || msg;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Demo fallback to bypass Firebase Auth constraints instantly if needed during tests
  const handleDemoLogin = (role: 'CEO' | 'SETTER') => {
    const demoProfile: UserProfile = role === 'CEO'
      ? {
          id: 'demo_ceo_uid',
          email: 'ceo@instacli.com',
          name: 'Matias Diaz (CEO)',
          role: 'CEO',
          permissions: ['dashboard', 'accounts', 'inbox', 'automations', 'settings'],
          createdAt: new Date()
        }
      : {
          id: 'demo_setter_uid',
          email: 'lucas@instacli.com',
          name: 'Lucas (Closer/Setter)',
          role: 'SETTER',
          permissions: ['inbox'], // Only inbox by default
          createdAt: new Date()
        };

    onLoginSuccess(demoProfile);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 flex flex-col items-center">
        <div className="flex justify-center">
          <div className="bg-indigo-600 p-3.5 rounded-2xl text-white shadow-xl shadow-indigo-100">
            <Sparkles className="h-9 w-9 text-white" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold tracking-tight text-slate-800">
          Instacli WP
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          {isRegistering
            ? "Crea tu cuenta de CEO para gestionar tus ventas en WhatsApp"
            : "Inicia sesión para acceder a tu panel de CRM"}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white py-8 px-4 shadow-xl shadow-slate-100 border border-slate-200 rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={isRegistering ? handleRegister : handleLogin}>
            {error && (
              <div className="bg-rose-50 border border-rose-150 text-rose-700 text-sm p-3 rounded-xl flex items-start gap-2">
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    placeholder="Matias Diaz"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Correo Electrónico
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="ejemplo@correo.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1">
                Contraseña
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <KeyRound className="h-5 w-5 text-slate-400" />
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-100 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer transition-colors duration-200"
              >
                {loading ? "Procesando..." : (isRegistering ? "Crear Cuenta CEO" : "Iniciar Sesión")}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-slate-400 select-none font-semibold">
                ¿Prefieres otra opción?
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 font-bold transition-colors"
              >
                {isRegistering ? "Ya tengo cuenta, Iniciar Sesión" : "Registrar nueva cuenta de CEO"}
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-[10px] text-center text-slate-500 mb-3 uppercase tracking-wider font-bold">
              Acceso Rápido de Demostración
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleDemoLogin('CEO')}
                className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-600 transition-colors"
              >
                Entrar como CEO
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('SETTER')}
                className="py-1.5 px-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Entrar como Setter
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
