import "../../global.css";
import React, { useState } from 'react';
import { Text, View, ImageBackground, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera, Eye, EyeOff } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

// Impede o WebBrowser de ficar aberto no iOS
WebBrowser.maybeCompleteAuthSession();

// Cria um listener pro redirecionamento
Linking.addEventListener('url', async (event) => {
    if (event.url.includes('#access_token') || event.url.includes('?access_token')) {
        try {
            // URL parse 
            const parts = event.url.split('#')[1] || event.url.split('?')[1];
            if (!parts) return;
            const params = new URLSearchParams(parts);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');

            if (access_token && refresh_token) {
                await supabase.auth.setSession({
                    access_token,
                    refresh_token
                });
            }
        } catch (e) {
            console.error('Erro setando token', e)
        }
    }
});

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }: { navigation: any }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const pickImage = async () => {
        Alert.alert(
            "Adicionar Foto",
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
                        if (!result.canceled) setAvatarUri(result.assets[0].uri);
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
                        if (!result.canceled) setAvatarUri(result.assets[0].uri);
                    }
                },
                { text: "Cancelar", style: "cancel" }
            ]
        );
    };

    const uploadAvatarAndUpsertProfile = async (userId: string) => {
        if (!avatarUri) return null;
        try {
            const base64 = await FileSystem.readAsStringAsync(avatarUri, { encoding: 'base64' });
            const arrayBuffer = decode(base64);
            const filename = `avatar_${userId}_${Date.now()}.jpg`;

            const { error: uploadError } = await supabase.storage
                .from('community')
                .upload(filename, arrayBuffer, { contentType: 'image/jpeg', upsert: false });

            if (uploadError) {
                console.error("Upload avatar error:", uploadError);
                return null;
            }

            const { data: publicUrlData } = supabase.storage
                .from('community')
                .getPublicUrl(filename);

            const avatarUrl = publicUrlData.publicUrl;

            // Upsert in profiles table
            await supabase.from('profiles').upsert({
                id: userId,
                full_name: name,
                avatar_url: avatarUrl
            }, { onConflict: 'id' });

            return avatarUrl;
        } catch (error) {
            console.error("Failed to upload avatar:", error);
            return null;
        }
    };

    async function signUpWithEmail() {
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Erro', 'Por favor, preencha todos os campos.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Erro', 'As senhas não coincidem.');
            return;
        }

        setLoading(true);
        // Using options.data to store name in user metadata if necessary
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    full_name: name,
                }
            }
        });

        if (error) {
            Alert.alert('Erro no Cadastro', error.message);
            setLoading(false);
        } else {
            if (data.user && avatarUri) {
                await uploadAvatarAndUpsertProfile(data.user.id);
            }

            // Se houver uma sessão, o Supabase já logou o usuário automaticamente.
            // O App.tsx vai trocar a navegação sozinho, então não forçamos um navigate('Login').
            if (!data.session) {
                Alert.alert('Sucesso!', 'Conta criada com sucesso. Você já pode fazer login.', [
                    { text: 'OK', onPress: () => navigation.navigate('Login') }
                ]);
                setLoading(false);
            }
        }
    }

    async function signUpWithGoogle() {
        try {
            setLoading(true);
            const redirectUrl = makeRedirectUri({
                preferLocalhost: false,
                scheme: 'dramicaelavargas',
            });

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                },
            });

            if (error) throw error;

            if (data?.url) {
                // Abre o navegador para o login
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

                if (result.type === 'success' && result.url) {
                    try {
                        const parts = result.url.split('#')[1] || result.url.split('?')[1];
                        if (parts) {
                            const params = new URLSearchParams(parts);
                            const access_token = params.get('access_token');
                            const refresh_token = params.get('refresh_token');
                            if (access_token && refresh_token) {
                                await supabase.auth.setSession({ access_token, refresh_token });
                            }
                        }
                    } catch (e) { }
                }
            }
        } catch (error: any) {
            Alert.alert('Erro no Google Login', error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <View className="flex-1 bg-black">
            <ImageBackground
                source={require('../../assets/draMicaela.webp')}
                className="flex-1 justify-end"
                resizeMode="cover"
                style={{ width: width, height: height }}
            >
                {/* Dark Gradient/Overlay */}
                <View className="absolute inset-0 bg-black/40" />

                <KeyboardAvoidingView
                    behavior="padding"
                    className="flex-1"
                >
                    <SafeAreaView className="w-full flex-1 justify-end px-6 pb-12 z-10">
                        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end', paddingTop: 40 }}>

                            {/* Back Button */}
                            <TouchableOpacity
                                className="absolute top-4 left-0 z-20 py-2 px-4 bg-black/50 rounded-full"
                                onPress={() => navigation.goBack()}
                            >
                                <Text className="text-white text-base">← Voltar</Text>
                            </TouchableOpacity>

                            {/* Logo / Title */}
                            <View className="mb-6 items-center mt-6">
                                <Text className="text-[#C5A668] text-4xl font-light text-center mb-2" style={{ fontFamily: 'serif', fontStyle: 'italic' }}>
                                    Criar Conta
                                </Text>
                                <Text className="text-gray-300 text-base text-center">
                                    Preencha seus dados para continuar
                                </Text>
                            </View>

                            {/* Avatar Picker */}
                            <View className="items-center mb-6">
                                <View className="relative">
                                    <View className="w-28 h-28 rounded-full bg-[#141414] overflow-hidden border-2 border-[#D4AF37]">
                                        {avatarUri ? (
                                            <Image source={{ uri: avatarUri }} className="w-full h-full" resizeMode="cover" />
                                        ) : (
                                            <View className="w-full h-full items-center justify-center">
                                                <Text className="text-gray-500 text-sm p-4 text-center">Adicionar Foto</Text>
                                            </View>
                                        )}
                                    </View>
                                    <TouchableOpacity
                                        className="absolute bottom-0 right-0 bg-[#D4AF37] p-2 rounded-full border-2 border-black shadow-lg"
                                        onPress={pickImage}
                                    >
                                        <Camera color="black" size={18} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Form */}
                            <View className="w-full gap-4">
                                <TextInput
                                    className="w-full bg-white/90 h-14 rounded-xl px-4 text-gray-800 text-lg border border-gray-200"
                                    placeholder="Nome Completo"
                                    placeholderTextColor="#6B7280"
                                    autoCapitalize="words"
                                    value={name}
                                    onChangeText={setName}
                                />

                                <TextInput
                                    className="w-full bg-white/90 h-14 rounded-xl px-4 text-gray-800 text-lg border border-gray-200"
                                    placeholder="Seu Email"
                                    placeholderTextColor="#6B7280"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />

                                <View className="w-full bg-white/90 h-14 rounded-xl flex-row items-center border border-gray-200 overflow-hidden">
                                    <TextInput
                                        className="flex-1 h-full px-4 text-gray-800 text-lg"
                                        placeholder="Sua Senha"
                                        placeholderTextColor="#6B7280"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity 
                                        className="px-4 h-full justify-center"
                                        onPress={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <EyeOff size={22} color="#6B7280" />
                                        ) : (
                                            <Eye size={22} color="#6B7280" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View className="w-full bg-white/90 h-14 rounded-xl flex-row items-center border border-gray-200 overflow-hidden">
                                    <TextInput
                                        className="flex-1 h-full px-4 text-gray-800 text-lg"
                                        placeholder="Confirmar Senha"
                                        placeholderTextColor="#6B7280"
                                        secureTextEntry={!showConfirmPassword}
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                    />
                                    <TouchableOpacity 
                                        className="px-4 h-full justify-center"
                                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <EyeOff size={22} color="#6B7280" />
                                        ) : (
                                            <Eye size={22} color="#6B7280" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className="w-full h-14 bg-[#D4AF37] rounded-xl items-center justify-center mt-6 shadow-lg shadow-black/20"
                                    activeOpacity={0.8}
                                    onPress={signUpWithEmail}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="black" />
                                    ) : (
                                        <Text className="text-black text-lg font-bold">Cadastrar</Text>
                                    )}
                                </TouchableOpacity>

                                {/* Divisor */}
                                <View className="flex-row items-center my-2">
                                    <View className="flex-1 h-[1px] bg-gray-500/50" />
                                    <Text className="text-gray-400 px-4 font-medium">Ou</Text>
                                    <View className="flex-1 h-[1px] bg-gray-500/50" />
                                </View>

                                {/* Google Button */}
                                {/* <TouchableOpacity
                                    className="w-full h-14 bg-white rounded-xl flex-row items-center justify-center shadow-lg shadow-black/20 gap-3"
                                    activeOpacity={0.8}
                                    onPress={signUpWithGoogle}
                                    disabled={loading}
                                >
                                    <Image
                                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png' }}
                                        style={{ width: 24, height: 24 }}
                                    />
                                    <Text className="text-gray-800 text-lg font-bold">Google</Text>
                                </TouchableOpacity> */}
                            </View>

                            {/* Footer */}
                            <View className="flex-row items-center mt-10 gap-1 mb-4 justify-center">
                                <Text className="text-gray-300 text-base shadow-black/50 shadow-sm">Já tem uma conta?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                                    <Text className="text-[#D4AF37] text-base font-bold shadow-black/50 shadow-sm">Faça Login</Text>
                                </TouchableOpacity>
                            </View>

                        </ScrollView>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </ImageBackground>
            <StatusBar style="light" />
        </View>
    );
}
