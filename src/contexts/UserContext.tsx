import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface UserProfile {
    id: string;
    email: string | null;
    full_name: string;
    avatar_url: string | null;
}

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

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log("Context: Auth event fired:", event, "User ID:", session?.user?.id);

            if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                return;
            }

            if (!session?.user) {
                console.log("Context: Session is null, clearing profile");
                setProfile(null);
                setLoading(false);
                return;
            }

            // USA setTimeout para evitar deadlock do Supabase JS v2
            // (não se deve chamar supabase client de dentro do onAuthStateChange diretamente)
            const user = session.user;
            setLoading(true);

            setTimeout(async () => {
                try {
                    const { data: publicProfile, error } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (error) {
                        console.warn("Context: Error fetching profile:", error.message);
                    }

                    const metadataName = user.user_metadata?.full_name || user.user_metadata?.name || '';
                    const metadataAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

                    const newProfile: UserProfile = {
                        id: user.id,
                        email: user.email || null,
                        full_name: publicProfile?.full_name || metadataName,
                        avatar_url: publicProfile?.avatar_url || metadataAvatar,
                    };

                    console.log("Context: Setting profile:", newProfile.full_name ? "Name OK" : "Incomplete");
                    setProfile(newProfile);
                } catch (err) {
                    console.error("Context: Unexpected error fetching profile:", err);
                    // Mesmo com erro, define um perfil mínimo para não travar na tela
                    setProfile({
                        id: user.id,
                        email: user.email || null,
                        full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
                    });
                } finally {
                    setLoading(false);
                    console.log("Context: Loading set to false");
                }
            }, 0);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: publicProfile } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', user.id)
                    .maybeSingle();

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

    const updateProfileState = (updates: Partial<UserProfile>) => {
        setProfile(prev => {
            if (!prev) return null;
            return { ...prev, ...updates };
        });
    };

    return (
        <UserContext.Provider value={{ profile, loading, refreshProfile: fetchUserData, updateProfileState }}>
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