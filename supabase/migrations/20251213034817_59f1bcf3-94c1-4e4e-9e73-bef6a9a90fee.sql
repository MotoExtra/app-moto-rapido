-- Add delivery_quantity column to offers table
ALTER TABLE public.offers 
ADD COLUMN delivery_quantity text;