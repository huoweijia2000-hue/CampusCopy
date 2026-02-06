import { CourseExchange, ExchangeComment } from '../types';
import { supabase } from './supabase';

const EXCHANGES_TABLE = 'course_exchanges';
const EXCHANGE_COMMENTS_TABLE = 'exchange_comments';

/**
 * Fetch all active course exchange requests.
 */
export const fetchExchanges = async (): Promise<CourseExchange[]> => {
    try {
        const { data, error } = await supabase
            .from(EXCHANGES_TABLE)
            .select('*')
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching exchanges:', error);
            return getMockExchanges();
        }

        return (data || []).map(mapSupabaseToExchange);
    } catch (e) {
        console.error('Exception fetching exchanges:', e);
        return getMockExchanges();
    }
};

/**
 * Post a new course exchange request.
 */
export const postExchange = async (exchange: Omit<CourseExchange, 'id' | 'createdAt' | 'status' | 'commentCount' | 'likes'>) => {
    try {
        const exchangeData = {
            user_id: exchange.userId,
            user_name: exchange.userName,
            user_avatar: exchange.userAvatar,
            user_major: exchange.userMajor,
            have_course: exchange.haveCourse,
            have_section: exchange.haveSection,
            have_instructor: exchange.haveInstructor,
            have_time: exchange.haveTime,
            want_courses: exchange.wantCourses,
            reason: exchange.reason,
            contacts: exchange.contacts,
            status: 'open',
            comment_count: 0,
            likes: 0,
        };

        const { data, error } = await supabase
            .from(EXCHANGES_TABLE)
            .insert(exchangeData)
            .select()
            .single();

        if (error) throw error;
        return mapSupabaseToExchange(data);
    } catch (e) {
        console.error('Error posting exchange:', e);
        return { id: Math.random().toString(), ...exchange, createdAt: new Date(), status: 'open', commentCount: 0, likes: 0 };
    }
};

/**
 * Fetch comments for a specific exchange request.
 */
export const fetchExchangeComments = async (exchangeId: string): Promise<ExchangeComment[]> => {
    try {
        const { data, error } = await supabase
            .from(EXCHANGE_COMMENTS_TABLE)
            .select('*')
            .eq('exchange_id', exchangeId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return getMockComments(exchangeId);
        }

        return (data || []).map(mapSupabaseToComment);
    } catch (e) {
        console.error('Exception fetching comments:', e);
        return getMockComments(exchangeId);
    }
};

/**
 * Post a comment to an exchange request.
 */
export const postExchangeComment = async (exchangeId: string, author: { id: string, name: string, avatar: string }, content: string) => {
    try {
        const { data, error } = await supabase
            .from(EXCHANGE_COMMENTS_TABLE)
            .insert({
                exchange_id: exchangeId,
                author_id: author.id,
                author_name: author.name,
                author_avatar: author.avatar,
                content,
            })
            .select()
            .single();

        if (error) throw error;

        // Increment comment count
        await incrementExchangeCommentCount(exchangeId);

        return mapSupabaseToComment(data);
    } catch (e) {
        console.error('Error posting comment:', e);
        return {
            id: Math.random().toString(),
            exchangeId,
            authorId: author.id,
            authorName: author.name,
            authorAvatar: author.avatar,
            content,
            createdAt: new Date(),
        };
    }
};

/**
 * Toggle like for an exchange request.
 */
export const toggleExchangeLike = async (exchangeId: string, userId: string) => {
    try {
        // Get current likes
        const { data: exchange, error: fetchError } = await supabase
            .from(EXCHANGES_TABLE)
            .select('likes')
            .eq('id', exchangeId)
            .single();

        if (fetchError || !exchange) return { success: false };

        // Update likes
        const { error: updateError } = await supabase
            .from(EXCHANGES_TABLE)
            .update({ likes: (exchange.likes || 0) + 1 })
            .eq('id', exchangeId);

        if (updateError) return { success: false };
        return { success: true };
    } catch (e) {
        console.error('Error toggling like:', e);
        return { success: false };
    }
};

