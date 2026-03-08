-- Fix wallet policies - drop existing ones first, then recreate
DROP POLICY IF EXISTS "Users can view their own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON public.user_wallets;
DROP POLICY IF EXISTS "Admins can manage all wallets" ON public.user_wallets;

-- Recreate with proper restrictions
CREATE POLICY "Users can view their own wallets" 
ON public.user_wallets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own wallets" 
ON public.user_wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own wallets" 
ON public.user_wallets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Only admins can delete wallets
CREATE POLICY "Admins can delete wallets"
ON public.user_wallets
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));