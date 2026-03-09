import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// Tipo de dados do usuário
export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string;
    avatar_url: string | null;
}

// O que o contexto oferece aos componentes
interface UserContextData {
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
    updateProfileState: (updates: Partial<UserProfile>) => void;
}

const UserContext = createContext<UserContextData>({} as UserContextData);

export const UserProvider = ({ children }: { children: ReactNode }) => {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Inicializa o perfil quando o app carrega
    useEffect(() => {
        fetchUserData();

        // Ouve mudanças de auth (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user) {
                    const { data: publicProfile, error } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (error) {
                        console.warn("Erro ao buscar publicProfile no onAuthStateChange:", error);
                    }

                    // Força a inserção para OAuth recém criado que não disparou trigger:
                    const fallbackName = session.user.user_metadata?.full_name || '';
                    const fallbackAvatar = session.user.user_metadata?.avatar_url || null;

                    setProfile({
                        id: session.user.id,
                        email: session.user.email || null,
                        full_name: publicProfile?.full_name || fallbackName,
                        avatar_url: publicProfile?.avatar_url || fallbackAvatar,
                    });
                } else {
                    setProfile(null);
                }
            } catch (err) {
                console.error("Erro inesperado no onAuthStateChange:", err);
            } finally {
                setLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    // Força uma busca diretamente no Supabase API
    const fetchUserData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: publicProfile, error } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) {
                    console.warn("Erro ao buscar publicProfile no fetchUserData:", error);
                }

                setProfile({
                    id: user.id,
                    email: user.email || null,
                    full_name: publicProfile?.full_name || user.user_metadata?.full_name || '',
                    avatar_url: publicProfile?.avatar_url || user.user_metadata?.avatar_url || null,
                });
            } else {
                setProfile(null);
            }
        } catch (e) {
            console.error("Erro ao buscar dados do usuário no contexto", e);
        } finally {
            setLoading(false);
        }
    };

    // Atualiza apenas localmente para ser rápido (o ProfileScreen chama isso após sucesso no Supabase)
    const updateProfileState = (updates: Partial<UserProfile>) => {
        setProfile(prev => {
            if (!prev) return null;
            return { ...prev, ...updates };
        });
    };

    return (
        <UserContext.Provider
            value={{
                profile,
                loading,
                refreshProfile: fetchUserData,
                updateProfileState,
            }}
        >
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};
