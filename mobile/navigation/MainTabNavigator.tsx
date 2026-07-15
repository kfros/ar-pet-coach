import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import RoutinesScreen from '../screens/RoutinesScreen';
import { SoundsScreen, ProgressScreen } from '../screens/TemporaryTabScreens';
import { COLORS } from '../constants/Theme';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarLabelPosition: 'below-icon',
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textSecondary,
                tabBarStyle: {
                    backgroundColor: COLORS.background,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                },
            }}
        >
            <Tab.Screen
                name="Home"
                component={DashboardScreen}
                options={{
                    tabBarLabel: 'Home',
                    tabBarButtonTestID: 'main-tab-home',
                    tabBarAccessibilityLabel: 'Home tab',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'home' : 'home-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="Routines"
                component={RoutinesScreen}
                options={{
                    tabBarLabel: 'Routines',
                    tabBarButtonTestID: 'main-tab-routines',
                    tabBarAccessibilityLabel: 'Routines tab',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'list' : 'list-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="Sounds"
                component={SoundsScreen}
                options={{
                    tabBarLabel: 'Sounds',
                    tabBarButtonTestID: 'main-tab-sounds',
                    tabBarAccessibilityLabel: 'Sounds tab',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'musical-notes' : 'musical-notes-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tab.Screen
                name="Progress"
                component={ProgressScreen}
                options={{
                    tabBarLabel: 'Progress',
                    tabBarButtonTestID: 'main-tab-progress',
                    tabBarAccessibilityLabel: 'Progress tab',
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons
                            name={focused ? 'stats-chart' : 'stats-chart-outline'}
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tab.Navigator>
    );
}
