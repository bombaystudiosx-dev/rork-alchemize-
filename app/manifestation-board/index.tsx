import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Dimensions, Alert, ImageBackground, Animated } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Play, Edit2, ArrowLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { manifestationsDb } from '@/lib/database';
import type { Manifestation } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_MARGIN = 16;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_MARGIN) / 2;
const MAX_MANIFESTATIONS = 25;

export default function ManifestationBoardScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [floatAnim]);

  const { data: manifestations = [] } = useQuery({
    queryKey: ['manifestations'],
    queryFn: () => manifestationsDb.getAll(),
  });



  const deleteMutation = useMutation({
    mutationFn: (id: string) => manifestationsDb.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manifestations'] });
    },
  });

  const handleAddManifestation = () => {
    if (manifestations.length >= MAX_MANIFESTATIONS) {
      Alert.alert('Limit Reached', `You can add up to ${MAX_MANIFESTATIONS} manifestations.`);
      return;
    }
    router.push('/manifestation-board/add' as any);
  };

  const handleStartSlideshow = () => {
    if (manifestations.length === 0) {
      Alert.alert('No Manifestations', 'Add some manifestations first to start the ritual.');
      return;
    }
    router.push('/manifestation-board/slideshow' as any);
  };

  const handleDeleteCard = (id: string, title: string) => {
    Alert.alert(
      'Delete Manifestation',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteMutation.mutate(id)
        },
      ]
    );
  };

  const placeholderSlots = Math.max(0, 3 - manifestations.length);
  const allSlots = [...manifestations, ...Array(placeholderSlots).fill(null)];

  const renderGridCard = (item: Manifestation | null, index: number) => {
    const translateY = floatAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -10],
    });

    if (item === null) {
      return (
        <Animated.View
          key={`placeholder-${index}`}
          style={[styles.gridCard, { transform: [{ translateY }] }]}
        >
          <TouchableOpacity
            style={styles.placeholderCardTouchable}
            onPress={handleAddManifestation}
          >
            <View style={styles.placeholderCard}>
              <Plus color="#fbbf24" size={40} />
              <Text style={styles.placeholderText}>Add{"\n"}Manifest</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        key={item.id}
        style={[styles.gridCard, { transform: [{ translateY }] }]}
      >
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => router.push(`/manifestation-board/${item.id}` as any)}
        >
        {item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.gridCardImage} contentFit="cover" />
        ) : (
          <LinearGradient
            colors={['#6366f1', '#8b5cf6']}
            style={styles.gridCardImage}
          >
            <Text style={styles.noImageText}>{item.title.charAt(0).toUpperCase()}</Text>
          </LinearGradient>
        )}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/manifestation-board/${item.id}` as any)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Edit2 color="#ffffff" size={14} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteCard(item.id, item.title)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Trash2 color="#ef4444" size={14} />
          </TouchableOpacity>
        </View>
        <View style={styles.gridCardOverlay}>
          <Text style={styles.gridCardTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{
          headerShown: true,
          headerTransparent: true,
          headerTitle: 'MANIFESTATION BOARD',
          headerTitleStyle: {
            color: '#ffffff',
            fontSize: 16,
            fontWeight: '700',
            textShadowColor: '#fbbf24',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 20,
            letterSpacing: 2,
          },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 16 }}>
              <ArrowLeft color="#ffffff" size={24} />
            </TouchableOpacity>
          ),
        }}
      />
      <ImageBackground
        source={{ uri: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/kflyhi3p0jh7nuw0u9n1u' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.contentSection}>

            <View style={styles.gridContainer}>
              {allSlots.map((item, index) => renderGridCard(item, index))}
            </View>
          </View>

        {manifestations.length > 3 && (
          <View style={styles.additionalCards}>
            <Text style={styles.sectionTitle}>All Manifestations</Text>
            {manifestations.slice(3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.listCard}
                onPress={() => router.push(`/manifestation-board/${item.id}` as any)}
              >
                {item.images.length > 0 ? (
                  <Image source={{ uri: item.images[0] }} style={styles.listCardImage} contentFit="cover" />
                ) : (
                  <LinearGradient
                    colors={['#6366f1', '#8b5cf6']}
                    style={styles.listCardImage}
                  >
                    <Text style={styles.listNoImageText}>{item.title.charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                )}
                <View style={styles.listCardContent}>
                  <View style={styles.listCardTextContainer}>
                    <Text style={styles.listCardTitle}>{item.title}</Text>
                    <Text style={styles.listCardCategory}>{item.category}</Text>
                    {item.intention && (
                      <Text style={styles.listCardIntention} numberOfLines={2}>{item.intention}</Text>
                    )}
                  </View>
                  <View style={styles.listCardActions}>
                    <TouchableOpacity
                      onPress={() => router.push(`/manifestation-board/${item.id}` as any)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.listActionButton}
                    >
                      <Edit2 color="#ffffff" size={18} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteCard(item.id, item.title)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={styles.listActionButton}
                    >
                      <Trash2 color="#ef4444" size={18} />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        </ScrollView>
        <TouchableOpacity 
          onPress={handleStartSlideshow}
          style={styles.playButtonBottomLeft}
        >
          <Play color="#ffffff" size={18} fill="#fbbf24" />
        </TouchableOpacity>
        {manifestations.length < MAX_MANIFESTATIONS && (
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddManifestation}
          >
            <Plus color="#fff" size={20} />
          </TouchableOpacity>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
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
    paddingTop: 164,
    paddingBottom: 100,
  },
  contentSection: {
    padding: 16,
  },
  playButtonBottomLeft: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 10,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_MARGIN,
    marginBottom: 16,
  },
  gridCard: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.4,
  },
  cardTouchable: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: '#fbbf24',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 10,
  },
  placeholderCardTouchable: {
    flex: 1,
  },
  placeholderCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fbbf24',
    borderStyle: 'dashed' as const,
    borderRadius: 18,
  },
  placeholderText: {
    marginTop: 8,
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: '700' as const,
    textAlign: 'center',
    textShadowColor: '#fbbf24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  gridCardImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 40,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  gridCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 12,
  },
  gridCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center',
    textShadowColor: '#fbbf24',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  cardActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },

  additionalCards: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 16,
  },
  listCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 12,
    height: 100,
  },
  listCardImage: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listNoImageText: {
    fontSize: 32,
    fontWeight: '700' as const,
    color: '#ffffff',
  },
  listCardContent: {
    flex: 1,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  listCardTextContainer: {
    flex: 1,
  },
  listCardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#ffffff',
    marginBottom: 4,
  },
  listCardCategory: {
    fontSize: 11,
    color: '#818cf8',
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  listCardIntention: {
    fontSize: 12,
    color: '#9ca3af',
    lineHeight: 16,
  },
  listCardActions: {
    flexDirection: 'column',
    gap: 8,
    justifyContent: 'center',
  },
  listActionButton: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fbbf24',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
});
