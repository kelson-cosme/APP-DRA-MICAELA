import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Play, MessageCircle, Users, Calendar } from 'lucide-react-native';
import HomeScreen from '../screens/HomeScreen';
import ContentStackNavigator from './ContentStackNavigator';
import CommunityStackNavigator from './CommunityStackNavigator';
import EventsScreen from '../screens/Events/EventsScreen';
import EventsStackNavigator from './EventsStackNavigator';
import IAChatScreen from '../screens/IAChatScreen';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

// Placeholder screens
const PlaceholderScreen = ({ name }: { name: string }) => (
    <View className="flex-1 items-center justify-center bg-[#2C2926]">
        <Text className="text-white">{name}</Text>
    </View>
);

export default function TabNavigator() {
    const insets = useSafeAreaInsets();
    const tabBarHeight = 70 + (insets.bottom > 0 ? insets.bottom - 10 : 0);

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    backgroundColor: '#FFFFFF',
                    height: tabBarHeight,
                    borderTopLeftRadius: 30,
                    borderTopRightRadius: 30,
                    position: 'absolute',
                    bottom: 0,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
                    paddingTop: 10,
                    borderTopWidth: 0,
                    elevation: 5,
                },
                tabBarActiveTintColor: '#8B4513',
                tabBarInactiveTintColor: '#A0A0A0',
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontFamily: 'sans-serif',
                },
            }}
        >
            <Tab.Screen
                name="Inicio"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color }) => <Home color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Conteudo"
                component={ContentStackNavigator}
                options={{
                    tabBarIcon: ({ color }) => <Play color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Mica"
                component={IAChatScreen}
                options={{
                    tabBarIcon: ({ color }) => <MessageCircle color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Comunidade"
                component={CommunityStackNavigator}
                options={{
                    tabBarIcon: ({ color }) => <Users color={color} size={24} />,
                }}
            />
            <Tab.Screen
                name="Eventos"
                component={EventsStackNavigator}
                options={{
                    tabBarIcon: ({ color }) => <Calendar color={color} size={24} />,
                }}
            />
        </Tab.Navigator>
    );
}
