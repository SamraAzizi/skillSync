import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const WHEREBY_API_KEY = Deno.env.get('WHEREBY_API_KEY');
    if (!WHEREBY_API_KEY) {
      throw new Error('WHEREBY_API_KEY is not set');
    }

    const { sessionId, startDate, endDate } = await req.json();

    console.log('Creating Whereby meeting for session:', sessionId);

    // Create a Whereby meeting room
    const response = await fetch('https://api.whereby.dev/v1/meetings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHEREBY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate,
        endDate,
        fields: ['hostRoomUrl', 'roomUrl'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Whereby API error:', errorText);
      throw new Error(`Whereby API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Whereby meeting created:', data.roomUrl);

    return new Response(
      JSON.stringify({ 
        roomUrl: data.roomUrl,
        hostRoomUrl: data.hostRoomUrl 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating Whereby meeting:', error);
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
