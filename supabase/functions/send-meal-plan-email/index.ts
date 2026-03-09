import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Meal {
  id: string;
  type: string;
  name: string;
  description: string;
  time: string;
  ingredients: string[];
  instructions: string[];
  nutritionalInfo: {
    calories: number;
    protein: string;
    carbs: string;
    fats: string;
  };
}

interface DayPlan {
  day: number;
  meals: Meal[];
  waterIntake: string;
  notes: string;
}

interface MealPlanEmailRequest {
  email: string;
  firstName: string;
  country: string;
  plan: DayPlan[];
}

const mealTypeIcon = (type: string) => {
  switch (type) {
    case 'breakfast': return '🌅';
    case 'lunch': return '☀️';
    case 'dinner': return '🌙';
    default: return '🍽️';
  }
};

const mealTypeLabel = (type: string) => {
  switch (type) {
    case 'breakfast': return 'Breakfast';
    case 'lunch': return 'Lunch';
    case 'dinner': return 'Dinner';
    default: return 'Meal';
  }
};

const generateMealPlanHtml = (data: MealPlanEmailRequest): string => {
  const { firstName, country, plan } = data;

  // Collect all unique ingredients across the entire plan
  const allIngredients = new Map<string, Set<number>>();
  plan.forEach(day => {
    day.meals.forEach(meal => {
      meal.ingredients.forEach(ingredient => {
        const key = ingredient.toLowerCase().trim();
        if (!allIngredients.has(key)) {
          allIngredients.set(key, new Set());
        }
        allIngredients.get(key)!.add(day.day);
      });
    });
  });

  // Build day sections
  const daySections = plan.map(day => {
    const mealRows = day.meals.map(meal => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 20px; margin-right: 8px;">${mealTypeIcon(meal.type)}</span>
            <strong style="font-size: 16px; color: #1f2937;">${mealTypeLabel(meal.type)}</strong>
            <span style="margin-left: auto; color: #6b7280; font-size: 13px;">⏰ ${meal.time}</span>
          </div>
          <h4 style="margin: 4px 0 6px; color: #111827; font-size: 15px;">${meal.name}</h4>
          <p style="margin: 0 0 10px; color: #6b7280; font-size: 13px; line-height: 1.5;">${meal.description}</p>
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <span style="background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">🔥 ${meal.nutritionalInfo.calories} cal</span>
            <span style="background: #dbeafe; color: #1e40af; padding: 3px 10px; border-radius: 12px; font-size: 12px;">P: ${meal.nutritionalInfo.protein}</span>
            <span style="background: #fce7f3; color: #9d174d; padding: 3px 10px; border-radius: 12px; font-size: 12px;">C: ${meal.nutritionalInfo.carbs}</span>
            <span style="background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 12px; font-size: 12px;">F: ${meal.nutritionalInfo.fats}</span>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div style="margin-bottom: 24px;">
        <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 14px 20px; border-radius: 12px 12px 0 0;">
          <h3 style="margin: 0; font-size: 18px;">📅 Day ${day.day}</h3>
          <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">💧 Water: ${day.waterIntake} • ${day.notes}</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          ${mealRows}
        </table>
      </div>
    `;
  }).join('');

  // Build ingredients section grouped alphabetically
  const sortedIngredients = Array.from(allIngredients.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  const ingredientRows = sortedIngredients.map(([ingredient, days]) => {
    const dayList = Array.from(days).sort().map(d => `D${d}`).join(', ');
    return `<tr>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-transform: capitalize;">${ingredient}</td>
      <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 12px; color: #9ca3af; text-align: right;">${dayList}</td>
    </tr>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 640px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #059669, #047857); padding: 32px 24px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
          <h1 style="margin: 0 0 8px; color: white; font-size: 26px;">🍽️ Your 7-Day Meal Plan</h1>
          <p style="margin: 0; color: #a7f3d0; font-size: 15px;">Personalized ${country} cuisine for ${firstName}</p>
          <p style="margin: 8px 0 0; color: #d1fae5; font-size: 12px;">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <!-- Timetable Section -->
        <h2 style="color: #111827; font-size: 20px; margin-bottom: 16px; padding-left: 4px;">📋 Your Meal Timetable</h2>
        ${daySections}

        <!-- Ingredients Shopping List -->
        <div style="margin-top: 32px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 14px 20px; border-radius: 12px 12px 0 0;">
            <h2 style="margin: 0; font-size: 18px;">🛒 Complete Ingredients List</h2>
            <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">${sortedIngredients.length} ingredients across your 7-day plan</p>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="background: #ffffff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <tr style="background: #fef3c7;">
              <td style="padding: 10px 12px; font-weight: 700; font-size: 13px; color: #92400e;">Ingredient</td>
              <td style="padding: 10px 12px; font-weight: 700; font-size: 13px; color: #92400e; text-align: right;">Used On</td>
            </tr>
            ${ingredientRows}
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px; padding: 20px; color: #9ca3af; font-size: 12px;">
          <p>Generated by <strong style="color: #059669;">LeanTrack</strong></p>
          <p>Stay consistent, stay healthy! 💪</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const requestData: MealPlanEmailRequest = await req.json();
    const { email, firstName, country, plan } = requestData;

    if (!email || !plan || plan.length === 0) {
      throw new Error("Missing required fields: email and plan");
    }

    const html = generateMealPlanHtml(requestData);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LeanTrack <onboarding@resend.dev>",
        to: [email],
        subject: `🍽️ Your 7-Day ${country} Meal Plan is Ready!`,
        html,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error("Resend error:", resData);
      throw new Error(resData.message || "Failed to send email");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-meal-plan-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
