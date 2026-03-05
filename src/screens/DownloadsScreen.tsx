import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Alert, RefreshControl } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Play, Trash2, Download } from 'lucide-react-native';
import { OfflineStorage, DownloadedEpisode } from '../lib/OfflineStorage';
import { useVideoPlayer, VideoView } from 'expo-video';

// Player separado para não recriar no meio da lista
function OfflinePlayer({ episode, onClose }: { episode: DownloadedEpisode; onClose: () => void }) {
    const player = useVideoPlayer(episode.local_video_uri, (p) => {
        p.loop = false;
        p.play();
    });

    return (
        <View className="flex-1 bg-black">
            <SafeAreaView className="absolute top-0 left-0 z-50 p-4">
                <TouchableOpacity
                    className="w-10 h-10 bg-black/50 rounded-full items-center justify-center"
                    onPress={onClose}
                >
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>
            </SafeAreaView>

            <View className="flex-1 justify-center">
                <VideoView
                    style={{ width: '100%', aspectRatio: 16 / 9 }}
                    player={player}
                    allowsFullscreen
                    nativeControls
                />
                <View className="p-4">
                    <Text className="text-white text-xl font-bold mt-4">{episode.title}</Text>
                    <Text className="text-gray-400 mt-2">{episode.description}</Text>
                </View>
            </View>
        </View>
    );
}

export default function DownloadsScreen() {
    const navigation = useNavigation<any>();
    const [downloads, setDownloads] = useState<DownloadedEpisode[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [playingEpisode, setPlayingEpisode] = useState<DownloadedEpisode | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const loadDownloads = async () => {
        const data = await OfflineStorage.getDownloads();
        setDownloads(data.reverse());
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadDownloads();
        }, [])
    );

    const handleRemove = (id: string, title: string) => {
        Alert.alert(
            'Excluir Download',
            `Deseja remover "${title}" do dispositivo?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Excluir',
                    style: 'destructive',
                    onPress: async () => {
                        setDeletingId(id);
                        try {
                            await OfflineStorage.removeDownload(id);
                            // Atualiza lista sem recarregar tudo
                            setDownloads(prev => prev.filter(d => d.id !== id));
                        } catch (e) {
                            Alert.alert('Erro', 'Não foi possível excluir o download.');
                        } finally {
                            setDeletingId(null);
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item }: { item: DownloadedEpisode }) => {
        const isDeleting = deletingId === item.id;

        return (
            <TouchableOpacity
                className={`flex-row bg-[#2B2B2B] rounded-xl mb-4 overflow-hidden ${isDeleting ? 'opacity-40' : ''}`}
                onPress={() => !isDeleting && setPlayingEpisode(item)}
                disabled={isDeleting}
            >
                <View className="w-32 h-24 relative bg-gray-800">
                    {item.local_thumbnail_uri ? (
                        <Image
                            source={{ uri: item.local_thumbnail_uri }}
                            className="w-full h-full opacity-70"
                            resizeMode="cover"
                        />
                    ) : (
                        <View className="w-full h-full items-center justify-center bg-gray-700">
                            <Download color="gray" size={24} />
                        </View>
                    )}
                    <View className="absolute inset-0 items-center justify-center">
                        <Play color="white" fill="white" size={20} />
                    </View>
                </View>

                <View className="flex-1 p-3 justify-between">
                    <View>
                        <Text className="text-[#D4AF37] text-xs font-bold mb-1">{item.content_title || 'Curso'}</Text>
                        <Text className="text-white font-bold text-sm" numberOfLines={2}>{item.title}</Text>
                    </View>

                    <View className="flex-row justify-between items-center mt-2">
                        <Text className="text-gray-500 text-xs">
                            {item.size ? `${(item.size / 1024 / 1024).toFixed(1)} MB` : 'Offline'}
                        </Text>
                        <TouchableOpacity
                            onPress={() => handleRemove(item.id, item.title)}
                            className="p-2"
                            disabled={isDeleting}
                        >
                            <Trash2 color={isDeleting ? '#666' : '#ef4444'} size={16} />
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    if (playingEpisode) {
        return <OfflinePlayer episode={playingEpisode} onClose={() => setPlayingEpisode(null)} />;
    }

    return (
        <View className="flex-1 bg-[#141414]">
            <SafeAreaView className="flex-1">
                <View className="px-4 py-4 flex-row items-center border-b border-gray-800 mb-4">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-[#C5A668] text-xl font-bold">Meus Downloads</Text>
                    {downloads.length > 0 && (
                        <Text className="text-gray-500 text-sm ml-auto">{downloads.length} vídeo{downloads.length !== 1 ? 's' : ''}</Text>
                    )}
                </View>

                {downloads.length === 0 ? (
                    <View className="flex-1 justify-center items-center px-8">
                        <View className="w-20 h-20 bg-[#2B2B2B] rounded-full items-center justify-center mb-6">
                            <Download color="#D4AF37" size={40} />
                        </View>
                        <Text className="text-white font-bold text-lg mb-2 text-center">Nenhum download ainda</Text>
                        <Text className="text-gray-400 text-center">
                            Baixe suas aulas favoritas para assistir quando estiver sem internet.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={downloads}
                        keyExtractor={item => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={{ padding: 16 }}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={() => { setRefreshing(true); loadDownloads(); }}
                                tintColor="#D4AF37"
                            />
                        }
                    />
                )}
            </SafeAreaView>
        </View>
    );
}