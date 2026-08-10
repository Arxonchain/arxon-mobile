-- Reliably expire open dice lobbies and refund stakes every minute
SELECT cron.schedule(
  'expire-open-dice-matches',
  '* * * * *',
  $$SELECT public.expire_open_dice_matches();$$
);

GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO authenticated;
GRANT EXECUTE ON FUNCTION public.expire_open_dice_matches() TO service_role;
