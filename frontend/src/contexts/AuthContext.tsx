import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { setApiPersona } from '../api/client';
import { TeamRole } from '../types';

export interface DemoPersona {
  id: string;
  name: string;
  role: TeamRole;
  email: string;
  avatar?: string;
}

export const DEMO_PERSONAS: DemoPersona[] = [
  { id: 'member-1', name: 'Alex Member', role: 'member', email: 'member@newtonite.io', avatar: 'A' },
  { id: 'lead-1', name: 'Sam Lead', role: 'lead', email: 'lead@newtonite.io', avatar: 'S' },
  { id: 'manager-1', name: 'Morgan Manager', role: 'manager', email: 'manager@newtonite.io', avatar: 'M' },
];

export interface AuthUserProfile {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  avatarUrl: string | null;
  isGoogleUser: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: AuthUserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithDemo: (persona: DemoPersona) => void;
  signOut: () => Promise<void>;
  updateRole: (role: TeamRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'lockstep_persona';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Helper to build profile from Supabase user
  const buildGoogleProfile = (u: User, roleOverride?: TeamRole): AuthUserProfile => {
    const meta = u.user_metadata || {};
    const name = meta.full_name || meta.name || u.email?.split('@')[0] || 'Operator';
    const avatarUrl = meta.avatar_url || meta.picture || null;
    return {
      id: u.id,
      name,
      email: u.email || 'operator@lockstep.io',
      role: roleOverride || 'lead', // Default Google users to Lead so they can test transitions
      avatarUrl,
      isGoogleUser: true,
    };
  };

  // Helper to build profile from demo persona
  const buildDemoProfile = (p: DemoPersona): AuthUserProfile => ({
    id: p.id,
    name: p.name,
    email: p.email,
    role: p.role,
    avatarUrl: null,
    isGoogleUser: false,
  });

  // Sync with API client headers whenever profile changes
  const syncApiHeaders = useCallback((p: AuthUserProfile | null) => {
    if (p) {
      setApiPersona(p.email, p.role, p.name);
    } else {
      setApiPersona('member@newtonite.io', 'member', 'Alex Member');
    }
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session: existingSession } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (existingSession?.user) {
          setSession(existingSession);
          setUser(existingSession.user);
          const p = buildGoogleProfile(existingSession.user);
          setProfile(p);
          syncApiHeaders(p);
        } else {
          // Check for cached demo persona in localStorage
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as DemoPersona;
              const p = buildDemoProfile(parsed);
              setProfile(p);
              syncApiHeaders(p);
            } catch {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }
      } catch (err) {
        console.warn('Auth initialization fallback:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
          const p = buildGoogleProfile(newSession.user);
          setProfile(p);
          syncApiHeaders(p);
          setIsLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          // Check if demo persona is still active or clear everything
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed = JSON.parse(stored) as DemoPersona;
              const p = buildDemoProfile(parsed);
              setProfile(p);
              syncApiHeaders(p);
            } catch {
              setProfile(null);
              syncApiHeaders(null);
            }
          } else {
            setProfile(null);
            syncApiHeaders(null);
          }
          setIsLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [syncApiHeaders]);

  // Google OAuth sign-in with fallback error reporting
  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/app/triage`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return { error };
      }
      return { error: null };
    } catch (err: any) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  // Demo persona sign-in
  const signInWithDemo = (persona: DemoPersona) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persona));
    const p = buildDemoProfile(persona);
    setProfile(p);
    syncApiHeaders(p);
  };

  // Sign out (clears both Supabase session and demo persona)
  const signOut = async () => {
    try {
      if (session) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error during Supabase signOut:', err);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setSession(null);
      setUser(null);
      setProfile(null);
      syncApiHeaders(null);
    }
  };

  // Update role dynamically (for testing RBAC transitions)
  const updateRole = (newRole: TeamRole) => {
    if (!profile) return;
    const updated = { ...profile, role: newRole };
    setProfile(updated);
    syncApiHeaders(updated);

    // If it was a demo persona, update localStorage as well
    if (!profile.isGoogleUser) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.role = newRole;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        } catch {}
      }
    }
  };

  const isAuthenticated = Boolean(profile);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated,
        signInWithGoogle,
        signInWithDemo,
        signOut,
        updateRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
