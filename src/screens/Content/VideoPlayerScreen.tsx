import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert, RefreshControl, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ResizeMode, Video } from 'expo-av';
import { supabase } from '../../lib/supabase';
import { ChevronLeft, Send, Heart, MessageSquare, Maximize2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function VideoPlayerScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { episodeId } = route.params;

    const [episode, setEpisode] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
    const [newComment, setNewComment] = useState('');
    const [replyingTo, setReplyingTo] = useState<any>(null); // State to track which comment is being replied to
    const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set()); // Track expanded replies
    const [likesCount, setLikesCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    // Calculate keyboard offset based on video height (16:9 aspect ratio)
    const { width } = Dimensions.get('window');
    const videoHeight = width * (9 / 16);
    const headerHeight = Platform.OS === 'ios' ? 90 : 60; // Approximate header/statusbar height
    const keyboardOffset = videoHeight + headerHeight;

    const videoRef = useRef<Video>(null);

    useEffect(() => {
        fetchEpisodeData();
    }, [episodeId]);

    const fetchEpisodeData = async () => {
        try {
            setLoading(true);

            // Fetch Episode Info
            const { data: epData, error: epError } = await supabase
                .from('episodes')
                .select('*')
                .eq('id', episodeId)
                .single();

            if (epError) throw epError;
            console.log('Episode Data:', epData);
            setEpisode(epData);

            // Fetch Likes count
            const { count: lCount, error: lError } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('episode_id', episodeId);

            setLikesCount(lCount || 0);

            // Check if user liked and completed
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: myLike } = await supabase
                    .from('likes')
                    .select('*')
                    .eq('episode_id', episodeId)
                    .eq('user_id', user.id)
                    .single();
                setHasLiked(!!myLike);

                const { data: progress } = await supabase
                    .from('user_episode_progress')
                    .select('completed')
                    .eq('episode_id', episodeId)
                    .eq('user_id', user.id)
                    .single();
                setIsCompleted(!!progress?.completed);
            }

            // Fetch Comments
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
        const { data: cData, error: cError } = await supabase
            .from('comments')
            .select('*') // Simplify: In real app, join with profiles to get user names
            .eq('episode_id', episodeId)
            .order('created_at', { ascending: false });

        if (cData) {
            console.log('Fetched Comments (First 3):', JSON.stringify(cData.slice(0, 3), null, 2));
            setComments(cData);

            // Fetch profiles for the comments
            const userIds = Array.from(new Set(cData.map(c => c.user_id)));
            if (userIds.length > 0) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', userIds);

                if (pData) {
                    const pMap: Record<string, any> = {};
                    pData.forEach(p => { pMap[p.id] = p; });
                    setProfilesMap(pMap);
                }
            }
        }
    };

    const toggleReplies = (commentId: string) => {
        setExpandedComments(prev => {
            const newSet = new Set(prev);
            if (newSet.has(commentId)) {
                newSet.delete(commentId);
            } else {
                newSet.add(commentId);
            }
            return newSet;
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
                // In a real app, you might might want to toggle valid false, but often we just keep it
                // For this request, we will toggle it.
                const { error } = await supabase
                    .from('user_episode_progress')
                    .delete() // Or update to completed = false if you prefer soft toggle
                    .eq('episode_id', episodeId)
                    .eq('user_id', user.id);
                if (!error) setIsCompleted(false);
            } else {
                const { error } = await supabase
                    .from('user_episode_progress')
                    .upsert({
                        episode_id: episodeId,
                        user_id: user.id,
                        completed: true
                    });
                if (!error) setIsCompleted(true);
            }
        } catch (err) {
            console.error("Error toggling completion", err);
        }
    };

    const handleSendComment = async () => {
        console.log('Attempting to send comment:', newComment);
        if (!newComment.trim()) {
            console.log('Comment is empty');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        console.log('User:', user);
        if (!user) {
            Alert.alert('Erro', 'Você precisa estar logado para comentar.');
            return;
        }

        const commentData: any = {
            episode_id: episodeId,
            user_id: user.id,
            text: newComment
        };

        if (replyingTo) {
            commentData.parent_id = replyingTo.id;
        }

        const { error } = await supabase.from('comments').insert(commentData);

        if (error) {
            console.error('Error sending comment:', error);
            Alert.alert('Erro', 'Não foi possível enviar o comentário: ' + error.message);
        } else {
            console.log('Comment sent successfully');
            setNewComment('');
            setReplyingTo(null); // Clear reply state
            fetchComments();
            // Optional: Dismiss keyboard
            Alert.alert('Sucesso', 'Comentário enviado!');
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#D4AF37" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#2C2926]">
            {/* Simple Header */}
            <SafeAreaView className="absolute top-0 left-0 right-0 z-50 px-4 pt-2 flex-row justify-between items-center" pointerEvents="box-none">
                <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                    onPress={() => navigation.goBack()}
                >
                    <ChevronLeft color="white" size={24} />
                </TouchableOpacity>

                <TouchableOpacity
                    className="w-10 h-10 rounded-full bg-black/50 items-center justify-center"
                    onPress={() => {
                        if (videoRef.current) {
                            videoRef.current.presentFullscreenPlayer();
                        }
                    }}
                >
                    <Maximize2 color="white" size={20} />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Video Player */}
            <View className="w-full aspect-video bg-black mt-0 relative">


                {/* Added margin top or handle SafeArea properly if needed, but video usually at top */}
                <Video
                    ref={videoRef}
                    style={{ width: '100%', height: '100%' }}
                    source={{
                        uri: episode?.video_url || 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4',
                    }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                    shouldPlay
                />
            </View>

            <View className="flex-1 flex-col">
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    className="flex-1"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? keyboardOffset : 0}
                >
                    <ScrollView
                        className="flex-1 px-4 py-4"
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
                        }
                    >
                        <Text className="text-white text-2xl font-bold mb-2">{episode?.title}</Text>
                        <Text className="text-gray-400 text-sm mb-6">{episode?.description}</Text>

                        {/* Actions */}
                        <View className="flex-row items-center justify-between mb-6 border-b border-[#D4AF37]/30 pb-6">
                            <View className="flex-row items-center gap-6">
                                <TouchableOpacity className="items-center gap-1" onPress={handleLike}>
                                    <Heart color={hasLiked ? "#D4AF37" : "white"} fill={hasLiked ? "#D4AF37" : "transparent"} size={28} />
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
                                <CheckCircle size={20} color={isCompleted ? "black" : "#D4AF37"} />
                                <Text className={`font-bold ${isCompleted ? "text-black" : "text-[#D4AF37]"}`}>
                                    {isCompleted ? "Concluída" : "Concluir Aula"}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Comments Section */}
                        <Text className="text-white font-bold text-lg mb-4">Comentários</Text>

                        {comments.filter(c => !c.parent_id).map((comment) => {
                            const userProfile = profilesMap[comment.user_id];
                            const userName = userProfile?.full_name || 'Usuário Anônimo';
                            const replies = comments.filter(c => c.parent_id === comment.id);
                            const isExpanded = expandedComments.has(comment.id);

                            return (
                                <View key={comment.id} className="mb-4">
                                    {/* Main Comment */}
                                    <View className="bg-[#2B2B2B] p-3 rounded-lg">
                                        <View className="flex-row justify-between items-center mb-1">
                                            <Text className="text-[#D4AF37] text-xs font-bold">{userName}</Text>
                                            <Text className="text-gray-500 text-[10px]">{new Date(comment.created_at).toLocaleDateString()}</Text>
                                        </View>
                                        <Text className="text-white text-sm">{comment.text}</Text>

                                        <View className="flex-row items-center gap-4 mt-2">
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setReplyingTo(comment);
                                                }}
                                            >
                                                <Text className="text-gray-400 text-xs font-bold">Responder</Text>
                                            </TouchableOpacity>

                                            {replies.length > 0 && (
                                                <TouchableOpacity
                                                    className="flex-row items-center gap-1"
                                                    onPress={() => toggleReplies(comment.id)}
                                                >
                                                    <Text className="text-[#D4AF37] text-xs font-bold">
                                                        {isExpanded ? 'Ocultar respostas' : `Ver ${replies.length} resposta(s)`}
                                                    </Text>
                                                    {isExpanded ? <ChevronUp size={14} color="#D4AF37" /> : <ChevronDown size={14} color="#D4AF37" />}
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    {/* Replies */}
                                    {isExpanded && replies.length > 0 && (
                                        <View className="pl-4 mt-2 ml-2">
                                            {replies.map(reply => {
                                                const replyProfile = profilesMap[reply.user_id];
                                                const replyName = replyProfile?.full_name || 'Usuário Anônimo';
                                                return (
                                                    <View key={reply.id} className="bg-[#2B2B2B]/50 p-2 rounded-lg mb-2 border-l-2 border-[#D4AF37]/30">
                                                        <View className="flex-row justify-between items-center mb-1">
                                                            <Text className="text-[#D4AF37] text-xs font-bold">{replyName}</Text>
                                                            <Text className="text-gray-500 text-[10px]">{new Date(reply.created_at).toLocaleDateString()}</Text>
                                                        </View>
                                                        <Text className="text-white text-xs">{reply.text}</Text>
                                                    </View>
                                                )
                                            })}
                                        </View>
                                    )}
                                </View>
                            );
                        })}

                        {/* Spacer for bottom input */}
                        <View className="h-5" />
                    </ScrollView>

                    {/* Comment Input */}
                    <View className="p-4 bg-[#2C2926] border-t border-[#D4AF37]/30 flex-col pb-8">
                        {replyingTo && (
                            <View className="flex-row justify-between items-center mb-2 px-2">
                                <Text className="text-gray-400 text-xs">
                                    Respondendo a <Text className="text-[#D4AF37] font-bold">{profilesMap[replyingTo.user_id]?.full_name || 'Usuário'}</Text>
                                </Text>
                                <TouchableOpacity onPress={() => setReplyingTo(null)}>
                                    <Text className="text-red-500 text-xs">Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View className="flex-row items-center">
                            <TextInput
                                className="flex-1 bg-[#3E3B36] h-12 rounded-full px-4 text-white mr-2 border border-[#524E48]"
                                placeholder={replyingTo ? "Escreva sua resposta..." : "Adicione um comentário..."}
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
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}
