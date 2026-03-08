import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BackendUnavailableError } from '@/lib/backendHealth';
import { useAuth } from '@/contexts/AuthContext';
import { usePoints } from './usePoints';
import { toast } from '@/hooks/use-toast';

const SOCIAL_POST_POINTS = 50; // Points per quality post
const SOCIAL_MINING_BOOST = 5; // +5 ARX-P/HR per quality post
const MAX_QUALITY_POSTS = 2; // Maximum quality posts allowed per day

// Required hashtags/mentions for a qualified post
const REQUIRED_TERMS = [
  '@arxonarx',
  '#arxon',
  '#arxonmining',
  '#arxonchain',
  'arxon'
];

interface SocialSubmission {
  id: string;
  user_id: string;
  post_url: string;
  platform: string;
  status: string;
  points_awarded: number;
  created_at: string;
  reviewed_at: string | null;
  claimed: boolean;
}

// Validate if a post URL/content qualifies for rewards
const validatePostQuality = async (postUrl: string): Promise<{ valid: boolean; reason?: string }> => {
  // Extract tweet ID from URL
  const tweetIdMatch = postUrl.match(/status\/(\d+)/);
  if (!tweetIdMatch) {
    return { valid: false, reason: "Invalid post URL format" };
  }

  // For now, we'll validate based on common patterns in the URL itself
  // In production, you'd call an edge function to fetch the actual tweet content
  const urlLower = postUrl.toLowerCase();
  
  // Check if URL contains any of the required terms (basic validation)
  // Real validation would require fetching tweet content via API
  const hasRequiredTerm = REQUIRED_TERMS.some(term => urlLower.includes(term.toLowerCase()));
  
  // Since we can't fetch tweet content directly from frontend, 
  // we'll set status to 'pending' and let an edge function validate
  // For MVP, we'll require manual validation or use a backend check
  
  return { valid: true }; // Will be validated server-side
};

