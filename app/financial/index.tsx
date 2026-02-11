import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Edit3,
  Trash2,
  X,
  DollarSign,
  ArrowLeft,
} from 'lucide-react-native';
import { financialIncomeDb, financialExpenseDb } from '@/lib/database';
import type { FinancialIncome, FinancialExpense } from '@/types';
import { localDateKey } from '@/lib/date-utils';

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const INCOME_COLOR = '#22c55e';
const EXPENSE_COLOR = '#ef4444';
const BACKGROUND_IMAGE = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u';

type FilterType = 'all' | 'income' | 'expense';
type TabType = 'calendar' | 'notes';

interface DayCellProps {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasIncome: boolean;
  hasExpense: boolean;
  onPress: (dateKey: string) => void;
}

const DayCell = memo(function DayCell({
  dateKey,
  dayNumber,
  isCurrentMonth,
  isToday,
  isSelected,
  hasIncome,
  hasExpense,
  onPress,
}: DayCellProps) {
  const handlePress = useCallback(() => {
    onPress(dateKey);
  }, [dateKey, onPress]);

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        isSelected && styles.dayCellSelected,
        isToday && !isSelected && styles.dayCellToday,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.dayText,
          !isCurrentMonth && styles.dayTextOther,
          isSelected && styles.dayTextSelected,
          isToday && styles.dayTextToday,
        ]}
      >
        {dayNumber}
      </Text>
      {(hasIncome || hasExpense) && (
        <View style={styles.dotContainer}>
          {hasIncome && <View style={[styles.dot, { backgroundColor: INCOME_COLOR }]} />}
          {hasExpense && <View style={[styles.dot, { backgroundColor: EXPENSE_COLOR }]} />}
        </View>
      )}
    </TouchableOpacity>
  );
});

interface TransactionCardProps {
  item: FinancialIncome | FinancialExpense;
  type: 'income' | 'expense';
  onPress: () => void;
}

