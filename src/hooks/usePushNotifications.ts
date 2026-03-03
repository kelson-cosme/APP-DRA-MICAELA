import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

// Comportamento padrão da notificação (aparecer com som no topo da tela)
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

export function usePushNotifications() {
    const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
    const [notification, setNotification] = useState<Notifications.Notification | null>(null);
    const notificationListener = useRef<Notifications.EventSubscription>();
    const responseListener = useRef<Notifications.EventSubscription>();

    useEffect(() => {
        registerForPushNotificationsAsync()
            .then(token => {
                if (token) {
                    setExpoPushToken(token);
                    saveTokenToSupabase(token);
                }
            })
            .catch(error => console.error("Erro ao registrar push token:", error));

        // Ouvinte para notificação recebida enquanto o app está aberto (foreground)
        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        // Ouvinte para caso o usuário clique na notificação 
        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Usuário clicou na notificação:', response);
            // Aqui você poderia rotear o app para a tela de notificações dependendo do payload
        });

        return () => {
            if (notificationListener.current) {
                Notifications.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                Notifications.removeNotificationSubscription(responseListener.current);
            }
        };
    }, []);

    const saveTokenToSupabase = async (token: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return; // Só salva se tiver logado

            // Usa a RPC para registrar o token, evitando erros de RLS quando
            // outro usuário loga no mesmo dispositivo
            const { error } = await supabase
                .rpc('register_push_token', {
                    push_token: token
                });

            if (error) {
                console.error('Falha ao salvar token no supabase:', error);
            }
        } catch (e) {
            console.error('Falha na conexão:', e);
        }
    };

    return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            Alert.alert('Falha', 'Não conseguimos obter permissão para Push Notifications.');
            return;
        }

        // Obter projectId do app.json (via EAS config)
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        if (!projectId) {
            console.warn("Projeto não tem EAS Project ID configurado.");
        }

        token = (await Notifications.getExpoPushTokenAsync({
            projectId,
        })).data;

        console.log("Push Token gerado:", token);
    } else {
        console.log("Must use physical device for Push Notifications");
    }

    return token;
}
