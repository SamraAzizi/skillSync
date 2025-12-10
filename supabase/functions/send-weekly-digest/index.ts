import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting weekly digest send...');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users with completed profiles who have email digest enabled
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('profile_completed', true)
      .eq('email_digest_enabled', true)
      .not('email', 'is', null);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      throw new Error('Failed to fetch users');
    }

    console.log(`Found ${users?.length || 0} users to send digests to`);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    let emailsSent = 0;
    const errors: string[] = [];

    for (const user of users || []) {
      if (!user.email) continue;

      try {
        // Get sessions where user was teacher (completed this week)
        const { data: taughtSessions } = await supabase
          .from('sessions')
          .select('id, skill, duration_minutes, scheduled_at, status')
          .eq('teacher_id', user.id)
          .eq('status', 'completed')
          .gte('scheduled_at', oneWeekAgo.toISOString());

        // Get sessions where user was learner (completed this week)
        const { data: learnedSessions } = await supabase
          .from('sessions')
          .select('id, skill, duration_minutes, scheduled_at, status')
          .eq('learner_id', user.id)
          .eq('status', 'completed')
          .gte('scheduled_at', oneWeekAgo.toISOString());

        // Get upcoming sessions
        const { data: upcomingSessions } = await supabase
          .from('sessions')
          .select('id, skill, scheduled_at, teacher_id, learner_id')
          .or(`teacher_id.eq.${user.id},learner_id.eq.${user.id}`)
          .eq('status', 'confirmed')
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5);

        // Get new reviews received this week
        const { data: newReviews } = await supabase
          .from('reviews')
          .select('rating, comment, created_at')
          .eq('reviewee_id', user.id)
          .gte('created_at', oneWeekAgo.toISOString());

        // Calculate stats
        const hoursTaught = (taughtSessions || []).reduce((sum, s) => sum + (s.duration_minutes || 60), 0) / 60;
        const hoursLearned = (learnedSessions || []).reduce((sum, s) => sum + (s.duration_minutes || 60), 0) / 60;
        const sessionsTaught = taughtSessions?.length || 0;
        const sessionsLearned = learnedSessions?.length || 0;
        const reviewsReceived = newReviews?.length || 0;
        const avgRating = newReviews && newReviews.length > 0 
          ? (newReviews.reduce((sum, r) => sum + r.rating, 0) / newReviews.length).toFixed(1)
          : null;

        // Get unique skills taught and learned
        const skillsTaught = [...new Set((taughtSessions || []).map(s => s.skill))];
        const skillsLearned = [...new Set((learnedSessions || []).map(s => s.skill))];

        // Skip if no activity
        const hasActivity = sessionsTaught > 0 || sessionsLearned > 0 || reviewsReceived > 0 || (upcomingSessions?.length || 0) > 0;
        if (!hasActivity) {
          console.log(`Skipping ${user.email} - no activity this week`);
          continue;
        }

        // Build upcoming sessions HTML
        let upcomingHtml = '';
        if (upcomingSessions && upcomingSessions.length > 0) {
          const sessionItems = await Promise.all(upcomingSessions.map(async (session) => {
            const isTeacher = session.teacher_id === user.id;
            const partnerId = isTeacher ? session.learner_id : session.teacher_id;
            const { data: partner } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', partnerId)
              .single();
            
            const sessionDate = new Date(session.scheduled_at).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
            
            return `<li style="margin-bottom: 8px;">
              <strong>${session.skill}</strong> - ${isTeacher ? 'Teaching' : 'Learning'} with ${partner?.full_name || 'Unknown'}
              <br><span style="color: #666; font-size: 13px;">${sessionDate}</span>
            </li>`;
          }));
          
          upcomingHtml = `
            <div style="margin-top: 20px;">
              <h3 style="color: #333; margin-bottom: 10px;">📅 Upcoming Sessions</h3>
              <ul style="list-style: none; padding: 0; margin: 0;">
                ${sessionItems.join('')}
              </ul>
            </div>
          `;
        }

        // Build reviews HTML
        let reviewsHtml = '';
        if (newReviews && newReviews.length > 0) {
          const reviewItems = newReviews.slice(0, 3).map(review => `
            <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 8px;">
              <div style="color: #f59e0b;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
              ${review.comment ? `<p style="margin: 8px 0 0 0; color: #555; font-style: italic;">"${review.comment}"</p>` : ''}
            </div>
          `).join('');
          
          reviewsHtml = `
            <div style="margin-top: 20px;">
              <h3 style="color: #333; margin-bottom: 10px;">⭐ New Reviews</h3>
              ${reviewItems}
            </div>
          `;
        }

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Your Weekly SkillSync Digest 📊</h1>
            <p>Hi ${user.full_name || 'there'},</p>
            <p>Here's your learning and teaching activity from the past week:</p>
            
            <div style="background: linear-gradient(135deg, #f5f5f5, #fff); padding: 24px; border-radius: 12px; margin: 24px 0;">
              <h2 style="margin-top: 0; color: #333;">This Week's Stats</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div style="background: #fff; padding: 16px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="font-size: 28px; font-weight: bold; color: #10b981;">${sessionsTaught}</div>
                  <div style="color: #666; font-size: 14px;">Sessions Taught</div>
                  <div style="color: #888; font-size: 12px;">${hoursTaught.toFixed(1)} hours</div>
                </div>
                <div style="background: #fff; padding: 16px; border-radius: 8px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="font-size: 28px; font-weight: bold; color: #3b82f6;">${sessionsLearned}</div>
                  <div style="color: #666; font-size: 14px;">Sessions Learned</div>
                  <div style="color: #888; font-size: 12px;">${hoursLearned.toFixed(1)} hours</div>
                </div>
              </div>
              
              ${skillsTaught.length > 0 ? `
                <div style="margin-top: 16px;">
                  <strong style="color: #333;">Skills Taught:</strong>
                  <span style="color: #666;"> ${skillsTaught.join(', ')}</span>
                </div>
              ` : ''}
              
              ${skillsLearned.length > 0 ? `
                <div style="margin-top: 8px;">
                  <strong style="color: #333;">Skills Learned:</strong>
                  <span style="color: #666;"> ${skillsLearned.join(', ')}</span>
                </div>
              ` : ''}
              
              ${avgRating ? `
                <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
                  <strong style="color: #333;">Average Rating This Week:</strong>
                  <span style="color: #f59e0b; font-size: 18px; margin-left: 8px;">★ ${avgRating}</span>
                </div>
              ` : ''}
            </div>
            
            ${reviewsHtml}
            ${upcomingHtml}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666;">Keep up the great work! Every skill you share helps build our learning community.</p>
              <p style="margin-top: 20px;">
                <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/dashboard" 
                   style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  View Full Dashboard
                </a>
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              You're receiving this because you have an active SkillSync account with email digests enabled.
              <br>
              <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/profile" style="color: #666;">
                Manage email preferences
              </a>
            </p>
          </div>
        `;

        await resend.emails.send({
          from: 'SkillSync <onboarding@resend.dev>',
          to: [user.email],
          subject: `Your Weekly Learning Digest - ${sessionsTaught + sessionsLearned} sessions this week!`,
          html: emailHtml,
        });

        emailsSent++;
        console.log(`Sent digest to ${user.email}`);
      } catch (userError) {
        console.error(`Error sending digest to ${user.email}:`, userError);
        errors.push(`${user.email}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
      }
    }

    console.log(`Weekly digest complete. Sent ${emailsSent} emails.`);

    return new Response(
      JSON.stringify({ 
        success: true,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-weekly-digest:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
