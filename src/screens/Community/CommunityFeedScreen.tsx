import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { Heart, MessageSquare, Plus, Image as ImageIcon } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import * as Haptics from 'expo-haptics';

const PAGE_SIZE = 10;

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
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [likedPostIds, setLikedPostIds] = useState<Set<string>>(new Set());
    const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const pageRef = useRef(0);
    const isFetchingRef = useRef(false);

    const fetchUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', user.id).single();
        setCurrentUserProfile(profile);

        const { data: myLikes } = await supabase
            .from('community_likes').select('post_id').eq('user_id', user.id);
        if (myLikes) setLikedPostIds(new Set(myLikes.map(l => l.post_id)));

        return user;
    };

    const fetchProfiles = async (data: Post[]) => {
        if (!data.length) return;
        const userIds = Array.from(new Set(data.map(p => p.user_id)));
        const { data: pData } = await supabase
            .from('profiles').select('id, full_name, avatar_url').in('id', userIds);
        if (pData) {
            setProfilesMap(prev => {
                const map = { ...prev };
                pData.forEach(p => { map[p.id] = p; });
                return map;
            });
        }
    };

    const fetchPage = async (page: number, replace = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;

        try {
            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            const { data, error } = await supabase
                .from('community_posts')
                .select('*, community_likes(count), community_comments(count)')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            const newPosts = data || [];
            setHasMore(newPosts.length === PAGE_SIZE);

            if (replace) {
                setPosts(newPosts);
            } else {
                setPosts(prev => {
                    // Evita duplicatas
                    const existingIds = new Set(prev.map(p => p.id));
                    const unique = newPosts.filter(p => !existingIds.has(p.id));
                    return [...prev, ...unique];
                });
            }

            await fetchProfiles(newPosts);
        } catch (err) {
            console.error('Error fetching posts:', err);
        } finally {
            isFetchingRef.current = false;
        }
    };

    const initialLoad = async () => {
        setLoading(true);
        pageRef.current = 0;
        await fetchUserData();
        await fetchPage(0, true);
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        pageRef.current = 0;
        setHasMore(true);
        await fetchUserData();
        await fetchPage(0, true);
        setRefreshing(false);
    };

    const onEndReached = async () => {
        if (!hasMore || loadingMore || isFetchingRef.current) return;
        setLoadingMore(true);
        pageRef.current += 1;
        await fetchPage(pageRef.current);
        setLoadingMore(false);
    };

    useEffect(() => { initialLoad(); }, []);

    useFocusEffect(useCallback(() => {
        // Ao voltar para a tela, apenas atualiza a primeira página
        // sem resetar scroll ou mostrar loading
        fetchPage(0, false);
    }, []));

    const handleLike = async (postId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const isLiked = likedPostIds.has(postId);
        setLikedPostIds(prev => {
            const s = new Set(prev);
            isLiked ? s.delete(postId) : s.add(postId);
            return s;
        });
        // Atualiza contagem otimisticamente
        setPosts(prev => prev.map(p => {
            if (p.id !== postId) return p;
            const current = p.community_likes?.[0]?.count || 0;
            return {
                ...p,
                community_likes: [{ count: isLiked ? current - 1 : current + 1 }],
            };
        }));

        if (isLiked) {
            await supabase.from('community_likes').delete().eq('post_id', postId).eq('user_id', user.id);
        } else {
            await supabase.from('community_likes').insert({ post_id: postId, user_id: user.id });
        }
    };

    const renderPost = ({ item: post }: { item: Post }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('PostDetail', { postId: post.id })}
            className="bg-[#2B2B2B] rounded-xl mb-4 overflow-hidden"
        >
            <View className="p-4 flex-row items-center gap-3">
                {profilesMap[post.user_id]?.avatar_url ? (
                    <Image
                        source={{ uri: profilesMap[post.user_id].avatar_url }}
                        className="w-10 h-10 rounded-full bg-gray-600"
                    />
                ) : (
                    <View className="w-10 h-10 rounded-full bg-gray-500 items-center justify-center">
                        <Text className="text-white font-bold">
                            {profilesMap[post.user_id]?.full_name?.charAt(0) || '?'}
                        </Text>
                    </View>
                )}
                <View>
                    <Text className="text-white font-bold text-base">
                        {profilesMap[post.user_id]?.full_name || 'Usuário da Comunidade'}
                    </Text>
                    <Text className="text-gray-400 text-xs">
                        {new Date(post.created_at).toLocaleDateString()}
                    </Text>
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
                    <Animatable.View
                        key={likedPostIds.has(post.id) ? 'liked' : 'unliked'}
                        animation={likedPostIds.has(post.id) ? 'bounceIn' : undefined}
                        duration={500}
                        useNativeDriver
                    >
                        <Heart
                            color={likedPostIds.has(post.id) ? '#E50914' : 'white'}
                            fill={likedPostIds.has(post.id) ? '#E50914' : 'transparent'}
                            size={20}
                        />
                    </Animatable.View>
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
    );

    const renderHeader = () => (
        <View className="bg-[#2B2B2B] rounded-xl p-4 mb-4 flex-row items-center gap-3">
            {currentUserProfile?.avatar_url ? (
                <Image
                    source={{ uri: currentUserProfile.avatar_url }}
                    className="w-10 h-10 rounded-full bg-gray-600"
                />
            ) : (
                <View className="w-10 h-10 rounded-full bg-gray-500 items-center justify-center">
                    <Text className="text-white font-bold">
                        {currentUserProfile?.full_name?.charAt(0) || '?'}
                    </Text>
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
    );

    const renderFooter = () => {
        if (!loadingMore) return <View className="h-24" />;
        return (
            <View className="py-6 items-center">
                <ActivityIndicator color="#D4AF37" />
            </View>
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
                <View className="px-4 py-4 border-b border-gray-800">
                    <Text className="text-[#C5A668] text-2xl font-bold" style={{ fontFamily: 'serif' }}>
                        Comunidade
                    </Text>
                </View>

                <FlatList
                    data={posts}
                    keyExtractor={item => item.id}
                    renderItem={renderPost}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={{ padding: 16, paddingTop: 16 }}
                    onEndReached={onEndReached}
                    onEndReachedThreshold={0.3}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
                    }
                    showsVerticalScrollIndicator={false}
                />

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