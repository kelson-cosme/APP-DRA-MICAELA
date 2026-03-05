import "./global.css";
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View } from 'react-native';
import { supabase } from './src/lib/supabase';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import TabNavigator from './src/navigation/TabNavigator';
import ProfileScreen from './src/screens/ProfileScreen';
import VideoPlayerScreen from './src/screens/Content/VideoPlayerScreen';
import DownloadsScreen from './src/screens/DownloadsScreen';
import { StatusBar } from 'expo-status-bar';
import NotificationsScreen from './src/screens/NotificationsScreen';
import SplashScreen from './src/components/SplashScreen';

import { UserProvider } from './src/contexts/UserContext';

const Stack = createNativeStackNavigator();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [authReady, setAuthReady] = useState(false);
  const [splashFinished, setSplashFinished] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthReady(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  const showSplash = !authReady || !splashFinished;

  return (
    <UserProvider>
      <View style={{ flex: 1 }}>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!authReady ? (
              <Stack.Screen name="Init" component={() => <View style={{ flex: 1, backgroundColor: '#1a1a1a' }} />} />
            ) : !session ? (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
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
        {showSplash && (
          <SplashScreen onAnimationComplete={() => setSplashFinished(true)} />
        )}
      </View>
    </UserProvider>
  );
}
