import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, Stack } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, Camera, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { manifestationsDb } from '@/lib/database';
import type { Manifestation } from '@/types';

const MOOD_TAGS: {
  key: Manifestation['category'];
  label: string;
  emoji: string;
}[] = [
  { key: 'wealth', label: 'Wealth', emoji: '💰' },
  { key: 'love', label: 'Love', emoji: '💞' },
  { key: 'health', label: 'Health', emoji: '🌿' },
  { key: 'focus', label: 'Focus', emoji: '🎯' },
  { key: 'creativity', label: 'Creativity', emoji: '🎨' },
  { key: 'healing', label: 'Healing', emoji: '💫' },
];

export default function AddManifestationScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [intention, setIntention] = useState('');
  const [selectedMood, setSelectedMood] = useState<Manifestation['category'] | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (manifestation: Manifestation) => manifestationsDb.create(manifestation),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manifestations'] });
      router.back();
    },
    onError: (error) => {
      console.error('[AddManifestation] Create failed:', error);
      Alert.alert('Error', 'Failed to create manifestation. Please try again.');
    },
  });

  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return false;
      }
    }
    return true;
  }, []);

  const handleUpload = useCallback(async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        console.log('[AddManifestation] Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('[AddManifestation] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  }, [requestPermissions]);

  const handleCamera = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Not Available', 'Camera is not available on web. Please use Upload instead.');
        return;
      }

      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow camera access.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        console.log('[AddManifestation] Photo captured:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('[AddManifestation] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageUri(null);
  }, []);

  const handleCreate = useCallback(() => {
    if (!intention.trim() && !imageUri) {
      Alert.alert('Missing Info', 'Please add a vision image or write an intention.');
      return;
    }

    const manifestation: Manifestation = {
      id: Date.now().toString(),
      title: intention.trim() || 'My Vision',
      description: '',
      category: selectedMood ?? 'other',
      intention: intention.trim(),
      images: imageUri ? [imageUri] : [],
      isFavorite: false,
      order: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log('[AddManifestation] Creating manifestation:', manifestation.id);
    createMutation.mutate(manifestation);
  }, [intention, imageUri, selectedMood, createMutation]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          presentation: 'modal',
          title: 'Add Manifestation',
          headerStyle: { backgroundColor: '#0c0520' },
          headerTintColor: '#ffffff',
          headerShadowVisible: false,
          headerTitleStyle: { color: '#ffffff' },
        }}
      />

      <LinearGradient
        colors={['#1a0a3e', '#0c0520', '#0d1033']}
        style={styles.background}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerEmoji}>✨</Text>
            <Text style={styles.headerTitle}>Add Manifestation</Text>
          </View>

          <Text style={styles.sectionLabel}>Vision Image</Text>
          <View style={styles.imageUploadArea}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  activeOpacity={0.7}
                >
                  <X color="#ffffff" size={18} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.uploadButtonsRow}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleUpload}
                    activeOpacity={0.7}
                    testID="upload-button"
                  >
                    <Upload color="#c4b5fd" size={24} />
                    <Text style={styles.uploadButtonText}>Upload</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleCamera}
                    activeOpacity={0.7}
                    testID="camera-button"
                  >
                    <Camera color="#c4b5fd" size={24} />
                    <Text style={styles.uploadButtonText}>Camera</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Your Intention</Text>
          <TextInput
            style={styles.intentionInput}
            value={intention}
            onChangeText={setIntention}
            placeholder="I am attracting abundance and joy..."
            placeholderTextColor="rgba(180, 170, 200, 0.5)"
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            testID="intention-input"
          />

          <Text style={styles.sectionLabel}>Mood Tag (optional)</Text>
          <View style={styles.moodGrid}>
            {MOOD_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.key}
                style={[
                  styles.moodTag,
                  selectedMood === tag.key && styles.moodTagActive,
                ]}
                onPress={() =>
                  setSelectedMood((prev) => (prev === tag.key ? null : tag.key))
                }
                activeOpacity={0.7}
                testID={`mood-${tag.key}`}
              >
                <Text style={styles.moodEmoji}>{tag.emoji}</Text>
                <Text
                  style={[
                    styles.moodLabel,
                    selectedMood === tag.key && styles.moodLabelActive,
                  ]}
                >
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreate}
            disabled={createMutation.isPending}
            activeOpacity={0.8}
            testID="create-portal-button"
          >
            <LinearGradient
              colors={['#7c3aed', '#4f46e5', '#3b82f6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.createButtonGradient}
            >
              <Text style={styles.createButtonText}>
                {createMutation.isPending ? 'Creating...' : 'Create Portal'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0520',
  },
  background: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 28,
  },
  headerEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: 'rgba(200, 190, 220, 0.8)',
    marginBottom: 10,
    marginTop: 4,
  },
  imageUploadArea: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderStyle: 'dashed' as const,
    overflow: 'hidden',
    marginBottom: 24,
    minHeight: 200,
    backgroundColor: 'rgba(124, 58, 237, 0.06)',
  },
  uploadPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  uploadButtonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  uploadButton: {
    backgroundColor: 'rgba(124, 58, 237, 0.2)',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.25)',
  },
  uploadButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#c4b5fd',
  },
  imagePreviewContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intentionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    minHeight: 120,
    marginBottom: 24,
    lineHeight: 22,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  moodTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    width: '23%' as any,
    minWidth: 72,
  },
  moodTagActive: {
    backgroundColor: 'rgba(124, 58, 237, 0.35)',
    borderColor: 'rgba(124, 58, 237, 0.6)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  moodEmoji: {
    fontSize: 20,
  },
  moodLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: 'rgba(200, 190, 220, 0.6)',
  },
  moodLabelActive: {
    color: '#ffffff',
  },
  createButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#ffffff',
    letterSpacing: 0.3,
  },
});
