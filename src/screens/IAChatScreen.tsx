import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard, Image, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

// Tipo de mensagem esperado pela OpenAI / nossa UI
type Message = {
    role: 'user' | 'assistant' | 'system';
    content: string;
};

export default function IAChatScreen() {
    const navigation = useNavigation();

    // Inicia com uma mensagem de saudação da IA
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Olá! Sou a IA assistente da Dra. Micaela Vargas. Como posso ajudar você hoje?' }
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [keyboardVisible, setKeyboardVisible] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    // Monitora a abertura do teclado
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            () => setKeyboardVisible(true)
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => setKeyboardVisible(false)
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    // Auto-scroll para o final quando houver novas mensagens
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    const QUICK_REPLIES = [
        "Mica, posso desabafar um pouco com você?",
        "Oi, Mica, estou passando por alguns sintomas e queria conversar com você.",
        "Preciso te contar como tenho me sentido esses dias…"
    ];

    const sendMessage = async (textToSend?: string) => {
        const text = typeof textToSend === 'string' ? textToSend : inputText;
        if (!text.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: text.trim() };

        // Adiciona a mensagem do usuário na tela e limpa o input
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        if (typeof textToSend !== 'string' || textToSend === inputText) {
            setInputText('');
        }
        setIsLoading(true);

        try {
            // Chamando a Edge Function do Supabase
            const { data, error } = await supabase.functions.invoke('chat-with-dra', {
                body: { messages: newMessages },
            });

            if (error) throw error;

            if (data?.message) {
                // Adiciona a resposta da IA
                setMessages(prev => [...prev, { role: 'assistant', content: data.message.content }]);
            } else if (data?.error) {
                setMessages(prev => [...prev, { role: 'assistant', content: 'Desculpe, ' + data.error }]);
            }
        } catch (error: any) {
            console.error('Erro ao enviar mensagem:', error);
            setMessages(prev => [
                ...prev,
                { role: 'assistant', content: 'Desculpe, não consegui processar sua mensagem no momento. Tente novamente mais tarde.' }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const renderTextWithLinks = (text: string) => {
        // Expressão regular para encontrar URLs
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);

        return parts.map((part, index) => {
            if (part.match(urlRegex)) {
                // Se for um link de whatsapp da Dra. Micaela, mostramos o botão
                if (part.includes('wa.me')) {
                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={() => Linking.openURL(part)}
                            className="bg-[#25D366] flex-row items-center px-4 py-3 rounded-full shadow-sm mt-3 mb-1 active:opacity-80"
                        >
                            <Text className="text-white font-bold text-base text-center w-full">
                                Falar no WhatsApp
                            </Text>
                        </TouchableOpacity>
                    );
                }

                // Outro tipo de link
                return (
                    <Text
                        key={index}
                        className="text-[#60A5FA] underline text-base font-medium"
                        onPress={() => Linking.openURL(part)}
                    >
                        {part}
                    </Text>
                );
            }
            return <Text key={index} className="text-white text-base">{part}</Text>;
        });
    };

    const renderMessage = ({ item }: { item: Message }) => {
        const isUser = item.role === 'user';
        return (
            <View className={`mb-4 flex-row ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                    <View className="w-8 h-8 rounded-full bg-[#8B4513] items-center justify-center mr-2 overflow-hidden mt-1">
                        <Image source={require('../../assets/mica.png')} className="w-full h-full" resizeMode="cover" />
                    </View>
                )}
                <View
                    className={`max-w-[80%] rounded-2xl p-4 ${isUser
                        ? 'bg-[#8B4513] rounded-tr-none'
                        : 'bg-[#333333] rounded-tl-none'
                        }`}
                >
                    <View className="flex-col">
                        {renderTextWithLinks(item.content)}
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-[#1a1a1a]">
            {/* Header */}
            <View className="flex-row items-center p-4 border-b border-[#333333]">
                <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
                    <ArrowLeft color="#FFFFFF" size={24} />
                </TouchableOpacity>
                <View>
                    <Text className="text-white text-xl font-bold">IA Mica</Text>
                    <Text className="text-[#A0A0A0] text-sm">Assistente Virtual</Text>
                </View>
            </View>

            {/* Chat Area */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={renderMessage}
                    contentContainerStyle={{ padding: 16 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                />

                {/* Input Area */}
                <View className={`p-4 border-t border-[#333333] bg-[#222222] min-h-24 ${keyboardVisible ? 'pb-4' : 'pb-[90px]'}`}>
                    {/* Quick Replies (Chips) */}
                    {messages.length === 1 && (
                        <View className="mb-4">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                {QUICK_REPLIES.map((reply, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => sendMessage(reply)}
                                        className="bg-[#333333] rounded-full px-4 py-2 mr-2 border border-[#444444]"
                                    >
                                        <Text className="text-white text-sm">{reply}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View className="flex-row items-end bg-[#1a1a1a] rounded-3xl border border-[#333333] pl-4 pr-2 py-2">
                        <TextInput
                            className="flex-1 text-white text-base pt-2 max-h-32 min-h-10"
                            placeholder="Escreva sua dúvida..."
                            placeholderTextColor="#666666"
                            multiline
                            value={inputText}
                            onChangeText={setInputText}
                        />
                        <TouchableOpacity
                            onPress={() => sendMessage()}
                            disabled={isLoading || !inputText.trim()}
                            className={`w-10 h-10 rounded-full items-center justify-center mb-1 ml-2 ${inputText.trim() && !isLoading ? 'bg-[#8B4513]' : 'bg-[#444444]'
                                }`}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Send color={inputText.trim() ? "#FFFFFF" : "#888888"} size={18} style={{ marginLeft: 2 }} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
