import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera, Upload, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useUser } from '../contexts/UserContext';
import { decode } from 'base64-arraybuffer';

export default function CompleteProfileScreen({ navigation }: { navigation: any }) {
    const { profile, updateProfileState } = useUser();
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url || null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
            base64: true,
        });

        if (!result.canceled && result.assets && result.assets[0].base64) {
            setAvatarUri(result.assets[0].uri);
            setBase64Image(result.assets[0].base64);
        }
    };

    const handleSaveProfile = async () => {
        if (!fullName.trim()) {
            alert("Por favor, digite seu nome completo.");
            return;
        }

        if (!profile?.id) {
            alert("Erro: ID de usuário não encontrado.");
            return;
        }

        setLoading(true);

        try {
            let finalAvatarUrl = avatarUri;

            // Upload de nova imagem de perfil do Google se o usuário selecionou do celular dele
            if (base64Image) {
                const fileName = `avatar-${profile.id}-${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, decode(base64Image), {
                        contentType: 'image/jpeg',
                        upsert: true,
                    });

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
                finalAvatarUrl = data.publicUrl;
            }

            // Atualiza localmente no banco
            const updates = {
                id: profile.id,
                full_name: fullName.trim(),
                avatar_url: finalAvatarUrl,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase.from('profiles').upsert(updates);
            if (error) throw error;

            // Atualiza metadata no Auth (pra ficar salvo no auth provider tambem)
            await supabase.auth.updateUser({
                data: { full_name: fullName.trim(), avatar_url: finalAvatarUrl }
            });

            // Atualiza Contexto 
            updateProfileState({ full_name: fullName.trim(), avatar_url: finalAvatarUrl });

            // Redireciona para o App Principal
            navigation.replace('HomeTabs');

        } catch (error: any) {
            alert('Não foi possível salvar os dados. ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-[#1A1A1A]">
            <StatusBar style="light" />
            <View className="flex-1 px-6 justify-center">

                <View className="mb-10 items-center">
                    <Text className="text-[#D4AF37] text-3xl font-bold text-center mb-2">Quase lá!</Text>
                    <Text className="text-gray-400 text-center text-sm px-4">
                        Para personalizar a melhor experiência médica e da comunidade na Dra. Micaela, finalize o seu perfil rapidinho.
                    </Text>
                </View>

                {/* Avatar Picker */}
                <View className="items-center mb-10">
                    <TouchableOpacity
                        onPress={pickImage}
                        className="w-32 h-32 bg-[#2a2a2a] rounded-full items-center justify-center border-2 border-[#D4AF37] overflow-hidden"
                    >
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} className="w-full h-full" />
                        ) : (
                            <Camera color="#D4AF37" size={40} />
                        )}
                        {!avatarUri && (
                            <View className="absolute bottom-4 bg-black/50 px-2 py-1 rounded-full">
                                <Text className="text-white text-[10px] font-bold uppercase tracking-wider">Adicionar Foto</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {avatarUri && (
                        <TouchableOpacity onPress={pickImage} className="mt-4 p-2 bg-[#2a2a2a] rounded-lg flex-row items-center gap-2">
                            <Upload color="#D4AF37" size={16} />
                            <Text className="text-[#D4AF37] font-semibold text-xs uppercase tracking-wider">Trocar Foto</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Name Input */}
                <View className="mb-6">
                    <Text className="text-gray-300 font-bold ml-1 mb-2">Nome Completo (Obrigatório)</Text>
                    <TextInput
                        className="w-full bg-[#2a2a2a] h-14 rounded-xl px-4 text-white text-lg border border-gray-700"
                        placeholder="Ex: Amanda Guedes"
                        placeholderTextColor="#6B7280"
                        value={fullName}
                        onChangeText={setFullName}
                        autoCapitalize="words"
                    />
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    className={`w-full h-14 rounded-xl mt-4 items-center justify-center ${!fullName.trim() ? 'bg-[#555] opacity-50' : 'bg-[#D4AF37]'}`}
                    onPress={handleSaveProfile}
                    disabled={loading || !fullName.trim()}
                >
                    {loading ? (
                        <ActivityIndicator color="black" />
                    ) : (
                        <Text className="text-black text-lg font-bold">Salvar e Entrar no App</Text>
                    )}
                </TouchableOpacity>

            </View>
        </SafeAreaView>
    );
}