// Helper functions
const mapSupabaseToExchange = (data: any): CourseExchange => ({
    id: data.id,
    userId: data.user_id,
    userName: data.user_name,
    userAvatar: data.user_avatar,
    userMajor: data.user_major,
    haveCourse: data.have_course,
    haveSection: data.have_section,
    haveInstructor: data.have_instructor,
    haveTime: data.have_time,
    wantCourses: data.want_courses,
    reason: data.reason,
    contacts: data.contacts,
    createdAt: new Date(data.created_at),
    status: data.status,
    commentCount: data.comment_count || 0,
    likes: data.likes || 0,
});

const mapSupabaseToComment = (data: any): ExchangeComment => ({
    id: data.id,
    exchangeId: data.exchange_id,
    authorId: data.author_id,
    authorName: data.author_name,
    authorAvatar: data.author_avatar,
    content: data.content,
    createdAt: new Date(data.created_at),
});

const incrementExchangeCommentCount = async (exchangeId: string) => {
    try {
        const { data: exchange } = await supabase
            .from(EXCHANGES_TABLE)
            .select('comment_count')
            .eq('id', exchangeId)
            .single();

        if (exchange) {
            await supabase
                .from(EXCHANGES_TABLE)
                .update({ comment_count: (exchange.comment_count || 0) + 1 })
                .eq('id', exchangeId);
        }
    } catch (e) {
        console.error('Error incrementing comment count:', e);
    }
};

/**
 * Mock data for development.
 */
const getMockExchanges = (): CourseExchange[] => [
    {
        id: 'mock1',
        userId: 'u1',
        userName: 'Zhang Wei',
        userAvatar: '👤',
        userMajor: 'Computer Science',
        haveCourse: 'COMP3015',
        haveSection: 'Sec1',
        haveInstructor: 'Dr. Smith',
        haveTime: 'Mon 2:30 PM',
        wantCourses: [
            { code: 'COMP3011', section: 'Sec2', instructor: 'Prof. Wong', time: 'Wed 10:30 AM' },
            { code: 'COMP3016', section: 'Sec1' }
        ],
        reason: 'Time conflict with my other core course.',
        contacts: [
            { platform: 'WeChat', value: 'zw12345' },
            { platform: 'Email', value: 'wei.zhang@example.com' }
        ],
        createdAt: new Date(),
        status: 'open',
        commentCount: 2,
        likes: 5,
        isLiked: false,
    },
    {
        id: 'mock2',
        userId: 'u2',
        userName: 'Sarah Lee',
        userAvatar: '👩‍🎓',
        userMajor: 'Marketing',
        haveCourse: 'MKTG2005',
        haveSection: 'Sec3',
        haveInstructor: 'Dr. Johnson',
        haveTime: 'Tue 1:00 PM',
        wantCourses: [
            { code: 'MKTG3010', section: 'Sec1' },
            { code: 'MKTG3020' }
        ],
        contacts: [
            { platform: 'WhatsApp', value: '98765432' }
        ],
        createdAt: new Date(Date.now() - 86400000),
        status: 'open',
        commentCount: 0,
        likes: 2,
        isLiked: true,
    }
];

const getMockComments = (exchangeId: string): ExchangeComment[] => [
    {
        id: 'c1',
        exchangeId,
        authorId: 'u3',
        authorName: 'David Wong',
        authorAvatar: '👨‍🎓',
        content: 'Is this COMP3015 section 1 or 2?',
        createdAt: new Date(Date.now() - 3600000),
    },
    {
        id: 'c2',
        exchangeId,
        authorId: 'u1',
        authorName: 'Zhang Wei',
        authorAvatar: '👤',
        content: 'It is section 1.',
        createdAt: new Date(Date.now() - 1800000),
    }
];
