import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase';

// Types based on actual database schema
type ProcessComment = Database['public']['Tables']['process_comments']['Row'];
type ProcessCommentInsert = Database['public']['Tables']['process_comments']['Insert'];

export interface Comment {
  id: string;
  process_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    id: string;
    name: string;
    email: string;
    avatar_url?: string;
  };
}

export class CommentService {
  static async getProcessComments(processId: string): Promise<Comment[]> {
    if (!processId) {
      throw new Error('Process ID is required');
    }

    console.log('Loading comments for process:', processId);

    // First, get the comments
    const { data: comments, error: commentsError } = await supabase
      .from('process_comments')
      .select('*')
      .eq('process_id', processId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching comments:', commentsError);
      throw commentsError;
    }

    if (!comments || comments.length === 0) {
      console.log('No comments found');
      return [];
    }

    // Get unique user IDs from comments
    const userIds = [...new Set(comments.map(comment => comment.user_id))];

    // Fetch user profiles for these user IDs
    const { data: userProfiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, user_id, name, email, avatar_url')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching user profiles:', profilesError);
      throw profilesError;
    }

    // Create a map of user_id to profile for quick lookup
    const profileMap = new Map();
    userProfiles?.forEach(profile => {
      profileMap.set(profile.user_id, profile);
    });

    console.log('Comments loaded:', comments.length);

    // Combine comments with user profiles
    return comments.map(comment => ({
      id: comment.id,
      process_id: comment.process_id,
      user_id: comment.user_id,
      comment: comment.comment,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user_profiles: profileMap.get(comment.user_id) ? {
        id: profileMap.get(comment.user_id).id,
        name: profileMap.get(comment.user_id).name,
        email: profileMap.get(comment.user_id).email,
        avatar_url: profileMap.get(comment.user_id).avatar_url
      } : undefined
    }));
  }

  static async addComment(processId: string, userId: string, comment: string): Promise<Comment> {
    if (!processId) {
      throw new Error('Process ID is required');
    }
    if (!userId) {
      throw new Error('User ID is required');
    }
    if (!comment.trim()) {
      throw new Error('Comment content is required');
    }

    console.log('Adding comment:', { processId, userId, commentLength: comment.length });

    const newComment: ProcessCommentInsert = {
      process_id: processId,
      user_id: userId,
      comment: comment.trim()
    };

    const { data, error } = await supabase
      .from('process_comments')
      .insert(newComment)
      .select('*')
      .single();

    if (error) {
      console.error('Error adding comment:', error);
      throw error;
    }

    // Fetch the user profile for this comment
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id, name, email, avatar_url')
      .eq('user_id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Don't throw error here, just log it and continue without profile
    }

    console.log('Comment added successfully:', data.id);

    return {
      id: data.id,
      process_id: data.process_id,
      user_id: data.user_id,
      comment: data.comment,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_profiles: userProfile ? {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        avatar_url: userProfile.avatar_url
      } : undefined
    };
  }

  static async updateComment(commentId: string, newComment: string): Promise<Comment> {
    if (!commentId) {
      throw new Error('Comment ID is required');
    }
    if (!newComment.trim()) {
      throw new Error('Comment content is required');
    }

    console.log('Updating comment:', commentId);

    const { data, error } = await supabase
      .from('process_comments')
      .update({ 
        comment: newComment.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating comment:', error);
      throw error;
    }

    // Fetch the user profile for this comment
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, user_id, name, email, avatar_url')
      .eq('user_id', data.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // Don't throw error here, just log it and continue without profile
    }

    console.log('Comment updated successfully:', commentId);

    return {
      id: data.id,
      process_id: data.process_id,
      user_id: data.user_id,
      comment: data.comment,
      created_at: data.created_at,
      updated_at: data.updated_at,
      user_profiles: userProfile ? {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        avatar_url: userProfile.avatar_url
      } : undefined
    };
  }

  static async deleteComment(commentId: string): Promise<void> {
    if (!commentId) {
      throw new Error('Comment ID is required');
    }

    console.log('Deleting comment:', commentId);

    const { error } = await supabase
      .from('process_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }

    console.log('Comment deleted successfully:', commentId);
  }

  static async getUserPermissionForComment(commentId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('process_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (error) {
      console.error('Error checking comment permission:', error);
      return false;
    }

    return data.user_id === user.id;
  }
}