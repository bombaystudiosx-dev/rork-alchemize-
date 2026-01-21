import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { Platform, View, ActivityIndicator, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initDatabase } from "@/lib/database";
import { preloadCriticalImages } from "@/constants/image-config";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider, useAuth } from "@/contexts/auth-context";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (isLoading || isNavigating) {
      console.log('[Navigation] Waiting...', { isLoading, isNavigating });
      return;
    }

    const inAuthGroup = segments[0] === 'auth';
    console.log('[Navigation] Checking auth:', { isAuthenticated, inAuthGroup, segments: segments[0] });

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[Navigation] Redirecting to auth...');
      setIsNavigating(true);
      setTimeout(() => {
        router.replace('/auth' as any);
        setIsNavigating(false);
      }, 100);
    } else if (isAuthenticated && inAuthGroup) {
      console.log('[Navigation] Redirecting to home...');
      setIsNavigating(true);
      setTimeout(() => {
        router.replace('/');
        setIsNavigating(false);
      }, 100);
    }
  }, [isAuthenticated, isLoading, segments, router, isNavigating]);

  if (isLoading) {
    return (
      <View style={layoutStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="auth" options={{ title: "Welcome", headerShown: false }} />
      <Stack.Screen name="index" options={{ title: "Alchemize", headerShown: false }} />
      <Stack.Screen name="manifestation-board/index" options={{ title: "Manifestation Board" }} />
      <Stack.Screen name="manifestation-board/[id]" options={{ title: "Manifestation Detail" }} />
      <Stack.Screen name="manifestation-board/add" options={{ title: "Add Manifestation", presentation: "modal" }} />
      <Stack.Screen name="manifestation-board/slideshow" options={{ title: "Slideshow", headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="goals/index" options={{ title: "Goals" }} />
      <Stack.Screen name="goals/[id]" options={{ title: "Goal Detail" }} />
      <Stack.Screen name="goals/add" options={{ title: "Add Goal", presentation: "modal" }} />
      <Stack.Screen name="habits/index" options={{ title: "Habits" }} />
      <Stack.Screen name="habits/add" options={{ title: "Add Habit", presentation: "modal" }} />
      <Stack.Screen name="financial/index" options={{ title: "Financial Tracker" }} />
      <Stack.Screen name="financial/add" options={{ title: "Add Transaction", presentation: "modal" }} />
      <Stack.Screen name="calorie/index" options={{ title: "Calorie Tracker" }} />
      <Stack.Screen name="calorie/add" options={{ title: "Add Meal", presentation: "modal" }} />
      <Stack.Screen name="todos/index" options={{ title: "To-Do List" }} />
      <Stack.Screen name="todos/add" options={{ title: "Add Task", presentation: "modal" }} />
      <Stack.Screen name="gratitude/index" options={{ title: "Gratitude Journal" }} />
      <Stack.Screen name="gratitude/add" options={{ title: "Add Entry", presentation: "modal" }} />
      <Stack.Screen name="fitness/index" options={{ title: "Fitness" }} />
      <Stack.Screen name="fitness/add" options={{ title: "Add Workout", presentation: "modal" }} />
      <Stack.Screen name="calorie/scan" options={{ title: "Scan Food", presentation: "modal" }} />
      <Stack.Screen name="calorie/profile" options={{ title: "Profile", presentation: "modal" }} />
      <Stack.Screen name="calorie/meal-prep" options={{ title: "Meal Prep" }} />
      <Stack.Screen name="financial/notes" options={{ title: "Financial Notes" }} />
      <Stack.Screen name="affirmations/index" options={{ title: "Affirmations" }} />
      <Stack.Screen name="affirmations/[id]" options={{ title: "Edit Affirmation" }} />
      <Stack.Screen name="affirmations/add" options={{ title: "Add Affirmation", presentation: "modal" }} />
      <Stack.Screen name="affirmations/play" options={{ title: "Play Mode", headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="quick-add" options={{ title: "Quick Add", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[App] Starting initialization...');
        
        if (Platform.OS !== 'web') {
          try {
            await initDatabase();
            console.log('[App] Database initialized successfully');
          } catch (dbError) {
            console.warn('[App] Database init warning (continuing):', dbError);
          }
        } else {
          console.log('[App] Web platform - skipping database init');
        }
        
        try {
          await preloadCriticalImages();
          console.log('[App] Images preloaded successfully');
        } catch (imgError) {
          console.warn('[App] Image preload warning (continuing):', imgError);
        }
        
        console.log('[App] Initialization complete');
        setIsReady(true);
      } catch (error) {
        console.error('[App] Initialization error (recovering):', error);
        setIsReady(true);
      } finally {
        try {
          await SplashScreen.hideAsync();
          console.log('[App] Splash screen hidden');
        } catch (splashError) {
          console.warn('[App] Splash screen hide warning:', splashError);
        }
      }
    };
    
    initialize();
  }, []);

  if (!isReady) {
    return (
      <View style={layoutStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const layoutStyles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
});
