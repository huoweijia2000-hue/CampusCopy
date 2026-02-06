import { Post, PostType } from '../types';
import { supabase } from './supabase';

const POSTS_TABLE = 'posts';

// Create a new post
export const createPost = async (
    authorId: string,
    authorName: string,
    authorTags: string[],
    authorAvatar: string,
    content: string,
    type: PostType,
    locationTag: string,
    geoPoint: { latitude: number; longitude: number },
    images: string[] = []
) => {
    // Check for Demo Mode (if authorId is demo_user)
    if (authorId === 'demo_user') {
        // Mock a successful post creation
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    id: 'mock_post_' + Date.now(),
                    authorId,
                    authorName,
                    authorTags,
                    authorAvatar,
                    content,
                    type,
                    images,
                    locationTag,
                    geoPoint: { latitude: geoPoint.latitude || 22.3380, longitude: geoPoint.longitude || 114.1813 },
                    timestamp: new Date(),
                    likes: 0,
                });
            }, 1000);
        });
    }

    // Insert into Supabase
    // We assume table columns: id, author_id, author_name, content, ...
    const postData = {
        author_id: authorId,
        author_name: authorName,
        author_tags: authorTags,
        author_avatar: authorAvatar,
        content,
        type,
        images,
        location_tag: locationTag,
        lat: geoPoint.latitude,
        lng: geoPoint.longitude,
        likes: 0,
        // created_at auto generated
    };

    const { data, error } = await supabase
        .from(POSTS_TABLE)
        .insert(postData)
        .select()
        .single();

    if (error) {
        throw new Error(error.message);
    }

    // Map back to Post type
    return mapSupabaseToPost(data);
};

// Get all posts
export const getPosts = async (limitCount: number = 20): Promise<Post[]> => {
    const { data, error } = await supabase
        .from(POSTS_TABLE)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limitCount);

    if (error) {
        console.error('Error fetching posts:', error);
        return [];
    }

    return (data || []).map(mapSupabaseToPost);
};

// Get posts by type
export const getPostsByType = async (type: PostType, limitCount: number = 20): Promise<Post[]> => {
    const { data, error } = await supabase
        .from(POSTS_TABLE)
        .select('*')
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(limitCount);

    if (error) {
        console.error('Error fetching posts by type:', error);
        return [];
    }

    return (data || []).map(mapSupabaseToPost);
};

// Like a post
export const likePost = async (postId: string) => {
    // 1. Fetch current likes
    const { data: currentPost, error: fetchError } = await supabase
        .from(POSTS_TABLE)
        .select('likes')
        .eq('id', postId)
        .single();

    if (fetchError || !currentPost) return;

    // 2. Update likes + 1
    await supabase
        .from(POSTS_TABLE)
        .update({ likes: (currentPost.likes || 0) + 1 })
        .eq('id', postId);
};

// Upload image and get URL
export const uploadPostImage = async (uri: string, postId: string): Promise<string> => {
    try {
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileName = `${postId}/${Date.now()}.jpg`;

        const { data, error } = await supabase.storage
            .from('posts') // Assume 'posts' bucket exists, publicly readable
            .upload(fileName, blob, {
                contentType: 'image/jpeg',
            });

        if (error) throw error;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('posts')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (e: any) {
        console.error('Upload failed:', e);
        throw e;
    }
};

// Helper to map snake_case DB fields to camelCase Post type
const mapSupabaseToPost = (data: any): Post => {
    return {
        id: data.id,
        authorId: data.author_id,
        authorName: data.author_name,
        authorTags: data.author_tags || [],
        authorAvatar: data.author_avatar,
        content: data.content,
        type: data.type,
        images: data.images || [],
        locationTag: data.location_tag,
        geoPoint: {
            latitude: data.lat,
            longitude: data.lng
        },
        createdAt: new Date(data.created_at),
        timestamp: new Date(data.created_at),
        likes: data.likes || 0,
        comments: 0, // Placeholder, implement comments table later if needed
        isAnonymous: false // Default to non-anonymous
    };
};
