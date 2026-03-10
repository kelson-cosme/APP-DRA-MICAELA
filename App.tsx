import "./global.css";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TabNavigator from './src/navigation/TabNavigator';
import ProfileScreen from './src/screens/ProfileScreen';
import VideoPlayerScreen from './src/screens/Content/VideoPlayerScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import { StatusBar } from 'expo-status-bar';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SplashScreen from './src/components/SplashScreen';
import CompleteProfileScreen from './src/screens/CompleteProfileScreen';
import { usePushNotifications } from './src/hooks/usePushNotifications';

import { UserProvider, useUser } from './src/contexts/UserContext';
import { supabase } from './src/lib/supabase';

const Stack = createNativeStackNavigator();

// Tela em branco — componente separado para evitar warning de inline function
const BlankScreen = () => <View style={{ flex: 1, backgroundColor: '#1a1a1a' }} />;

function AppInner() {
  // splashFinished controla se a animação inicial já foi exibida
  // Uma vez true, nunca volta para false — a splash não reaparece após login/logout
  const [splashFinished, setSplashFinished] = useState(false);

  const handleSplashFinish = useCallback(() => {
    setSplashFinished(true);
  }, []);

  const { profile, loading: profileLoading } = useUser();
  usePushNotifications();

  // isReady: contexto terminou de carregar (INITIAL_SESSION processado)
  const isReady = !profileLoading;

  // hasSession: carregou E existe perfil
  const hasSession = isReady && profile !== null;

  // Precisa completar perfil se logado mas sem nome
  const needsProfileCompletion = hasSession && !profile?.full_name;

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isReady ? (
            // Contexto ainda carregando — tela em branco (splash cobre)
            <Stack.Screen name="Init" component={BlankScreen} />
          ) : !hasSession ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen as any} />
            </>
          ) : needsProfileCompletion ? (
            <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
          ) : (
            <>
              <Stack.Screen name="HomeTabs" component={TabNavigator} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
              <Stack.Screen name="Downloads" component={DownloadsScreen} />
              <Stack.Screen name="Notifications" component={NotificationsScreen} />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/*
        Splash aparece APENAS enquanto splashFinished=false.
        Isso ocorre só na abertura do app. Após handleSplashFinish ser chamado,
        splashFinished nunca volta a false — login/logout não reexibem a splash.
      */}
      {!splashFinished && (
        <SplashScreen onAnimationComplete={handleSplashFinish} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <UserProvider>
      <AppInner />
    </UserProvider>
  );
}