-- Add 'access_fee' to purchase_type enum
ALTER TYPE public.purchase_type ADD VALUE IF NOT EXISTS 'access_fee';

-- Add parent_order_id to orders to link fee → original order
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

-- Add fee settings to site_settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS access_fee_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS access_fee_amount NUMERIC NOT NULL DEFAULT 24.90;