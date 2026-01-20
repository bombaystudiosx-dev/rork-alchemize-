import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Text, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Plus, DollarSign, TrendingUp, FileText } from 'lucide-react-native';
import { financialIncomeDb, financialExpenseDb, financialNoteDb } from '@/lib/database';


type ViewMode = 'monthly' | 'quarterly' | 'yearly';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function FinancialTrackerScreen() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const { data: incomeData = [] } = useQuery({
    queryKey: ['financial-income'],
    queryFn: () => financialIncomeDb.getAll(),
  });

  const { data: expenseData = [] } = useQuery({
    queryKey: ['financial-expenses'],
    queryFn: () => financialExpenseDb.getAll(),
  });

  const { data: notesData } = useQuery({
    queryKey: ['financial-notes'],
    queryFn: () => financialNoteDb.get(),
  });

  const periodData = useMemo(() => {
    const now = currentDate;
    let startDate: Date;
    let endDate: Date;
    let label: string;

    if (viewMode === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      label = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
    } else if (viewMode === 'quarterly') {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      label = `Q${quarter + 1} ${now.getFullYear()}`;
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      label = `${now.getFullYear()}`;
    }

    const startTime = startDate.getTime();
    const endTime = endDate.getTime();

    const filteredIncome = incomeData.filter(
      (item) => item.incomeDate >= startTime && item.incomeDate <= endTime
    );
    const filteredExpenses = expenseData.filter(
      (item) => item.expenseDate >= startTime && item.expenseDate <= endTime
    );

    const grossIncome = filteredIncome.reduce((sum, item) => sum + item.incomeGross, 0);
    const netIncome = filteredIncome.reduce((sum, item) => sum + item.incomeNet, 0);
    const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.expenseAmount, 0);
    const moneyLeftOver = netIncome - totalExpenses;

    return {
      label,
      grossIncome,
      netIncome,
      totalExpenses,
      moneyLeftOver,
      filteredIncome,
      filteredExpenses,
    };
  }, [viewMode, currentDate, incomeData, expenseData]);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevMonthDate = new Date(year, month, -startingDayOfWeek + i + 1);
      days.push(prevMonthDate);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  const hasIncomeOnDate = (date: Date) => {
    const dayStart = new Date(date).setHours(0, 0, 0, 0);
    const dayEnd = new Date(date).setHours(23, 59, 59, 999);
    return incomeData.some((item) => item.incomeDate >= dayStart && item.incomeDate <= dayEnd);
  };

  const hasExpenseOnDate = (date: Date) => {
    const dayStart = new Date(date).setHours(0, 0, 0, 0);
    const dayEnd = new Date(date).setHours(23, 59, 59, 999);
    return expenseData.some((item) => item.expenseDate >= dayStart && item.expenseDate <= dayEnd);
  };

  const changeMonth = (direction: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
  };

  const renderCalendarDay = (date: Date | null, index: number, variant: 'income' | 'expense') => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.calendarDay} />;
    }

    const isCurrentMonth = date.getMonth() === currentDate.getMonth();
    const isToday = new Date().toDateString() === date.toDateString();
    const isSelected = selectedDate?.toDateString() === date.toDateString();
    const hasData = variant === 'income' ? hasIncomeOnDate(date) : hasExpenseOnDate(date);

    return (
      <TouchableOpacity
        key={`${variant}-${date.toISOString()}`}
        style={[
          styles.calendarDay,
          !isCurrentMonth && styles.calendarDayOutside,
          isToday && styles.calendarDayToday,
          isSelected && (variant === 'income' ? styles.calendarDaySelectedIncome : styles.calendarDaySelectedExpense),
        ]}
        onPress={() => setSelectedDate(date)}
      >
        <Text
          style={[
            styles.calendarDayNumber,
            !isCurrentMonth && styles.calendarDayNumberOutside,
            isToday && styles.calendarDayNumberToday,
            isSelected && styles.calendarDayNumberSelected,
          ]}
        >
          {date.getDate()}
        </Text>
        {hasData && (
          <View
            style={[
              styles.dataDot,
              variant === 'income' ? styles.dataDotIncome : styles.dataDotExpense,
            ]}
          />
        )}
      </TouchableOpacity>
    );
  };

  const calendarDays = getDaysInMonth(currentDate);
  const recentExpenses = expenseData.slice(0, 5);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.periodTabs}>
          <TouchableOpacity
            style={[styles.periodTab, viewMode === 'monthly' && styles.periodTabActive]}
            onPress={() => setViewMode('monthly')}
          >
            <Text style={[styles.periodTabText, viewMode === 'monthly' && styles.periodTabTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodTab, viewMode === 'quarterly' && styles.periodTabActive]}
            onPress={() => setViewMode('quarterly')}
          >
            <Text style={[styles.periodTabText, viewMode === 'quarterly' && styles.periodTabTextActive]}>
              Quarterly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodTab, viewMode === 'yearly' && styles.periodTabActive]}
            onPress={() => setViewMode('yearly')}
          >
            <Text style={[styles.periodTabText, viewMode === 'yearly' && styles.periodTabTextActive]}>
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryPeriod}>{periodData.label}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gross Income</Text>
              <Text style={[styles.summaryValue, styles.incomeText]}>
                ${periodData.grossIncome.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Income</Text>
              <Text style={[styles.summaryValue, styles.incomeText]}>
                ${periodData.netIncome.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryValue, styles.expenseText]}>
                ${periodData.totalExpenses.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Money Left Over</Text>
              <Text
                style={[
                  styles.summaryValue,
                  styles.moneyLeftOver,
                  periodData.moneyLeftOver < 0 ? styles.negativeBalance : styles.positiveBalance,
                ]}
              >
                ${periodData.moneyLeftOver.toFixed(2)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryActions}>
            <TouchableOpacity
              style={[styles.summaryButton, styles.summaryButtonIncome]}
              onPress={() => router.push('/financial/add?type=income' as any)}
            >
              <Text style={styles.summaryButtonText}>Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.summaryButton, styles.summaryButtonExpense]}
              onPress={() => router.push('/financial/add?type=expense' as any)}
            >
              <Text style={styles.summaryButtonText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendarSection}>
          <View style={styles.calendarCard}>
            <Text style={styles.calendarTitle}>Income Calendar</Text>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
                <Text style={styles.monthButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
                <Text style={styles.monthButtonText}>→</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekDaysHeader}>
              {DAYS.map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => renderCalendarDay(date, index, 'income'))}
            </View>
          </View>

          <View style={styles.calendarCard}>
            <Text style={styles.calendarTitle}>Expense Calendar</Text>
            <View style={styles.calendarHeader}>
              <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthButton}>
                <Text style={styles.monthButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.monthYear}>
                {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
              </Text>
              <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthButton}>
                <Text style={styles.monthButtonText}>→</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.weekDaysHeader}>
              {DAYS.map((day) => (
                <Text key={day} style={styles.weekDayText}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {calendarDays.map((date, index) => renderCalendarDay(date, index, 'expense'))}
            </View>
          </View>
        </View>

        <View style={styles.recentExpensesCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Recent Expenses</Text>
            <TouchableOpacity onPress={() => router.push('/financial/add?type=expense' as any)}>
              <Plus color="#6366f1" size={24} />
            </TouchableOpacity>
          </View>
          {recentExpenses.length === 0 ? (
            <Text style={styles.emptyText}>No expenses yet</Text>
          ) : (
            recentExpenses.map((expense) => (
              <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseItemLeft}>
                  <Text style={styles.expenseItemName}>{expense.expenseName}</Text>
                  <Text style={styles.expenseItemCategory}>{expense.expenseCategory}</Text>
                  <Text style={styles.expenseItemDate}>
                    {new Date(expense.expenseDate).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.expenseItemAmount, styles.expenseText]}>
                  -${expense.expenseAmount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>

        {notesData && (
          <View style={styles.notesCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Financial Notes</Text>
              <TouchableOpacity onPress={() => router.push('/financial/notes' as any)}>
                <FileText color="#6366f1" size={24} />
              </TouchableOpacity>
            </View>
            <View style={styles.noteRow}>
              <Text style={styles.noteLabel}>Total Debt:</Text>
              <Text style={[styles.noteValue, styles.expenseText]}>
                ${notesData.debtAmount.toFixed(2)}
              </Text>
            </View>
            {notesData.noteTotalDebt ? (
              <Text style={styles.noteDescription}>{notesData.noteTotalDebt}</Text>
            ) : null}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowQuickActions(true)}>
        <Plus color="#fff" size={28} />
      </TouchableOpacity>

      <Modal
        visible={showQuickActions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQuickActions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowQuickActions(false)}
        >
          <View style={styles.quickActionsSheet}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => {
                setShowQuickActions(false);
                router.push('/financial/add?type=income' as any);
              }}
            >
              <DollarSign color="#10b981" size={24} />
              <Text style={styles.quickActionText}>Add Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => {
                setShowQuickActions(false);
                router.push('/financial/add?type=expense' as any);
              }}
            >
              <TrendingUp color="#ef4444" size={24} />
              <Text style={styles.quickActionText}>Add Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionItem}
              onPress={() => {
                setShowQuickActions(false);
                router.push('/financial/notes' as any);
              }}
            >
              <FileText color="#6366f1" size={24} />
              <Text style={styles.quickActionText}>Edit Notes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionCancel}
              onPress={() => setShowQuickActions(false)}
            >
              <Text style={styles.quickActionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  periodTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 26, 26, 0.7)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 42, 0.5)',
  },
  periodTabActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#a0a0a0',
  },
  periodTabTextActive: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 42, 0.5)',
  },
  summaryPeriod: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryGrid: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  incomeText: {
    color: '#10b981',
  },
  expenseText: {
    color: '#ef4444',
  },
  moneyLeftOver: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  positiveBalance: {
    color: '#10b981',
  },
  negativeBalance: {
    color: '#ef4444',
  },
  summaryActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  summaryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  summaryButtonIncome: {
    backgroundColor: '#10b981',
  },
  summaryButtonExpense: {
    backgroundColor: '#ef4444',
  },
  summaryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  calendarSection: {
    gap: 16,
    marginBottom: 16,
  },
  calendarCard: {
    backgroundColor: 'rgba(30, 30, 35, 0.95)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(100, 100, 120, 0.4)',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthButton: {
    padding: 8,
  },
  monthButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '700' as const,
  },
  monthYear: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  weekDaysHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#a0a0ff',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calendarDayOutside: {
    opacity: 0.35,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderRadius: 8,
  },
  calendarDaySelectedIncome: {
    backgroundColor: '#059669',
    borderRadius: 8,
  },
  calendarDaySelectedExpense: {
    backgroundColor: '#dc2626',
    borderRadius: 8,
  },
  calendarDayNumber: {
    fontSize: 14,
    color: '#e5e5e5',
    fontWeight: '600' as const,
  },
  calendarDayNumberOutside: {
    color: '#666',
  },
  calendarDayNumberToday: {
    fontWeight: '700' as const,
  },
  calendarDayNumberSelected: {
    color: '#fff',
    fontWeight: '700' as const,
  },
  dataDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  dataDotIncome: {
    backgroundColor: '#34d399',
  },
  dataDotExpense: {
    backgroundColor: '#f87171',
  },
  recentExpensesCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 42, 0.5)',
  },
  notesCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 42, 0.5)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  expenseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 42, 42, 0.5)',
  },
  expenseItemLeft: {
    flex: 1,
  },
  expenseItemName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 4,
  },
  expenseItemCategory: {
    fontSize: 12,
    color: '#6366f1',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  expenseItemDate: {
    fontSize: 12,
    color: '#666',
  },
  expenseItemAmount: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  noteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteLabel: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  noteValue: {
    fontSize: 18,
    fontWeight: '700' as const,
  },
  noteDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  quickActionsSheet: {
    backgroundColor: 'rgba(26, 26, 26, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  quickActionsTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  quickActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(42, 42, 42, 0.5)',
    borderRadius: 12,
    marginBottom: 12,
    gap: 16,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  quickActionCancel: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  quickActionCancelText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#666',
  },
});
