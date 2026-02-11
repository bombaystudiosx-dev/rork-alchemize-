import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Text, Animated, Platform, Modal, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { Settings, ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, ChevronDown, ChevronUp, Moon } from 'lucide-react-native';
import { ASSETS } from '@/constants/assets';
import { OPTIMIZED_IMAGE_URLS } from '@/constants/image-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/contexts/theme-context';
import PWAInstallPrompt from './pwa-install-prompt';
import { getDatabase } from '@/lib/database';
import { isSameLocalDay, localDateKey, startOfLocalDay } from '@/lib/date-utils';
import { useAuth } from '@/contexts/auth-context';

const FEATURES_VISIBILITY_KEY = '@alchemize_features_visibility';
const CALENDAR_VISIBILITY_KEY = '@alchemize_calendar_visibility';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_Y_OFFSET = 80 as const;
const CARD_HORIZONTAL_PADDING = 40 as const;
const CARD_WIDTH = SCREEN_WIDTH - (CARD_HORIZONTAL_PADDING * 2);
const CARD_HEIGHT = 460;

interface FeatureCard {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  route: string;
}

interface FeatureVisibility {
  [key: string]: boolean;
}

interface CalendarEvent {
  date: string;
  type: string;
  count: number;
  title?: string;
  deepLink?: string;
}

const ALL_FEATURE_CARDS: FeatureCard[] = [
  {
    id: 'manifestation-board',
    title: 'Manifestation Board',
    subtitle: 'Visualize/feel your dreams until your reality becomes a reflection',
    image: ASSETS.cardManifestationBoard,
    route: '/manifestation-board',
  },
  {
    id: 'affirmations',
    title: 'Affirmations',
    subtitle: 'Reprogram your subconscious mind with powerful affirmations',
    image: OPTIMIZED_IMAGE_URLS.affirmationsCard,
    route: '/affirmations',
  },
  {
    id: 'goals',
    title: 'Set Goals',
    subtitle: 'Be intentional and strategic with your life',
    image: OPTIMIZED_IMAGE_URLS.goalsCard,
    route: '/goals',
  },
  {
    id: 'habits',
    title: 'Habit Tracker',
    subtitle: 'Condition yourself for greatness',
    image: OPTIMIZED_IMAGE_URLS.habitsCard,
    route: '/habits',
  },
  {
    id: 'financial',
    title: 'Financial',
    subtitle: 'Organize Finances',
    image: OPTIMIZED_IMAGE_URLS.financialCard,
    route: '/financial',
  },
  {
    id: 'calorie',
    title: 'Calorie',
    subtitle: 'AI food recognition, macros & meal planning',
    image: OPTIMIZED_IMAGE_URLS.calorieCard,
    route: '/calorie',
  },
  {
    id: 'todos',
    title: 'To-Do',
    subtitle: 'Shape your day, one small win at a time.',
    image: OPTIMIZED_IMAGE_URLS.todosCard,
    route: '/todos',
  },
  {
    id: 'gratitude',
    title: 'Gratitude',
    subtitle: 'Gratitude is the ability to experience life as a gift.',
    image: OPTIMIZED_IMAGE_URLS.gratitudeCard,
    route: '/gratitude',
  },
  {
    id: 'fitness',
    title: 'Fitness',
    subtitle: 'Transform your body and energy',
    image: OPTIMIZED_IMAGE_URLS.fitnessCard,
    route: '/fitness',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    subtitle: 'Organize your time with intention',
    image: OPTIMIZED_IMAGE_URLS.appointmentsCard,
    route: '/appointments',
  },
];

