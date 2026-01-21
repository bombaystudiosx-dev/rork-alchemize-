import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react-native';
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

export default function EditExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [frequency, setFrequency] = useState<'one-time' | 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [notes, setNotes] = useState('');

  const { data: expenses } = useQuery({
    queryKey: ['financial-expenses'],
    queryFn: () => financialExpenseDb.getAll(),
  });

  const existingExpense = expenses?.find((e) => e.id === params.id);

  useEffect(() => {
    if (existingExpense) {
      setExpenseName(existingExpense.expenseName);
      setExpenseAmount(existingExpense.expenseAmount.toString());
      setFrequency(existingExpense.frequency);
      setNotes(existingExpense.notes || '');
    }
  }, [existingExpense]);

  const updateMutation = useMutation({
    mutationFn: (expense: FinancialExpense) => financialExpenseDb.update(expense),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-expenses'] });
      Alert.alert('Success', 'Expense updated successfully');
      router.back();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financialExpenseDb.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-expenses'] });
      Alert.alert('Success', 'Expense deleted successfully');
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

    if (!existingExpense) return;

    const expense: FinancialExpense = {
      ...existingExpense,
      expenseName: expenseName.trim(),
      expenseAmount: amount,
      notes: notes.trim(),
      frequency,
    };

    updateMutation.mutate(expense);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (params.id && typeof params.id === 'string') {
              deleteMutation.mutate(params.id);
            }
          },
        },
      ]
    );
  };

  if (!existingExpense) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Expense not found</Text>
      </View>
    );
  }

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
          disabled={updateMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {updateMutation.isPending ? 'Updating...' : 'Update Expense'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleteMutation.isPending}
        >
          <Trash2 color="#EF4444" size={20} />
          <Text style={styles.deleteButtonText}>Delete Expense</Text>
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
  errorText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    marginTop: 40,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#EF4444',
    marginLeft: 8,
  },
});
