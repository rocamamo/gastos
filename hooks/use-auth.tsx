'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

type AuthContextType = {
    user: User | null;
    profile: any | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        const e2eId = (window as unknown as { __E2E_USER_ID__?: string }).__E2E_USER_ID__;
        if (e2eId) {
            const id = e2eId;
            setUser({
                id,
                email: 'e2e@local.test',
                aud: 'authenticated',
                role: 'authenticated',
                app_metadata: {},
                user_metadata: {},
                created_at: new Date().toISOString(),
            } as User);
            setProfile({ id, name: 'Usuario E2E', email: 'e2e@local.test', role: 'user' });
            setIsLoading(false);
            return;
        }

        const fetchSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);

            if (session?.user) {
                // Fetch complete profile if needed
                const res = await fetch('/api/me');
                if (res.ok) {
                    const profileData = await res.json();
                    setProfile(profileData);
                }
            }
            setIsLoading(false);
        };

        fetchSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                if (!session?.user) setProfile(null);
            }
        );

        return () => subscription.unsubscribe();
    }, [supabase.auth]);

    const signOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, profile, isLoading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