function getWeekStart(date: Date): Date {
  const d = startOfLocalDay(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return startOfLocalDay(new Date(d.getFullYear(), d.getMonth(), diff));
}

function getWeekDays(startDate: Date): Date[] {
  const start = startOfLocalDay(startDate);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(startOfLocalDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
  }
  return days;
}

interface UnifiedCalendarProps {
  events: CalendarEvent[];
  selectedWeekStart: Date;
  onWeekChange: (date: Date) => void;
  onDayPress: (date: Date) => void;
  isDark?: boolean;
  onEventPress?: (route: string) => void;
  getEventTitle?: (type: string) => string;
  getEventColor?: (type: string) => string;
}

function UnifiedCalendar({ events, selectedWeekStart, onWeekChange, onDayPress, isDark = false, onEventPress, getEventTitle, getEventColor }: UnifiedCalendarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const weekDays = getWeekDays(selectedWeekStart);
  const [todayTick, setTodayTick] = useState(0);

  const today = startOfLocalDay(new Date());
  void todayTick;

  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 10);
    const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());
    const timeout = setTimeout(() => {
      setTodayTick((t) => t + 1);
    }, delay);
    return () => clearTimeout(timeout);
  }, [todayTick]);
  
  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    onWeekChange(newDate);
  };
  
  const goToNextWeek = () => {
    const newDate = new Date(selectedWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    onWeekChange(newDate);
  };
  
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = localDateKey(date);
    return events.filter((e) => e.date === dateStr);
  };
  
  const getDayColor = (dayEvents: CalendarEvent[]): string => {
    if (dayEvents.length === 0) return 'transparent';
    const types = dayEvents.map(e => e.type);
    if (types.includes('gratitude')) return '#fbbf24';
    if (types.includes('workout')) return '#10b981';
    if (types.includes('financial')) return '#06b6d4';
    if (types.includes('habit')) return '#8b5cf6';
    if (types.includes('task')) return '#f59e0b';
    if (types.includes('goal')) return '#ec4899';
    if (types.includes('appointment')) return '#ef4444';
    if (types.includes('manifestation')) return '#d946ef';
    if (types.includes('affirmation')) return '#a78bfa';
    if (types.includes('meal')) return '#f97316';
    return '#6366f1';
  };
  
  const calStyle = isDark ? calendarStyles.dark : calendarStyles.light;
  
  const allWeekEvents = weekDays.flatMap((day) => {
    const dateStr = localDateKey(day);
    return getEventsForDate(day).map((event) => ({
      ...event,
      dateStr,
      dayOfWeek: day.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: day.getDate(),
    }));
  });

  return (
    <View style={calendarStyles.container}>
      <View style={calendarStyles.header}>
        <TouchableOpacity onPress={goToPreviousWeek} style={calendarStyles.navButton}>
          <ChevronLeft size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
        </TouchableOpacity>
        <Text style={[calendarStyles.monthText, calStyle.monthText]}>
          {selectedWeekStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
        <View style={calendarStyles.headerRight}>
          <TouchableOpacity onPress={goToNextWeek} style={calendarStyles.navButton}>
            <ChevronRight size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={calendarStyles.expandButton}>
            {isExpanded ? (
              <ChevronUp size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
            ) : (
              <ChevronDown size={20} color={isDark ? '#a78bfa' : '#8b5cf6'} />
            )}
          </TouchableOpacity>
        </View>
      </View>
      <View style={calendarStyles.daysContainer}>
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(day);
          const isToday = isSameLocalDay(day, today);
          const dayColor = getDayColor(dayEvents);
          
          return (
            <TouchableOpacity key={index} style={calendarStyles.dayItem} onPress={() => onDayPress(day)} activeOpacity={0.7}>
              <Text style={[calendarStyles.dayName, calStyle.dayName]}>
                {day.toLocaleDateString('en-US', { weekday: 'narrow' })}
              </Text>
              <View style={[
                calendarStyles.dayNumber,
                isToday && (isDark ? calendarStyles.todayDark : calendarStyles.today),
                dayEvents.length > 0 && { borderColor: dayColor, borderWidth: 2 }
              ]}>
                <Text style={[
                  calendarStyles.dayText,
                  calStyle.dayText,
                  isToday && calendarStyles.todayText
                ]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={calendarStyles.eventDots}>
                {dayEvents.slice(0, 3).map((event, i) => (
                  <View
                    key={i}
                    style={[calendarStyles.eventDot, { backgroundColor: getDayColor([event]) }]}
                  />
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {isExpanded && (
        <View style={calendarStyles.expandedSection}>
          <View style={calendarStyles.expandedHeader}>
            <Text style={[calendarStyles.expandedTitle, calStyle.expandedTitle]}>
              Week Activities ({allWeekEvents.length})
            </Text>
          </View>
          <ScrollView 
            style={calendarStyles.expandedScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {allWeekEvents.length === 0 ? (
              <View style={calendarStyles.expandedEmpty}>
                <Text style={[calendarStyles.expandedEmptyText, calStyle.expandedEmptyText]}>
                  No activities this week
                </Text>
              </View>
            ) : (
              allWeekEvents.map((event, index) => {
                const eventColor = getEventColor ? getEventColor(event.type) : getDayColor([event]);
                const eventTitle = getEventTitle ? getEventTitle(event.type) : event.type;
                
                return (
                  <TouchableOpacity
                    key={`${event.dateStr}-${event.type}-${index}`}
                    style={calendarStyles.expandedEventItem}
                    onPress={() => {
                      if (onEventPress) {
                        const routes: { [key: string]: string } = {
                          financial: '/financial',
                          gratitude: '/gratitude',
                          task: '/todos',
                          appointment: '/appointments',
                          goal: '/goals',
                          workout: '/fitness',
                          habit: '/habits',
                          manifestation: '/manifestation-board',
                          affirmation: '/affirmations',
                          meal: '/calorie',
                        };
                        onEventPress(routes[event.type] || '/');
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[calendarStyles.expandedEventIndicator, { backgroundColor: eventColor }]} />
                    <View style={calendarStyles.expandedEventContent}>
                      <View style={calendarStyles.expandedEventHeader}>
                        <Text style={[calendarStyles.expandedEventTitle, calStyle.expandedEventTitle]}>
                          {eventTitle}
                        </Text>
                        <Text style={[calendarStyles.expandedEventDate, calStyle.expandedEventDate]}>
                          {event.dayOfWeek} {event.dayNumber}
                        </Text>
                      </View>
                      <Text style={[calendarStyles.expandedEventCount, calStyle.expandedEventCount]}>
                        {event.count} {event.count === 1 ? 'entry' : 'entries'}
                      </Text>
                    </View>
                    <ChevronRight size={16} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)'} />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [featureCards, setFeatureCards] = useState<FeatureCard[]>(ALL_FEATURE_CARDS);
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(true);
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  const moonFloat = useRef(new Animated.Value(0)).current;
  const usernameGlow = useRef(new Animated.Value(0)).current;
  const candleFlickers = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;
  const starTwinkles = useRef(
    Array.from({ length: 8 }, () => new Animated.Value(0.3))
  ).current;

  const loadCalendarEvents = useCallback(async () => {
    if (Platform.OS === 'web') return;
    
    try {
      const db = getDatabase();
      if (!db) {
        return;
      }
      
      const startDate = new Date(selectedWeekStart);
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date(selectedWeekStart);
      endDate.setDate(endDate.getDate() + 60);
      
      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();
      
      const transactions = await db.getAllAsync<any>(
        'SELECT date FROM transactions WHERE date >= ? AND date <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const gratitude = await db.getAllAsync<any>(
        'SELECT entryDate FROM gratitude_entries WHERE entryDate >= ? AND entryDate <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const tasks = await db.getAllAsync<any>(
        'SELECT dueDate FROM tasks WHERE dueDate IS NOT NULL AND dueDate >= ? AND dueDate <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const appointments = await db.getAllAsync<any>(
        'SELECT date FROM appointments WHERE date >= ? AND date <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const goals = await db.getAllAsync<any>(
        'SELECT targetDate FROM goals WHERE targetDate IS NOT NULL AND targetDate >= ? AND targetDate <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const workouts = await db.getAllAsync<any>(
        'SELECT date FROM workouts WHERE date >= ? AND date <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const habitCompletions = await db.getAllAsync<any>(
        'SELECT completionDate FROM habit_completions WHERE completionDate >= ? AND completionDate <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const manifestations = await db.getAllAsync<any>(
        'SELECT createdAt FROM manifestations WHERE createdAt >= ? AND createdAt <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const affirmations = await db.getAllAsync<any>(
        'SELECT createdAt FROM affirmations WHERE createdAt >= ? AND createdAt <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const meals = await db.getAllAsync<any>(
        'SELECT loggedAt FROM food_logs WHERE loggedAt >= ? AND loggedAt <= ?',
        [startTimestamp, endTimestamp]
      );
      
      const eventMap = new Map<string, { [key: string]: number }>();
      
      const addEvent = (timestamp: number, type: string) => {
        const dateStr = localDateKey(new Date(timestamp));
        if (!eventMap.has(dateStr)) {
          eventMap.set(dateStr, {});
        }
        const dayEvents = eventMap.get(dateStr)!;
        dayEvents[type] = (dayEvents[type] || 0) + 1;
      };
      
      transactions.forEach(t => addEvent(t.date, 'financial'));
      gratitude.forEach(g => addEvent(g.entryDate, 'gratitude'));
      tasks.forEach(t => addEvent(t.dueDate, 'task'));
      appointments.forEach(a => addEvent(a.date, 'appointment'));
      goals.forEach(g => addEvent(g.targetDate, 'goal'));
      workouts.forEach(w => addEvent(w.date, 'workout'));
      habitCompletions.forEach(h => addEvent(h.completionDate, 'habit'));
      manifestations.forEach(m => addEvent(m.createdAt, 'manifestation'));
      affirmations.forEach(a => addEvent(a.createdAt, 'affirmation'));
      meals.forEach(m => addEvent(m.loggedAt, 'meal'));
      
      const allEvents: CalendarEvent[] = [];
      eventMap.forEach((types, date) => {
        Object.keys(types).forEach(type => {
          allEvents.push({ date, type, count: types[type] });
        });
      });
      
      setCalendarEvents(allEvents);
    } catch (error) {
      if (error instanceof Error && error.message !== 'Database not initialized') {
        // Silent fail for calendar events - non-critical
      }
    }
  }, [selectedWeekStart]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const moonAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(moonFloat, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(moonFloat, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    const usernameAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(usernameGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(usernameGlow, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );

    const candleAnimations = candleFlickers.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 800 + (index * 100),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800 + (index * 100),
            useNativeDriver: true,
          }),
        ])
      );
    });

    const starAnimations = starTwinkles.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 300),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
    });

    moonAnimation.start();
    usernameAnimation.start();
    candleAnimations.forEach(anim => anim.start());
    starAnimations.forEach(anim => anim.start());

    return () => {
      moonAnimation.stop();
      usernameAnimation.stop();
      candleAnimations.forEach(anim => anim.stop());
      starAnimations.forEach(anim => anim.stop());
    };
  }, [moonFloat, usernameGlow, candleFlickers, starTwinkles]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return '⚡ GOOD MORNING ⚡';
    if (hour < 18) return '⚡ GOOD AFTERNOON ⚡';
    return '⚡ GOOD EVENING ⚡';
  };

  const formatTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const loadFeatureVisibility = async () => {
    try {
      const stored = await AsyncStorage.getItem(FEATURES_VISIBILITY_KEY);
      if (stored && typeof stored === 'string' && stored.startsWith('{')) {
        try {
          const visibility = JSON.parse(stored) as FeatureVisibility;
          const visibleCards = ALL_FEATURE_CARDS.filter(
            card => visibility[card.id] !== false
          );
          setFeatureCards(visibleCards);
        } catch {
          await AsyncStorage.removeItem(FEATURES_VISIBILITY_KEY);
          setFeatureCards(ALL_FEATURE_CARDS);
        }
      } else {
        setFeatureCards(ALL_FEATURE_CARDS);
      }
    } catch {
      setFeatureCards(ALL_FEATURE_CARDS);
    }
  };

  const loadCalendarVisibility = async () => {
    try {
      const stored = await AsyncStorage.getItem(CALENDAR_VISIBILITY_KEY);
      if (stored !== null) {
        setCalendarVisible(stored === 'true');
      }
    } catch {
      // Use default value
    }
  };

  useEffect(() => {
    loadFeatureVisibility();
    loadCalendarVisibility();
    loadCalendarEvents();
  }, [loadCalendarEvents]);
  
  useEffect(() => {
    loadCalendarEvents();
  }, [loadCalendarEvents, selectedWeekStart]);

  useFocusEffect(
    React.useCallback(() => {
      loadFeatureVisibility();
      loadCalendarVisibility();
      loadCalendarEvents();
    }, [loadCalendarEvents])
  );

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
  };

  const handleCardPress = (route: string) => {
    router.push(route as any);
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    setDayModalVisible(true);
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = localDateKey(date);
    return calendarEvents.filter((e) => e.date === dateStr);
  };

  const getEventTitle = (type: string): string => {
    const titles: { [key: string]: string } = {
      financial: 'Financial Activity',
      gratitude: 'Gratitude Entry',
      task: 'Task',
      appointment: 'Appointment',
      goal: 'Goal Milestone',
      workout: 'Workout',
      habit: 'Habit Completion',
      manifestation: 'Manifestation',
      affirmation: 'Affirmation',
      meal: 'Meal Log',
    };
    return titles[type] || type;
  };

  const getEventRoute = (type: string): string => {
    const routes: { [key: string]: string } = {
      financial: '/financial',
      gratitude: '/gratitude',
      task: '/todos',
      appointment: '/appointments',
      goal: '/goals',
      workout: '/fitness',
      habit: '/habits',
      manifestation: '/manifestation-board',
      affirmation: '/affirmations',
      meal: '/calorie',
    };
    return routes[type] || '/';
  };

  const getEventColor = (type: string): string => {
    const colors: { [key: string]: string } = {
      financial: '#06b6d4',
      gratitude: '#fbbf24',
      task: '#f59e0b',
      appointment: '#ef4444',
      goal: '#ec4899',
      workout: '#10b981',
      habit: '#8b5cf6',
      manifestation: '#d946ef',
      affirmation: '#a78bfa',
      meal: '#f97316',
    };
    return colors[type] || '#6366f1';
  };

  if (theme === 'cosmic') {
    return <OrbitalHomeScreen 
      featureCards={featureCards} 
      onCardPress={handleCardPress} 
      router={router} 
      calendarEvents={calendarEvents} 
      selectedWeekStart={selectedWeekStart} 
      onWeekChange={setSelectedWeekStart}
      onDayPress={handleDayPress}
      selectedDate={selectedDate}
      dayModalVisible={dayModalVisible}
      setDayModalVisible={setDayModalVisible}
      getEventsForDate={getEventsForDate}
      getEventTitle={getEventTitle}
      getEventRoute={getEventRoute}
      getEventColor={getEventColor}
      calendarVisible={calendarVisible}
    />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1a0b2e', '#2d1b4e', '#3d2463', '#1a0b2e']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <View style={styles.decorativeElements}>
        <Animated.View 
          style={[
            styles.moon, 
            { 
              top: 120, 
              left: -40,
              transform: [{
                translateY: moonFloat.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                })
              }]
            }
          ]}
        >
          <LinearGradient
            colors={['#4a90e2', '#6fb1ff']}
            style={styles.moonGradient}
          >
            <View style={styles.moonCrescent} />
          </LinearGradient>
        </Animated.View>
        
        {[...Array(8)].map((_, i) => (
          <Animated.View
            key={`star-${i}`}
            style={[
              styles.star,
              {
                top: 100 + Math.random() * 300,
                left: Math.random() * SCREEN_WIDTH,
                opacity: starTwinkles[i],
              },
            ]}
          />
        ))}
        
        {[...Array(6)].map((_, i) => {
          const candleTop = 150 + Math.random() * (SCREEN_HEIGHT - 400);
          const candleLeft = i < 3 ? Math.random() * (SCREEN_WIDTH * 0.2) : SCREEN_WIDTH - Math.random() * (SCREEN_WIDTH * 0.2);
          const baseOpacity = 0.4 + Math.random() * 0.4;
          
          return (
            <Animated.View
              key={`candle-${i}`}
              style={[
                styles.candle,
                {
                  top: candleTop,
                  left: candleLeft,
                  opacity: baseOpacity,
                },
              ]}
            >
              <View style={styles.candleBody} />
              <Animated.View 
                style={[
                  styles.candleFlame,
                  {
                    transform: [{
                      scaleY: candleFlickers[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.2],
                      })
                    }]
                  }
                ]}
              />
            </Animated.View>
          );
        })}
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => {}} style={styles.iconButton}>
            <Moon size={22} color="#a78bfa" />
          </TouchableOpacity>
        </View>
        <View style={styles.topBarRight}>
          <Text style={styles.timeText}>{formatTime()}</Text>
          <TouchableOpacity
            onPress={() => router.push('/settings' as any)}
            style={styles.iconButton}
          >
            <Settings size={22} color="#a78bfa" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.greetingSection, { paddingTop: insets.top + 60 }]}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Animated.View
          style={{
            shadowColor: '#ec4899',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: usernameGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.8],
            }),
            shadowRadius: usernameGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [8, 20],
            }),
          }}
        >
          <LinearGradient
            colors={['#ec4899', '#8b5cf6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.usernameGradient}
          >
            <Text style={styles.username}>{user?.name || 'User'}</Text>
          </LinearGradient>
        </Animated.View>
        <Text style={styles.tagline}>Transform your reality by transforming yourself</Text>
      </View>

      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
        >
          {featureCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.cardContainer}
              onPress={() => handleCardPress(card.route)}
              activeOpacity={0.9}
            >
              <View style={styles.card}>
                <Image 
                  source={card.image} 
                  style={styles.cardImageFull} 
                  contentFit="cover"
                  contentPosition={card.id === 'habits' ? 'top' : 'center'}
                  cachePolicy="memory-disk"
                  priority="high"
                  transition={0}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
                  locations={[0, 0.6, 1]}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                  </View>
                </LinearGradient>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.swipeText}>← Swipe to navigate →</Text>
          <View style={styles.dotsContainer}>
            {featureCards.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  currentPage === index && styles.dotActive,
                ]}
              />
            ))}
          </View>
          <Text style={styles.pageCounter}>
            {currentPage + 1} of {featureCards.length}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/quick-add' as any)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#8b5cf6', '#6d28d9']}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={dayModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDayModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setDayModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <CalendarIcon size={24} color="#8b5cf6" />
                <Text style={styles.modalTitle}>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDayModalVisible(false)} style={styles.modalClose}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDate && getEventsForDate(selectedDate).length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No activities on this day</Text>
                </View>
              ) : (
                selectedDate && getEventsForDate(selectedDate).map((event, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.eventItem}
                    onPress={() => {
                      setDayModalVisible(false);
                      router.push(getEventRoute(event.type) as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.eventIndicator, { backgroundColor: getEventColor(event.type) }]} />
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventTitle}>{getEventTitle(event.type)}</Text>
                      <Text style={styles.eventCount}>{event.count} {event.count === 1 ? 'item' : 'items'}</Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PWAInstallPrompt />
    </View>
  );
}

