import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EventsScreen from '../screens/Events/EventsScreen';
import EventDetailScreen from '../screens/Events/EventDetailScreen';

const Stack = createNativeStackNavigator();

export default function EventsStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="EventsFeed" component={EventsScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        </Stack.Navigator>
    );
}
