import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { toast } from 'react-hot-toast';

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

    const initializeAuth = async () => {
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
            console.error('Session error:', error);
            // Clear invalid session data
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          } else {
            setSession(session);
            setUser(session?.user ?? null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          // Clear any corrupted session data
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes only if configured
    let subscription: any = null;
    if (isConfigured) {
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (mounted) {
            try {
              if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
                setSession(session);
                setUser(session?.user ?? null);
              } else if (event === 'SIGNED_IN') {
                setSession(session);
                setUser(session?.user ?? null);
              } else {
                setSession(session);
                setUser(session?.user ?? null);
              }
            } catch (error) {
              console.error('Auth state change error:', error);
              // Handle auth errors by clearing session
              setSession(null);
              setUser(null);
            } finally {
              setLoading(false);
            }
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
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
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
    } catch (error) {
      console.error('Sign in exception:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string, role: string) => {
    if (!isConfigured) {
      throw new Error('Sistema não configurado. Entre em contato com o administrador.');
    }
    
    try {
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
        console.error('Sign up error:', error);
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
    } catch (error) {
      console.error('Sign up exception:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      }
      
      // Always clear local state regardless of API response
      setSession(null);
      setUser(null);
      
      if (error) throw error;
    } catch (error) {
      console.error('Sign out exception:', error);
      // Clear local state even if API call fails
      setSession(null);
      setUser(null);
      throw error;
    }
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