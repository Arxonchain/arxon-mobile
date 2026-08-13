import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { lobbyPathForDiceInvite, parseDiceInviteUrl } from '@/features/dice/diceInviteUrl';
import { parseAuthAppLink, stashAuthCallbackHash } from '@/lib/auth/parseAuthAppLink';

/**
 * Capacitor appUrlOpen / cold-start launch URL → in-app HashRouter navigation.
 * Handles auth App Links (confirm / reset) and Dice invite short links.
 */
export default function AppDeepLinkListener() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    if (!Capacitor.isPluginAvailable('App')) return;

    let remove: (() => void) | undefined;

    void (async () => {
      try {
        const { App } = await import('@capacitor/app');

        const openUrl = (url: string) => {
          const auth = parseAuthAppLink(url);
          if (auth) {
            stashAuthCallbackHash(auth.implicitHash);
            navigate(auth.pathWithSearch);
            return;
          }

          const invite = parseDiceInviteUrl(url);
          if (invite) {
            navigate(lobbyPathForDiceInvite(invite.mode, invite.code));
          }
        };

        const launch = await App.getLaunchUrl();
        if (launch?.url) openUrl(launch.url);

        const handle = await App.addListener('appUrlOpen', ({ url }) => openUrl(url));
        remove = () => {
          void handle.remove();
        };
      } catch {
        /* plugin unavailable — browser / paste flows still work */
      }
    })();

    return () => remove?.();
  }, [navigate]);

  return null;
}
