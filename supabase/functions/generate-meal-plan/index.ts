import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { country, allergies, schedule, mealTypes } = await req.json();

    const selectedMeals = mealTypes && mealTypes.length > 0 ? mealTypes : ['breakfast', 'lunch', 'dinner'];
    const mealCount = selectedMeals.length;

    const allergyText = allergies.length > 0
      ? `The user is allergic to or cannot eat: ${allergies.join(', ')}. COMPLETELY EXCLUDE any meals containing these ingredients.`
      : 'The user has no food allergies.';

    const mealTimesText = selectedMeals.map((type: string) => {
      if (type === 'breakfast') return `Breakfast at ${schedule?.breakfastTime || '07:30'}`;
      if (type === 'lunch') return `Lunch at ${schedule?.lunchTime || '13:00'}`;
      if (type === 'dinner') return `Dinner at ${schedule?.dinnerTime || '19:00'}`;
      return '';
    }).filter(Boolean).join(', ');

    const mealExamples = selectedMeals.map((type: string, idx: number) => {
      const time = type === 'breakfast' ? (schedule?.breakfastTime || '07:30')
        : type === 'lunch' ? (schedule?.lunchTime || '13:00')
        : (schedule?.dinnerTime || '19:00');
      return `        {
          "id": "d1-${type}",
          "type": "${type}",
          "name": "Meal Name",
          "description": "Short description",
          "time": "${time}",
          "ingredients": ["ingredient 1", "ingredient 2"],
          "instructions": ["step 1", "step 2"],
          "nutritionalInfo": {
            "calories": 350,
            "protein": "20g",
            "carbs": "40g",
            "fats": "10g"
          }
        }`;
    }).join(',\n');

    const prompt = `Generate a 7-day meal plan for someone from ${country}. The meals should be inspired by ${country}'s cuisine and local foods.

${allergyText}

Schedule: ${mealTimesText}.

IMPORTANT RULES:
- Each day must have exactly ${mealCount} meal(s): ${selectedMeals.join(', ')}
- All meals must be healthy and suitable for weight loss
- Keep portions moderate
- Use ingredients commonly available in ${country}
- Each meal should include nutritional estimates
- DO NOT include any ingredient the user is allergic to
- Make meals practical and easy to prepare

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "plan": [
    {
      "day": 1,
      "meals": [
${mealExamples}
      ],
      "waterIntake": "2-3 liters",
      "notes": "Motivational note for the day"
    }
  ]
}

Generate all 7 days. Make each day unique with different meals.`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a nutritionist who creates personalized meal plans. Return ONLY valid JSON, no markdown formatting.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content;
    
    // Strip markdown code fences if present
    content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    const mealPlan = JSON.parse(content);

    return new Response(JSON.stringify(mealPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
