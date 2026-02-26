import { useRouter } from 'expo-router';
import { ArrowLeftRight, ChevronRight, Search, Star, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    FlatList,
    Keyboard,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { CAMPUS_BUILDINGS } from '../../data/buildings';
import { getCurrentUser } from '../../services/auth';
import { getBuildings } from '../../services/buildings';
import {
    loadBuildingFavorites,
    saveBuildingFavoritesLocal,
    setBuildingFavoriteRemote
} from '../../services/favorites';

export default function ClassroomIndex() {
    const { t } = useTranslation();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState<string[]>([]);
    const [buildingsData, setBuildingsData] = useState(CAMPUS_BUILDINGS);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [allowRemoteFavorites, setAllowRemoteFavorites] = useState(false);

    React.useEffect(() => {
        const fetchBuildings = async () => {
            try {
                const data = await getBuildings();
                if (data && data.length > 0) {
                    setBuildingsData(data);
                }
            } catch (e) {
                console.error('Failed to fetch buildings for classroom tab', e);
            }
        };
        const loadFavorites = async () => {
            try {
                const user = await getCurrentUser();
                const canRemote = !!user?.uid && !user?.isDemo;
                setCurrentUserId(canRemote ? user.uid : null);
                setAllowRemoteFavorites(canRemote);

                const ids = await loadBuildingFavorites(canRemote ? user.uid : null, canRemote);
                setFavorites(ids);
            } catch (e) {
                console.error('Error loading building favorites:', e);
            }
        };
        fetchBuildings();
        loadFavorites();
    }, []);

    const filteredBuildings = searchQuery.trim()
        ? buildingsData.filter(b => {
            const query = searchQuery.toLowerCase();
            return (
                (b.name || '').toLowerCase().includes(query) ||
                (b.id || '').toLowerCase().includes(query) ||
                (b.description || '').toLowerCase().includes(query)
            );
        })
        : buildingsData;

    const handleBuildingSelect = (buildingId: string) => {
        router.push(`/classroom/${buildingId}` as any);
        Keyboard.dismiss();
    };

    const toggleFavorite = async (id: string) => {
        if (favorites.includes(id)) {
            const nextFavorites = favorites.filter(fav => fav !== id);
            setFavorites(nextFavorites);
            try {
                await saveBuildingFavoritesLocal(nextFavorites);
                if (allowRemoteFavorites && currentUserId) {
                    await setBuildingFavoriteRemote(currentUserId, id, false);
                }
            } catch (e) {
                console.error('Error saving building favorites:', e);
            }
        } else {
            const nextFavorites = [...favorites, id];
            setFavorites(nextFavorites);
            try {
                await saveBuildingFavoritesLocal(nextFavorites);
                if (allowRemoteFavorites && currentUserId) {
                    await setBuildingFavoriteRemote(currentUserId, id, true);
                }
            } catch (e) {
                console.error('Error saving building favorites:', e);
            }
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>{t('classroom_tab.title')}</Text>
                        <Text style={styles.headerSubtitle}>{t('classroom_tab.subtitle')}</Text>
                    </View>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Search size={20} color="#9CA3AF" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={t('classroom_tab.search_hint')}
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <X size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Favorites Section */}
            {favorites.length > 0 && !searchQuery && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⭐ {t('classroom_tab.favorites')}</Text>
                    <FlatList
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        data={CAMPUS_BUILDINGS.filter(b => favorites.includes(b.id))}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.favoriteCard}
                                onPress={() => handleBuildingSelect(item.id)}
                            >
                                <Text style={styles.favoriteIcon}>🏫</Text>
                                <Text style={styles.favoriteName} numberOfLines={1}>{item.name}</Text>
                            </TouchableOpacity>
                        )}
                        contentContainerStyle={{ paddingHorizontal: 16 }}
                    />
                </View>
            )}

            {/* Building List */}
            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>
                    {searchQuery ? `${t('classroom_tab.results')} (${filteredBuildings.length})` : t('classroom_tab.all_buildings')}
                </Text>
                <FlatList
                    data={filteredBuildings}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.roomCard}
                            onPress={() => handleBuildingSelect(item.id)}
                        >
                            <View style={styles.roomIcon}>
                                <Text style={styles.roomIconText}>🏫</Text>
                            </View>
                            <View style={styles.roomInfo}>
                                <Text style={styles.roomName}>{item.name}</Text>
                                <Text style={styles.roomDetails} numberOfLines={1}>
                                    {item.description}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.favoriteButton}
                                onPress={() => toggleFavorite(item.id)}
                            >
                                <Star
                                    size={18}
                                    color={favorites.includes(item.id) ? '#FFD700' : '#D1D5DB'}
                                    fill={favorites.includes(item.id) ? '#FFD700' : 'transparent'}
                                />
                            </TouchableOpacity>
                            <ChevronRight size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                />
            </View>

            {/* Exchange FAB (Still kept as per request to only change content) */}
            <TouchableOpacity
                style={styles.exchangeFab}
                onPress={() => router.push('/courses/exchange' as any)}
            >
                <ArrowLeftRight size={24} color="#fff" />
                <View style={styles.fabBadge}>
                    <Text style={styles.fabBadgeText}>{t('classroom_tab.swap_courses')}</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, backgroundColor: '#1E3A8A' },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    backButton: { marginRight: 12, padding: 4 },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    searchContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
    searchInput: { flex: 1, fontSize: 15, color: '#111827', marginLeft: 10 },
    section: { paddingTop: 16, paddingBottom: 8 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', paddingHorizontal: 16, marginBottom: 12 },
    favoriteCard: { alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginRight: 12, maxWidth: 120 },
    favoriteIcon: { fontSize: 20, marginBottom: 4 },
    favoriteName: { fontSize: 12, fontWeight: '600', color: '#92400E' },
    listSection: { flex: 1, paddingTop: 8 },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    roomCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    roomIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3E8FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    roomIconText: { fontSize: 20 },
    roomInfo: { flex: 1 },
    roomName: { fontSize: 15, fontWeight: '600', color: '#111827' },
    roomDetails: { fontSize: 12, color: '#6B7280', marginTop: 2 },
    favoriteButton: { padding: 8 },
    exchangeFab: {
        position: 'absolute',
        bottom: 110,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#8B5CF6',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 15,
        zIndex: 9999,
    },
    fabBadge: {
        position: 'absolute',
        top: -8,
        right: -4,
        backgroundColor: '#EF4444',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#fff',
    },
    fabBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
