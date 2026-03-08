// src/screens/Content/VideoPlayerScreen.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    View, Text, ScrollView, TextInput, TouchableOpacity,
    ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
    RefreshControl, Dimensions, Modal
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../../lib/supabase';
import {
    ChevronLeft, Send, Heart, MessageSquare, Maximize2,
    ChevronDown, ChevronUp, CheckCircle, Settings2
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const QUALITY_OPTIONS = [
    { label: 'Auto', value: '' },
    { label: '360p', value: '360p' },
    { label: '480p', value: '480p' },
    { label: '720p', value: '720p' },
    { label: '1080p', value: '1080p' },
];

function buildHlsUrl(uid: string, quality: string) {
    const customerCode = process.env.EXPO_PUBLIC_CLOUDFLARE_CUSTOMER_CODE;
    const base = customerCode
        ? `https://customer-${customerCode}.cloudflarestream.com/${uid}/manifest/video.m3u8`
        : `https://videodelivery.net/${uid}/manifest/video.m3u8`;
    return quality ? `${base}?quality=${quality}` : base;
}

export default function VideoPlayerScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { episodeId } = route.params;

    const [episode, setEpisode] = useState<any>(null);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [selectedQuality, setSelectedQuality] = useState('');
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [videoReady, setVideoReady] = useState(false);

    const [comments, setComments] = useState<any[]>([]);
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
    const [likesCount, setLikesCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    const { width } = Dimensions.get('window');
    const videoHeight = width * (9 / 16);
    const headerHeight = Platform.OS === 'ios' ? 90 : 60;
    const keyboardOffset = videoHeight + headerHeight;
    const videoViewRef = useRef<any>(null);

    // Player criado uma vez; usamos player.replace() para trocar fonte sem recriar
    const player = useVideoPlayer('', (p) => {
        p.loop = false;
    });

    const handleQualityChange = useCallback((quality: string) => {
        if (!episode?.video_url) return;
        const newUrl = buildHlsUrl(episode.video_url, quality);
        setSelectedQuality(quality);
        setShowQualityMenu(false);
        player.replace({ uri: newUrl });
    }, [episode, player]);

    useEffect(() => {
        fetchEpisodeData();
    }, [episodeId]);

    const fetchEpisodeData = async () => {
        try {
            setLoading(true);
            setVideoReady(false);

            const { data: epData, error: epError } = await supabase
                .from('episodes')
                .select('*')
                .eq('id', episodeId)
                .single();

            if (epError) throw epError;
            setEpisode(epData);

            if (epData?.video_url) {
                const url = buildHlsUrl(epData.video_url, '');
                player.replace({ uri: url });
                setVideoReady(true);
            }

            const { count: lCount } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('episode_id', episodeId);
            setLikesCount(lCount || 0);

            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: myLike } = await supabase
                    .from('likes').select('*')
                    .eq('episode_id', episodeId).eq('user_id', user.id).single();
                setHasLiked(!!myLike);

                const { data: progress } = await supabase
                    .from('user_episode_progress').select('completed')
                    .eq('episode_id', episodeId).eq('user_id', user.id).single();
                setIsCompleted(!!progress?.completed);
            }

            fetchComments();
        } catch (error) {
            console.error('Error fetching episode data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchEpisodeData();
    };

    const fetchComments = async () => {
        const { data: cData } = await supabase
            .from('comments').select('*')
            .eq('episode_id', episodeId)
            .order('created_at', { ascending: false });

        if (cData) {
            setComments(cData);
            const userIds = Array.from(new Set(cData.map((c: any) => c.user_id)));
            if (userIds.length > 0) {
                const { data: pData } = await supabase
                    .from('profiles').select('id, full_name, avatar_url').in('id', userIds);
                if (pData) {
                    const pMap: Record<string, any> = {};
                    pData.forEach((p: any) => { pMap[p.id] = p; });
                    setProfilesMap(pMap);
                }
            }
        }
    };

    const toggleReplies = (commentId: string) => {
        setExpandedComments(prev => {
            const s = new Set(prev);
            s.has(commentId) ? s.delete(commentId) : s.add(commentId);
            return s;
        });
    };

    const handleLike = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        if (hasLiked) {
            await supabase.from('likes').delete().eq('episode_id', episodeId).eq('user_id', user.id);
            setHasLiked(false);
            setLikesCount(prev => prev - 1);
        } else {
            await supabase.from('likes').insert({ episode_id: episodeId, user_id: user.id });
            setHasLiked(true);
            setLikesCount(prev => prev + 1);
        }
    };

    const handleToggleCompletion = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        try {
            if (isCompleted) {
                await supabase.from('user_episode_progress').delete()
                    .eq('episode_id', episodeId).eq('user_id', user.id);
                setIsCompleted(false);
            } else {
                await supabase.from('user_episode_progress')
                    .upsert({ episode_id: episodeId, user_id: user.id, completed: true });
                setIsCompleted(true);
            }
        } catch (err) {
            console.error('Error toggling completion', err);
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim()) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            Alert.alert('Erro', 'Você precisa estar logado para comentar.');
            return;
        }
        const commentData: any = { episode_id: episodeId, user_id: user.id, text: newComment };
        if (replyingTo) commentData.parent_id = replyingTo.id;

        const { error } = await supabase.from('comments').insert(commentData);
        if (error) {
            Alert.alert('Erro', 'Não foi possível enviar o comentário: ' + error.message);
        } else {
            setNewComment('');
            setReplyingTo(null);
            fetchComments();
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#D4AF37" />
            </View>
        );
    }

    const currentQualityLabel = QUALITY_OPTIONS.find(q => q.value === selectedQuality)?.label || 'Auto';

    return (
        <KeyboardAvoidingView
            behavior="padding"
            style={{ flex: 1, backgroundColor: '#2C2926' }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
            {/* Header */}
            <SafeAreaView
                className="absolute top-0 left-0 right-0 z-50 px-4 pt-2 flex-row justify-between items-center"
                pointerEvents="box-none"
            >
                <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>

                <View className="flex-row items-center gap-2">
                    {/* Seletor de qualidade */}
                    <TouchableOpacity
                        className="h-10 px-3 rounded-full bg-black/50 items-center justify-center flex-row gap-1"
                        onPress={() => setShowQualityMenu(true)}
                    >
                        <Settings2 color="white" size={16} />
                        <Text className="text-white text-xs font-bold">{currentQualityLabel}</Text>
                    </TouchableOpacity>

                    {/* Fullscreen */}
                    <TouchableOpacity
                        className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                        onPress={() => videoViewRef.current?.enterFullscreen?.()}
                    >
                        <Maximize2 color="white" size={20} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            {/* Video Player */}
            <View style={{ width: '100%', height: videoHeight, backgroundColor: 'black' }}>
                {!videoReady ? (
                    <View className="flex-1 justify-center items-center">
                        <ActivityIndicator color="#D4AF37" />
                        <Text className="text-gray-400 mt-2 text-xs">Carregando vídeo...</Text>
                    </View>
                ) : (
                    <VideoView
                        ref={videoViewRef}
                        style={{ flex: 1 }}
                        player={player}
                        allowsFullscreen
                        allowsPictureInPicture
                        nativeControls
                    />
                )}
            </View>

            {/* Modal de Qualidade */}
            <Modal
                visible={showQualityMenu}
                transparent
                animationType="fade"
                onRequestClose={() => setShowQualityMenu(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/60 justify-center items-center"
                    activeOpacity={1}
                    onPress={() => setShowQualityMenu(false)}
                >
                    <View className="bg-[#1E1B18] rounded-2xl w-64 overflow-hidden border border-[#D4AF37]/20">
                        <View className="px-4 py-3 border-b border-[#D4AF37]/20">
                            <Text className="text-[#D4AF37] font-bold text-base">Qualidade do Vídeo</Text>
                        </View>
                        {QUALITY_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                className={`px-4 py-3 flex-row justify-between items-center ${selectedQuality === opt.value ? 'bg-[#D4AF37]/10' : ''}`}
                                onPress={() => handleQualityChange(opt.value)}
                            >
                                <Text className={`text-sm font-medium ${selectedQuality === opt.value ? 'text-[#D4AF37]' : 'text-white'}`}>
                                    {opt.label}
                                    {opt.value === '' ? (
                                        <Text className="text-gray-400 text-xs"> (recomendado)</Text>
                                    ) : null}
                                </Text>
                                {selectedQuality === opt.value && (
                                    <View className="w-2 h-2 rounded-full bg-[#D4AF37]" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </TouchableOpacity>
            </Modal>

            <View className="flex-1 flex-col">
                <ScrollView
                    className="flex-1 px-4 py-4"
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />}
                >
                    <Text className="text-white text-2xl font-bold mb-2">{episode?.title}</Text>
                    <Text className="text-gray-400 text-sm mb-6">{episode?.description}</Text>

                    {/* Actions */}
                    <View className="flex-row items-center justify-between mb-6 border-b border-[#D4AF37]/30 pb-6">
                        <View className="flex-row items-center gap-6">
                            <TouchableOpacity className="items-center gap-1" onPress={handleLike}>
                                <Heart
                                    color={hasLiked ? '#D4AF37' : 'white'}
                                    fill={hasLiked ? '#D4AF37' : 'transparent'}
                                    size={28}
                                />
                                <Text className="text-white text-xs">{likesCount}</Text>
                            </TouchableOpacity>
                            <View className="items-center gap-1">
                                <MessageSquare color="white" size={28} />
                                <Text className="text-white text-xs">{comments.length}</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            className={`flex-row items-center gap-2 px-4 py-2 rounded-full ${isCompleted ? 'bg-[#D4AF37]' : 'bg-[#D4AF37]/20 border border-[#D4AF37]'}`}
                            onPress={handleToggleCompletion}
                        >
                            <CheckCircle size={20} color={isCompleted ? 'black' : '#D4AF37'} />
                            <Text className={`font-bold ${isCompleted ? 'text-black' : 'text-[#D4AF37]'}`}>
                                {isCompleted ? 'Concluída' : 'Concluir Aula'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Comments */}
                    <Text className="text-white font-bold text-lg mb-4">Comentários</Text>
                    {comments.filter(c => !c.parent_id).map((comment) => {
                        const userName = profilesMap[comment.user_id]?.full_name || 'Usuário Anônimo';
                        const replies = comments.filter(c => c.parent_id === comment.id);
                        const isExpanded = expandedComments.has(comment.id);

                        return (
                            <View key={comment.id} className="mb-4">
                                <View className="bg-[#2B2B2B] p-3 rounded-lg">
                                    <View className="flex-row justify-between items-center mb-1">
                                        <Text className="text-[#D4AF37] text-xs font-bold">{userName}</Text>
                                        <Text className="text-gray-500 text-[10px]">
                                            {new Date(comment.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <Text className="text-white text-sm">{comment.text}</Text>
                                    <View className="flex-row items-center gap-4 mt-2">
                                        <TouchableOpacity onPress={() => setReplyingTo(comment)}>
                                            <Text className="text-gray-400 text-xs font-bold">Responder</Text>
                                        </TouchableOpacity>
                                        {replies.length > 0 && (
                                            <TouchableOpacity
                                                className="flex-row items-center gap-1"
                                                onPress={() => toggleReplies(comment.id)}
                                            >
                                                <Text className="text-[#D4AF37] text-xs font-bold">
                                                    {isExpanded ? 'Ocultar' : `Ver ${replies.length} resposta(s)`}
                                                </Text>
                                                {isExpanded
                                                    ? <ChevronUp size={14} color="#D4AF37" />
                                                    : <ChevronDown size={14} color="#D4AF37" />
                                                }
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {isExpanded && replies.map((reply: any) => (
                                    <View key={reply.id} className="pl-4 mt-2 ml-2">
                                        <View className="bg-[#2B2B2B]/50 p-2 rounded-lg border-l-2 border-[#D4AF37]/30">
                                            <View className="flex-row justify-between items-center mb-1">
                                                <Text className="text-[#D4AF37] text-xs font-bold">
                                                    {profilesMap[reply.user_id]?.full_name || 'Usuário'}
                                                </Text>
                                                <Text className="text-gray-500 text-[10px]">
                                                    {new Date(reply.created_at).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <Text className="text-white text-xs">{reply.text}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        );
                    })}
                    <View className="h-5" />
                </ScrollView>

                {/* Comment Input */}
                <View className={`p-4 bg-[#2C2926] border-t border-[#D4AF37]/30 flex-col ${Platform.OS === 'ios' ? 'pb-8' : 'pb-4'}`}>
                    {replyingTo && (
                        <View className="flex-row justify-between items-center mb-2 px-2">
                            <Text className="text-gray-400 text-xs">
                                Respondendo a{' '}
                                <Text className="text-[#D4AF37] font-bold">
                                    {profilesMap[replyingTo.user_id]?.full_name || 'Usuário'}
                                </Text>
                            </Text>
                            <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                <Text className="text-red-500 text-xs">Cancelar</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    <View className="flex-row items-center">
                        <TextInput
                            className="flex-1 bg-[#3E3B36] h-12 rounded-full px-4 text-white mr-2 border border-[#524E48]"
                            placeholder={replyingTo ? 'Escreva sua resposta...' : 'Adicione um comentário...'}
                            placeholderTextColor="#9CA3AF"
                            value={newComment}
                            onChangeText={setNewComment}
                        />
                        <TouchableOpacity
                            className="w-12 h-12 bg-[#D4AF37] rounded-full items-center justify-center"
                            onPress={handleSendComment}
                        >
                            <Send color="black" size={20} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}