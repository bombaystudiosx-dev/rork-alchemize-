import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financialIncomeDb, financialExpenseDb } from '@/lib/database';
import type { FinancialIncome, FinancialExpense, IncomeCategory, ExpenseCategory } from '@/types';

const INCOME_CATEGORIES: IncomeCategory[] = ['salary', 'freelance', 'business', 'investment', 'bonus', 'other'];
const EXPENSE_CATEGORIES: ExpenseCategory[] = ['bills', 'business', 'personal', 'food', 'transport', 'entertainment', 'shopping', 'health', 'education', 'other'];

export default function AddFinancialScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  
  const type = (params.type as 'income' | 'expense') || 'expense';
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [incomeGross, setIncomeGross] = useState('');
  const [incomeNet, setIncomeNet] = useState('');
  const [taxPercentage, setTaxPercentage] = useState('');
  const [deductions, setDeductions] = useState('');
  const [incomeCategory, setIncomeCategory] = useState<IncomeCategory>('salary');
  
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('personal');
  
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (params.date && typeof params.date === 'string') {
      const dateTimestamp = parseInt(params.date, 10);
      if (!isNaN(dateTimestamp)) {
        setSelectedDate(new Date(dateTimestamp));
      }
    }
  }, [params.date]);

  const createIncomeMutation = useMutation({
    mutationFn: (income: FinancialIncome) => financialIncomeDb.create(income),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-income'] });
      router.back();
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (expense: FinancialExpense) => financialExpenseDb.create(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-expenses'] });
      router.back();
    },
  });

  const handleSaveIncome = () => {
    const grossAmount = parseFloat(incomeGross);
    const netAmount = parseFloat(incomeNet);
    
    if (isNaN(grossAmount) || grossAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid gross income amount');
      return;
    }
    
    if (isNaN(netAmount) || netAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid net income amount');
      return;
    }

    const taxPercent = parseFloat(taxPercentage) || 0;
    const deductionsAmount = parseFloat(deductions) || 0;
    const taxAmount = (grossAmount * taxPercent) / 100;

    const income: FinancialIncome = {
      id: Date.now().toString(),
      incomeGross: grossAmount,
      incomeNet: netAmount,
      taxAmount,
      taxPercentage: taxPercent,
      deductions: deductionsAmount,
      incomeCategory,
      incomeDate: selectedDate.getTime(),
      notes: notes.trim(),
      createdAt: Date.now(),
    };

    createIncomeMutation.mutate(income);
  };

  const handleSaveExpense = () => {
    const amount = parseFloat(expenseAmount);
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid expense amount');
      return;
    }
    
    if (!expenseName.trim()) {
      Alert.alert('Error', 'Please enter an expense name');
      return;
    }

    const expense: FinancialExpense = {
      id: Date.now().toString(),
      expenseName: expenseName.trim(),
      expenseAmount: amount,
      expenseCategory,
      expenseDate: selectedDate.getTime(),
      notes: notes.trim(),
      createdAt: Date.now(),
    };

    createExpenseMutation.mutate(expense);
  };

  const handleSave = () => {
    if (type === 'income') {
      handleSaveIncome();
    } else {
      handleSaveExpense();
    }
  };

  const isPending = createIncomeMutation.isPending || createExpenseMutation.isPending;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.typeHeader}>
          <Text style={[styles.typeTitle, type === 'income' ? styles.incomeColor : styles.expenseColor]}>
            {type === 'income' ? '💰 Add Income' : '💸 Add Expense'}
          </Text>
        </View>

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity 
          style={styles.dateButton}
          onPress={() => {
            Alert.prompt(
              'Select Date',
              `Current: ${selectedDate.toLocaleDateString()}`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Set',
                  onPress: (text?: string) => {
                    if (text) {
                      const date = new Date(text);
                      if (!isNaN(date.getTime())) {
                        setSelectedDate(date);
                      } else {
                        Alert.alert('Invalid date', 'Please enter a valid date (e.g., 2024-01-15)');
                      }
                    }
                  },
                },
              ],
              'plain-text',
              selectedDate.toISOString().split('T')[0]
            );
          }}
        >
          <Text style={styles.dateButtonText}>
            {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </TouchableOpacity>

        {type === 'income' ? (
          <>
            <Text style={styles.label}>Gross Income</Text>
            <TextInput
              style={styles.input}
              value={incomeGross}
              onChangeText={setIncomeGross}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Net Income</Text>
            <TextInput
              style={styles.input}
              value={incomeNet}
              onChangeText={setIncomeNet}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Tax Percentage (Optional)</Text>
            <TextInput
              style={styles.input}
              value={taxPercentage}
              onChangeText={setTaxPercentage}
              placeholder="0"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Deductions (Optional)</Text>
            <TextInput
              style={styles.input}
              value={deductions}
              onChangeText={setDeductions}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {INCOME_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    incomeCategory === cat && styles.categoryChipSelectedIncome,
                  ]}
                  onPress={() => setIncomeCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      incomeCategory === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>Expense Name</Text>
            <TextInput
              style={styles.input}
              value={expenseName}
              onChangeText={setExpenseName}
              placeholder="e.g., Groceries, Rent..."
              placeholderTextColor="#666"
            />

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              value={expenseAmount}
              onChangeText={setExpenseAmount}
              placeholder="0.00"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {EXPENSE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryChip,
                    expenseCategory === cat && styles.categoryChipSelectedExpense,
                  ]}
                  onPress={() => setExpenseCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      expenseCategory === cat && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any additional details..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[
            styles.saveButton,
            type === 'income' ? styles.saveButtonIncome : styles.saveButtonExpense,
          ]}
          onPress={handleSave}
          disabled={isPending}
        >
          <Text style={styles.saveButtonText}>
            {isPending ? 'Saving...' : `Save ${type === 'income' ? 'Income' : 'Expense'}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  typeHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  typeTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
  },
  incomeColor: {
    color: '#10b981',
  },
  expenseColor: {
    color: '#ef4444',
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 42, 0.8)',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  dateButton: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 42, 0.8)',
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#6366f1',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(26, 26, 26, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(42, 42, 42, 0.8)',
  },
  categoryChipSelectedIncome: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryChipSelectedExpense: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#a0a0a0',
    textTransform: 'capitalize',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  saveButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  saveButtonIncome: {
    backgroundColor: '#10b981',
  },
  saveButtonExpense: {
    backgroundColor: '#ef4444',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
