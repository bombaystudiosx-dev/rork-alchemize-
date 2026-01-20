import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Dimensions, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Edit2, Save, X, Trash2, Camera, ImageIcon } from 'lucide-react-native';
import { manifestationsDb } from '@/lib/database';
import type { Manifestation } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CATEGORIES = ['wealth', 'love', 'health', 'career', 'relationships', 'other'] as const;

export default function ManifestationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]>('wealth');
  const [intention, setIntention] = useState('');
  const [images, setImages] = useState<string[]>([]);

  const { data: manifestation } = useQuery({
    queryKey: ['manifestation', id],
    queryFn: () => manifestationsDb.getById(id!),
    enabled: !!id,
  });

  React.useEffect(() => {
    if (manifestation) {
      setTitle(manifestation.title);
      setCategory(manifestation.category);
      setIntention(manifestation.intention);
      setImages(manifestation.images);
    }
  }, [manifestation]);

  const updateMutation = useMutation({
    mutationFn: (updated: Manifestation) => manifestationsDb.update(updated),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifestations'] });
      queryClient.invalidateQueries({ queryKey: ['manifestation', id] });
      setIsEditing(false);
      Alert.alert('Success', 'Manifestation updated successfully');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => manifestationsDb.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifestations'] });
      router.back();
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }

    if (!manifestation) return;

    const updated: Manifestation = {
      ...manifestation,
      title: title.trim(),
      category,
      intention: intention.trim(),
      images,
      updatedAt: Date.now(),
    };

    updateMutation.mutate(updated);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Manifestation',
      'Are you sure you want to delete this manifestation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id!),
        },
      ]
    );
  };

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return false;
      }
    }
    return true;
  };

  const handlePickImage = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages].slice(0, 5));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

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
        setImages(prev => [...prev, result.assets[0].uri].slice(0, 5));
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!manifestation) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (isEditing) {
    return (
      <View style={styles.container}>
        <View style={styles.editHeader}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setIsEditing(false)}>
            <X color="#ffffff" size={24} />
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSave}>
            <Save color="#6366f1" size={24} />
            <Text style={[styles.headerButtonText, styles.saveText]}>Save</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.editContent}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="My manifestation..."
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Intention</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={intention}
            onChangeText={setIntention}
            placeholder="Describe your intention..."
            placeholderTextColor="#9ca3af"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={styles.label}>Images (up to 5)</Text>
          <View style={styles.imagePickerContainer}>
            <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
              <ImageIcon color="#ffffff" size={24} />
              <Text style={styles.imagePickerText}>Choose Photos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.imagePickerButton} onPress={handleTakePhoto}>
              <Camera color="#ffffff" size={24} />
              <Text style={styles.imagePickerText}>Take Photo</Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 && (
            <ScrollView horizontal style={styles.imagePreviewContainer} showsHorizontalScrollIndicator={false}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Trash2 color="#ffffff" size={16} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {manifestation.images.length > 0 && (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageCarousel}
          >
            {manifestation.images.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={styles.image}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        )}

        <View style={styles.infoContainer}>
          <Text style={styles.category}>{manifestation.category}</Text>
          <Text style={styles.title}>{manifestation.title}</Text>
          {manifestation.intention && (
            <Text style={styles.intention}>{manifestation.intention}</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
          <Edit2 color="#ffffff" size={20} />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Trash2 color="#ffffff" size={20} />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
  imageCarousel: {
    height: 300,
  },
  image: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  infoContainer: {
    padding: 20,
  },
  category: {
    fontSize: 14,
    color: '#818cf8',
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 16,
  },
  intention: {
    fontSize: 16,
    color: '#d1d5db',
    lineHeight: 24,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 14,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
  },
  headerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  saveText: {
    color: '#6366f1',
  },
  editContent: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  categoryChipActive: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  categoryText: {
    fontSize: 14,
    color: '#d1d5db',
    fontWeight: '500' as const,
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  imagePickerContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  imagePickerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  imagePickerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  imagePreviewContainer: {
    marginTop: 12,
  },
  imagePreviewWrapper: {
    marginRight: 12,
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#1a1a1a',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 12,
    padding: 4,
  },
});
