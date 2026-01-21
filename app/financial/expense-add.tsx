import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { financialExpenseDb } from '@/lib/database';
import type { FinancialExpense } from '@/types';

const FREQUENCIES = [
  { value: 'one-time', label: 'One-Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'bi-weekly', label: 'Bi-Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export default function AddExpenseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [frequency, setFrequency] = useState<'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [notes, setNotes] = useState('');

  const saveMutation = useMutation({
    mutationFn: (expense: FinancialExpense) => financialExpenseDb.create(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-expenses'] });
      Alert.alert('Success', 'Expense added successfully');
      router.back();
    },
  });

  const handleSave = () => {
    if (!expenseName.trim()) {
      Alert.alert('Error', 'Please enter expense name');
      return;
    }
    if (!expenseAmount.trim()) {
      Alert.alert('Error', 'Please enter expense amount');
      return;
    }

    const amount = parseFloat(expenseAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const expense: FinancialExpense = {
      id: `expense-${Date.now()}`,
      expenseName: expenseName.trim(),
      expenseAmount: amount,
      expenseCategory: 'bills',
      expenseDate: Date.now(),
      notes: notes.trim(),
      frequency,
      createdAt: Date.now(),
    };

    saveMutation.mutate(expense);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Expense Name</Text>
        <TextInput
          style={styles.input}
          value={expenseName}
          onChangeText={setExpenseName}
          placeholder="e.g., Netflix, Rent, Car Insurance"
          placeholderTextColor="#555"
        />

        <Text style={styles.label}>Amount</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={expenseAmount}
            onChangeText={setExpenseAmount}
            placeholder="0.00"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.label}>Frequency</Text>
        <View style={styles.frequencyGrid}>
          {FREQUENCIES.map((freq) => (
            <TouchableOpacity
              key={freq.value}
              style={[
                styles.frequencyButton,
                frequency === freq.value && styles.frequencyButtonActive,
              ]}
              onPress={() => setFrequency(freq.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  frequency === freq.value && styles.frequencyButtonTextActive,
                ]}
              >
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional details about this expense..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {saveMutation.isPending ? 'Adding...' : 'Add Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#F59E0B',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#F59E0B',
    paddingVertical: 16,
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  frequencyButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: '47%',
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderColor: '#8B5CF6',
  },
  frequencyButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  frequencyButtonTextActive: {
    color: '#8B5CF6',
  },
  saveButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#fff',
  },
});
