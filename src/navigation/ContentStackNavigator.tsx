import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ContentHomeScreen from '../screens/Content/ContentHomeScreen';
import ContentDetailScreen from '../screens/Content/ContentDetailScreen';
import VideoPlayerScreen from '../screens/Content/VideoPlayerScreen';

const Stack = createNativeStackNavigator();

export default function ContentStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="ContentHome" component={ContentHomeScreen} />
            <Stack.Screen name="ContentDetail" component={ContentDetailScreen} />
        </Stack.Navigator>
    );
}