const calendarStyles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButton: {
    padding: 4,
  },
  expandButton: {
    padding: 4,
    marginLeft: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500' as const,
    marginBottom: 6,
    opacity: 0.7,
  },
  dayNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  today: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 2,
    borderColor: '#8b5cf6',
  },
  todayDark: {
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderWidth: 2,
    borderColor: '#a78bfa',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  todayText: {
    fontWeight: '700' as const,
  },
  eventDots: {
    flexDirection: 'row',
    gap: 2,
    height: 6,
    justifyContent: 'center',
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  light: {
    monthText: {
      color: '#fff',
    },
    dayName: {
      color: 'rgba(255, 255, 255, 0.8)',
    },
    dayText: {
      color: '#fff',
    },
  },
  dark: {
    monthText: {
      color: '#fff',
    },
    dayName: {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    dayText: {
      color: '#fff',
    },
    expandedTitle: {
      color: '#fff',
    },
    expandedEmptyText: {
      color: 'rgba(255,255,255,0.5)',
    },
    expandedEventTitle: {
      color: '#fff',
    },
    expandedEventDate: {
      color: 'rgba(255,255,255,0.6)',
    },
    expandedEventCount: {
      color: 'rgba(255,255,255,0.5)',
    },
  },
  expandedSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  expandedHeader: {
    marginBottom: 12,
  },
  expandedTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  expandedScroll: {
    maxHeight: 300,
  },
  expandedEmpty: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  expandedEmptyText: {
    fontSize: 14,
  },
  expandedEventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  expandedEventIndicator: {
    width: 3,
    height: 36,
    borderRadius: 2,
    marginRight: 12,
  },
  expandedEventContent: {
    flex: 1,
  },
  expandedEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expandedEventTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  expandedEventDate: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  expandedEventCount: {
    fontSize: 12,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a0b2e',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  decorativeElements: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  moon: {
    position: 'absolute',
    width: 180,
    height: 180,
  },
  moonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 90,
    opacity: 0.6,
  },
  moonCrescent: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 140,
    height: 180,
    backgroundColor: '#1a0b2e',
    borderRadius: 90,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    backgroundColor: '#fff',
    borderRadius: 1.5,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  candle: {
    position: 'absolute',
    alignItems: 'center',
  },
  candleBody: {
    width: 8,
    height: 40,
    backgroundColor: '#8b5cf6',
    borderRadius: 4,
    opacity: 0.6,
  },
  candleFlame: {
    width: 12,
    height: 16,
    backgroundColor: '#fbbf24',
    borderRadius: 6,
    marginTop: -8,
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    letterSpacing: 0.5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 5,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fbbf24',
    letterSpacing: 2,
    textShadowColor: 'rgba(251, 191, 36, 0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  usernameGradient: {
    borderRadius: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  username: {
    fontSize: 42,
    fontWeight: '700' as const,
    color: '#fff',
    letterSpacing: 1,
    textAlign: 'center',
    includeFontPadding: false,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  tagline: {
    fontSize: 16,
    fontStyle: 'italic' as const,
    color: '#fbbf24',
    letterSpacing: 0.5,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 12,
    paddingHorizontal: 24,
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  carouselContainer: {
    flex: 1,
    marginTop: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  cardContainer: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(30, 20, 50, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  cardImageFull: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
  },
  cardContent: {
    padding: 20,
    paddingBottom: 24,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    includeFontPadding: false,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false,
  },
  footer: {
    paddingVertical: 16,
    paddingBottom: 24,
    alignItems: 'center',
    gap: 12,
  },
  swipeText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500' as const,
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 3,
  },
  dotActive: {
    backgroundColor: '#a78bfa',
    width: 20,
  },
  pageCounter: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
  },
  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabIcon: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300' as const,
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(20,20,30,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderTopColor: 'rgba(139,92,246,0.3)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  eventIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});

interface OrbitalHomeScreenProps {
  featureCards: FeatureCard[];
  onCardPress: (route: string) => void;
  router: any;
  calendarEvents: CalendarEvent[];
  selectedWeekStart: Date;
  onWeekChange: (date: Date) => void;
  onDayPress: (date: Date) => void;
  selectedDate: Date | null;
  dayModalVisible: boolean;
  setDayModalVisible: (visible: boolean) => void;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventTitle: (type: string) => string;
  getEventRoute: (type: string) => string;
  getEventColor: (type: string) => string;
  calendarVisible: boolean;
}

function OrbitalHomeScreen({ featureCards, onCardPress, router, calendarEvents, selectedWeekStart, onWeekChange, onDayPress, selectedDate, dayModalVisible, setDayModalVisible, getEventsForDate, getEventTitle, getEventRoute, getEventColor, calendarVisible }: OrbitalHomeScreenProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const floatAnims = useRef(
    featureCards.map(() => new Animated.Value(0))
  ).current;
  const sparkleAnims = useRef(
    Array.from({ length: 12 }, () => ({
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      rotate: new Animated.Value(0),
    }))
  ).current;

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const headerTopPadding = insets.top + HEADER_Y_OFFSET;

  useEffect(() => {
    const animations = floatAnims.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000 + (index * 400),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 3000 + (index * 400),
            useNativeDriver: true,
          }),
        ])
      );
    });

    const sparkleAnimations = sparkleAnims.map((sparkle, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(index * 200),
          Animated.parallel([
            Animated.timing(sparkle.opacity, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.scale, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.rotate, {
              toValue: 1,
              duration: 1600,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(sparkle.opacity, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(sparkle.scale, {
              toValue: 0,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
    });

    animations.forEach(animation => animation.start());
    sparkleAnimations.forEach(animation => animation.start());

    return () => {
      animations.forEach(animation => animation.stop());
      sparkleAnimations.forEach(animation => animation.stop());
    };
  }, [floatAnims, sparkleAnims]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: true,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const index = Math.round(offsetX / SCREEN_WIDTH);
        setSelectedIndex(index);
      },
    }
  );

  return (
    <View style={orbitalStyles.container}>
      <Image 
        source={OPTIMIZED_IMAGE_URLS.cosmicBackground}
        style={orbitalStyles.background} 
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
      <View style={orbitalStyles.overlay} />
      
      {calendarVisible && (
        <View style={[orbitalStyles.headerContainer, { paddingTop: headerTopPadding }]}>
          <View style={orbitalStyles.headerContent}>
            <UnifiedCalendar 
              events={calendarEvents}
              selectedWeekStart={selectedWeekStart}
              onWeekChange={onWeekChange}
              onDayPress={onDayPress}
              isDark
              onEventPress={(route) => router.push(route as any)}
              getEventTitle={getEventTitle}
              getEventColor={getEventColor}
            />
          </View>
        </View>
      )}

      <View style={orbitalStyles.carouselContainer}>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={orbitalStyles.scrollView}
          contentContainerStyle={orbitalStyles.scrollContent}
        >
          {featureCards.map((card, index) => {
            const inputRange = [
              (index - 1) * SCREEN_WIDTH,
              index * SCREEN_WIDTH,
              (index + 1) * SCREEN_WIDTH,
            ];

            const scale = scrollX.interpolate({
              inputRange,
              outputRange: [0.7, 1, 0.7],
              extrapolate: 'clamp',
            });

            const opacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.4, 1, 0.4],
              extrapolate: 'clamp',
            });

            const translateY = scrollX.interpolate({
              inputRange,
              outputRange: [60, 0, 60],
              extrapolate: 'clamp',
            });

            const floatY = floatAnims[index].interpolate({
              inputRange: [0, 1],
              outputRange: [0, -15],
            });

            return (
              <View key={card.id} style={orbitalStyles.planetContainer}>
                <Animated.View
                  style={[
                    orbitalStyles.planetWrapper,
                    {
                      transform: [{ scale }, { translateY }, { translateY: floatY }],
                      opacity,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={orbitalStyles.planet}
                    onPress={() => onCardPress(card.route)}
                    activeOpacity={0.9}
                  >
                    <View style={orbitalStyles.planetInner}>
                      <Image 
                        source={card.image} 
                        style={orbitalStyles.planetImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                        priority="high"
                        transition={0}
                      />
                      <View style={orbitalStyles.planetOverlay} />
                    </View>
                    <View style={orbitalStyles.planetGlow} />
                  </TouchableOpacity>
                  <View style={orbitalStyles.planetInfo}>
                    <Text style={orbitalStyles.planetTitle}>{card.title}</Text>
                    <Text style={orbitalStyles.planetSubtitle}>
                      {card.subtitle}
                    </Text>
                  </View>
                </Animated.View>
              </View>
            );
          })}
        </Animated.ScrollView>

        <View style={orbitalStyles.footer}>
          <View style={orbitalStyles.dotsContainer}>
            {featureCards.map((_, index) => (
              <View
                key={index}
                style={[
                  orbitalStyles.dot,
                  selectedIndex === index && orbitalStyles.dotActive,
                ]}
              />
            ))}
          </View>
          <Text style={orbitalStyles.pageCounter}>
            {selectedIndex + 1} of {featureCards.length}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={orbitalStyles.settingsButton}
        onPress={() => router.push('/settings' as any)}
        activeOpacity={0.8}
      >
        <Settings color="#fff" size={24} />
      </TouchableOpacity>

      <Modal
        visible={dayModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDayModalVisible(false)}
      >
        <Pressable style={orbitalStyles.modalOverlay} onPress={() => setDayModalVisible(false)}>
          <Pressable style={orbitalStyles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={orbitalStyles.modalHeader}>
              <View style={orbitalStyles.modalHeaderLeft}>
                <CalendarIcon size={24} color="#a78bfa" />
                <Text style={orbitalStyles.modalTitle}>
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDayModalVisible(false)} style={orbitalStyles.modalClose}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={orbitalStyles.modalScroll} showsVerticalScrollIndicator={false}>
              {selectedDate && getEventsForDate(selectedDate).length === 0 ? (
                <View style={orbitalStyles.emptyState}>
                  <Text style={orbitalStyles.emptyStateText}>No activities on this day</Text>
                </View>
              ) : (
                selectedDate && getEventsForDate(selectedDate).map((event, index) => (
                  <TouchableOpacity
                    key={index}
                    style={orbitalStyles.eventItem}
                    onPress={() => {
                      setDayModalVisible(false);
                      router.push(getEventRoute(event.type) as any);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[orbitalStyles.eventIndicator, { backgroundColor: getEventColor(event.type) }]} />
                    <View style={orbitalStyles.eventDetails}>
                      <Text style={orbitalStyles.eventTitle}>{getEventTitle(event.type)}</Text>
                      <Text style={orbitalStyles.eventCount}>{event.count} {event.count === 1 ? 'item' : 'items'}</Text>
                    </View>
                    <ChevronRight size={20} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <PWAInstallPrompt />
    </View>
  );
}

const orbitalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  headerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
    width: '100%',
  },
  time: {
    fontSize: 44,
    fontFamily: 'Pacifico',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 52,
    marginTop: 8,
    marginBottom: 6,
    textAlign: 'center',
  },
  greeting: {
    fontSize: 34,
    fontWeight: '700' as const,
    fontFamily: 'Akronim',
    color: '#fbbf24',
    letterSpacing: 2,
    textShadowColor: 'rgba(251, 191, 36, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  username: {
    fontSize: 26,
    fontWeight: '600' as const,
    fontFamily: 'Akronim',
    color: '#a78bfa',
    letterSpacing: 1,
    textShadowColor: 'rgba(167, 139, 250, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 20,
    fontFamily: 'Pacifico',
    color: '#f5d3ff',
    letterSpacing: 0.3,
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 4,
    paddingHorizontal: 20,
  },
  carouselContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  planetContainer: {
    width: Dimensions.get('window').width,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  planetWrapper: {
    alignItems: 'center',
  },
  planet: {
    width: 180,
    height: 180,
    borderRadius: 90,
    position: 'relative',
  },
  planetInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    overflow: 'hidden',
  },
  planetImage: {
    width: '100%',
    height: '100%',
  },
  planetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  planetGlow: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 100,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  planetInfo: {
    marginTop: 24,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  planetTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 34,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    includeFontPadding: false,
  },
  planetSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    includeFontPadding: false,
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: '#a78bfa',
    width: 24,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 5,
  },
  pageCounter: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500' as const,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  settingsButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.4)',
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(15,15,30,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderTopColor: 'rgba(167,139,250,0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167,139,250,0.2)',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#fff',
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  emptyState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(167,139,250,0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
  },
  eventIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 16,
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  eventCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
