import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft, Camera, LogOut, Download } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';

import { useUser } from '../contexts/UserContext';

export default function ProfileScreen() {
    const navigation = useNavigation<any>();
    const { profile, updateProfileState } = useUser();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);
    const email = profile?.email || '';

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name);
            setAvatarUrl(profile.avatar_url);
        }
    }, [profile]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        navigation.replace('Login');
    };

    const pickImage = async () => {
        Alert.alert(
            "Alterar Foto",
            "Escolha a origem da imagem",
            [
                {
                    text: "Câmera",
                    onPress: async () => {
                        const result = await ImagePicker.launchCameraAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.8,
                        });
                        if (!result.canceled) await uploadAvatar(result.assets[0].uri);
                    }
                },
                {
                    text: "Galeria",
                    onPress: async () => {
                        const result = await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ['images'],
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.8,
                        });
                        if (!result.canceled) await uploadAvatar(result.assets[0].uri);
                    }
                },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const uploadAvatar = async (uri: string) => {
        try {
            setLoading(true);
            const base64 = await FileSystem.readAsStringAsync(uri, {
                encoding: 'base64'
            });
            const arrayBuffer = decode(base64);

            const filename = `avatar_${Date.now()}.jpg`;

            const { error } = await supabase.storage
                .from('community') // Using existing bucket for now
                .upload(filename, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false
                });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('community')
                .getPublicUrl(filename);

            setAvatarUrl(publicUrlData.publicUrl);
        } catch (error: any) {
            Alert.alert('Erro no Upload', error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const { error, data: { user } } = await supabase.auth.updateUser({
                data: { full_name: fullName, avatar_url: avatarUrl }
            });

            if (error) throw error;

            // Update the public.profiles table so it reflects in the Community feed
            if (user) {
                const { error: profileError } = await supabase.from('profiles').upsert({
                    id: user.id,
                    full_name: fullName,
                    avatar_url: avatarUrl
                }, { onConflict: 'id' });

                if (profileError) {
                    console.warn("Could not update public profile:", profileError);
                }
            }

            // Sync with global state immediately
            updateProfileState({ full_name: fullName, avatar_url: avatarUrl });

            Alert.alert('Sucesso', 'Perfil atualizado!');
        } catch (error: any) {
            Alert.alert('Erro', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-[#2C2926]">
            <SafeAreaView className="flex-1">
                {/* Header */}
                <View className="flex-row items-center justify-between px-4 py-4 border-b border-[#3E3B36]">
                    <TouchableOpacity onPress={() => navigation.goBack()} className="w-10 h-10 items-center justify-center">
                        <ChevronLeft color="white" size={24} />
                    </TouchableOpacity>
                    <Text className="text-white font-bold text-lg">Meu Perfil</Text>
                    <View className="w-10" />
                </View>

                <ScrollView className="flex-1 px-4 py-8">
                    {/* Avatar Section */}
                    <View className="items-center mb-8">
                        <View className="relative">
                            <View className="w-32 h-32 rounded-full bg-gray-600 overflow-hidden border-4 border-[#D4AF37]">
                                {avatarUrl ? (
                                    <Image source={{ uri: avatarUrl }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="w-full h-full items-center justify-center bg-[#141414]">
                                        <Text className="text-white text-4xl">{fullName ? fullName[0].toUpperCase() : '?'}</Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity
                                className="absolute bottom-0 right-0 bg-[#D4AF37] p-2 rounded-full border-2 border-[#2C2926]"
                                onPress={pickImage}
                            >
                                <Camera color="black" size={20} />
                            </TouchableOpacity>
                        </View>
                        <Text className="text-gray-400 mt-4 text-sm">{email}</Text>
                    </View>

                    {/* Form Section */}
                    <View className="space-y-4 gap-4">
                        <TouchableOpacity
                            className="bg-[#3E3B36] p-4 rounded-xl flex-row items-center justify-between"
                            onPress={() => navigation.navigate('Downloads')}
                        >
                            <View className="flex-row items-center gap-3">
                                <View className="w-10 h-10 bg-[#D4AF37]/20 items-center justify-center rounded-full">
                                    <Download color="#D4AF37" size={20} />
                                </View>
                                <Text className="text-white font-bold text-base">Meus Downloads</Text>
                            </View>
                            <ChevronLeft color="#6B7280" size={20} className="rotate-180" />
                        </TouchableOpacity>

                        <View>
                            <Text className="text-gray-300 mb-2 font-medium">Nome Completo</Text>
                            <TextInput
                                className="w-full bg-[#3E3B36] h-12 rounded-xl px-4 text-white border border-[#524E48]"
                                placeholder="Seu nome"
                                placeholderTextColor="#6B7280"
                                value={fullName}
                                onChangeText={setFullName}
                            />
                        </View>

                        <TouchableOpacity
                            className="w-full h-12 bg-[#D4AF37] rounded-xl items-center justify-center mt-4"
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="black" />
                            ) : (
                                <Text className="text-black font-bold text-lg">Salvar Alterações</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View className="mt-12 border-t border-[#3E3B36] pt-8">
                        <TouchableOpacity
                            className="flex-row items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20"
                            onPress={handleSignOut}
                        >
                            <LogOut color="#ef4444" size={20} />
                            <Text className="text-red-500 font-bold">Sair do Aplicativo</Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </SafeAreaView>
            <StatusBar style="light" />
        </View>
    );
}