const TransactionCard = memo(function TransactionCard({ item, type, onPress }: TransactionCardProps) {
  const isIncome = type === 'income';
  const color = isIncome ? INCOME_COLOR : EXPENSE_COLOR;
  const income = item as FinancialIncome;
  const expense = item as FinancialExpense;

  return (
    <TouchableOpacity
      style={[styles.transactionCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.transactionHeader}>
        <View style={[styles.categoryBadge, { backgroundColor: `${color}20` }]}>
          {isIncome ? (
            <TrendingUp size={12} color={color} />
          ) : (
            <TrendingDown size={12} color={color} />
          )}
          <Text style={[styles.categoryText, { color }]}>
            {isIncome ? income.incomeCategory : expense.expenseCategory}
          </Text>
        </View>
        <Text style={[styles.amountText, { color }]}>
          {isIncome ? '+' : '-'}${isIncome ? income.incomeNet.toLocaleString('en-US', { minimumFractionDigits: 2 }) : expense.expenseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </Text>
      </View>
      <Text style={styles.transactionTitle}>
        {isIncome ? `${income.incomeCategory.charAt(0).toUpperCase() + income.incomeCategory.slice(1)} Income` : expense.expenseName}
      </Text>
      {(isIncome ? income.notes : expense.notes) ? (
        <Text style={styles.transactionNotes} numberOfLines={2}>
          {isIncome ? income.notes : expense.notes}
        </Text>
      ) : null}
      {!isIncome && expense.frequency !== 'one-time' && (
        <View style={styles.frequencyBadge}>
          <Text style={styles.frequencyText}>{expense.frequency}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

export default function FinancialTrackerScreen() {
  const router = useRouter();
  const [incomes, setIncomes] = useState<FinancialIncome[]>([]);
  const [expenses, setExpenses] = useState<FinancialExpense[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => localDateKey(new Date()));
  const [viewDate, setViewDate] = useState<Date>(() => new Date());
  const [filter, setFilter] = useState<FilterType>('all');
  const [activeTab, setActiveTab] = useState<TabType>('calendar');
  const [selectedItem, setSelectedItem] = useState<{ item: FinancialIncome | FinancialExpense; type: 'income' | 'expense' } | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const loadData = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const [incomeData, expenseData] = await Promise.all([
        financialIncomeDb.getAll(),
        financialExpenseDb.getAll(),
      ]);
      setIncomes(incomeData);
      setExpenses(expenseData);
      console.log('[Financial] Loaded', incomeData.length, 'incomes and', expenseData.length, 'expenses');
    } catch (error) {
      console.error('[Financial] Error loading:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const result: { dateKey: string; dayNumber: number; isCurrentMonth: boolean }[] = [];

    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth, -i);
      result.push({
        dateKey: localDateKey(d),
        dayNumber: d.getDate(),
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(currentYear, currentMonth, day);
      result.push({
        dateKey: localDateKey(d),
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    const endPadding = 42 - result.length;
    for (let i = 1; i <= endPadding; i++) {
      const d = new Date(currentYear, currentMonth + 1, i);
      result.push({
        dateKey: localDateKey(d),
        dayNumber: d.getDate(),
        isCurrentMonth: false,
      });
    }

    return result;
  }, [currentYear, currentMonth]);

  const dateMarkers = useMemo(() => {
    const markers: Record<string, { hasIncome: boolean; hasExpense: boolean }> = {};
    
    incomes.forEach((income) => {
      const key = localDateKey(new Date(income.incomeDate));
      if (!markers[key]) markers[key] = { hasIncome: false, hasExpense: false };
      markers[key].hasIncome = true;
    });

    expenses.forEach((expense) => {
      const key = localDateKey(new Date(expense.expenseDate));
      if (!markers[key]) markers[key] = { hasIncome: false, hasExpense: false };
      markers[key].hasExpense = true;
    });

    return markers;
  }, [incomes, expenses]);

  const selectedDayItems = useMemo(() => {
    const dayIncomes = incomes.filter((i) => localDateKey(new Date(i.incomeDate)) === selectedDateKey);
    const dayExpenses = expenses.filter((e) => localDateKey(new Date(e.expenseDate)) === selectedDateKey);

    let items: { item: FinancialIncome | FinancialExpense; type: 'income' | 'expense' }[] = [];

    if (filter === 'all' || filter === 'income') {
      items = [...items, ...dayIncomes.map((i) => ({ item: i, type: 'income' as const }))];
    }
    if (filter === 'all' || filter === 'expense') {
      items = [...items, ...dayExpenses.map((e) => ({ item: e, type: 'expense' as const }))];
    }

    return items.sort((a, b) => {
      const dateA = a.type === 'income' ? (a.item as FinancialIncome).incomeDate : (a.item as FinancialExpense).expenseDate;
      const dateB = b.type === 'income' ? (b.item as FinancialIncome).incomeDate : (b.item as FinancialExpense).expenseDate;
      return dateB - dateA;
    });
  }, [incomes, expenses, selectedDateKey, filter]);

  const todayKey = localDateKey(new Date());

  const handleDayPress = useCallback((dateKey: string) => {
    setSelectedDateKey(dateKey);
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  }, [currentYear, currentMonth]);

  const goToNextMonth = useCallback(() => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  }, [currentYear, currentMonth]);

  const goToToday = useCallback(() => {
    const today = new Date();
    setViewDate(today);
    setSelectedDateKey(localDateKey(today));
  }, []);

  const handleItemPress = useCallback((item: FinancialIncome | FinancialExpense, type: 'income' | 'expense') => {
    setSelectedItem({ item, type });
    setDetailModalVisible(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.type === 'income') {
        await financialIncomeDb.delete(selectedItem.item.id);
      } else {
        await financialExpenseDb.delete(selectedItem.item.id);
      }
      setConfirmModalVisible(false);
      setDetailModalVisible(false);
      loadData();
    } catch (error) {
      console.error('[Financial] Error deleting:', error);
    }
  }, [selectedItem, loadData]);

  const handleEdit = useCallback(() => {
    if (!selectedItem) return;
    setDetailModalVisible(false);
    if (selectedItem.type === 'expense') {
      router.push(`/financial/expense-edit?id=${selectedItem.item.id}` as any);
    }
  }, [selectedItem, router]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const totalIncome = useMemo(() => incomes.reduce((sum, i) => sum + i.incomeNet, 0), [incomes]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.expenseAmount, 0), [expenses]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <Image source={{ uri: BACKGROUND_IMAGE }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <LinearGradient colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendar' && styles.tabActive]}
          onPress={() => setActiveTab('calendar')}
        >
          <DollarSign size={18} color={activeTab === 'calendar' ? '#fff' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>Calendar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() => {
            setActiveTab('notes');
            router.push('/financial/notes' as any);
          }}
        >
          <FileText size={18} color={activeTab === 'notes' ? '#fff' : 'rgba(255,255,255,0.5)'} />
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>Notes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: INCOME_COLOR }]}>
            +${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: EXPENSE_COLOR }]}>
            -${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      <View style={styles.calendarHeader}>
        <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
          <ChevronLeft size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToToday}>
          <Text style={styles.monthTitle}>{monthNames[currentMonth]} {currentYear}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
          <ChevronRight size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.weekHeader}>
        {DAYS_OF_WEEK.map((day, index) => (
          <Text key={index} style={styles.weekDay}>{day}</Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          const marker = dateMarkers[day.dateKey] || { hasIncome: false, hasExpense: false };
          return (
            <DayCell
              key={`${day.dateKey}-${index}`}
              dateKey={day.dateKey}
              dayNumber={day.dayNumber}
              isCurrentMonth={day.isCurrentMonth}
              isToday={day.dateKey === todayKey}
              isSelected={day.dateKey === selectedDateKey}
              hasIncome={marker.hasIncome}
              hasExpense={marker.hasExpense}
              onPress={handleDayPress}
            />
          );
        })}
      </View>

      <View style={styles.filterContainer}>
        {(['all', 'income', 'expense'] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : f === 'income' ? 'Income' : 'Expenses'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.transactionsList} contentContainerStyle={styles.transactionsContent}>
        {selectedDayItems.length === 0 ? (
          <View style={styles.emptyState}>
            <DollarSign size={48} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>No transactions on this day</Text>
            <Text style={styles.emptySubtext}>Tap + to add income or expense</Text>
          </View>
        ) : (
          selectedDayItems.map(({ item, type }) => (
            <TransactionCard
              key={item.id}
              item={item}
              type={type}
              onPress={() => handleItemPress(item, type)}
            />
          ))
        )}
      </ScrollView>

      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: INCOME_COLOR }]}
          onPress={() => router.push('/financial/income-add' as any)}
          activeOpacity={0.8}
        >
          <TrendingUp size={20} color="#fff" />
          <Text style={styles.fabText}>Income</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: EXPENSE_COLOR }]}
          onPress={() => router.push('/financial/expense-add' as any)}
          activeOpacity={0.8}
        >
          <TrendingDown size={20} color="#fff" />
          <Text style={styles.fabText}>Expense</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={detailModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setDetailModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedItem?.type === 'income' ? 'Income Details' : 'Expense Details'}
              </Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            {selectedItem && (
              <View style={styles.modalBody}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Amount</Text>
                  <Text style={[styles.modalValue, { color: selectedItem.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }]}>
                    {selectedItem.type === 'income' ? '+' : '-'}$
                    {selectedItem.type === 'income'
                      ? (selectedItem.item as FinancialIncome).incomeNet.toLocaleString('en-US', { minimumFractionDigits: 2 })
                      : (selectedItem.item as FinancialExpense).expenseAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Category</Text>
                  <Text style={styles.modalValue}>
                    {selectedItem.type === 'income'
                      ? (selectedItem.item as FinancialIncome).incomeCategory
                      : (selectedItem.item as FinancialExpense).expenseCategory}
                  </Text>
                </View>
                {selectedItem.type === 'expense' && (
                  <>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Name</Text>
                      <Text style={styles.modalValue}>{(selectedItem.item as FinancialExpense).expenseName}</Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Frequency</Text>
                      <Text style={styles.modalValue}>{(selectedItem.item as FinancialExpense).frequency}</Text>
                    </View>
                  </>
                )}
                {(selectedItem.type === 'income' ? (selectedItem.item as FinancialIncome).notes : (selectedItem.item as FinancialExpense).notes) && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Notes</Text>
                    <Text style={styles.modalValue}>
                      {selectedItem.type === 'income' ? (selectedItem.item as FinancialIncome).notes : (selectedItem.item as FinancialExpense).notes}
                    </Text>
                  </View>
                )}
                <View style={styles.modalActions}>
                  {selectedItem.type === 'expense' && (
                    <TouchableOpacity style={styles.modalButton} onPress={handleEdit}>
                      <Edit3 size={18} color="#8B5CF6" />
                      <Text style={styles.modalButtonText}>Edit</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[styles.modalButton, styles.deleteButton]}
                    onPress={() => setConfirmModalVisible(true)}
                  >
                    <Trash2 size={18} color="#ef4444" />
                    <Text style={[styles.modalButtonText, { color: '#ef4444' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={confirmModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setConfirmModalVisible(false)}>
          <Pressable style={styles.confirmModal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.confirmTitle}>Delete Transaction?</Text>
            <Text style={styles.confirmText}>This action cannot be undone.</Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.confirmButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmDeleteButton]}
                onPress={handleDelete}
              >
                <Text style={[styles.confirmButtonText, { color: '#fff' }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  headerBackButton: {
    padding: 8,
    marginLeft: -8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  tabTextActive: {
    color: '#fff',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  weekHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.4)',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  dayCellSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 12,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.5)',
    borderRadius: 12,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#fff',
  },
  dayTextOther: {
    color: 'rgba(255,255,255,0.25)',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  dayTextToday: {
    color: '#8B5CF6',
  },
  dotContainer: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 3,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
  },
  filterTextActive: {
    color: '#fff',
  },
  transactionsList: {
    flex: 1,
  },
  transactionsContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  transactionCard: {
    backgroundColor: 'rgba(26,26,26,0.9)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'capitalize',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  transactionNotes: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 18,
  },
  frequencyBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 6,
  },
  frequencyText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#8B5CF6',
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 4,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  fab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  modalRow: {
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500' as const,
    textTransform: 'capitalize',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    gap: 8,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8B5CF6',
  },
  confirmModal: {
    width: '100%',
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  confirmDeleteButton: {
    backgroundColor: '#ef4444',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
