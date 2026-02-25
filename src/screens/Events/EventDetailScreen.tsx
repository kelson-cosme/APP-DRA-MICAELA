import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Calendar, Clock, CheckCircle, ChevronLeft, Share2 } from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';

type Event = {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    image_url: string;
};

export default function EventDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { event: initialEvent } = route.params;

    const [event, setEvent] = useState<Event>(initialEvent);
    const [status, setStatus] = useState<'going' | 'interested' | 'not_going' | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchRsvpStatus();
    }, []);

    const fetchRsvpStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('event_rsvps')
                .select('status')
                .eq('user_id', user.id)
                .eq('event_id', event.id)
                .single();

            if (data) setStatus(data.status);
        }
    };

    const handleRsvp = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                Alert.alert('Login necessário', 'Você precisa estar logado para confirmar presença.');
                return;
            }

            const newStatus = status === 'going' ? 'not_going' : 'going';
            setStatus(newStatus); // Optimistic

            if (newStatus === 'going') {
                const { error } = await supabase
                    .from('event_rsvps')
                    .upsert({ user_id: user.id, event_id: event.id, status: 'going' });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('event_rsvps')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('event_id', event.id);
                if (error) throw error;
            }
        } catch (error: any) {
            Alert.alert('Erro', 'Não foi possível atualizar sua presença.');
            setStatus(status); // Revert
        }
    };

    const openMaps = () => {
        const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${event.location}`; // Ideally this would be coords, but search query works too
        const label = event.title;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });

        if (url) {
            Linking.openURL(url);
        }
    };

    const date = new Date(event.event_date);

    return (
        <View className="flex-1 bg-[#2C2926]">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4 absolute top-10 z-10 w-full">
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="w-10 h-10 items-center justify-center bg-black/50 rounded-full"
                    >
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView className="flex-1">
                    <Image
                        source={{ uri: event.image_url || 'https://via.placeholder.com/400x300' }}
                        className="w-full h-80"
                        resizeMode="cover"
                    />

                    <View className="px-5 py-6">
                        <Text className="text-[#D4AF37] font-bold text-sm mb-2 uppercase tracking-wider">
                            {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </Text>
                        <Text className="text-white font-bold text-3xl mb-4 leading-tight">{event.title}</Text>

                        {/* Info Row */}
                        <View className="flex-row gap-6 mb-8 border-b border-[#3E3B36] pb-6">
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 bg-[#3E3B36] rounded-full items-center justify-center">
                                    <Clock color="#D4AF37" size={20} />
                                </View>
                                <View>
                                    <Text className="text-gray-400 text-xs uppercase font-bold">Horário</Text>
                                    <Text className="text-white font-medium">
                                        {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity className="flex-row items-center gap-3 flex-1" onPress={openMaps}>
                                <View className="w-10 h-10 bg-[#3E3B36] rounded-full items-center justify-center">
                                    <MapPin color="#D4AF37" size={20} />
                                </View>
                                <View className="flex-1">
                                    <Text className="text-gray-400 text-xs uppercase font-bold">Localização</Text>
                                    <Text className="text-white font-medium underline" numberOfLines={1}>
                                        {event.location}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        <Text className="text-white font-bold text-xl mb-3">Sobre o evento</Text>
                        <Text className="text-gray-300 text-base leading-7 mb-8">
                            {event.description}
                        </Text>
                    </View>
                </ScrollView>

                {/* Footer RSVP */}
                <View className="p-4 bg-[#2C2926] border-t border-[#3E3B36] pb-24">
                    <TouchableOpacity
                        className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 ${status === 'going' ? 'bg-green-600/20 border border-green-500' : 'bg-[#D4AF37]'}`}
                        onPress={handleRsvp}
                    >
                        {status === 'going' ? (
                            <>
                                <CheckCircle color="#22c55e" size={20} />
                                <Text className="text-green-500 font-bold text-lg">Presença Confirmada</Text>
                            </>
                        ) : (
                            <Text className="text-black font-bold text-lg">Confirmar Presença</Text>
                        )}
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </View>
    );
}
