import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
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

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      if (!isConfigured) {
        if (mounted) {
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
    if (isConfigured) {
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
  }, [isConfigured]);

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
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
    if (!isConfigured) {
      throw new Error('Sistema não configurado. Entre em contato com o administrador.');
    }
    
    console.log('Attempting to sign up user:', { email, name, role });
    
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
      console.error('Supabase signup error:', error);
      if (error.message.includes('User already registered')) {
        console.log('User already exists, this is expected for demo users');
        return; // Don't throw error for existing users when creating demo accounts
      } else if (error.message.includes('Invalid email')) {
        throw new Error('Email inválido. Verifique o formato do email.');
      } else if (error.message.includes('Password should be at least')) {
        throw new Error('A senha deve ter pelo menos 6 caracteres.');
      } else {
        throw new Error(`Erro no cadastro: ${error.message}`);
      }
    }
    
    console.log('Signup successful:', data);
    
    if (data.user && !data.user.email_confirmed_at && !data.session) {
      console.log('User created but email confirmation required');
      // Don't throw error if email confirmation is disabled
      return;
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