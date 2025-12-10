import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { Resend } from "https://esm.sh/resend@4.0.0";

// Helper function to get OAuth2 access token for FCM
async function getAccessToken(): Promise<string | null> {
  try {
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return null;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iss: serviceAccount.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    };

    const encoder = new TextEncoder();
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const unsignedToken = `${headerB64}.${payloadB64}`;

    const pemContents = serviceAccount.private_key
      .replace('-----BEGIN PRIVATE KEY-----', '')
      .replace('-----END PRIVATE KEY-----', '')
      .replace(/\n/g, '');
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      encoder.encode(unsignedToken)
    );
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const jwt = `${unsignedToken}.${signatureB64}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResponse.json();
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting FCM access token:', error);
    return null;
  }
}

async function sendPushNotification(
  accessToken: string,
  projectId: string,
  token: string,
  title: string,
  body: string,
  sessionId: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title, body },
            data: { sessionId, type: 'session_reminder' },
            android: {
              priority: 'high',
              notification: { sound: 'default' },
            },
            apns: {
              payload: { aps: { sound: 'default', badge: 1 } },
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('FCM error:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
}

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find sessions that are:
    // 1. Confirmed
    // 2. Starting between 55 and 65 minutes from now (to catch sessions in 1-hour window)
    // 3. Have a meeting link
    const now = new Date();
    const startWindow = new Date(now.getTime() + 55 * 60 * 1000);
    const endWindow = new Date(now.getTime() + 65 * 60 * 1000);

    // Fetch sessions without joins since foreign keys don't exist
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*')
      .eq('status', 'confirmed')
      .not('meeting_link', 'is', null)
      .gte('scheduled_at', startWindow.toISOString())
      .lte('scheduled_at', endWindow.toISOString());

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      throw sessionsError;
    }

    console.log(`Found ${sessions?.length || 0} sessions to send reminders for`);

    // Get FCM access token and project ID
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}');
    const fcmProjectId = serviceAccount.project_id;
    const fcmAccessToken = await getAccessToken();

    let emailsSent = 0;
    let pushSent = 0;
    
    for (const session of sessions || []) {
      // Fetch teacher and learner profiles with notification preferences
      const { data: teacher } = await supabase
        .from('profiles')
        .select('id, email, full_name, session_reminder_enabled')
        .eq('id', session.teacher_id)
        .single();

      const { data: learner } = await supabase
        .from('profiles')
        .select('id, email, full_name, session_reminder_enabled')
        .eq('id', session.learner_id)
        .single();
      const sessionTime = new Date(session.scheduled_at).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short',
      });

      // Send email to teacher (if reminders enabled)
      if (teacher?.email && teacher?.session_reminder_enabled !== false) {
        try {
          await resend.emails.send({
            from: 'SkillSync <onboarding@resend.dev>',
            to: [teacher.email],
            subject: `Session Reminder: Teaching ${session.skill} in 1 hour`,
            html: `
              <h1>Session Starting Soon!</h1>
              <p>Hi ${teacher.full_name || 'there'},</p>
              <p>This is a reminder that your session is starting in approximately 1 hour.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2>Session Details</h2>
                <p><strong>Skill:</strong> ${session.skill}</p>
                <p><strong>Role:</strong> Teacher</p>
                <p><strong>Student:</strong> ${learner?.full_name || 'Unknown'}</p>
                <p><strong>Time:</strong> ${sessionTime}</p>
                <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
              </div>
              <p style="margin: 30px 0;">
                <a href="${session.meeting_link}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  🎥 Join Video Meeting
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                Meeting Link: <a href="${session.meeting_link}">${session.meeting_link}</a>
              </p>
              ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
              <p>Good luck with your session!</p>
              <p>Best regards,<br>The SkillSync Team</p>
            `,
          });
          emailsSent++;
          console.log(`Sent reminder to teacher: ${teacher.email}`);
        } catch (error) {
          console.error(`Failed to send email to teacher ${teacher.email}:`, error);
        }
      }

      // Send push notification to teacher
      if (teacher?.id && fcmAccessToken && fcmProjectId) {
        const { data: teacherTokens } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('user_id', teacher.id);

        for (const { token } of teacherTokens || []) {
          const success = await sendPushNotification(
            fcmAccessToken,
            fcmProjectId,
            token,
            `Session in 1 hour: Teaching ${session.skill}`,
            `Your session with ${learner?.full_name || 'a student'} starts soon!`,
            session.id
          );
          if (success) pushSent++;
        }
      }

      // Send email to learner (if reminders enabled)
      if (learner?.email && learner?.session_reminder_enabled !== false) {
        try {
          await resend.emails.send({
            from: 'SkillSync <onboarding@resend.dev>',
            to: [learner.email],
            subject: `Session Reminder: Learning ${session.skill} in 1 hour`,
            html: `
              <h1>Session Starting Soon!</h1>
              <p>Hi ${learner.full_name || 'there'},</p>
              <p>This is a reminder that your session is starting in approximately 1 hour.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2>Session Details</h2>
                <p><strong>Skill:</strong> ${session.skill}</p>
                <p><strong>Role:</strong> Learner</p>
                <p><strong>Teacher:</strong> ${teacher?.full_name || 'Unknown'}</p>
                <p><strong>Time:</strong> ${sessionTime}</p>
                <p><strong>Duration:</strong> ${session.duration_minutes} minutes</p>
              </div>
              <p style="margin: 30px 0;">
                <a href="${session.meeting_link}" style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  🎥 Join Video Meeting
                </a>
              </p>
              <p style="color: #666; font-size: 14px;">
                Meeting Link: <a href="${session.meeting_link}">${session.meeting_link}</a>
              </p>
              ${session.notes ? `<p><strong>Notes:</strong> ${session.notes}</p>` : ''}
              <p>Enjoy your learning session!</p>
              <p>Best regards,<br>The SkillSync Team</p>
            `,
          });
          emailsSent++;
          console.log(`Sent reminder to learner: ${learner.email}`);
        } catch (error) {
          console.error(`Failed to send email to learner ${learner.email}:`, error);
        }
      }

      // Send push notification to learner
      if (learner?.id && fcmAccessToken && fcmProjectId) {
        const { data: learnerTokens } = await supabase
          .from('device_tokens')
          .select('token')
          .eq('user_id', learner.id);

        for (const { token } of learnerTokens || []) {
          const success = await sendPushNotification(
            fcmAccessToken,
            fcmProjectId,
            token,
            `Session in 1 hour: Learning ${session.skill}`,
            `Your session with ${teacher?.full_name || 'your teacher'} starts soon!`,
            session.id
          );
          if (success) pushSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        sessionsFound: sessions?.length || 0,
        emailsSent,
        pushSent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-session-reminder:', error);
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
