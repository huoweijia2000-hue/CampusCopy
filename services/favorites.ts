import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const COURSE_FAVORITES_KEY = 'hkcampus_favorite_courses';
const BUILDING_FAVORITES_KEY = 'hkcampus_favorite_buildings';

type FavoriteIdRow = { course_id?: string; building_id?: string };

const readLocalFavorites = async (key: string): Promise<string[]> => {
    try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Error reading local favorites:', e);
        return [];
    }
};

const writeLocalFavorites = async (key: string, ids: string[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(ids));
    } catch (e) {
        console.error('Error saving local favorites:', e);
    }
};

export const loadCourseFavorites = async (
    userId?: string | null,
    allowRemote: boolean = true
): Promise<string[]> => {
    const local = await readLocalFavorites(COURSE_FAVORITES_KEY);
    if (!userId || !allowRemote) return local;

    const { data, error } = await supabase
        .from('course_favorites')
        .select('course_id')
        .eq('user_id', userId);

    if (error) {
        console.warn('Failed to fetch course favorites from Supabase:', error.message);
        return local;
    }

    const ids = (data || [])
        .map((row: FavoriteIdRow) => row.course_id)
        .filter(Boolean) as string[];
    await writeLocalFavorites(COURSE_FAVORITES_KEY, ids);
    return ids;
};

export const saveCourseFavoritesLocal = async (ids: string[]): Promise<void> => {
    await writeLocalFavorites(COURSE_FAVORITES_KEY, ids);
};

export const setCourseFavoriteRemote = async (
    userId: string,
    courseId: string,
    makeFavorite: boolean
): Promise<void> => {
    if (makeFavorite) {
        const { error } = await supabase
            .from('course_favorites')
            .upsert({ user_id: userId, course_id: courseId }, { onConflict: 'user_id,course_id' });
        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from('course_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId);
    if (error) throw error;
};

export const loadBuildingFavorites = async (
    userId?: string | null,
    allowRemote: boolean = true
): Promise<string[]> => {
    const local = await readLocalFavorites(BUILDING_FAVORITES_KEY);
    if (!userId || !allowRemote) return local;

    const { data, error } = await supabase
        .from('building_favorites')
        .select('building_id')
        .eq('user_id', userId);

    if (error) {
        console.warn('Failed to fetch building favorites from Supabase:', error.message);
        return local;
    }

    const ids = (data || [])
        .map((row: FavoriteIdRow) => row.building_id)
        .filter(Boolean) as string[];
    await writeLocalFavorites(BUILDING_FAVORITES_KEY, ids);
    return ids;
};

export const saveBuildingFavoritesLocal = async (ids: string[]): Promise<void> => {
    await writeLocalFavorites(BUILDING_FAVORITES_KEY, ids);
};

export const setBuildingFavoriteRemote = async (
    userId: string,
    buildingId: string,
    makeFavorite: boolean
): Promise<void> => {
    if (makeFavorite) {
        const { error } = await supabase
            .from('building_favorites')
            .upsert({ user_id: userId, building_id: buildingId }, { onConflict: 'user_id,building_id' });
        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from('building_favorites')
        .delete()
        .eq('user_id', userId)
        .eq('building_id', buildingId);
    if (error) throw error;
};
