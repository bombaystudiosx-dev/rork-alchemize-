import React, { useState, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, TextInput, Animated, Platform, ImageBackground, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Search, Plus, ArrowLeft } from 'lucide-react-native';
import { gratitudeDb } from '@/lib/database';
import { useTheme } from '@/contexts/theme-context';
import { LinearGradient } from 'expo-linear-gradient';
import { isSameLocalDay, startOfLocalDay } from '@/lib/date-utils';

export default function GratitudeJournalScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'cosmic-dark';
  
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const today = useMemo(() => startOfLocalDay(new Date()), []);

  const { data: entries = [] } = useQuery({
    queryKey: ['gratitude-entries'],
    queryFn: () => Platform.OS === 'web' ? Promise.resolve([]) : gratitudeDb.getAll(),
  });

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysCount = lastDay.getDate();

    const jsDay = firstDay.getDay();
    const monIndex = (jsDay + 6) % 7;

    return { daysCount, startDay: monIndex, year, month };
  };

  const monthData = getDaysInMonth(selectedMonth);
  const daysArray = Array.from({ length: monthData.daysCount }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: monthData.startDay }, () => null);

  const hasEntry = (day: number) => {
    const checkDate = startOfLocalDay(new Date(monthData.year, monthData.month, day)).getTime();
    return entries.some((e) => startOfLocalDay(new Date(e.entryDate)).getTime() === checkDate);
  };

  const changeMonth = (delta: number) => {
    setSelectedMonth(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + delta);
      return newDate;
    });
  };

  const handleDayPress = (day: number) => {
    const date = startOfLocalDay(new Date(monthData.year, monthData.month, day)).getTime();
    setSelectedDate(date);
  };

  const entriesForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return entries.filter((e) => startOfLocalDay(new Date(e.entryDate)).getTime() === selectedDate);
  }, [entries, selectedDate]);

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;
    const query = searchQuery.toLowerCase();
    return entries.filter(e => 
      e.gratitude1?.toLowerCase().includes(query) ||
      e.gratitude2?.toLowerCase().includes(query) ||
      e.gratitude3?.toLowerCase().includes(query)
    );
  }, [entries, searchQuery]);

  const renderDay = (item: number | null, index: number) => {
    if (item === null) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    const hasEntryToday = hasEntry(item);
    const dayDateObj = startOfLocalDay(new Date(monthData.year, monthData.month, item));
    const isToday = isSameLocalDay(dayDateObj, today);

    const dayDate = dayDateObj.getTime();
    const isSelected = selectedDate === dayDate;

    return (
      <TouchableOpacity
        key={`day-${item}`}
        style={[
          styles.day,
          isSelected && styles.selectedDay,
        ]}
        onPress={() => handleDayPress(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.dayCircle,
          isToday && styles.todayCircle,
          isSelected && styles.selectedDayCircle,
        ]}>
          <Text style={[
            styles.dayText,
            isToday && styles.todayText,
            isSelected && styles.selectedDayText,
          ]}>
            {item}
          </Text>
          {hasEntryToday && (
            <View style={styles.heartIndicator}>
              <HeartPulse />
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  function HeartPulse() {
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }, [pulseAnim]);

    return (
      <Animated.Text style={[styles.heartEmoji, { transform: [{ scale: pulseAnim }] }]}>
        💛
      </Animated.Text>
    );
  }

  const displayEntries = useMemo(() => {
    if (selectedDate && entriesForSelectedDate.length > 0) {
      return entriesForSelectedDate;
    }
    return searchQuery ? filteredEntries.slice(0, 5) : entries.slice(0, 5);
  }, [selectedDate, entriesForSelectedDate, searchQuery, filteredEntries, entries]);

  const colors = isDark ? {
    bg1: '#05050a',
    bg2: '#0a0515',
    bg3: '#120a2e',
    card: '#1a1230',
    cardGlow: 'rgba(138, 92, 246, 0.1)',
    border: '#2d2550',
    text: '#ffffff',
    textSecondary: '#9d91c4',
    accent: '#FFD700',
    purple: '#8a5cf6',
    purpleGlow: 'rgba(138, 92, 246, 0.3)',
  } : {
    bg1: '#f5f3ff',
    bg2: '#ede9fe',
    bg3: '#ddd6fe',
    card: '#ffffff',
    cardGlow: 'rgba(138, 92, 246, 0.05)',
    border: '#c4b5fd',
    text: '#1e1b4b',
    textSecondary: '#6d28d9',
    accent: '#FFD700',
    purple: '#8a5cf6',
    purpleGlow: 'rgba(138, 92, 246, 0.2)',
  };

  return (
    <ImageBackground
      source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/f9jzlvbjacumvalwn6fvr' }}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={styles.overlay} />
      
      <TouchableOpacity 
        onPress={() => router.back()}
        style={styles.backButton}
        activeOpacity={0.7}
      >
        <View style={[styles.backButtonInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <ArrowLeft color={colors.purple} size={24} strokeWidth={2.5} />
        </View>
      </TouchableOpacity>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={styles.content} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search color={colors.textSecondary} size={20} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search your gratitudes..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <View style={styles.quote}>
          <Text style={[styles.quoteText, { color: colors.textSecondary }]}>
            &quot;Even on hard days, there&apos;s always something to be grateful for.&quot;
          </Text>
        </View>

        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => changeMonth(-1)} 
            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ChevronLeft color={colors.purple} size={20} strokeWidth={2.5} />
          </TouchableOpacity>
          
          <View style={styles.monthYearContainer}>
            <Text style={[styles.monthText, { color: colors.text }]}>
              {selectedMonth.toLocaleDateString('default', { month: 'long' })}
            </Text>
            <Text style={[styles.yearText, { color: colors.textSecondary }]}>
              {selectedMonth.getFullYear()}
            </Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => changeMonth(1)} 
            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ChevronRight color={colors.purple} size={20} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        <View style={[styles.calendarCard, { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          shadowColor: colors.purple,
        }]}>
          <View style={styles.weekDays}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <Text key={i} style={[styles.weekDayText, { color: colors.textSecondary }]}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {[...emptyDays, ...daysArray].map((item, index) => renderDay(item, index))}
          </View>
        </View>

        {displayEntries.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.cardGlow, borderColor: colors.border }]}>
              <Text style={styles.emptyHeart}>💜</Text>
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {selectedDate ? 'No gratitude entries for this date yet' : 'Start your gratitude journey'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Cultivate daily gratitude and transform your mindset
            </Text>
          </View>
        )}

        {displayEntries.length > 0 && (
          <View style={styles.entriesSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {selectedDate 
                ? `Entries for ${new Date(selectedDate).toLocaleDateString('default', { month: 'short', day: 'numeric' })}`
                : searchQuery 
                ? 'Search Results'
                : 'Recent Entries'
              }
            </Text>
            {displayEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={[styles.entryCard, { 
                  backgroundColor: colors.card, 
                  borderColor: colors.border,
                  shadowColor: colors.purple,
                }]}
                onPress={() => {
                  router.push(`/gratitude/add?date=${entry.entryDate}` as any);
                }}
              >
                <View style={styles.entryHeader}>
                  <Text style={[styles.entryDate, { color: colors.purple }]}>
                    {new Date(entry.entryDate).toLocaleDateString('default', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </Text>
                  <Text style={styles.goldHeart}>💛</Text>
                </View>
                <Text style={[styles.entryText, { color: colors.text }]} numberOfLines={2}>
                  • {entry.gratitude1}
                </Text>
                {entry.gratitude2 && (
                  <Text style={[styles.entryText, { color: colors.text }]} numberOfLines={2}>
                    • {entry.gratitude2}
                  </Text>
                )}
                {entry.gratitude3 && (
                  <Text style={[styles.entryText, { color: colors.text }]} numberOfLines={2}>
                    • {entry.gratitude3}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>

      <TouchableOpacity 
        onPress={() => {
          const date = selectedDate || startOfLocalDay(new Date()).getTime();
          router.push(`/gratitude/add?date=${date}` as any);
        }}
        style={styles.fabContainer}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#a855f7', '#8a5cf6', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fab, {
            shadowColor: colors.purple,
          }]}
        >
          <Plus color="#ffffff" size={28} strokeWidth={3} />
        </LinearGradient>
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  monthYearContainer: {
    alignItems: 'center',
  },
  monthText: {
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: 0.5,
  },
  yearText: {
    fontSize: 15,
    fontWeight: '600' as const,
    marginTop: 4,
    opacity: 0.7,
  },
  calendarCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(138, 92, 246, 0.1)',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 2,
  },
  day: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
  },
  dayDark: {
    backgroundColor: 'transparent',
  },
  dayLight: {
    backgroundColor: 'transparent',
  },
  todayDark: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
  },
  todayLight: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  dayTextDark: {
    color: '#a0a0a0',
  },
  dayTextLight: {
    color: '#4b5563',
  },
  todayText: {
    color: '#FFD700',
    fontWeight: '700' as const,
  },
  heartIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
  },
  heartEmoji: {
    fontSize: 10,
  },
  recentSection: {
    marginTop: 32,
  },
  recentTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  entryCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  entryDate: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  goldHeart: {
    fontSize: 18,
  },
  entryText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  moreEntries: {
    fontSize: 12,
    fontStyle: 'italic' as const,
    marginTop: 4,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 32,
    right: 24,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  quote: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  quoteText: {
    fontSize: 13,
    fontStyle: 'italic' as const,
    textAlign: 'center',
    lineHeight: 20,
  },
  dayCircle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    position: 'relative',
  },
  todayCircle: {
    backgroundColor: 'rgba(138, 92, 246, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(138, 92, 246, 0.5)',
  },
  selectedDay: {
    transform: [{ scale: 1.05 }],
  },
  selectedDayCircle: {
    backgroundColor: '#8a5cf6',
    shadowColor: '#8a5cf6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 6,
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '700' as const,
  },
  emptyState: {
    marginTop: 48,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  emptyHeart: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  entriesSection: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
});
