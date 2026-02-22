-- Initial Setup & Schema for Control de Gastos Colaborativo

-- 1. Create custom types if necessary (using Check constraints instead for simplicity)

-- 2. Create tables
CREATE TABLE IF NOT EXISTS public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  role text default 'user'::text check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade not null,
  category_id uuid references public.categories (id) on delete set null not null,
  detail text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null check (currency in ('COP', 'USD')),
  amount_cop numeric(12,2) not null,
  amount_usd numeric(12,2) not null,
  expense_date date not null default current_date,
  attachment_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert essential categories
INSERT INTO public.categories (name) VALUES 
('Mercado'), ('Ropa Niños'), ('Transporte'), ('Restaurantes'), ('Medicos'), ('Colegio'), ('Utiles escolares'), ('Regalos'), ('Otros')
ON CONFLICT (name) DO NOTHING;

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Users Table Policies
CREATE POLICY "Users are viewable by everyone" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Categories Table Policies
CREATE POLICY "Categories are viewable by everyone" ON public.categories
  FOR SELECT USING (true);

-- Expenses Table Policies
CREATE POLICY "Expenses are viewable by everyone" ON public.expenses
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Triggers for updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- 5. Trigger to handle new users from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Setup Attachment Storage (Requires pgcrypto for gen_random_uuid())
-- Note: Assuming you have created a bucket named 'attachments' via dashboard or CLI
-- These setup policies assume the bucket exists.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true) 
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Attachments are publicly accessible" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can upload attachments" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own attachments" 
  ON storage.objects FOR UPDATE 
  USING (bucket_id = 'attachments' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own attachments" 
  ON storage.objects FOR DELETE 
  USING (bucket_id = 'attachments' AND auth.uid() = owner);
