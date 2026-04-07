import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let email: string | null = null;
    let subscriptionId: string | null = null;

    // Support both GET (email links) and POST (in-app unsubscribe)
    if (req.method === "POST") {
      const body = await req.json();
      email = body.email || null;
      subscriptionId = body.subscriptionId || null;
    } else {
      const url = new URL(req.url);
      email = url.searchParams.get("email");
      subscriptionId = url.searchParams.get("id");
    }

    if (!email && !subscriptionId) {
      return new Response(generateHtmlPage("Error", "Invalid unsubscribe request. Email or subscription ID required.", false), {
        status: 400,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    console.log(`Unsubscribe request for email: ${email}, id: ${subscriptionId}`);

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete the subscription
    let query = supabase.from("email_subscriptions").delete();
    
    if (subscriptionId) {
      query = query.eq("id", subscriptionId);
    } else {
      query = query.eq("email", email);
    }

    const { error } = await query;

    if (error) {
      console.error("Error deleting subscription:", error);
      return new Response(generateHtmlPage("Error", "Failed to unsubscribe. Please try again later.", false), {
        status: 500,
        headers: { "Content-Type": "text/html", ...corsHeaders },
      });
    }

    console.log(`Successfully unsubscribed: ${email}`);

    return new Response(generateHtmlPage("Unsubscribed Successfully", `You have been unsubscribed from LeanTrack email reports. You will no longer receive weekly or monthly progress reports at ${email}.`, true), {
      status: 200,
      headers: { "Content-Type": "text/html", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Unsubscribe error:", error);
    return new Response(generateHtmlPage("Error", "An unexpected error occurred. Please try again later.", false), {
      status: 500,
      headers: { "Content-Type": "text/html", ...corsHeaders },
    });
  }
};

function generateHtmlPage(title: string, message: string, success: boolean): string {
  const iconColor = success ? "#4CAF50" : "#f44336";
  const icon = success ? "✓" : "✕";
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - LeanTrack</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 450px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        .icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: ${iconColor};
          color: white;
          font-size: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 20px;
        }
        h1 {
          color: #333;
          margin-bottom: 15px;
          font-size: 24px;
        }
        p {
          color: #666;
          line-height: 1.6;
          margin-bottom: 25px;
        }
        .logo {
          font-size: 14px;
          color: #999;
          margin-top: 20px;
        }
        .logo span {
          color: #4CAF50;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${title}</h1>
        <p>${message}</p>
        <div class="logo">🏃 <span>LeanTrack</span> • Your Personal Health Companion</div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
