-- Add email_subscriptions table for storing user emails for reports
CREATE TABLE public.email_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  weekly_reports BOOLEAN NOT NULL DEFAULT true,
  monthly_reports BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this app)
CREATE POLICY "Allow select email subscriptions" 
ON public.email_subscriptions 
FOR SELECT 
USING (true);

CREATE POLICY "Allow insert email subscriptions" 
ON public.email_subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update email subscriptions" 
ON public.email_subscriptions 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow delete email subscriptions" 
ON public.email_subscriptions 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_email_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_subscriptions_updated_at
BEFORE UPDATE ON public.email_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_email_subscription_updated_at();