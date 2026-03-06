import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { X, Image as ImageIcon, Send, Camera } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

export default function CreatePostScreen() {
    const navigation = useNavigation<any>();
    const [text, setText] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const [showImageModal, setShowImageModal] = useState(false);

    React.useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();
            setCurrentUserProfile(data);
        }
    };

    const pickImage = () => {
        setShowImageModal(true);
    };

    const handleCamera = async () => {
        setShowImageModal(false);
        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const handleGallery = async () => {
        setShowImageModal(false);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const uploadImage = async (uri: string) => {
        try {
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64'
            });
            const arrayBuffer = decode(base64);

            const filename = `${Date.now()}.jpg`;

            const { data, error } = await supabase.storage
                .from('community')
                .upload(filename, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('community')
                .getPublicUrl(filename);

            return publicUrlData.publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    const handlePost = async () => {
        if (!text && !image) return;

        try {
            setUploading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let imageUrl = null;
            if (image) {
                imageUrl = await uploadImage(image);
            }

            const { error } = await supabase.from('community_posts').insert({
                user_id: user.id,
                content_text: text,
                image_url: imageUrl
            });

            if (error) throw error;

            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#141414]">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-800">
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <X color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-lg">Criar Publicação</Text>
                    <TouchableOpacity
                        onPress={handlePost}
                        disabled={uploading || (!text && !image)}
                        className={`px-4 py-2 rounded-full ${(!text && !image) ? 'bg-gray-700' : 'bg-[#D4AF37]'}`}
                    >
                        {uploading ? (
                            <ActivityIndicator size="small" color="black" />
                        ) : (
                            <Text className={`font-bold ${(!text && !image) ? 'text-gray-400' : 'text-black'}`}>Publicar</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    className="flex-1"
                >
                    <ScrollView className="flex-1 p-4">
                        <View className="flex-row gap-3 mb-4 items-center">
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
                            <View>
                                <Text className="text-white font-bold text-base">{currentUserProfile?.full_name || 'Usuário'}</Text>
                                <Text className="text-gray-400 text-xs">Público</Text>
                            </View>
                        </View>

                        <TextInput
                            className="text-white text-lg"
                            placeholder="No que você está pensando?"
                            placeholderTextColor="#6B7280"
                            multiline
                            value={text}
                            onChangeText={setText}
                            textAlignVertical="top"
                            scrollEnabled={false}
                        />

                        {image && (
                            <View className="mt-4 relative rounded-xl overflow-hidden mb-4">
                                <Image source={{ uri: image }} className="w-full h-60" resizeMode="cover" />
                                <TouchableOpacity
                                    className="absolute top-2 right-2 bg-black/50 p-1 rounded-full"
                                    onPress={() => setImage(null)}
                                >
                                    <X color="white" size={20} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </ScrollView>

                    {/* Toolbar */}
                    <View className="p-4 border-t border-gray-800 bg-[#141414] pb-24">
                        <TouchableOpacity className="flex-row items-center gap-2" onPress={pickImage}>
                            <ImageIcon color="#D4AF37" size={24} />
                            <Text className="text-[#D4AF37] font-medium">Adicionar foto</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>

            </SafeAreaView>

            {/* Modal de Seleção de Imagem */}
            <Modal
                visible={showImageModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowImageModal(false)}
            >
                <TouchableOpacity
                    className="flex-1 bg-black/60 justify-end"
                    activeOpacity={1}
                    onPress={() => setShowImageModal(false)}
                >
                    <View className="bg-[#2B2B2B] rounded-t-3xl pt-6 pb-10 px-6 border-t border-[#D4AF37]/20">
                        <View className="flex-row justify-between items-center mb-6">
                            <Text className="text-white text-xl font-bold">Adicionar Foto</Text>
                            <TouchableOpacity onPress={() => setShowImageModal(false)} className="p-2 bg-[#333333] rounded-full">
                                <X color="#A0A0A0" size={20} />
                            </TouchableOpacity>
                        </View>

                        <View className="flex-row justify-around gap-4 mt-2">
                            <TouchableOpacity
                                className="flex-1 bg-[#3E3B36] p-6 rounded-2xl items-center border border-[#524E48] active:bg-[#4E4B46]"
                                onPress={handleCamera}
                            >
                                <View className="w-14 h-14 bg-[#D4AF37]/20 rounded-full items-center justify-center mb-3">
                                    <Camera color="#D4AF37" size={28} />
                                </View>
                                <Text className="text-white font-bold">Câmera</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                className="flex-1 bg-[#3E3B36] p-6 rounded-2xl items-center border border-[#524E48] active:bg-[#4E4B46]"
                                onPress={handleGallery}
                            >
                                <View className="w-14 h-14 bg-[#D4AF37]/20 rounded-full items-center justify-center mb-3">
                                    <ImageIcon color="#D4AF37" size={28} />
                                </View>
                                <Text className="text-white font-bold">Galeria</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}
