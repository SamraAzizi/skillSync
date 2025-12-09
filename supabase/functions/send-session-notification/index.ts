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
    const { sessionId, status } = await req.json();

    if (!sessionId || !status) {
      throw new Error('Missing sessionId or status');
    }

    if (!['confirmed', 'declined'].includes(status)) {
      throw new Error('Status must be either confirmed or declined');
    }

    console.log(`Sending ${status} notification for session: ${sessionId}`);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch session details
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching session:', sessionError);
      throw new Error('Session not found');
    }

    // Fetch teacher and learner profiles with notification preferences
    const { data: teacher } = await supabase
      .from('profiles')
      .select('id, email, full_name, session_notification_enabled')
      .eq('id', session.teacher_id)
      .single();

    const { data: learner } = await supabase
      .from('profiles')
      .select('id, email, full_name, session_notification_enabled')
      .eq('id', session.learner_id)
      .single();

    const sessionTime = new Date(session.scheduled_at).toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'short',
    });

    let emailsSent = 0;

    if (status === 'confirmed') {
      // Send confirmation email to teacher (if notifications enabled)
      if (teacher?.email && teacher?.session_notification_enabled !== false) {
        try {
          await resend.emails.send({
            from: 'SkillSync <onboarding@resend.dev>',
            to: [teacher.email],
            subject: `Session Confirmed: Teaching ${session.skill}`,
            html: `
              <h1>Session Confirmed! 🎉</h1>
              <p>Hi ${teacher.full_name || 'there'},</p>
              <p>Great news! Your session has been confirmed.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2>Session Details</h2>
                <p><strong>Skill:</strong> ${session.skill}</p>
                <p><strong>Role:</strong> Teacher</p>
                <p><strong>Student:</strong> ${learner?.full_name || 'Unknown'}</p>
                <p><strong>Time:</strong> ${sessionTime}</p>
                <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
              </div>
              ${session.meeting_link ? `
                <p style="margin: 30px 0;">
                  <a href="${session.meeting_link}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    🎥 Join Video Meeting
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  Meeting Link: <a href="${session.meeting_link}">${session.meeting_link}</a>
                </p>
              ` : ''}
              ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
              <p>You'll receive a reminder 1 hour before the session starts.</p>
              <p>Best regards,<br>The SkillSync Team</p>
            `,
          });
          emailsSent++;
          console.log(`Sent confirmation to teacher: ${teacher.email}`);
        } catch (error) {
          console.error(`Failed to send email to teacher ${teacher.email}:`, error);
        }
      }

      // Send confirmation email to learner (if notifications enabled)
      if (learner?.email && learner?.session_notification_enabled !== false) {
        try {
          await resend.emails.send({
            from: 'SkillSync <onboarding@resend.dev>',
            to: [learner.email],
            subject: `Session Confirmed: Learning ${session.skill}`,
            html: `
              <h1>Session Confirmed! 🎉</h1>
              <p>Hi ${learner.full_name || 'there'},</p>
              <p>Great news! Your session has been confirmed.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2>Session Details</h2>
                <p><strong>Skill:</strong> ${session.skill}</p>
                <p><strong>Role:</strong> Learner</p>
                <p><strong>Teacher:</strong> ${teacher?.full_name || 'Unknown'}</p>
                <p><strong>Time:</strong> ${sessionTime}</p>
                <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
              </div>
              ${session.meeting_link ? `
                <p style="margin: 30px 0;">
                  <a href="${session.meeting_link}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    🎥 Join Video Meeting
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">
                  Meeting Link: <a href="${session.meeting_link}">${session.meeting_link}</a>
                </p>
              ` : ''}
              ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
              <p>You'll receive a reminder 1 hour before the session starts.</p>
              <p>Best regards,<br>The SkillSync Team</p>
            `,
          });
          emailsSent++;
          console.log(`Sent confirmation to learner: ${learner.email}`);
        } catch (error) {
          console.error(`Failed to send email to learner ${learner.email}:`, error);
        }
      }
    } else if (status === 'declined') {
      // Send decline notification to learner only (if notifications enabled)
      if (learner?.email && learner?.session_notification_enabled !== false) {
        try {
          await resend.emails.send({
            from: 'SkillSync <onboarding@resend.dev>',
            to: [learner.email],
            subject: `Session Declined: ${session.skill}`,
            html: `
              <h1>Session Update</h1>
              <p>Hi ${learner.full_name || 'there'},</p>
              <p>Unfortunately, ${teacher?.full_name || 'the teacher'} has declined your session request.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2>Session Details</h2>
                <p><strong>Skill:</strong> ${session.skill}</p>
                <p><strong>Teacher:</strong> ${teacher?.full_name || 'Unknown'}</p>
                <p><strong>Requested Time:</strong> ${sessionTime}</p>
              </div>
              <p>Don't worry! You can find other teachers for this skill on the platform and book another session.</p>
              <p style="margin: 30px 0;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('supabase.co', 'lovable.app') || ''}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Find Another Teacher
                </a>
              </p>
              <p>Best regards,<br>The SkillSync Team</p>
            `,
          });
          emailsSent++;
          console.log(`Sent decline notification to learner: ${learner.email}`);
        } catch (error) {
          console.error(`Failed to send email to learner ${learner.email}:`, error);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        status,
        emailsSent 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-session-notification:', error);
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
