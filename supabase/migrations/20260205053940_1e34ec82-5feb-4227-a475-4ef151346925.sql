-- Create storage bucket for food photos
INSERT INTO storage.buckets (id, name, public) VALUES ('food-photos', 'food-photos', true);

-- Create policies for food photos bucket
CREATE POLICY "Anyone can view food photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'food-photos');

CREATE POLICY "Anyone can upload food photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'food-photos');

CREATE POLICY "Anyone can update food photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'food-photos');

CREATE POLICY "Anyone can delete food photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'food-photos');

-- Create table to store food photo analysis results
CREATE TABLE public.food_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_url TEXT NOT NULL,
  food_name TEXT NOT NULL,
  portion_size TEXT,
  calories INTEGER NOT NULL,
  protein INTEGER,
  carbs INTEGER,
  fats INTEGER,
  ai_analysis TEXT,
  notes TEXT,
  meal_type TEXT DEFAULT 'meal',
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (but allow public access since no auth)
ALTER TABLE public.food_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Anyone can view food entries" 
ON public.food_entries 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert food entries" 
ON public.food_entries 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update food entries" 
ON public.food_entries 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete food entries" 
ON public.food_entries 
FOR DELETE 
USING (true);