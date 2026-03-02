import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { ChevronLeft, Bell, Check, MessageSquare, Video } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotificationsScreen() {
    const navigation = useNavigation<any>();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchNotifications();

        // Mark all as read when screen is opened
        markAllAsRead();
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50); // Get recent notifications

            if (error) throw error;

            if (data) {
                setNotifications(data);

                // Fetch profiles for sender_id
                const senderIds = Array.from(new Set(data.map(n => n.sender_id).filter(id => id)));
                if (senderIds.length > 0) {
                    const { data: pData } = await supabase
                        .from('profiles')
                        .select('id, full_name, avatar_url')
                        .in('id', senderIds);

                    if (pData) {
                        const pMap: Record<string, any> = {};
                        pData.forEach(p => { pMap[p.id] = p; });
                        setProfilesMap(pMap);
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await supabase
                .from('notifications')
                .update({ read: true })
                .eq('user_id', user.id)
                .eq('read', false);
        } catch (e) {
            console.error('Error marking as read', e);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    // Helper to format notification text and icon
    const getNotificationDetails = (notification: any) => {
        const senderName = profilesMap[notification.sender_id]?.full_name || 'Alguém';

        if (notification.type === 'course_reply') {
            return {
                text: `${senderName} respondeu ao seu comentário em uma aula.`,
                icon: <Video size={20} color="#D4AF37" />,
                action: () => {
                    // Navigate to Tab navigator -> Content Tab -> specific video if we had it
                    // The Content tab name is 'Conteudo'
                    navigation.navigate('HomeTabs', { screen: 'Conteudo' });
                }
            };
        }

        if (notification.type === 'community_reply') {
            return {
                text: `${senderName} comentou na sua publicação na comunidade.`,
                icon: <MessageSquare size={20} color="#D4AF37" />,
                action: () => {
                    // Navigate to Tab navigator -> Community Tab
                    navigation.navigate('HomeTabs', { screen: 'Comunidade' });
                }
            };
        }

        return {
            text: `Nova notificação de ${senderName}.`,
            icon: <Bell size={20} color="#D4AF37" />,
            action: () => { }
        };
    };

    const renderItem = ({ item }: { item: any }) => {
        const details = getNotificationDetails(item);
        const senderProfile = profilesMap[item.sender_id];

        return (
            <TouchableOpacity
                className={`flex-row p-4 border-b border-gray-800 ${!item.read ? 'bg-[#2B2B2B]' : 'bg-[#141414]'}`}
                onPress={details.action}
            >
                <View className="mr-4 mt-1">
                    {senderProfile?.avatar_url ? (
                        <Image
                            source={{ uri: senderProfile.avatar_url }}
                            className="w-12 h-12 rounded-full"
                        />
                    ) : (
                        <View className="w-12 h-12 rounded-full bg-gray-600 items-center justify-center">
                            <Text className="text-white font-bold">{senderProfile?.full_name?.charAt(0) || '?'}</Text>
                        </View>
                    )}
                    <View className="absolute -bottom-1 -right-1 bg-[#2C2926] rounded-full p-1 border border-[#141414]">
                        {details.icon}
                    </View>
                </View>

                <View className="flex-1 justify-center">
                    <Text className={`text-sm ${!item.read ? 'text-white font-bold' : 'text-gray-300'}`}>
                        {details.text}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-1">
                        {new Date(item.created_at).toLocaleString()}
                    </Text>
                </View>

                {!item.read && (
                    <View className="w-2 h-2 rounded-full bg-[#D4AF37] self-center ml-2" />
                )}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View className="flex-1 bg-[#141414] justify-center items-center">
                <ActivityIndicator size="large" color="#D4AF37" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#141414]">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center px-4 py-4 border-b border-gray-800">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-xl flex-1">Notificações</Text>
                </View>

                {/* List */}
                {notifications.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-8">
                        <View className="w-20 h-20 bg-[#2B2B2B] rounded-full items-center justify-center mb-6">
                            <Bell color="#D4AF37" size={40} />
                        </View>
                        <Text className="text-white font-bold text-lg mb-2 text-center">Nenhuma notificação</Text>
                        <Text className="text-gray-400 text-center">
                            Você ainda não tem notificações de atividades.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={notifications}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#D4AF37" />
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}
