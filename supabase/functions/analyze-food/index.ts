 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
 };
 
 serve(async (req) => {
   // Handle CORS preflight requests
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const { imageBase64 } = await req.json();
     
     if (!imageBase64) {
       console.error('No image data provided');
       return new Response(
         JSON.stringify({ error: 'No image data provided' }),
         { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
     if (!LOVABLE_API_KEY) {
       console.error('LOVABLE_API_KEY is not configured');
       return new Response(
         JSON.stringify({ error: 'AI service not configured' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log('Analyzing food image with AI...');
 
     const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${LOVABLE_API_KEY}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         model: 'google/gemini-3-flash-preview',
         messages: [
           {
             role: 'system',
             content: `You are a nutrition expert AI. Analyze food images and provide detailed nutritional estimates.
 
 IMPORTANT: Always respond with valid JSON in this exact format:
 {
   "food_name": "Name of the food/dish",
   "portion_size": "Estimated portion size (e.g., '1 plate', '200g', '1 bowl')",
   "calories": <number>,
   "protein": <number in grams>,
   "carbs": <number in grams>,
   "fats": <number in grams>,
   "description": "Brief description of what you see and any dietary notes",
   "confidence": "high/medium/low"
 }
 
 Be accurate with Nigerian and West African dishes. If you see multiple items, estimate the total. If uncertain, provide reasonable estimates based on typical portion sizes.`
           },
           {
             role: 'user',
             content: [
               {
                 type: 'text',
                 text: 'Analyze this food image and provide nutritional information in JSON format.'
               },
               {
                 type: 'image_url',
                 image_url: {
                   url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                 }
               }
             ]
           }
         ],
         max_tokens: 1000,
       }),
     });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error('AI API error:', response.status, errorText);
       
       if (response.status === 429) {
         return new Response(
           JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
           { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
       
       if (response.status === 402) {
         return new Response(
           JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
           { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
         );
       }
       
       return new Response(
         JSON.stringify({ error: 'Failed to analyze image' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     const aiResponse = await response.json();
     const content = aiResponse.choices?.[0]?.message?.content;
     
     console.log('AI response received:', content?.substring(0, 200));
 
     if (!content) {
       console.error('No content in AI response');
       return new Response(
         JSON.stringify({ error: 'No analysis result from AI' }),
         { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     // Parse the JSON from the AI response
     let nutritionData;
     try {
       // Try to extract JSON from the response (AI might wrap it in markdown)
       const jsonMatch = content.match(/\{[\s\S]*\}/);
       if (jsonMatch) {
         nutritionData = JSON.parse(jsonMatch[0]);
       } else {
         throw new Error('No JSON found in response');
       }
     } catch (parseError) {
       console.error('Failed to parse AI response as JSON:', parseError);
       // Return a fallback with the raw analysis
       nutritionData = {
         food_name: 'Food Item',
         portion_size: 'Unknown',
         calories: 0,
         protein: 0,
         carbs: 0,
         fats: 0,
         description: content,
         confidence: 'low'
       };
     }
 
     console.log('Nutrition data parsed successfully:', nutritionData.food_name);
 
     return new Response(
       JSON.stringify(nutritionData),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
 
   } catch (error) {
     console.error('Error in analyze-food function:', error);
     return new Response(
       JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });