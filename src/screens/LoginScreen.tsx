import "../../global.css";
import React, { useState } from 'react';
import { Text, View, ImageBackground, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { makeRedirectUri } from 'expo-auth-session';

// Impede o WebBrowser de ficar aberto no iOS
WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: { navigation: any }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [remember, setRemember] = useState(false);

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha email e senha.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            Alert.alert('Erro no Login', error.message);
            setLoading(false);
        } else {
            // Success: App.tsx will handle navigation via onAuthStateChange
        }
    }

    async function signInWithGoogle() {
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

                if (result.type === 'success') {
                    // O Supabase lida com o token via deeplink automatico usando expo-linking/supabase config na v2
                    // Apenas deixamos o onAuthStateChange do App.tsx funcionar
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
                        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>

                            <View className="mb-10 items-center">
                                <Image
                                    source={require('../../assets/assinatura.png')}
                                    style={{ width: '100%', height: 80 }}
                                    resizeMode="contain"
                                />
                            </View>

                            {/* Form */}
                            <View className="w-full gap-4">
                                <TextInput
                                    className="w-full bg-white/90 h-14 rounded-xl px-4 text-gray-800 text-lg border border-gray-200"
                                    placeholder="Seu Email"
                                    placeholderTextColor="#6B7280"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />

                                <TextInput
                                    className="w-full bg-white/90 h-14 rounded-xl px-4 text-gray-800 text-lg border border-gray-200"
                                    placeholder="Sua Senha"
                                    placeholderTextColor="#6B7280"
                                    secureTextEntry
                                    value={password}
                                    onChangeText={setPassword}
                                />

                                <View className="w-full flex-row justify-between items-center mt-2">
                                    <TouchableOpacity
                                        className="flex-row items-center gap-2"
                                        onPress={() => setRemember(!remember)}
                                    >
                                        <View className={`w-5 h-5 rounded border border-white items-center justify-center ${remember ? 'bg-[#C5A668] border-[#C5A668]' : 'bg-transparent'}`}>
                                            {remember && <View className="w-3 h-3 bg-white rounded-sm" />}
                                        </View>
                                        <Text className="text-white text-base font-medium shadow-black/50 shadow-sm">Lembrar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity>
                                        <Text className="text-white text-base font-medium shadow-black/50 shadow-sm">Esqueceu a senha?</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className="w-full h-14 bg-[#D4AF37] rounded-xl items-center justify-center mt-6 shadow-lg shadow-black/20"
                                    activeOpacity={0.8}
                                    onPress={signInWithEmail}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="black" />
                                    ) : (
                                        <Text className="text-black text-lg font-bold">Entrar</Text>
                                    )}
                                </TouchableOpacity>

                                {/* Divisor */}
                                <View className="flex-row items-center my-2">
                                    <View className="flex-1 h-[1px] bg-gray-500/50" />
                                    <Text className="text-gray-400 px-4 font-medium">Ou continue com</Text>
                                    <View className="flex-1 h-[1px] bg-gray-500/50" />
                                </View>

                                {/* Google Button */}
                                <TouchableOpacity
                                    className="w-full h-14 bg-white rounded-xl flex-row items-center justify-center shadow-lg shadow-black/20 gap-3"
                                    activeOpacity={0.8}
                                    onPress={signInWithGoogle}
                                    disabled={loading}
                                >
                                    <Image
                                        source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png' }}
                                        style={{ width: 24, height: 24 }}
                                    />
                                    <Text className="text-gray-800 text-lg font-bold">Google</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Footer */}
                            <View className="flex-row items-center mt-10 gap-1 mb-4 justify-center">
                                <Text className="text-gray-300 text-base shadow-black/50 shadow-sm">Não tem acesso?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text className="text-[#D4AF37] text-base font-bold shadow-black/50 shadow-sm">Cadastre agora mesmo</Text>
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
