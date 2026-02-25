import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Calendar, Clock, CheckCircle } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

type Event = {
    id: string;
    title: string;
    description: string;
    event_date: string;
    location: string;
    image_url: string;
};



export default function EventsScreen() {
    const navigation = useNavigation<any>();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .order('event_date', { ascending: true });

            if (eventsError) throw eventsError;
            setEvents(eventsData || []);

            if (eventsError) throw eventsError;
            setEvents(eventsData || []);
        } catch (error) {
            console.error('Error fetching events:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchEvents();
    };


    if (loading) {
        return (
            <View className="flex-1 bg-[#2C2926] justify-center items-center">
                <ActivityIndicator size="large" color="#D4AF37" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#2C2926]">
            <SafeAreaView className="flex-1">
                <View className="px-4 py-4 flex-row justify-between items-center border-b border-[#D4AF37]/30">
                    <View>
                        <Text className="text-white text-2xl font-bold">Eventos</Text>
                        <Text className="text-gray-400 text-sm">Próximos encontros</Text>
                    </View>
                </View>

                <ScrollView
                    className="flex-1 px-4 py-4"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
                    }
                >
                    {events.map((event) => {
                        const date = new Date(event.event_date);

                        return (
                            <TouchableOpacity
                                key={event.id}
                                className="bg-[#3E3B36] rounded-2xl overflow-hidden mb-6 border border-[#524E48]"
                                onPress={() => navigation.navigate('EventDetail', { event })}
                                activeOpacity={0.9}
                            >
                                <Image
                                    source={{ uri: event.image_url || 'https://via.placeholder.com/400x200' }}
                                    className="w-full h-48"
                                    resizeMode="cover"
                                />

                                <View className="p-4">
                                    <View className="flex-row justify-between items-start mb-2">
                                        <View className="flex-1 mr-2">
                                            <Text className="text-[#D4AF37] font-bold text-sm mb-1">
                                                {date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
                                            </Text>
                                            <Text className="text-white font-bold text-xl mb-2">{event.title}</Text>
                                        </View>
                                    </View>

                                    <Text className="text-gray-300 mb-4 text-sm leading-5" numberOfLines={2}>
                                        {event.description}
                                    </Text>

                                    <View className="flex-row items-center gap-2 mb-2">
                                        <Clock color="#9CA3AF" size={16} />
                                        <Text className="text-gray-400 text-xs">
                                            {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </Text>
                                    </View>

                                    <View className="flex-row items-center gap-2 mb-6">
                                        <MapPin color="#9CA3AF" size={16} />
                                        <Text className="text-gray-400 text-xs" numberOfLines={1}>{event.location}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    <View className="h-20" />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}
