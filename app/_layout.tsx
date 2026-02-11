import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ThemeProvider } from "@/contexts/theme-context";
import { AuthProvider } from "@/contexts/auth-context";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerBackVisible: true, headerStyle: { backgroundColor: '#0a0a0a' }, headerTintColor: '#fff' }}>
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
      <Stack.Screen name="financial/income-add" options={{ title: "Add Income", presentation: "modal" }} />
      <Stack.Screen name="financial/expense-edit" options={{ title: "Edit Expense" }} />
      <Stack.Screen name="affirmations/index" options={{ title: "Affirmations" }} />
      <Stack.Screen name="affirmations/[id]" options={{ title: "Edit Affirmation" }} />
      <Stack.Screen name="affirmations/add" options={{ title: "Add Affirmation", presentation: "modal" }} />
      <Stack.Screen name="affirmations/play" options={{ title: "Play Mode", headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
      <Stack.Screen name="quick-add" options={{ title: "Quick Add", presentation: "modal" }} />
      <Stack.Screen name="appointments/index" options={{ title: "Appointments" }} />
      <Stack.Screen name="appointments/add" options={{ title: "Add Appointment", presentation: "modal" }} />
      <Stack.Screen name="pwa-install-prompt" options={{ title: "Install App", presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <GestureHandlerRootView style={layoutStyles.root}>
            <RootLayoutNav />
          </GestureHandlerRootView>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

const layoutStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
