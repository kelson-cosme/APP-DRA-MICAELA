import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CommunityFeedScreen from '../screens/Community/CommunityFeedScreen';
import CreatePostScreen from '../screens/Community/CreatePostScreen';
import PostDetailScreen from '../screens/Community/PostDetailScreen';

const Stack = createNativeStackNavigator();

export default function CommunityStackNavigator() {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="CommunityFeed" component={CommunityFeedScreen} />
            <Stack.Screen name="CreatePost" component={CreatePostScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
        </Stack.Navigator>
    );
}
