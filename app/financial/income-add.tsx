import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import { financialIncomeDb } from '@/lib/database';
import type { FinancialIncome } from '@/types';

const INCOME_CATEGORIES = [
  { value: 'salary', label: 'Salary' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'business', label: 'Business' },
  { value: 'investment', label: 'Investment' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'other', label: 'Other' },
] as const;

export default function AddIncomeScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [grossAmount, setGrossAmount] = useState('');
  const [netAmount, setNetAmount] = useState('');
  const [category, setCategory] = useState<'salary' | 'freelance' | 'business' | 'investment' | 'bonus' | 'other'>('salary');
  const [notes, setNotes] = useState('');
  const [incomeDate] = useState(new Date());

  const saveMutation = useMutation({
    mutationFn: (income: FinancialIncome) => financialIncomeDb.create(income),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-income'] });
      Alert.alert('Success', 'Income added successfully');
      router.back();
    },
  });

  const handleSave = () => {
    if (!grossAmount.trim() && !netAmount.trim()) {
      Alert.alert('Error', 'Please enter at least one amount');
      return;
    }

    const gross = parseFloat(grossAmount) || 0;
    const net = parseFloat(netAmount) || gross;

    if (gross <= 0 && net <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const taxAmount = gross > 0 ? gross - net : 0;
    const taxPercentage = gross > 0 ? (taxAmount / gross) * 100 : 0;

    const income: FinancialIncome = {
      id: `income-${Date.now()}`,
      incomeGross: gross,
      incomeNet: net > 0 ? net : gross,
      taxAmount,
      taxPercentage,
      deductions: 0,
      incomeCategory: category,
      incomeDate: incomeDate.getTime(),
      notes: notes.trim(),
      createdAt: Date.now(),
    };

    saveMutation.mutate(income);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Add Income',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
              <ArrowLeft size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Gross Amount (Optional)</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.amountInput}
            value={grossAmount}
            onChangeText={setGrossAmount}
            placeholder="0.00"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.label}>Net Amount (Take Home)</Text>
        <View style={[styles.amountInputContainer, styles.netAmountContainer]}>
          <Text style={[styles.currencySymbol, styles.netCurrency]}>$</Text>
          <TextInput
            style={[styles.amountInput, styles.netInput]}
            value={netAmount}
            onChangeText={setNetAmount}
            placeholder="0.00"
            placeholderTextColor="#555"
            keyboardType="decimal-pad"
          />
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryGrid}>
          {INCOME_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryButton,
                category === cat.value && styles.categoryButtonActive,
              ]}
              onPress={() => setCategory(cat.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  category === cat.value && styles.categoryButtonTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Date</Text>
        <View style={styles.dateContainer}>
          <Calendar size={20} color="#22c55e" />
          <Text style={styles.dateText}>{formatDate(incomeDate)}</Text>
        </View>

        <Text style={styles.label}>Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Additional details about this income..."
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
            {saveMutation.isPending ? 'Adding...' : 'Add Income'}
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
  headerBackButton: {
    padding: 8,
    marginLeft: -8,
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
  netAmountContainer: {
    borderColor: 'rgba(34, 197, 94, 0.3)',
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.5)',
    marginRight: 8,
  },
  netCurrency: {
    color: '#22c55e',
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600' as const,
    color: '#fff',
    paddingVertical: 16,
  },
  netInput: {
    color: '#22c55e',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minWidth: '30%',
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22c55e',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  categoryButtonTextActive: {
    color: '#22c55e',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  dateText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500' as const,
  },
  saveButton: {
    backgroundColor: '#22c55e',
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