export const useSocialSubmissions = () => {
  const { user } = useAuth();
  const { addPoints, triggerConfetti, refreshPoints } = usePoints();
  const [submitting, setSubmitting] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<SocialSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate total mining boost from claimed posts only
  const totalMiningBoost = submissions.filter(
    s => s.status === 'approved' && s.points_awarded > 0
  ).length * SOCIAL_MINING_BOOST;

  // Count quality posts (not rejected)
  const qualityPostsCount = submissions.filter(
    s => s.status !== 'rejected'
  ).length;

  const canSubmitMore = qualityPostsCount < MAX_QUALITY_POSTS;

  const fetchSubmissions = useCallback(async () => {
    if (!user) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('social_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // claimed = points_awarded > 0 (already received rewards)
      const submissionsWithClaimed = (data || []).map(s => ({
        ...s,
        claimed: s.points_awarded > 0
      }));
      
      setSubmissions(submissionsWithClaimed);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const submitPost = async (postUrl: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to submit posts",
        variant: "destructive"
      });
      return false;
    }

    // Check max posts limit
    if (!canSubmitMore) {
      toast({
        title: "Limit Reached",
        description: `You can only submit ${MAX_QUALITY_POSTS} quality posts`,
        variant: "destructive"
      });
      return false;
    }

    // Validate URL format
    const urlPattern = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/;
    if (!urlPattern.test(postUrl)) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid X/Twitter post URL",
        variant: "destructive"
      });
      return false;
    }

    // Check for duplicate submission
    const existing = submissions.find(s => s.post_url === postUrl);
    if (existing) {
      toast({
        title: "Already Submitted",
        description: "This post has already been submitted",
        variant: "destructive"
      });
      return false;
    }

    setSubmitting(true);

    try {
      // Submit as pending - will be validated by edge function
      const { data, error } = await supabase
        .from('social_submissions')
        .insert({
          user_id: user.id,
          post_url: postUrl,
          platform: 'twitter',
          status: 'pending', // Pending validation
          points_awarded: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Call edge function to validate the post
      const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-x-post', {
        body: { submissionId: data.id, postUrl }
      });

      if (validationError) {
        console.error('Validation error:', validationError);
        // Still allow submission, will be manually reviewed
        toast({
          title: "Post Submitted",
          description: "Your post is pending review",
        });
      } else if (validationResult?.qualified) {
        // Post is qualified - update local state
        setSubmissions(prev => [{
          ...data,
          status: 'approved',
          claimed: false
        }, ...prev]);
        
        toast({
          title: "Post Qualified! 🐦",
          description: `Your post mentions ARXON! Claim your ${SOCIAL_POST_POINTS} ARX-P + ${SOCIAL_MINING_BOOST} ARX-P/HR boost!`,
        });
        return true;
      } else {
        // Post not qualified
        setSubmissions(prev => [{
          ...data,
          status: 'rejected',
          claimed: false
        }, ...prev]);
        
        toast({
          title: "Post Not Qualified",
          description: validationResult?.reason || "Post must mention @arxonarx, #arxon, #arxonmining, or #arxonchain to qualify",
          variant: "destructive"
        });
        return false;
      }

      // Add to local state as pending if validation didn't complete
      if (!validationResult) {
        setSubmissions(prev => [{
          ...data,
          claimed: false
        }, ...prev]);
      }

      return true;
    } catch (error: any) {
      console.error('Error submitting post:', error);
      toast({
        title: error instanceof BackendUnavailableError ? 'Service Unavailable' : 'Submission Failed',
        description: error?.message || 'Please try again',
        variant: "destructive",
      });
      return false;
    } finally {
      setSubmitting(false);
    }

  };

  // Claim rewards for a submission - with double-claim prevention
  const claimRewards = async (submissionId: string) => {
    if (!user) return false;

    // Get fresh submission data from local state
    const submission = submissions.find(s => s.id === submissionId);
    if (!submission) {
      toast({
        title: "Submission Not Found",
        description: "Please refresh and try again",
        variant: "destructive"
      });
      return false;
    }

    // Check if already claimed (local state)
    if (submission.claimed || submission.points_awarded > 0) {
      toast({
        title: "Already Claimed",
        description: "You have already claimed rewards for this post",
        variant: "destructive"
      });
      return false;
    }

    // Check if approved
    if (submission.status !== 'approved') {
      toast({
        title: "Not Eligible",
        description: "Only approved posts can be claimed",
        variant: "destructive"
      });
      return false;
    }

    setClaiming(submissionId);

    try {
      // First, verify from database that it hasn't been claimed (prevent race conditions)
      const { data: freshData, error: checkError } = await supabase
        .from('social_submissions')
        .select('points_awarded, status')
        .eq('id', submissionId)
        .eq('user_id', user.id)
        .single();

      if (checkError) throw checkError;

      // Double-check server-side: if already claimed, abort
      if (freshData.points_awarded > 0) {
        // Update local state to reflect reality
        setSubmissions(prev => 
          prev.map(s => s.id === submissionId 
            ? { ...s, claimed: true, points_awarded: freshData.points_awarded }
            : s
          )
        );
        toast({
          title: "Already Claimed",
          description: "Rewards for this post were already claimed",
          variant: "destructive"
        });
        return false;
      }

      // Check if still approved
      if (freshData.status !== 'approved') {
        setSubmissions(prev => 
          prev.map(s => s.id === submissionId 
            ? { ...s, status: freshData.status }
            : s
          )
        );
        toast({
          title: "Not Eligible",
          description: "This post is no longer approved for rewards",
          variant: "destructive"
        });
        return false;
      }

      // Update submission as claimed with points (atomic operation)
      const { error: updateError } = await supabase
        .from('social_submissions')
        .update({
          points_awarded: SOCIAL_POST_POINTS,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', submissionId)
        .eq('points_awarded', 0); // Only update if not already claimed

      if (updateError) throw updateError;

      // Add points to user's balance (social_points) - instant reflection
      await addPoints(SOCIAL_POST_POINTS, 'social');

      // Update X post mining boost in user_points (separate from referral boost)
      const { data: currentPoints } = await supabase
        .from('user_points')
        .select('x_post_boost_percentage')
        .eq('user_id', user.id)
        .single();

      if (currentPoints) {
        // Each post adds 50% boost (5 ARX-P/HR out of base 10/hr)
        const newXPostBoost = ((currentPoints as any).x_post_boost_percentage || 0) + (SOCIAL_MINING_BOOST * 10);
        const { error: boostError } = await supabase
          .from('user_points')
          .update({ 
            x_post_boost_percentage: newXPostBoost,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        if (!boostError) {
          console.log('X post boost updated to:', newXPostBoost);
        }
      }

      // Update local state immediately for instant UI reflection
      setSubmissions(prev => 
        prev.map(s => s.id === submissionId 
          ? { ...s, claimed: true, points_awarded: SOCIAL_POST_POINTS }
          : s
        )
      );

      // Refresh points to get updated balance instantly
      await refreshPoints();

      triggerConfetti();
      toast({
        title: "Rewards Claimed! 🎉",
        description: `+${SOCIAL_POST_POINTS} ARX-P & +${SOCIAL_MINING_BOOST} ARX-P/HR mining boost added to your account!`,
      });

      return true;
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      toast({
        title: error instanceof BackendUnavailableError ? 'Service Unavailable' : 'Claim Failed',
        description: error?.message || 'Please try again',
        variant: "destructive",
      });
      return false;
    } finally {
      setClaiming(null);
    }

  };

  // Initial fetch
  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Real-time subscription for social_submissions
  useEffect(() => {
    if (!user) return;

    console.log('Setting up real-time subscription for social_submissions');
    
    const channel = supabase
      .channel('social-submissions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_submissions',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time social_submissions update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newSub = payload.new as SocialSubmission;
            setSubmissions(prev => {
              if (prev.some(s => s.id === newSub.id)) return prev;
              return [{ ...newSub, claimed: newSub.points_awarded > 0 }, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedSub = payload.new as SocialSubmission;
            setSubmissions(prev => 
              prev.map(s => s.id === updatedSub.id 
                ? { ...updatedSub, claimed: updatedSub.points_awarded > 0 }
                : s
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setSubmissions(prev => prev.filter(s => s.id !== (payload.old as SocialSubmission).id));
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up social_submissions subscription');
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    submissions,
    loading,
    submitting,
    claiming,
    submitPost,
    claimRewards,
    fetchSubmissions,
    SOCIAL_POST_POINTS,
    SOCIAL_MINING_BOOST,
    MAX_QUALITY_POSTS,
    totalMiningBoost,
    qualityPostsCount,
    canSubmitMore
  };
};
