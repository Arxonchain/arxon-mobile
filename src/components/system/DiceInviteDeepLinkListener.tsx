import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { lobbyPathForDiceInvite, parseDiceInviteUrl } from '@/features/dice/diceInviteUrl';

/**
 * If Capacitor ever receives an arxonchain.xyz /d|/r URL (App Links / custom scheme),
 * route into the existing join-by-code lobby. Does not replace paste-code UX.
 */
export default function DiceInviteDeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!Capacitor.isPluginAvailable('App')) return;

    let remove: (() => void) | undefined;

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');

        const openInvite = (url: string) => {
          const parsed = parseDiceInviteUrl(url);
          if (!parsed) return;
          navigate(lobbyPathForDiceInvite(parsed.mode, parsed.code));
        };

        const launch = await App.getLaunchUrl();
        if (launch?.url) openInvite(launch.url);

        const handle = await App.addListener('appUrlOpen', ({ url }) => openInvite(url));
        remove = () => {
          void handle.remove();
        };
      } catch {
        /* plugin unavailable — join-by-code still works */
      }
    })();

    return () => remove?.();
  }, [navigate]);

  return null;
}
