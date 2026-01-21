import React from 'react';
import { View, StyleSheet, ScrollView, ImageBackground, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Lock, CreditCard, PiggyBank, ChevronRight, Eye, EyeOff } from 'lucide-react-native';
import { financialNoteDb } from '@/lib/database';

export default function FinancialTrackerScreen() {
  const router = useRouter();
  const [showLogins, setShowLogins] = React.useState(false);

  const { data: notesData } = useQuery({
    queryKey: ['financial-notes'],
    queryFn: () => financialNoteDb.get(),
  });

  const navigateToNotes = (section: string) => {
    router.push(`/financial/notes?section=${section}` as any);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.headerTitle}>Financial Notes</Text>
          <Text style={styles.headerSubtitle}>Keep your important financial information secure</Text>

          <TouchableOpacity
            style={styles.noteCard}
            onPress={() => navigateToNotes('logins')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <Lock color="#8B5CF6" size={24} />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Important Logins</Text>
                <Text style={styles.cardSubtitle}>Bank accounts, investments, credentials</Text>
              </View>
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  setShowLogins(!showLogins);
                }}
              >
                {showLogins ? (
                  <EyeOff color="#666" size={20} />
                ) : (
                  <Eye color="#666" size={20} />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.cardContent}>
              {notesData?.noteLoginInfo ? (
                <Text style={styles.cardPreview} numberOfLines={showLogins ? undefined : 2}>
                  {showLogins ? notesData.noteLoginInfo : '••••••••••••••••••••'}
                </Text>
              ) : (
                <Text style={styles.emptyText}>Tap to add login information</Text>
              )}
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.editText}>Edit</Text>
              <ChevronRight color="#8B5CF6" size={18} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.noteCard}
            onPress={() => navigateToNotes('debt')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, styles.debtIcon]}>
                <CreditCard color="#EF4444" size={24} />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Debt</Text>
                <Text style={styles.cardSubtitle}>Credit cards, loans, mortgages</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              {notesData && notesData.debtAmount > 0 ? (
                <>
                  <Text style={styles.amountLabel}>Total Debt</Text>
                  <Text style={[styles.amountValue, styles.debtAmount]}>
                    ${notesData.debtAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </Text>
                  {notesData.noteTotalDebt ? (
                    <Text style={styles.cardPreview} numberOfLines={2}>
                      {notesData.noteTotalDebt}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.emptyText}>Tap to track your debt</Text>
              )}
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.editText}>Edit</Text>
              <ChevronRight color="#8B5CF6" size={18} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.noteCard}
            onPress={() => navigateToNotes('savings')}
            activeOpacity={0.8}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.iconContainer, styles.savingsIcon]}>
                <PiggyBank color="#10B981" size={24} />
              </View>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>Savings</Text>
                <Text style={styles.cardSubtitle}>Savings accounts, emergency fund</Text>
              </View>
            </View>
            <View style={styles.cardContent}>
              {notesData && (notesData.savingsAmount > 0 || notesData.emergencyFund > 0 || notesData.savingsNotes) ? (
                <>
                  <View style={styles.savingsRow}>
                    <View style={styles.savingsItem}>
                      <Text style={styles.amountLabel}>Savings</Text>
                      <Text style={[styles.amountValue, styles.savingsAmount]}>
                        ${notesData.savingsAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    <View style={styles.savingsItem}>
                      <Text style={styles.amountLabel}>Emergency Fund</Text>
                      <Text style={[styles.amountValue, styles.savingsAmount]}>
                        ${notesData.emergencyFund.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                  {notesData.savingsNotes ? (
                    <Text style={styles.cardPreview} numberOfLines={2}>
                      {notesData.savingsNotes}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.emptyText}>Tap to track your savings</Text>
              )}
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.editText}>Edit</Text>
              <ChevronRight color="#8B5CF6" size={18} />
            </View>
          </TouchableOpacity>
        </ScrollView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 28,
  },
  noteCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  debtIcon: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  savingsIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  eyeButton: {
    padding: 8,
  },
  cardContent: {
    marginBottom: 16,
  },
  cardPreview: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
  },
  amountLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  debtAmount: {
    color: '#EF4444',
  },
  savingsAmount: {
    color: '#10B981',
  },
  savingsRow: {
    flexDirection: 'row',
    gap: 24,
  },
  savingsItem: {
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  editText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#8B5CF6',
    marginRight: 4,
  },
});
