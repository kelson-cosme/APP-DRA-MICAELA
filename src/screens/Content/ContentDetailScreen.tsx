import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Play, ChevronLeft, CheckCircle, Download, Trash2, Loader2 } from 'lucide-react-native';
import { OfflineStorage } from '../../lib/OfflineStorage';
import { Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ContentDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { contentId } = route.params;

    const [content, setContent] = useState<any>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [episodes, setEpisodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [completedEpisodeIds, setCompletedEpisodeIds] = useState<Set<string>>(new Set());
    const [downloadedEpisodeIds, setDownloadedEpisodeIds] = useState<Set<string>>(new Set());
    const [downloadingEpisodes, setDownloadingEpisodes] = useState<Record<string, number>>({}); // id -> progress (0-1)

    useEffect(() => {
        fetchDetails();
        checkDownloads();
    }, [contentId]);

    const checkDownloads = async () => {
        const downloads = await OfflineStorage.getDownloads();
        setDownloadedEpisodeIds(new Set(downloads.map(d => d.id)));
    };

    const handleDownload = async (episode: any) => {
        try {
            setDownloadingEpisodes(prev => ({ ...prev, [episode.id]: 0 }));

            await OfflineStorage.downloadEpisode(
                episode,
                content?.title || 'Curso',
                (progress) => {
                    setDownloadingEpisodes(prev => ({ ...prev, [episode.id]: progress }));
                }
            );

            setDownloadedEpisodeIds(prev => {
                const newSet = new Set(prev);
                newSet.add(episode.id);
                return newSet;
            });
            Alert.alert('Sucesso', 'Download concluído!');
        } catch (error) {
            Alert.alert('Erro', 'Falha ao baixar vídeo.');
            console.error(error);
        } finally {
            setDownloadingEpisodes(prev => {
                const newState = { ...prev };
                delete newState[episode.id];
                return newState;
            });
        }
    };

    const handleRemoveDownload = async (episodeId: string) => {
        Alert.alert(
            "Remover Download",
            "Deseja remover este episódio dos downloads?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Remover",
                    style: "destructive",
                    onPress: async () => {
                        await OfflineStorage.removeDownload(episodeId);
                        setDownloadedEpisodeIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(episodeId);
                            return newSet;
                        });
                    }
                }
            ]
        );
    };

    const fetchDetails = async () => {
        try {
            setLoading(true);

            // Iniciar todas as promessas de banco de dados concorrentemente (Promise.all)
            const [
                contentResult,
                modulesResult,
                episodesResult,
                userResult
            ] = await Promise.all([
                supabase.from('contents').select('*').eq('id', contentId).single(),
                supabase.from('modules').select('*').eq('content_id', contentId).order('order', { ascending: true }),
                supabase.from('episodes').select('*').eq('content_id', contentId).order('order', { ascending: true }),
                supabase.auth.getUser()
            ]);

            if (contentResult.error) throw contentResult.error;
            if (modulesResult.error) throw modulesResult.error;
            if (episodesResult.error) throw episodesResult.error;

            setContent(contentResult.data);
            setModules(modulesResult.data || []);
            setEpisodes(episodesResult.data || []);

            // Fetch User Progress
            const user = userResult.data.user;
            const episodesData = episodesResult.data;

            if (user && episodesData && episodesData.length > 0) {
                const epIds = episodesData.map(e => e.id);
                const { data: progressData, error: progressError } = await supabase
                    .from('user_episode_progress')
                    .select('episode_id')
                    .eq('user_id', user.id)
                    .eq('completed', true)
                    .in('episode_id', epIds);

                if (!progressError && progressData) {
                    setCompletedEpisodeIds(new Set(progressData.map(p => p.episode_id)));
                }
            }
        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    const progressPercentage = episodes.length > 0
        ? Math.round((completedEpisodeIds.size / episodes.length) * 100)
        : 0;

    if (loading) {
        return (
            <View className="flex-1 bg-[#2C2926] justify-center items-center">
                <ActivityIndicator size="large" color="#D4AF37" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#2C2926]">
            <ScrollView className="flex-1">
                {/* Header Image */}
                <View className="w-full h-80 relative">
                    <Image
                        source={{ uri: content?.thumbnail_url || 'https://via.placeholder.com/400x600' }}
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                    <View className="absolute inset-0 bg-black/40" />
                    {/* Gradient Overlay for seamless transition */}
                    <View className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#141414] to-transparent" />

                    <TouchableOpacity
                        className="absolute top-12 left-4 w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                        onPress={() => navigation.goBack()}
                    >
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                </View>

                <View className="px-4 -mt-10 mb-8">
                    <Text className="text-white text-3xl font-bold mb-2">{content?.title}</Text>
                    <Text className="text-gray-400 text-sm mb-6">{content?.description}</Text>

                    {/* Progress Bar */}
                    <View className="mb-6">
                        <View className="flex-row justify-between mb-2">
                            <Text className="text-gray-400 text-xs font-bold">SEU PROGRESSO</Text>
                            <Text className="text-[#D4AF37] text-xs font-bold">{progressPercentage}%</Text>
                        </View>
                        <View className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <View
                                className="h-full bg-[#D4AF37]"
                                style={{ width: `${progressPercentage}%` }}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        className="w-full bg-[#D4AF37] h-12 rounded items-center justify-center flex-row mb-6"
                        onPress={() => {
                            // Find first uncompleted episode or first episode
                            const firstUncompleted = episodes.find(e => !completedEpisodeIds.has(e.id));
                            const targetEpisode = firstUncompleted || episodes[0];

                            if (targetEpisode) {
                                navigation.navigate('VideoPlayer', { episodeId: targetEpisode.id });
                            }
                        }}
                    >
                        <Play color="black" fill="black" size={20} />
                        <Text className="text-black font-bold ml-2 text-lg">
                            {progressPercentage === 100 ? 'Assistir Novamente' : (progressPercentage > 0 ? 'Continuar' : 'Começar Agora')}
                        </Text>
                    </TouchableOpacity>

                    <Text className="text-white text-xl font-bold mb-4">Episódios</Text>

                    <View className="gap-4">
                        {modules.length > 0 ? (
                            modules.map((module) => (
                                <View key={module.id} className="mb-4">
                                    <Text className="text-white font-bold text-lg mb-2 pl-1">{module.title}</Text>
                                    <View className="gap-3">
                                        {episodes.filter(e => e.module_id === module.id).map((episode, index) => {
                                            const isCompleted = completedEpisodeIds.has(episode.id);
                                            const isDownloaded = downloadedEpisodeIds.has(episode.id);
                                            const isDownloading = downloadingEpisodes[episode.id] !== undefined;

                                            return (
                                                <TouchableOpacity
                                                    key={episode.id}
                                                    className="flex-row items-center bg-[#2B2B2B] rounded-lg overflow-hidden h-24"
                                                    onPress={() => navigation.navigate('VideoPlayer', { episodeId: episode.id })}
                                                >
                                                    <View className="w-32 h-full relative">
                                                        <Image
                                                            source={{ uri: episode.thumbnail_url || content?.thumbnail_url }}
                                                            className={`w-full h-full ${isCompleted ? 'opacity-40' : 'opacity-60'}`}
                                                            resizeMode="cover"
                                                        />
                                                        <View className="absolute inset-0 items-center justify-center">
                                                            {isCompleted ? (
                                                                <CheckCircle color="#D4AF37" size={24} />
                                                            ) : (
                                                                <Play color="white" size={24} />
                                                            )}
                                                        </View>
                                                    </View>
                                                    <View className="flex-1 p-3 justify-center">
                                                        <View className="flex-row justify-between items-start">
                                                            <Text className={`font-bold text-base mb-1 flex-1 ${isCompleted ? 'text-[#D4AF37]' : 'text-white'}`} numberOfLines={1}>{episode.title}</Text>

                                                            {isDownloading ? (
                                                                <View className="w-8 h-8 items-center justify-center">
                                                                    <ActivityIndicator size="small" color="#D4AF37" />
                                                                </View>
                                                            ) : isDownloaded ? (
                                                                <TouchableOpacity onPress={() => handleRemoveDownload(episode.id)} className="p-1">
                                                                    <CheckCircle color="#D4AF37" size={18} fill="#D4AF37" stroke="black" />
                                                                </TouchableOpacity>
                                                            ) : (
                                                                <TouchableOpacity onPress={() => handleDownload(episode)} className="p-1">
                                                                    <Download color="gray" size={18} />
                                                                </TouchableOpacity>
                                                            )}
                                                        </View>

                                                        <Text className="text-gray-400 text-xs" numberOfLines={2}>{episode.description}</Text>
                                                        {episode.duration && <Text className="text-gray-500 text-xs mt-1">{Math.floor(episode.duration / 60)} min</Text>}
                                                    </View>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                </View>
                            ))
                        ) : (
                            episodes.map((episode, index) => {
                                const isCompleted = completedEpisodeIds.has(episode.id);
                                const isDownloaded = downloadedEpisodeIds.has(episode.id);
                                const isDownloading = downloadingEpisodes[episode.id] !== undefined;

                                return (
                                    <TouchableOpacity
                                        key={episode.id}
                                        className="flex-row items-center bg-[#2B2B2B] rounded-lg overflow-hidden h-24"
                                        onPress={() => navigation.navigate('VideoPlayer', { episodeId: episode.id })}
                                    >
                                        <View className="w-32 h-full relative">
                                            <Image
                                                source={{ uri: episode.thumbnail_url || content?.thumbnail_url }}
                                                className={`w-full h-full ${isCompleted ? 'opacity-40' : 'opacity-60'}`}
                                                resizeMode="cover"
                                            />
                                            <View className="absolute inset-0 items-center justify-center">
                                                {isCompleted ? (
                                                    <CheckCircle color="#D4AF37" size={24} />
                                                ) : (
                                                    <Play color="white" size={24} />
                                                )}
                                            </View>
                                        </View>
                                        <View className="flex-1 p-3 justify-center">
                                            <View className="flex-row justify-between items-start">
                                                <Text className={`font-bold text-base mb-1 flex-1 ${isCompleted ? 'text-[#D4AF37]' : 'text-white'}`} numberOfLines={1}>{index + 1}. {episode.title}</Text>

                                                {isDownloading ? (
                                                    <View className="w-8 h-8 items-center justify-center">
                                                        <ActivityIndicator size="small" color="#D4AF37" />
                                                    </View>
                                                ) : isDownloaded ? (
                                                    <TouchableOpacity onPress={() => handleRemoveDownload(episode.id)} className="p-1">
                                                        <CheckCircle color="#D4AF37" size={18} fill="#D4AF37" stroke="black" />
                                                    </TouchableOpacity>
                                                ) : (
                                                    <TouchableOpacity onPress={() => handleDownload(episode)} className="p-1">
                                                        <Download color="gray" size={18} />
                                                    </TouchableOpacity>
                                                )}
                                            </View>

                                            <Text className="text-gray-400 text-xs" numberOfLines={2}>{episode.description}</Text>
                                            {episode.duration && <Text className="text-gray-500 text-xs mt-1">{Math.floor(episode.duration / 60)} min</Text>}
                                        </View>
                                    </TouchableOpacity>
                                )
                            })
                        )}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
