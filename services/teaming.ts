import { CourseTeaming, TeamingComment } from '../types';
import { supabase } from './supabase';

const TEAMING_TABLE = 'course_teaming';
const TEAMING_COMMENTS_TABLE = 'teaming_comments';

/**
 * Fetch teaming requests for a specific course.
 */
export const fetchTeamingRequests = async (courseId: string): Promise<CourseTeaming[]> => {
    try {
        const { data, error } = await supabase
            .from(TEAMING_TABLE)
            .select('*')
            .eq('course_id', courseId)
            .eq('status', 'open')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching teaming requests:', error);
            return getMockTeaming(courseId);
        }

        return (data || []).map(mapSupabaseToTeaming);
    } catch (e) {
        console.error('Exception fetching teaming requests:', e);
        return getMockTeaming(courseId);
    }
};

/**
 * Post a new teaming request.
 */
export const postTeamingRequest = async (request: Partial<CourseTeaming>): Promise<{ success: boolean; data?: CourseTeaming }> => {
    try {
        const teamingData = {
            course_id: request.courseId,
            user_id: request.userId,
            user_name: request.userName,
            user_avatar: request.userAvatar,
            user_major: request.userMajor,
            section: request.section,
            self_intro: request.selfIntro,
            target_teammate: request.targetTeammate,
            contacts: request.contacts,
            status: 'open',
            likes: 0,
            comment_count: 0,
        };

        const { data, error } = await supabase
            .from(TEAMING_TABLE)
            .insert(teamingData)
            .select()
            .single();

        if (error) throw error;

        return {
            success: true,
            data: mapSupabaseToTeaming(data),
        };
    } catch (e) {
        console.error('Error posting teaming request:', e);
        return {
            success: false,
        };
    }
};

/**
 * Toggle like for a teaming request.
 */
export const toggleTeamingLike = async (teamingId: string, userId: string): Promise<{ success: boolean }> => {
    try {
        // Get current likes
        const { data: teaming, error: fetchError } = await supabase
            .from(TEAMING_TABLE)
            .select('likes')
            .eq('id', teamingId)
            .single();

        if (fetchError || !teaming) return { success: false };

        // Update likes
        const { error: updateError } = await supabase
            .from(TEAMING_TABLE)
            .update({ likes: (teaming.likes || 0) + 1 })
            .eq('id', teamingId);

        if (updateError) return { success: false };
        return { success: true };
    } catch (e) {
        console.error('Error toggling like:', e);
        return { success: false };
    }
};

/**
 * Fetch comments for a teaming request.
 */
export const fetchTeamingComments = async (teamingId: string): Promise<TeamingComment[]> => {
    try {
        const { data, error } = await supabase
            .from(TEAMING_COMMENTS_TABLE)
            .select('*')
            .eq('teaming_id', teamingId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching teaming comments:', error);
            return getMockTeamingComments(teamingId);
        }

        return (data || []).map(mapSupabaseToTeamingComment);
    } catch (e) {
        console.error('Exception fetching teaming comments:', e);
        return getMockTeamingComments(teamingId);
    }
};

/**
 * Post a comment to a teaming request.
 */
export const postTeamingComment = async (teamingId: string, author: any, content: string): Promise<{ success: boolean }> => {
    try {
        const { error: insertError } = await supabase
            .from(TEAMING_COMMENTS_TABLE)
            .insert({
                teaming_id: teamingId,
                author_id: author.id,
                author_name: author.name,
                author_avatar: author.avatar,
                content,
            });

        if (insertError) throw insertError;

        // Increment comment count
        await incrementTeamingCommentCount(teamingId);

        return { success: true };
    } catch (e) {
        console.error('Error posting teaming comment:', e);
        return { success: false };
    }
};

// Helper functions
const mapSupabaseToTeaming = (data: any): CourseTeaming => ({
    id: data.id,
    courseId: data.course_id,
    userId: data.user_id,
    userName: data.user_name,
    userAvatar: data.user_avatar,
    userMajor: data.user_major,
    section: data.section,
    selfIntro: data.self_intro,
    targetTeammate: data.target_teammate,
    contacts: data.contacts,
    createdAt: new Date(data.created_at),
    status: data.status,
    likes: data.likes || 0,
    commentCount: data.comment_count || 0,
});

const mapSupabaseToTeamingComment = (data: any): TeamingComment => ({
    id: data.id,
    teamingId: data.teaming_id,
    authorId: data.author_id,
    authorName: data.author_name,
    authorAvatar: data.author_avatar,
    content: data.content,
    createdAt: new Date(data.created_at),
});

const incrementTeamingCommentCount = async (teamingId: string) => {
    try {
        const { data: teaming } = await supabase
            .from(TEAMING_TABLE)
            .select('comment_count')
            .eq('id', teamingId)
            .single();

        if (teaming) {
            await supabase
                .from(TEAMING_TABLE)
                .update({ comment_count: (teaming.comment_count || 0) + 1 })
                .eq('id', teamingId);
        }
    } catch (e) {
        console.error('Error incrementing comment count:', e);
    }
};

const getMockTeamingComments = (teamingId: string): TeamingComment[] => [
    {
        id: 'tc1',
        teamingId,
        authorId: 'u5',
        authorName: 'David Chen',
        authorAvatar: '👨‍🎓',
        content: 'I am interested! I am in Sec1 too.',
        createdAt: new Date(Date.now() - 3600000)
    }
];

/**
 * Mock data generator.
 */
const getMockTeaming = (courseId: string): CourseTeaming[] => [
    {
        id: 't1',
        courseId,
        userId: 'u1',
        userName: 'Zhang Wei',
        userAvatar: '👤',
        userMajor: 'Computer Science',
        section: 'Sec1',
        selfIntro: 'I am a Year 3 student proficient in Python and React.',
        targetTeammate: 'Looking for someone who is responsible and can contribute to the frontend.',
        contacts: [
            { platform: 'WeChat', value: 'zw12345' }
        ],
        createdAt: new Date(Date.now() - 86400000),
        status: 'open',
        likes: 3,
        commentCount: 1
    },
    {
        id: 't2',
        courseId,
        userId: 'u2',
        userName: 'Sarah Lee',
        userAvatar: '👩‍🎓',
        userMajor: 'Marketing',
        section: 'Sec2',
        selfIntro: 'Marketing student with experience in UI/UX research.',
        targetTeammate: 'Need a technical partner for the data analysis part.',
        contacts: [
            { platform: 'WhatsApp', value: '98765432' }
        ],
        createdAt: new Date(Date.now() - 172800000),
        status: 'open',
        likes: 1,
        commentCount: 0
    }
];
