import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Play } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// Types
type Category = {
    id: string;
    name: string;
};

type Content = {
    id: string;
    category_id: string;
    title: string;
    thumbnail_url: string;
};

export default function ContentHomeScreen({ navigation }: { navigation: any }) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [contents, setContents] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: cats, error: catsError } = await supabase.from('categories').select('*');
            const { data: conts, error: contsError } = await supabase.from('contents').select('*');

            if (catsError) throw catsError;
            if (contsError) throw contsError;

            if (catsError) throw catsError;
            if (contsError) throw contsError;

            setCategories(cats || []);
            setContents(conts || []);
        } catch (error) {
            console.error('Error fetching content:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const getContentsByCategory = (categoryId: string) => {
        return contents.filter(c => c.category_id === categoryId);
    };

    const renderHero = () => {
        // Just pick the first content as hero for now
        const heroContent = contents[0];
        if (!heroContent) return null;

        return (
            <TouchableOpacity
                className="w-full h-[550px] relative mb-8"
                onPress={() => navigation.navigate('ContentDetail', { contentId: heroContent.id })}
            >
                <Image
                    source={{ uri: heroContent.thumbnail_url || 'https://via.placeholder.com/400x600' }}
                    className="w-full h-full"
                    resizeMode="cover"
                />
                <View className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <View className="absolute inset-0 bg-black/30" />

                <View className="absolute bottom-4 left-4 right-4 items-center">
                    <Text className="text-white text-3xl font-bold mb-2 text-center">{heroContent.title}</Text>
                    <View className="flex-row gap-4">
                        <View className="flex-row items-center bg-[#D4AF37] px-6 py-2 rounded-md">
                            <Play size={20} color="black" fill="black" />
                            <Text className="text-black font-bold ml-2">Assistir</Text>
                        </View>
                        <View className="flex-row items-center bg-[#565656] px-6 py-2 rounded-md">
                            <Text className="text-white font-bold">Minha Lista</Text>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
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
            {contents.length === 0 ? (
                <View className="flex-1 justify-center items-center px-6">
                    <Text className="text-white text-xl font-bold text-center mb-2">Sem conteúdos no momento</Text>
                    <Text className="text-gray-400 text-center">Fique atento, em breve teremos novidades para você!</Text>
                </View>
            ) : (
                <ScrollView
                    className="flex-1"
                    contentContainerStyle={{ paddingBottom: 100 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#D4AF37" />
                    }
                >
                    {renderHero()}

                    {categories.map(category => {
                        const categoryContents = getContentsByCategory(category.id);
                        if (categoryContents.length === 0) return null;

                        return (
                            <View key={category.id} className="mb-6">
                                <Text className="text-white text-lg font-bold ml-4 mb-2">{category.name}</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-4">
                                    {categoryContents.map(content => (
                                        <TouchableOpacity
                                            key={content.id}
                                            className="mr-3 w-32 h-48 rounded-md overflow-hidden relative"
                                            onPress={() => navigation.navigate('ContentDetail', { contentId: content.id })}
                                        >
                                            <Image
                                                source={{ uri: content.thumbnail_url || 'https://via.placeholder.com/150x225' }}
                                                className="w-full h-full"
                                                resizeMode="cover"
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}
