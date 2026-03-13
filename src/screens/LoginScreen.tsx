import "../../global.css";
import React, { useState, useRef } from 'react';
import { Text, View, ImageBackground, TextInput, TouchableOpacity, Dimensions, Alert, ActivityIndicator, KeyboardAvoidingView, ScrollView, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Eye, EyeOff } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

WebBrowser.maybeCompleteAuthSession();

// Flag global para evitar processar o token duas vezes
// (uma vez pelo DeepLink listener e outra pelo WebBrowser result)
let tokenAlreadyProcessed = false;

Linking.addEventListener('url', async (event) => {
    if (tokenAlreadyProcessed) return;
    if (event.url.includes('#access_token') || event.url.includes('?access_token')) {
        tokenAlreadyProcessed = true;
        try {
            const parts = event.url.split('#')[1] || event.url.split('?')[1];
            if (!parts) return;
            const params = new URLSearchParams(parts);
            const access_token = params.get('access_token');
            const refresh_token = params.get('refresh_token');
            if (access_token && refresh_token) {
                await supabase.auth.setSession({ access_token, refresh_token });
            }
        } catch (e) {
            console.error('❌ [DeepLink] Erro:', e);
        } finally {
            setTimeout(() => { tokenAlreadyProcessed = false; }, 3000);
        }
    }
});

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation }: { navigation: any }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function signInWithEmail() {
        if (!email || !password) {
            Alert.alert('Erro', 'Por favor, preencha email e senha.');
            return;
        }
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            Alert.alert('Erro no Login', error.message);
            setLoading(false);
        }
    }

    async function signInWithGoogle() {
        try {
            setLoading(true);
            tokenAlreadyProcessed = false;

            const redirectUrl = 'dramicaelavargas://auth/callback';

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: redirectUrl },
            });

            if (error) throw error;

            if (data?.url) {
                const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

                if (result.type === 'success' && !tokenAlreadyProcessed) {
                    const resultUrl = (result as any).url;
                    if (resultUrl) {
                        const parts = resultUrl.split('#')[1] || resultUrl.split('?')[1];
                        if (parts) {
                            const params = new URLSearchParams(parts);
                            const access_token = params.get('access_token');
                            const refresh_token = params.get('refresh_token');
                            if (access_token && refresh_token) {
                                tokenAlreadyProcessed = true;
                                await supabase.auth.setSession({ access_token, refresh_token });
                                setTimeout(() => { tokenAlreadyProcessed = false; }, 3000);
                            }
                        }
                    }
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
                <View className="absolute inset-0 bg-black/40" />
                <KeyboardAvoidingView behavior="padding" className="flex-1">
                    <SafeAreaView className="w-full flex-1 justify-end px-6 pb-12 z-10">
                        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>

                            <View className="mb-10 items-center">
                                <Image
                                    source={require('../../assets/assinatura.png')}
                                    style={{ width: '100%', height: 80 }}
                                    resizeMode="contain"
                                />
                            </View>

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

                                <View className="w-full flex-row justify-between items-center mt-2">
                                    <TouchableOpacity className="flex-row items-center gap-2" onPress={() => setRemember(!remember)}>
                                        <View className={`w-5 h-5 rounded border border-white items-center justify-center ${remember ? 'bg-[#C5A668] border-[#C5A668]' : 'bg-transparent'}`}>
                                            {remember && <View className="w-3 h-3 bg-white rounded-sm" />}
                                        </View>
                                        <Text className="text-white text-base font-medium">Lembrar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity>
                                        <Text className="text-white text-base font-medium">Esqueceu a senha?</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    className="w-full h-14 bg-[#D4AF37] rounded-xl items-center justify-center mt-6"
                                    activeOpacity={0.8}
                                    onPress={signInWithEmail}
                                    disabled={loading}
                                >
                                    {loading ? <ActivityIndicator color="black" /> : <Text className="text-black text-lg font-bold">Entrar</Text>}
                                </TouchableOpacity>

                                <View className="flex-row items-center my-2">
                                    <View className="flex-1 h-[1px] bg-gray-500/50" />
                                    <Text className="text-gray-400 px-4 font-medium">Ou continue com</Text>
                                    <View className="flex-1 h-[1px] bg-gray-500/50" />
                                </View>

                                <TouchableOpacity
                                    className="w-full h-14 bg-white rounded-xl flex-row items-center justify-center gap-3"
                                    activeOpacity={0.8}
                                    onPress={signInWithGoogle}
                                    disabled={loading}
                                >
                                    <Image
                                        source={require('../../assets/gmail.png')}
                                        style={{ width: 24, height: 24 }}
                                        resizeMode="contain"
                                    />
                                    <Text className="text-gray-800 text-lg font-bold">Google</Text>
                                </TouchableOpacity>
                            </View>

                            <View className="flex-row items-center mt-10 gap-1 mb-4 justify-center">
                                <Text className="text-gray-300 text-base">Não tem acesso?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text className="text-[#D4AF37] text-base font-bold"> Cadastre agora mesmo</Text>
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