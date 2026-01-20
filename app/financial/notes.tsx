import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react-native';
import { financialNoteDb } from '@/lib/database';
import type { FinancialNote } from '@/types';

export default function FinancialNotesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [loginInfo, setLoginInfo] = useState('');
  const [showLoginInfo, setShowLoginInfo] = useState(false);
  const [debtNotes, setDebtNotes] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [savingsAmount, setSavingsAmount] = useState('');
  const [emergencyFund, setEmergencyFund] = useState('');

  const { data: existingNotes } = useQuery({
    queryKey: ['financial-notes'],
    queryFn: () => financialNoteDb.get(),
  });

  useEffect(() => {
    if (existingNotes) {
      setLoginInfo(existingNotes.noteLoginInfo);
      setDebtNotes(existingNotes.noteTotalDebt);
      setDebtAmount(existingNotes.debtAmount.toString());
      setSavingsAmount(existingNotes.savingsAmount.toString());
      setEmergencyFund(existingNotes.emergencyFund.toString());
    }
  }, [existingNotes]);

  const saveMutation = useMutation({
    mutationFn: (note: FinancialNote) => financialNoteDb.createOrUpdate(note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-notes'] });
      Alert.alert('Success', 'Financial notes saved successfully');
      router.back();
    },
  });

  const handleSave = () => {
    const debt = parseFloat(debtAmount) || 0;
    const savings = parseFloat(savingsAmount) || 0;
    const emergency = parseFloat(emergencyFund) || 0;

    const note: FinancialNote = {
      id: existingNotes?.id || 'financial-note-1',
      noteLoginInfo: loginInfo.trim(),
      noteTotalDebt: debtNotes.trim(),
      debtAmount: debt,
      debtDueDate: null,
      savingsAmount: savings,
      emergencyFund: emergency,
      updatedAt: Date.now(),
    };

    saveMutation.mutate(note);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔒 Important Login Info</Text>
          <Text style={styles.sectionDescription}>
            Securely store important financial account information
          </Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, styles.passwordInput]}
              value={loginInfo}
              onChangeText={setLoginInfo}
              placeholder="Bank login, investment accounts..."
              placeholderTextColor="#666"
              secureTextEntry={!showLoginInfo}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowLoginInfo(!showLoginInfo)}
            >
              {showLoginInfo ? (
                <EyeOff color="#6366f1" size={24} />
              ) : (
                <Eye color="#6366f1" size={24} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💳 Total Debt</Text>
          <Text style={styles.label}>Debt Amount</Text>
          <TextInput
            style={styles.input}
            value={debtAmount}
            onChangeText={setDebtAmount}
            placeholder="0.00"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <Text style={styles.label}>Debt Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={debtNotes}
            onChangeText={setDebtNotes}
            placeholder="Credit cards, loans, mortgages..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 Savings & Emergency Fund</Text>
          <Text style={styles.label}>Savings Amount</Text>
          <TextInput
            style={styles.input}
            value={savingsAmount}
            onChangeText={setSavingsAmount}
            placeholder="0.00"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
          <Text style={styles.label}>Emergency Fund</Text>
          <TextInput
            style={styles.input}
            value={emergencyFund}
            onChangeText={setEmergencyFund}
            placeholder="0.00"
            placeholderTextColor="#666"
            keyboardType="decimal-pad"
          />
        </View>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saveMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {saveMutation.isPending ? 'Saving...' : 'Save Notes'}
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
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#a0a0a0',
    marginBottom: 16,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 56,
    minHeight: 100,
    paddingTop: 16,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#fff',
  },
});
