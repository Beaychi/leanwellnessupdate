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
    const { country, allergies, schedule, mealTypes, preferences } = await req.json();

    const selectedMeals = mealTypes && mealTypes.length > 0 ? mealTypes : ['breakfast', 'lunch', 'dinner'];
    const mealCount = selectedMeals.length;

    const allergyText = allergies.length > 0
      ? `The user is allergic to or cannot eat: ${allergies.join(', ')}. COMPLETELY EXCLUDE any meals containing these ingredients.`
      : 'The user has no food allergies.';

    // Build preference context
    const dietMap: Record<string, string> = {
      balanced: 'a balanced diet with a healthy mix of protein, carbs, and fats',
      vegetarian: 'a vegetarian diet (no meat or fish)',
      vegan: 'a strict vegan diet (no animal products at all)',
      keto: 'a keto/low-carb diet (high fat, very low carbs, moderate protein)',
      'high-protein': 'a high-protein diet focused on lean protein sources',
    };
    const budgetMap: Record<string, string> = {
      budget: 'Use only affordable, everyday ingredients commonly found in local markets',
      moderate: 'Use a balanced mix of affordable and moderately priced ingredients',
      premium: 'Feel free to include premium or specialty ingredients',
    };
    const skillMap: Record<string, string> = {
      beginner: 'Keep recipes very simple with basic cooking techniques (boiling, frying, mixing). Max 5 ingredients per meal.',
      intermediate: 'Recipes can use standard cooking techniques. Up to 8 ingredients per meal.',
      advanced: 'Recipes can be complex with multiple cooking techniques and many ingredients.',
    };
    const sourceMap: Record<string, string> = {
      cook: 'The user cooks all meals at home with full kitchen access.',
      'buy-some': 'The user sometimes cooks and sometimes buys prepared food. Include some meals that can be easily bought from local vendors/restaurants.',
      'buy-mostly': 'The user mostly buys food (e.g., a student). Suggest meals that can be bought from local food vendors, canteens, or restaurants with descriptions of what to order. Only include very simple prep meals (like sandwiches, salads).',
    };
    const prepMap: Record<string, string> = {
      quick: 'Each meal must take less than 15 minutes to prepare.',
      moderate: 'Each meal should take between 15-30 minutes to prepare.',
      elaborate: 'Meals can take 30+ minutes to prepare.',
    };

    const prefs = preferences || {};
    const dietText = dietMap[prefs.dietPreference] || dietMap.balanced;
    const budgetText = budgetMap[prefs.budgetLevel] || budgetMap.moderate;
    const skillText = skillMap[prefs.cookingSkill] || skillMap.intermediate;
    const sourceText = sourceMap[prefs.foodSource] || sourceMap.cook;
    const prepText = prepMap[prefs.prepTime] || prepMap.moderate;

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

USER PREFERENCES:
- Diet: The user follows ${dietText}.
- ${sourceText}
- ${skillText}
- ${budgetText}
- ${prepText}

Schedule: ${mealTimesText}.

IMPORTANT RULES:
- Each day must have exactly ${mealCount} meal(s): ${selectedMeals.join(', ')}
- All meals must be healthy and suitable for weight loss
- Keep portions moderate
- Use ingredients commonly available in ${country}
- Each meal should include nutritional estimates
- DO NOT include any ingredient the user is allergic to
- Make meals practical based on the user's cooking skill and food source
- AVOID weird or unusual food combinations - stick to traditional, well-known pairings from ${country}'s cuisine
- For each meal, suggest a fruit or vegetable side dish that complements the meal (include it in the description like "Serve with sliced mango" or "Side: steamed spinach")
- If the user mostly buys food, describe what to order or buy rather than detailed cooking instructions

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
