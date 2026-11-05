import { showTrayNotification } from '@/lib/showTrayNotification';

export function notifyTx(title: string, body: string, tag: string) {
  void showTrayNotification(title, body, { tag, url: '/' });
}
