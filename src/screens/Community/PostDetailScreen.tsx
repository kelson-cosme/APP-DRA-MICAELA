import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Heart, MessageSquare, Send, ChevronLeft, Trash2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PostDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { postId } = route.params;

    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [likesCount, setLikesCount] = useState(0);
    const [hasLiked, setHasLiked] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    useEffect(() => {
        fetchPostDetails();
        getCurrentUser();
    }, [postId]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);
    };

    const fetchPostDetails = async () => {
        try {
            setLoading(true);

            // Fetch Post
            const { data: postData, error: postError } = await supabase
                .from('community_posts')
                .select('*')
                .eq('id', postId)
                .single();

            if (postError) throw postError;
            setPost(postData);

            // Fetch Likes
            const { count: lCount, error: lError } = await supabase
                .from('community_likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', postId);
            setLikesCount(lCount || 0);

            // Check if Liked
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: myLike } = await supabase
                    .from('community_likes')
                    .select('*')
                    .eq('post_id', postId)
                    .eq('user_id', user.id)
                    .single();
                setHasLiked(!!myLike);
            }

            fetchComments(postData.user_id);
        } catch (error) {
            console.error('Error fetching post details:', error);
        } finally {
            setLoading(false);
        }
    };



    const fetchComments = async (currentPostAuthorId?: string) => {
        const { data, error } = await supabase
            .from('community_comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (!error && data) {
            setComments(data);

            // Fetch profiles for comments and post author
            const userIds = new Set(data.map(c => c.user_id));

            const authorId = currentPostAuthorId || post?.user_id;
            if (authorId) userIds.add(authorId);

            const idsArray = Array.from(userIds);
            if (idsArray.length > 0) {
                const { data: pData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .in('id', idsArray);

                if (pData) {
                    const pMap: Record<string, any> = {};
                    pData.forEach(p => { pMap[p.id] = p; });
                    setProfilesMap(prev => ({ ...prev, ...pMap }));
                }
            }
        }
    };

    const handleLike = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (hasLiked) {
            await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
            setHasLiked(false);
            setLikesCount(prev => prev - 1);
        } else {
            await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id });
            setHasLiked(true);
            setLikesCount(prev => prev + 1);
        }
    };

    const handleSendComment = async () => {
        if (!newComment.trim()) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase.from('community_comments').insert({
            post_id: postId,
            user_id: user.id,
            text: newComment
        });

        if (error) {
            Alert.alert('Erro', 'Não foi possível enviar o comentário');
        } else {
            setNewComment('');
            fetchComments();
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        Alert.alert(
            "Excluir comentário",
            "Tem certeza?",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        await supabase.from('community_comments').delete().eq('id', commentId);
                        fetchComments();
                    }
                }
            ]
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
                <View className="flex-row items-center px-4 py-2 border-b border-gray-800">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-lg">Publicação</Text>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
                >
                    <ScrollView className="flex-1">
                        {/* Post Content */}
                        <View className="bg-[#2B2B2B] mb-4">
                            <View className="p-4 flex-row items-center gap-3">
                                {profilesMap[post?.user_id]?.avatar_url ? (
                                    <Image
                                        source={{ uri: profilesMap[post?.user_id].avatar_url }}
                                        className="w-10 h-10 rounded-full bg-gray-600"
                                    />
                                ) : (
                                    <View className="w-10 h-10 rounded-full bg-gray-500 items-center justify-center">
                                        <Text className="text-white font-bold">{profilesMap[post?.user_id]?.full_name?.charAt(0) || '?'}</Text>
                                    </View>
                                )}
                                <View>
                                    <Text className="text-white font-bold text-base">{profilesMap[post?.user_id]?.full_name || 'Usuário da Comunidade'}</Text>
                                    <Text className="text-gray-400 text-xs">{new Date(post?.created_at).toLocaleDateString()}</Text>
                                </View>
                            </View>

                            <Text className="text-white px-4 mb-3 text-base">{post?.content_text}</Text>

                            {post?.image_url && (
                                <Image
                                    source={{ uri: post.image_url }}
                                    className="w-full h-80 bg-gray-800"
                                    resizeMode="cover"
                                />
                            )}

                            <View className="p-4 flex-row items-center gap-6 border-t border-gray-700 mt-2">
                                <TouchableOpacity
                                    className="flex-row items-center gap-2"
                                    onPress={handleLike}
                                >
                                    <Heart color={hasLiked ? "#E50914" : "white"} fill={hasLiked ? "#E50914" : "transparent"} size={24} />
                                    <Text className="text-gray-300 text-sm">{likesCount} Curtidas</Text>
                                </TouchableOpacity>

                                <View className="flex-row items-center gap-2">
                                    <MessageSquare color="white" size={24} />
                                    <Text className="text-gray-300 text-sm">{comments.length} Comentários</Text>
                                </View>
                            </View>
                        </View>

                        {/* Comments List */}
                        <View className="px-4 pb-20">
                            <Text className="text-gray-400 mb-4 font-bold">Comentários</Text>
                            {comments.map((comment) => (
                                <View key={comment.id} className="bg-[#2B2B2B] p-3 rounded-lg mb-3">
                                    <View className="flex-row justify-between items-start">
                                        <View className="flex-row items-center gap-3 mb-1">
                                            {profilesMap[comment.user_id]?.avatar_url ? (
                                                <Image
                                                    source={{ uri: profilesMap[comment.user_id].avatar_url }}
                                                    className="w-8 h-8 rounded-full bg-gray-600"
                                                />
                                            ) : (
                                                <View className="w-8 h-8 rounded-full bg-gray-500 items-center justify-center">
                                                    <Text className="text-white font-bold text-xs">{profilesMap[comment.user_id]?.full_name?.charAt(0) || '?'}</Text>
                                                </View>
                                            )}
                                            <View>
                                                <Text className="text-[#D4AF37] font-bold text-xs">{profilesMap[comment.user_id]?.full_name || 'Usuário'}</Text>
                                                <Text className="text-gray-500 text-[10px]">{new Date(comment.created_at).toLocaleDateString()}</Text>
                                            </View>
                                        </View>
                                        {currentUserId === comment.user_id && (
                                            <TouchableOpacity onPress={() => handleDeleteComment(comment.id)}>
                                                <Trash2 color="#ef4444" size={14} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text className="text-white text-sm mt-1 ml-11">{comment.text}</Text>
                                </View>
                            ))}
                            {comments.length === 0 && (
                                <Text className="text-gray-500 text-center mt-4">Seja o primeiro a comentar!</Text>
                            )}
                        </View>
                    </ScrollView>

                    {/* Input Area */}
                    <View className="p-4 bg-[#141414] border-t border-gray-800 flex-row items-center pb-24">
                        <TextInput
                            className="flex-1 bg-[#2B2B2B] min-h-[48px] max-h-24 rounded-full px-4 text-white mr-2 pt-3 pb-3"
                            placeholder="Escreva um comentário..."
                            placeholderTextColor="#9CA3AF"
                            multiline
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
                </KeyboardAvoidingView>
            </SafeAreaView>
        </View>
    );
}
