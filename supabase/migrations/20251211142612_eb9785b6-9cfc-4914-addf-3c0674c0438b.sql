-- Add date column to offers table
ALTER TABLE public.offers 
ADD COLUMN offer_date date DEFAULT CURRENT_DATE;