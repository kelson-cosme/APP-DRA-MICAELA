import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Heart, MessageSquare, Plus, Image as ImageIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Post {
    id: string;
    content_text: string;
    image_url: string | null;
    created_at: string;
    user_id: string;
    community_likes: { count: number }[];
    community_comments: { count: number }[];
}

export default function CommunityFeedScreen() {
    const navigation = useNavigation<any>();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});

    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

    const fetchPosts = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Fetch current user profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setCurrentUserProfile(profile);
            }

            const { data, error } = await supabase
                .from('community_posts')
                .select('*, community_likes(count), community_comments(count)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPosts(data || []);

            if (user) {
                const { data: myLikes } = await supabase
                    .from('community_likes')
                    .select('post_id')
                    .eq('user_id', user.id);

                if (myLikes) {
                    setLikedPostIds(new Set(myLikes.map(l => l.post_id)));
                }
            }

            // Fetch Profiles
            if (data && data.length > 0) {
                const userIds = Array.from(new Set(data.map(p => p.user_id)));
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
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchPosts();
        }, [])
    );

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchPosts();
    }, []);

    const handleLike = async (postId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Optimistic Update
        const isLiked = likedPostIds.has(postId);
        setLikedPostIds(prev => {
            const newSet = new Set(prev);
            if (isLiked) newSet.delete(postId);
            else newSet.add(postId);
            return newSet;
        });

        if (isLiked) {
            await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        } else {
            await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id });
        }
        fetchPosts(); // Refresh to ensure sync
    };

    if (loading && !refreshing) {
        return (
            <View className="flex-1 bg-[#141414] justify-center items-center">
                <ActivityIndicator size="large" color="#D4AF37" />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-[#141414]">
            <SafeAreaView className="flex-1">
                <View className="px-4 py-4 border-b border-gray-800">
                    <Text className="text-[#C5A668] text-2xl font-bold" style={{ fontFamily: 'serif' }}>Comunidade</Text>
                </View>

                {/* Feed List */}
                <ScrollView
                    className="flex-1 px-4 mt-4"
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
                    }
                >
                    {/* Create Post Trigger */}
                    <View className="bg-[#2B2B2B] rounded-xl p-4 mb-4 flex-row items-center gap-3">
                        {currentUserProfile?.avatar_url ? (
                            <Image
                                source={{ uri: currentUserProfile.avatar_url }}
                                className="w-10 h-10 rounded-full bg-gray-600"
                            />
                        ) : (
                            <View className="w-10 h-10 rounded-full bg-gray-500 items-center justify-center">
                                <Text className="text-white font-bold">{currentUserProfile?.full_name?.charAt(0) || '?'}</Text>
                            </View>
                        )}
                        <TouchableOpacity
                            className="flex-1 bg-[#141414] h-10 rounded-full justify-center px-4 border border-gray-700"
                            onPress={() => navigation.navigate('CreatePost')}
                        >
                            <Text className="text-gray-400">No que você está pensando?</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('CreatePost')}>
                            <ImageIcon color="#D4AF37" size={24} />
                        </TouchableOpacity>
                    </View>
                    {posts.map((post) => (
                        <TouchableOpacity
                            key={post.id}
                            activeOpacity={0.9}
                            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                            className="bg-[#2B2B2B] rounded-xl mb-4 overflow-hidden mt-4"
                        >
                            <View className="p-4 flex-row items-center gap-3">
                                {profilesMap[post.user_id]?.avatar_url ? (
                                    <Image
                                        source={{ uri: profilesMap[post.user_id].avatar_url }}
                                        className="w-10 h-10 rounded-full bg-gray-600"
                                    />
                                ) : (
                                    <View className="w-10 h-10 rounded-full bg-gray-500 items-center justify-center">
                                        <Text className="text-white font-bold">{profilesMap[post.user_id]?.full_name?.charAt(0) || '?'}</Text>
                                    </View>
                                )}
                                <View>
                                    <Text className="text-white font-bold text-base">{profilesMap[post.user_id]?.full_name || 'Usuário da Comunidade'}</Text>
                                    <Text className="text-gray-400 text-xs">{new Date(post.created_at).toLocaleDateString()}</Text>
                                </View>
                            </View>

                            <Text className="text-white px-4 mb-3 text-base">{post.content_text}</Text>

                            {post.image_url && (
                                <Image
                                    source={{ uri: post.image_url }}
                                    className="w-full h-64 bg-gray-800"
                                    resizeMode="cover"
                                />
                            )}

                            <View className="p-4 flex-row items-center gap-6 border-t border-gray-700 mt-2">
                                <TouchableOpacity
                                    className="flex-row items-center gap-2"
                                    onPress={() => handleLike(post.id)}
                                >
                                    <Heart
                                        color={likedPostIds.has(post.id) ? "#E50914" : "white"}
                                        fill={likedPostIds.has(post.id) ? "#E50914" : "transparent"}
                                        size={20}
                                    />
                                    <Text className="text-gray-300 text-sm">
                                        {post.community_likes?.[0]?.count || 0} Curtidas
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="flex-row items-center gap-2"
                                    onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
                                >
                                    <MessageSquare color="white" size={20} />
                                    <Text className="text-gray-300 text-sm">
                                        {post.community_comments?.[0]?.count || 0} Comentários
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <View className="h-24" />
                </ScrollView>

                {/* FAB */}
                <TouchableOpacity
                    className="absolute bottom-6 right-6 w-14 h-14 bg-[#D4AF37] rounded-full items-center justify-center shadow-lg shadow-black/50"
                    onPress={() => navigation.navigate('CreatePost')}
                >
                    <Plus color="black" size={30} />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}
