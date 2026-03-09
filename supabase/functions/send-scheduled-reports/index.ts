import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ScheduledReportRequest {
  reportType: "weekly" | "monthly";
}

const generateReportHtml = (reportType: string, email: string) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4CAF50, #2E7D32); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { padding: 30px; }
        .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🏃 LeanTrack ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Your scheduled progress summary</p>
        </div>
        <div class="content">
          <p>Hello!</p>
          <p>This is your scheduled ${reportType} report from LeanTrack. Open the app to view your detailed progress and stats.</p>
          <p style="color: #666; text-align: center; margin-top: 20px;">Keep up the great work! Every small step counts towards your health goals.</p>
        </div>
        <div class="footer">
          <p>LeanTrack • Your Personal Health Companion</p>
          <p>You're receiving this because you subscribed to ${reportType} reports.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType }: ScheduledReportRequest = await req.json();
    
    console.log(`Processing scheduled ${reportType} reports`);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all subscribers for this report type
    const column = reportType === "weekly" ? "weekly_reports" : "monthly_reports";
    const { data: subscribers, error: fetchError } = await supabase
      .from("email_subscriptions")
      .select("email")
      .eq(column, true);

    if (fetchError) {
      console.error("Error fetching subscribers:", fetchError);
      throw fetchError;
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("No subscribers found for", reportType, "reports");
      return new Response(JSON.stringify({ success: true, sent: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Found ${subscribers.length} subscribers for ${reportType} reports`);

    let sentCount = 0;
    const errors: string[] = [];

    for (const subscriber of subscribers) {
      try {
        const html = generateReportHtml(reportType, subscriber.email);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "LeanTrack <onboarding@resend.dev>",
            to: [subscriber.email],
            subject: `Your LeanTrack ${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Progress Report 📊`,
            html,
          }),
        });

        if (res.ok) {
          sentCount++;
          console.log(`Email sent to ${subscriber.email}`);
        } else {
          const errorData = await res.json();
          console.error(`Failed to send to ${subscriber.email}:`, errorData);
          errors.push(`${subscriber.email}: ${errorData.message}`);
        }
      } catch (err: any) {
        console.error(`Error sending to ${subscriber.email}:`, err);
        errors.push(`${subscriber.email}: ${err.message}`);
      }
    }

    console.log(`Scheduled ${reportType} reports complete: ${sentCount}/${subscribers.length} sent`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: subscribers.length,
        errors: errors.length > 0 ? errors : undefined 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error processing scheduled reports:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
