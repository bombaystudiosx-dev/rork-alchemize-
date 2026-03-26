import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Lock, AlertCircle, FileText, X } from 'lucide-react-native';
import { financialIncomeDb, financialExpenseDb, financialNoteDb } from '@/lib/database';
import type { FinancialIncome, FinancialExpense, FinancialNote } from '@/types';

type Period = 'monthly' | 'quarterly' | 'yearly';
type IncomeCategory = FinancialIncome['incomeCategory'];
type ExpenseCategory = FinancialExpense['expenseCategory'];

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const INCOME_CATEGORIES: IncomeCategory[] = ['salary','freelance','business','investment','bonus','other'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['bills','food','transport','shopping','health','entertainment','business','education','personal','other'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getMonthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function timestampToDateStr(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateStrToTimestamp(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

function todayStr(): string {
  return timestampToDateStr(Date.now());
}

function getPeriodRange(period: Period): { start: number; end: number; label: string } {
  const now = new Date();
  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    return { start, end, label: `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()} Summary` };
  }
  if (period === 'quarterly') {
    const q = Math.floor(now.getMonth() / 3);
    const sm = q * 3;
    const start = new Date(now.getFullYear(), sm, 1).getTime();
    const end = new Date(now.getFullYear(), sm + 3, 0, 23, 59, 59, 999).getTime();
    return { start, end, label: `Q${q + 1} ${now.getFullYear()} Summary` };
  }
  const start = new Date(now.getFullYear(), 0, 1).getTime();
  const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
  return { start, end, label: `${now.getFullYear()} Summary` };
}

interface CalendarCardProps {
  title: string;
  emoji: string;
  accentColor: string;
  highlightDays: Set<string>;
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}

const CalendarCard = React.memo(function CalendarCard({
  title, emoji, accentColor, highlightDays,
  currentMonth, onPrevMonth, onNextMonth,
  selectedDay, onSelectDay,
}: CalendarCardProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const cells = useMemo(() => {
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstDay, daysInMonth]);

  const weeks = useMemo(() => {
    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [cells]);

  return (
    <View style={[calStyles.card, { borderColor: `${accentColor}55` }]}>
      <View style={calStyles.cardHeader}>
        <Text style={calStyles.emoji}>{emoji}</Text>
        <Text style={calStyles.title}>{title}</Text>
      </View>

      <View style={calStyles.nav}>
        <TouchableOpacity style={calStyles.navBtn} onPress={onPrevMonth} activeOpacity={0.7} testID="cal-prev">
          <ChevronLeft color="rgba(255,255,255,0.75)" size={18} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={calStyles.monthLabel}>{getMonthLabel(year, month)}</Text>
        <TouchableOpacity style={calStyles.navBtn} onPress={onNextMonth} activeOpacity={0.7} testID="cal-next">
          <ChevronRight color="rgba(255,255,255,0.75)" size={18} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <View style={calStyles.weekdaysRow}>
        {WEEKDAYS.map(d => (
          <Text key={d} style={calStyles.weekday}>{d}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.weekRow}>
          {week.map((day, di) => {
            if (day === null) {
              return <View key={di} style={calStyles.emptyCell} />;
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const hasEntry = highlightDays.has(dateStr);
            const isSelected = selectedDay === dateStr;

            return (
              <TouchableOpacity
                key={di}
                style={[
                  calStyles.dayCell,
                  hasEntry && !isSelected && { backgroundColor: `${accentColor}22`, borderColor: `${accentColor}55` },
                  isSelected && { backgroundColor: accentColor, borderColor: accentColor },
                ]}
                onPress={() => onSelectDay(dateStr)}
                activeOpacity={0.7}
              >
                <Text style={[
                  calStyles.dayText,
                  hasEntry && !isSelected && { color: accentColor, fontWeight: '700' as const },
                  isSelected && { color: '#fff', fontWeight: '700' as const },
                ]}>
                  {day}
                </Text>
                {hasEntry && !isSelected && (
                  <View style={[calStyles.dot, { backgroundColor: accentColor }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
});

interface AddIncomeModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (income: FinancialIncome) => void;
  isLoading: boolean;
}

function AddIncomeModal({ visible, onClose, onAdd, isLoading }: AddIncomeModalProps) {
  const [source, setSource] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<IncomeCategory>('salary');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setSource('');
    setGrossAmount('');
    setNetAmount('');
    setDate(todayStr());
    setCategory('salary');
    setNotes('');
  };

  const handleSave = () => {
    const gross = parseFloat(grossAmount);
    if (!gross || gross <= 0) return;
    const net = parseFloat(netAmount) || gross;
    const income: FinancialIncome = {
      id: `income_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      incomeGross: gross,
      incomeNet: net,
      taxAmount: Math.max(0, gross - net),
      taxPercentage: gross > 0 ? ((gross - net) / gross) * 100 : 0,
      deductions: 0,
      incomeCategory: category,
      incomeDate: dateStrToTimestamp(date),
      notes: notes.trim(),
      createdAt: Date.now(),
    };
    onAdd(income);
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={mStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={mStyles.sheet}>
          <View style={mStyles.mHeader}>
            <Text style={mStyles.mTitle}>Add Income</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={mStyles.closeBtn} activeOpacity={0.7}>
              <X color="#fff" size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={mStyles.label}>Source / Title</Text>
            <TextInput
              style={mStyles.input}
              value={source}
              onChangeText={setSource}
              placeholder="Salary, freelance, dividend..."
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={mStyles.label}>Category</Text>
            <View style={mStyles.chipWrap}>
              {INCOME_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[mStyles.chip, category === cat && { backgroundColor: 'rgba(16,185,129,0.3)', borderColor: '#10B981' }]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[mStyles.chipText, category === cat && { color: '#10B981' }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={mStyles.label}>Gross Amount</Text>
            <View style={mStyles.amtRow}>
              <Text style={[mStyles.currency, { color: '#10B981' }]}>$</Text>
              <TextInput
                style={[mStyles.input, mStyles.amtInput, { color: '#10B981' }]}
                value={grossAmount}
                onChangeText={setGrossAmount}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={mStyles.label}>Net Amount (optional)</Text>
            <View style={mStyles.amtRow}>
              <Text style={[mStyles.currency, { color: '#10B981' }]}>$</Text>
              <TextInput
                style={[mStyles.input, mStyles.amtInput, { color: '#10B981' }]}
                value={netAmount}
                onChangeText={setNetAmount}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={mStyles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={mStyles.input}
              value={date}
              onChangeText={setDate}
              placeholder={todayStr()}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={mStyles.label}>Notes (optional)</Text>
            <TextInput
              style={[mStyles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional details..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
            />

            <TouchableOpacity
              style={[mStyles.submitBtn, { backgroundColor: '#10B981' }]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={mStyles.submitBtnText}>+ Add Income</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface AddExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (expense: FinancialExpense) => void;
  isLoading: boolean;
}

function AddExpenseModal({ visible, onClose, onAdd, isLoading }: AddExpenseModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState<ExpenseCategory>('personal');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setName('');
    setAmount('');
    setDate(todayStr());
    setCategory('personal');
    setNotes('');
  };

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    const expense: FinancialExpense = {
      id: `expense_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      expenseName: name.trim() || category,
      expenseAmount: amt,
      expenseCategory: category,
      expenseDate: dateStrToTimestamp(date),
      notes: notes.trim(),
      createdAt: Date.now(),
    };
    onAdd(expense);
    reset();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={mStyles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={mStyles.sheet}>
          <View style={mStyles.mHeader}>
            <Text style={mStyles.mTitle}>Add Expense</Text>
            <TouchableOpacity onPress={() => { reset(); onClose(); }} style={mStyles.closeBtn} activeOpacity={0.7}>
              <X color="#fff" size={20} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={mStyles.label}>Expense Name</Text>
            <TextInput
              style={mStyles.input}
              value={name}
              onChangeText={setName}
              placeholder="Groceries, rent, gas..."
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={mStyles.label}>Category</Text>
            <View style={mStyles.chipWrap}>
              {EXPENSE_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[mStyles.chip, category === cat && { backgroundColor: 'rgba(239,68,68,0.3)', borderColor: '#EF4444' }]}
                  onPress={() => setCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text style={[mStyles.chipText, category === cat && { color: '#EF4444' }]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={mStyles.label}>Amount</Text>
            <View style={mStyles.amtRow}>
              <Text style={[mStyles.currency, { color: '#EF4444' }]}>$</Text>
              <TextInput
                style={[mStyles.input, mStyles.amtInput, { color: '#EF4444' }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="decimal-pad"
              />
            </View>

            <Text style={mStyles.label}>Date (YYYY-MM-DD)</Text>
            <TextInput
              style={mStyles.input}
              value={date}
              onChangeText={setDate}
              placeholder={todayStr()}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={mStyles.label}>Notes (optional)</Text>
            <TextInput
              style={[mStyles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional details..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              multiline
            />

            <TouchableOpacity
              style={[mStyles.submitBtn, { backgroundColor: '#EF4444' }]}
              onPress={handleSave}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={mStyles.submitBtnText}>+ Add Expense</Text>
              }
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function FinancialTrackerScreen() {
  const queryClient = useQueryClient();
  const now = new Date();

  const [period, setPeriod] = useState<Period>('monthly');
  const [incomeMonth, setIncomeMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [expenseMonth, setExpenseMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedIncomeDay, setSelectedIncomeDay] = useState<string | null>(null);
  const [selectedExpenseDay, setSelectedExpenseDay] = useState<string | null>(null);
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);

  const [notepadText, setNotepadText] = useState('');
  const [notepadSaved, setNotepadSaved] = useState(false);
  const autosaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [editingNotes, setEditingNotes] = useState(false);
  const [showLoginInfo, setShowLoginInfo] = useState(false);
  const [loginDraft, setLoginDraft] = useState('');
  const [debtNotesDraft, setDebtNotesDraft] = useState('');
  const [debtAmountDraft, setDebtAmountDraft] = useState('');

  const { data: allIncome = [] } = useQuery({
    queryKey: ['financial-income'],
    queryFn: () => financialIncomeDb.getAll(),
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['financial-expenses'],
    queryFn: () => financialExpenseDb.getAll(),
  });

  const { data: financialNotes } = useQuery({
    queryKey: ['financial-notes'],
    queryFn: () => financialNoteDb.get(),
  });

  useEffect(() => {
    AsyncStorage.getItem('financial_notepad').then(v => {
      if (v !== null) setNotepadText(v);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (financialNotes) {
      setLoginDraft(financialNotes.noteLoginInfo ?? '');
      setDebtNotesDraft(financialNotes.noteTotalDebt ?? '');
      setDebtAmountDraft(financialNotes.debtAmount ? financialNotes.debtAmount.toString() : '');
    }
  }, [financialNotes]);

  const handleNotepadChange = useCallback((text: string) => {
    setNotepadText(text);
    setNotepadSaved(false);
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    autosaveRef.current = setTimeout(() => {
      AsyncStorage.setItem('financial_notepad', text).then(() => {
        setNotepadSaved(true);
        setTimeout(() => setNotepadSaved(false), 2000);
      }).catch(() => {});
    }, 1500);
  }, []);

  const handleNotepadSave = useCallback(() => {
    if (autosaveRef.current) clearTimeout(autosaveRef.current);
    AsyncStorage.setItem('financial_notepad', notepadText).then(() => {
      setNotepadSaved(true);
      setTimeout(() => setNotepadSaved(false), 2000);
    }).catch(() => {});
  }, [notepadText]);

  const addIncomeMutation = useMutation({
    mutationFn: (income: FinancialIncome) => financialIncomeDb.create(income),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-income'] });
      setShowAddIncome(false);
    },
  });

  const addExpenseMutation = useMutation({
    mutationFn: (expense: FinancialExpense) => financialExpenseDb.create(expense),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-expenses'] });
      setShowAddExpense(false);
    },
  });

  const saveNotesMutation = useMutation({
    mutationFn: (note: FinancialNote) => financialNoteDb.createOrUpdate(note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['financial-notes'] });
      setEditingNotes(false);
    },
  });

  const handleSaveNotes = useCallback(() => {
    const note: FinancialNote = {
      id: financialNotes?.id ?? 'financial-note-1',
      noteLoginInfo: loginDraft,
      noteTotalDebt: debtNotesDraft,
      debtAmount: parseFloat(debtAmountDraft) || 0,
      debtDueDate: null,
      savingsAmount: financialNotes?.savingsAmount ?? 0,
      emergencyFund: financialNotes?.emergencyFund ?? 0,
      savingsNotes: financialNotes?.savingsNotes ?? '',
      updatedAt: Date.now(),
    };
    saveNotesMutation.mutate(note);
  }, [financialNotes, loginDraft, debtNotesDraft, debtAmountDraft, saveNotesMutation]);

  const periodRange = useMemo(() => getPeriodRange(period), [period]);

  const periodIncome = useMemo(() =>
    allIncome.filter(i => i.incomeDate >= periodRange.start && i.incomeDate <= periodRange.end),
    [allIncome, periodRange]
  );

  const periodExpenses = useMemo(() =>
    allExpenses.filter(e => e.expenseDate >= periodRange.start && e.expenseDate <= periodRange.end),
    [allExpenses, periodRange]
  );

  const grossIncome = useMemo(() => periodIncome.reduce((s, i) => s + i.incomeGross, 0), [periodIncome]);
  const netIncome = useMemo(() => periodIncome.reduce((s, i) => s + i.incomeNet, 0), [periodIncome]);
  const totalExpenses = useMemo(() => periodExpenses.reduce((s, e) => s + e.expenseAmount, 0), [periodExpenses]);
  const moneyLeft = netIncome - totalExpenses;

  const incomeHighlightDays = useMemo(() => {
    const set = new Set<string>();
    allIncome.forEach(i => set.add(timestampToDateStr(i.incomeDate)));
    return set;
  }, [allIncome]);

  const expenseHighlightDays = useMemo(() => {
    const set = new Set<string>();
    allExpenses.forEach(e => set.add(timestampToDateStr(e.expenseDate)));
    return set;
  }, [allExpenses]);

  const prevIncomeMonth = useCallback(() => {
    setIncomeMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1));
  }, []);
  const nextIncomeMonth = useCallback(() => {
    setIncomeMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1));
  }, []);
  const prevExpenseMonth = useCallback(() => {
    setExpenseMonth(p => new Date(p.getFullYear(), p.getMonth() - 1, 1));
  }, []);
  const nextExpenseMonth = useCallback(() => {
    setExpenseMonth(p => new Date(p.getFullYear(), p.getMonth() + 1, 1));
  }, []);

  const recentExpenses = useMemo(() =>
    [...periodExpenses].sort((a, b) => b.expenseDate - a.expenseDate).slice(0, 10),
    [periodExpenses]
  );

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.bg}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Period Filter Tabs */}
          <View style={styles.tabsRow}>
            {(['monthly', 'quarterly', 'yearly'] as Period[]).map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.tab, period === p && styles.tabActive]}
                onPress={() => setPeriod(p)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{periodRange.label}</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gross Income</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatCurrency(grossIncome)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Net Income</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>{formatCurrency(netIncome)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={[styles.summaryValue, { color: '#EF4444' }]}>{formatCurrency(totalExpenses)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.15)' }]} />
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, styles.moneyLeftLabel]}>Money Left Over</Text>
              <Text style={[
                styles.summaryValue,
                styles.moneyLeftValue,
                { color: moneyLeft >= 0 ? '#10B981' : '#EF4444' },
              ]}>
                {formatCurrency(moneyLeft)}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.18)' }]}
                onPress={() => setShowAddIncome(true)}
                activeOpacity={0.75}
                testID="add-income-btn"
              >
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>+ Income</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { borderColor: '#EF4444', backgroundColor: 'rgba(239,68,68,0.18)' }]}
                onPress={() => setShowAddExpense(true)}
                activeOpacity={0.75}
                testID="add-expense-btn"
              >
                <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>+ Expense</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Income Calendar */}
          <CalendarCard
            title="Income Calendar"
            emoji="💰"
            accentColor="#10B981"
            highlightDays={incomeHighlightDays}
            currentMonth={incomeMonth}
            onPrevMonth={prevIncomeMonth}
            onNextMonth={nextIncomeMonth}
            selectedDay={selectedIncomeDay}
            onSelectDay={setSelectedIncomeDay}
          />

          {/* Expense Calendar */}
          <CalendarCard
            title="Expense Calendar"
            emoji="💸"
            accentColor="#EF4444"
            highlightDays={expenseHighlightDays}
            currentMonth={expenseMonth}
            onPrevMonth={prevExpenseMonth}
            onNextMonth={nextExpenseMonth}
            selectedDay={selectedExpenseDay}
            onSelectDay={setSelectedExpenseDay}
          />

          {/* Recent Expenses */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Expenses</Text>
            {recentExpenses.length === 0 ? (
              <Text style={styles.emptyText}>No expenses for this period</Text>
            ) : (
              recentExpenses.map(expense => (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={styles.expenseLeft}>
                    <Text style={styles.expenseName} numberOfLines={1}>{expense.expenseName}</Text>
                    <Text style={styles.expenseMeta}>
                      {expense.expenseCategory} · {timestampToDateStr(expense.expenseDate)}
                    </Text>
                  </View>
                  <Text style={styles.expenseAmt}>{formatCurrency(expense.expenseAmount)}</Text>
                </View>
              ))
            )}
          </View>

          {/* Notepad */}
          <View style={styles.card}>
            <View style={styles.notepadHeader}>
              <View style={styles.notepadTitleRow}>
                <FileText color="#F59E0B" size={20} />
                <Text style={[styles.cardTitle, { marginBottom: 0, marginLeft: 8 }]}>Notepad</Text>
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleNotepadSave}
                activeOpacity={0.7}
              >
                <FileText color="rgba(255,255,255,0.6)" size={14} />
                <Text style={styles.saveBtnText}>{notepadSaved ? 'Saved ✓' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.notepadInput}
              value={notepadText}
              onChangeText={handleNotepadChange}
              placeholder="Jot down financial thoughts, reminders, goals..."
              placeholderTextColor="rgba(255,255,255,0.28)"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.autosaveHint}>Auto-saves after you stop typing</Text>
          </View>

          {/* Financial Notes */}
          <View style={styles.card}>
            <View style={styles.notesHeader}>
              <Text style={styles.cardTitle}>Financial Notes</Text>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => {
                  if (editingNotes) {
                    handleSaveNotes();
                  } else {
                    setEditingNotes(true);
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.editBtnText}>
                  {editingNotes
                    ? (saveNotesMutation.isPending ? 'Saving...' : 'Save')
                    : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Info Panel */}
            <View style={styles.loginPanel}>
              <View style={styles.panelHeader}>
                <Lock color="#F59E0B" size={15} />
                <Text style={styles.loginPanelTitle}>Important Login Info</Text>
                <TouchableOpacity
                  onPress={() => setShowLoginInfo(!showLoginInfo)}
                  style={styles.eyeBtn}
                  activeOpacity={0.7}
                >
                  {showLoginInfo
                    ? <EyeOff color="rgba(255,255,255,0.6)" size={17} />
                    : <Eye color="rgba(255,255,255,0.6)" size={17} />
                  }
                </TouchableOpacity>
              </View>
              {editingNotes ? (
                <TextInput
                  style={styles.panelInput}
                  value={loginDraft}
                  onChangeText={setLoginDraft}
                  placeholder="Bank logins, investment accounts..."
                  placeholderTextColor="rgba(255,255,255,0.28)"
                  secureTextEntry={!showLoginInfo}
                  multiline
                  textAlignVertical="top"
                />
              ) : (
                <Text style={styles.maskedText}>
                  {showLoginInfo
                    ? (financialNotes?.noteLoginInfo || 'No login info saved')
                    : '••••••••••••••••••••••'}
                </Text>
              )}
            </View>

            {/* Debt Panel */}
            <View style={styles.debtPanel}>
              <View style={styles.panelHeader}>
                <AlertCircle color="#EF4444" size={15} />
                <Text style={styles.debtPanelTitle}>Total Debt Notes</Text>
              </View>
              {editingNotes ? (
                <>
                  <TextInput
                    style={[styles.panelInput, { marginBottom: 10 }]}
                    value={debtNotesDraft}
                    onChangeText={setDebtNotesDraft}
                    placeholder="Credit cards, loans, mortgages..."
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.debtFieldLabel}>Total Debt Amount ($)</Text>
                  <TextInput
                    style={styles.panelInput}
                    value={debtAmountDraft}
                    onChangeText={setDebtAmountDraft}
                    placeholder="0.00"
                    placeholderTextColor="rgba(255,255,255,0.28)"
                    keyboardType="decimal-pad"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.debtNoteText}>
                    {financialNotes?.noteTotalDebt || 'No debt notes'}
                  </Text>
                  <View style={styles.debtDivider} />
                  <View style={styles.debtAmtRow}>
                    <Text style={styles.debtAmtLabel}>Total Debt Amount:</Text>
                    <Text style={styles.debtAmtValue}>
                      {formatCurrency(financialNotes?.debtAmount ?? 0)}
                    </Text>
                  </View>
                </>
              )}
            </View>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </ImageBackground>

      <AddIncomeModal
        visible={showAddIncome}
        onClose={() => setShowAddIncome(false)}
        onAdd={income => addIncomeMutation.mutate(income)}
        isLoading={addIncomeMutation.isPending}
      />

      <AddExpenseModal
        visible={showAddExpense}
        onClose={() => setShowAddExpense(false)}
        onAdd={expense => addExpenseMutation.mutate(expense)}
        isLoading={addExpenseMutation.isPending}
      />
    </View>
  );
}

const calStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(12, 18, 55, 0.78)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  emoji: {
    fontSize: 22,
  },
  title: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
  },
  weekdaysRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600' as const,
    paddingVertical: 4,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  dayCell: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    margin: 1.5,
  },
  emptyCell: {
    flex: 1,
    height: 40,
    margin: 1.5,
  },
  dayText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500' as const,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
});

const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0e1640',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  mTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  amtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 13,
  },
  currency: {
    fontSize: 18,
    fontWeight: '700' as const,
    marginRight: 6,
  },
  amtInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    paddingVertical: 13,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600' as const,
  },
  submitBtn: {
    borderRadius: 14,
    padding: 17,
    alignItems: 'center',
    marginTop: 22,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050a1a',
  },
  bg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 8, 30, 0.55)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 14,
    padding: 3,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(120, 80, 255, 0.45)',
    shadowColor: '#7B5CF5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: {
    color: '#fff',
  },
  summaryCard: {
    backgroundColor: 'rgba(14, 20, 65, 0.82)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(120, 100, 255, 0.3)',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500' as const,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
  moneyLeftLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
  moneyLeftValue: {
    fontSize: 20,
    fontWeight: '700' as const,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  card: {
    backgroundColor: 'rgba(14, 20, 60, 0.78)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    paddingVertical: 16,
    fontStyle: 'italic',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  expenseLeft: {
    flex: 1,
    marginRight: 12,
  },
  expenseName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 2,
  },
  expenseMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'capitalize',
  },
  expenseAmt: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#EF4444',
  },
  notepadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notepadTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.75)',
  },
  notepadInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  autosaveHint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 8,
    fontStyle: 'italic',
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  editBtn: {
    backgroundColor: 'rgba(120, 80, 255, 0.25)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(120, 80, 255, 0.5)',
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  loginPanel: {
    borderWidth: 1.5,
    borderColor: 'rgba(245,158,11,0.45)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    backgroundColor: 'rgba(245,158,11,0.06)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  loginPanelTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#F59E0B',
    flex: 1,
  },
  eyeBtn: {
    padding: 4,
  },
  maskedText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
  },
  debtPanel: {
    borderWidth: 1.5,
    borderColor: 'rgba(239,68,68,0.45)',
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.06)',
  },
  debtPanelTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#EF4444',
    flex: 1,
  },
  debtNoteText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 12,
    lineHeight: 20,
  },
  debtDivider: {
    height: 1,
    backgroundColor: 'rgba(239,68,68,0.2)',
    marginBottom: 12,
  },
  debtAmtRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  debtAmtLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
  },
  debtAmtValue: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#EF4444',
  },
  panelInput: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  debtFieldLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 6,
    marginTop: 4,
  },
});
