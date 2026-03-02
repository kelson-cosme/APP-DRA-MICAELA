import React from 'react';
import { View, Text, ScrollView, ImageBackground, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, Play, Calendar as CalendarIcon, MessageCircle, Users, Home } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../contexts/UserContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function HomeScreen() {
    const navigation = useNavigation<any>();
    const { profile, loading: profileLoading, refreshProfile } = useUser();

    // Call the push notification hook to register the device when Home mounts
    usePushNotifications();

    const [refreshing, setRefreshing] = React.useState(false);
    const [unreadCount, setUnreadCount] = React.useState(0);

    const userName = profile?.full_name || 'Maria';
    const avatarUrl = profile?.avatar_url || null;

    useFocusEffect(
        React.useCallback(() => {
            fetchUnreadNotifications();
        }, [])
    );

    const fetchUnreadNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('read', false);

            if (!error && count !== null) {
                setUnreadCount(count);
            }
        } catch (error) {
            console.error('Error fetching unread notifications:', error);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshProfile();
        await fetchUnreadNotifications();
        setRefreshing(false);
    };

    return (
        <View className="flex-1 bg-[#2C2926]">
            <SafeAreaView className="flex-1">
                <ScrollView
                    className="flex-1 px-4"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
                    }
                >

                    {/* Header */}
                    <View className="flex-row justify-between items-center py-4">
                        <TouchableOpacity
                            className="w-10 h-10 rounded-full bg-gray-400 overflow-hidden border-2 border-[#D4AF37]"
                            onPress={() => navigation.navigate('Profile')}
                        >
                            {/* Avatar Placeholder */}
                            <Image
                                source={{ uri: avatarUrl || 'https://via.placeholder.com/100' }}
                                className="w-full h-full"
                            />
                        </TouchableOpacity>
                        <TouchableOpacity className="relative" onPress={() => navigation.navigate('Notifications')}>
                            <Bell color="white" size={24} />
                            {unreadCount > 0 && (
                                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
                                    <Text className="text-white text-[10px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* Greeting */}
                    <View className="mb-6">
                        <Text className="text-gray-300 text-lg">Bom dia</Text>
                        <Text className="text-white text-3xl font-bold">{userName}</Text>
                    </View>

                    {/* AI Chat Card */}
                    <View className="w-full p-4 rounded-3xl bg-[#3E3B36] border border-[#524E48] mb-6">
                        <Text className="text-white text-base mb-3">Converse com a Mica, sua amiga virtual</Text>
                        <View className="flex-row items-center">
                            <View className="w-12 h-12 rounded-full bg-[#B89B84] mr-3" />
                            <View className="flex-1 bg-white rounded-xl px-4 py-3 relative">
                                <View className="absolute left-[-6px] top-4 w-4 h-4 bg-white transform rotate-45" />
                                <Text className="text-black text-base">Como posso te ajudar hoje?</Text>
                            </View>
                        </View>
                    </View>

                    {/* Diary Card */}
                    {/* Diary Card */}
                    <TouchableOpacity className="w-full h-48 rounded-3xl overflow-hidden mb-6 relative">
                        <Image
                            source={require('../../assets/diary_bg.png')}
                            className="absolute inset-0 w-full h-full z-0"
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['#2C2926', 'rgba(44, 41, 38, 0.8)', 'transparent']}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 }}
                        />
                        <View className="absolute inset-0 p-6 justify-center z-20">
                            <View className="w-12 h-12 rounded-full bg-[#D4AF37] items-center justify-center mb-2">
                                <Text className="text-white text-2xl">+</Text>
                            </View>
                            <Text className="text-white text-2xl font-bold">Meu diário</Text>
                            <Text className="text-gray-200">Como está seu dia hoje?</Text>
                        </View>
                    </TouchableOpacity>

                    {/* Grid Cards */}
                    <View className="flex-row gap-4 mb-24">
                        {/* Community */}
                        <TouchableOpacity
                            className="flex-1 h-64 rounded-3xl bg-gray-700 overflow-hidden relative"
                            onPress={() => navigation.navigate('Comunidade')}
                        >
                            <Image
                                source={require('../../assets/community_bg.png')}
                                className="absolute inset-0 w-full h-full z-0"
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 }}
                            />
                            <View className="absolute top-5 left-5 w-10 h-10 rounded-full bg-[#D4AF37] items-center justify-center z-20">
                                <Users color="white" size={20} />
                            </View>
                            <View className="flex-1 justify-end p-5 z-20">
                                <Text className="text-white text-xl font-bold mb-1">Minha Comunidade</Text>
                                <Text className="text-gray-300 text-xs">Espaço para partilhar, acolher e se fortalecer juntas.</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Content */}
                        <TouchableOpacity
                            className="flex-1 h-64 rounded-3xl bg-gray-700 overflow-hidden relative"
                            onPress={() => navigation.navigate('Conteudo')}
                        >
                            <Image
                                source={require('../../assets/content_bg.png')}
                                className="absolute inset-0 w-full h-full z-0"
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="cover"
                            />
                            <LinearGradient
                                colors={['transparent', 'rgba(0,0,0,0.8)']}
                                style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 }}
                            />
                            <View className="absolute top-5 left-5 w-10 h-10 rounded-full bg-[#D4AF37] items-center justify-center z-20">
                                <Play color="white" size={20} fill="white" />
                            </View>
                            <View className="flex-1 justify-end p-5 z-20">
                                <Text className="text-white text-xl font-bold mb-1">Conteúdos para mim</Text>
                                <Text className="text-gray-300 text-xs">Conhecimento que ajuda você a entender e se cuidar melhor.</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </SafeAreaView>

            {/* Bottom Tab Bar (Custom Implementation since we are not fully using Tab.Navigator yet or simplifying) */}
            {/* Note: This is a visual representation. In real navigation, this would be the TabBar component */}
        </View>
    );
}
