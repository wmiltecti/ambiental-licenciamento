import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Test Supabase connection
const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('license_processes').select('count').limit(1);
    return !error;
  } catch (err) {
    console.warn('Supabase connection test failed:', err);
    return false;
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  isSupabaseReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, role: string) => Promise<void>;
  signOut: () => Promise<void>;
  userMetadata: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfigured] = useState(isSupabaseConfigured());
  const [isSupabaseReady, setIsSupabaseReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!isConfigured) {
        if (mounted) {
          setIsSupabaseReady(false);
          setLoading(false);
        }
        return;
      }

      // Test Supabase connection
      const connectionTest = await testSupabaseConnection();
      if (mounted) {
        setIsSupabaseReady(connectionTest);
      }

      if (!connectionTest) {
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (mounted) {
          if (error) {
            console.warn('Auth session error:', error.message);
          }
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen for auth changes only if configured
    let subscription: any = null;
    if (isConfigured && isSupabaseReady) {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (mounted) {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
          }
        }
      );
      subscription = authSubscription;
    }

    return () => {
      mounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isConfigured, isSupabaseReady]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured || !isSupabaseReady) {
      throw new Error('Sistema não configurado. Entre em contato com o administrador.');
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email ou senha incorretos. Verifique suas credenciais e tente novamente.');
      } else if (error.message.includes('Email not confirmed')) {
        throw new Error('Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.');
      } else if (error.message.includes('Too many requests')) {
        throw new Error('Muitas tentativas de login. Aguarde alguns minutos e tente novamente.');
      } else {
        throw new Error(`Erro no login: ${error.message}`);
      }
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    if (!isConfigured || !isSupabaseReady) {
      throw new Error('Sistema não configurado. Entre em contato com o administrador.');
    }
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          role: role
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });
    
    if (error) {
      if (error.message.includes('User already registered')) {
        throw new Error('Este email já está cadastrado. Tente fazer login ou use outro email.');
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Email inválido. Verifique o formato do email.');
      } else if (error.message.includes('Password should be at least')) {
        throw new Error('A senha deve ter pelo menos 6 caracteres.');
      } else {
        throw new Error(`Erro no cadastro: ${error.message}`);
      }
    }
    
    if (data.user && !data.user.email_confirmed_at && !data.session) {
      throw new Error('Cadastro realizado! Verifique seu email para confirmar a conta antes de fazer login.');
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const value = {
    user,
    session,
    loading,
    isConfigured,
    isSupabaseReady,
    signIn,
    signUp,
    signOut,
    userMetadata: user?.user_metadata
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}