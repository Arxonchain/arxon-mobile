-- Arena operator grants. Requires app_role.arena_admin from 20261118010000.

CREATE OR REPLACE FUNCTION public.has_arena_ops(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'arena_admin'::app_role),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.has_arena_ops(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_arena_ops(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_arena_ops(uuid) TO service_role;

DROP POLICY IF EXISTS "Arena operators can manage arena battles" ON public.arena_battles;
CREATE POLICY "Arena operators can manage arena battles"
  ON public.arena_battles
  FOR ALL
  USING (public.has_role(auth.uid(), 'arena_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'arena_admin'::app_role));

DROP POLICY IF EXISTS "Arena operators can manage boosts" ON public.arena_boosts;
CREATE POLICY "Arena operators can manage boosts"
  ON public.arena_boosts
  FOR ALL
  USING (public.has_role(auth.uid(), 'arena_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'arena_admin'::app_role));

DROP POLICY IF EXISTS "Arena operators can view all votes" ON public.arena_votes;
CREATE POLICY "Arena operators can view all votes"
  ON public.arena_votes
  FOR SELECT
  USING (public.has_role(auth.uid(), 'arena_admin'::app_role));

CREATE OR REPLACE FUNCTION public.admin_delete_arena_battle(p_battle_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote_count INT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_arena_ops(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT COUNT(*) INTO v_vote_count FROM public.arena_votes WHERE battle_id = p_battle_id;
  IF v_vote_count > 0 THEN
    PERFORM public.refund_arena_battle_stakes(p_battle_id, 'admin_delete');
  END IF;

  DELETE FROM public.arena_battles WHERE id = p_battle_id;
  RETURN jsonb_build_object('success', true, 'refunded_votes', v_vote_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_listed_arena_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(COALESCE(NEW.email, '')) = 'effiomemmanuel03@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'arena_admin'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_grant_listed_arena_admin ON auth.users;
CREATE TRIGGER trg_grant_listed_arena_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_listed_arena_admin();

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'arena_admin'::app_role
FROM auth.users
WHERE lower(email) = 'effiomemmanuel03@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
