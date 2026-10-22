import QRCode from 'qrcode';

export async function qrDataUrl(text: string) {
  return QRCode.toDataURL(text, {
    margin: 1,
    width: 400,
    errorCorrectionLevel: 'M',
    color: { dark: '#050505', light: '#ffffff' },
  });
}

export async function scanAddressQr(): Promise<string> {
  try {
    const { BarcodeScanner, BarcodeFormat } = await import('@capacitor-mlkit/barcode-scanning');
    const perm = await BarcodeScanner.requestPermissions();
    if (perm.camera !== 'granted') throw new Error('Camera permission is required to scan.');
    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.QrCode],
    });
    const raw = barcodes[0]?.rawValue?.trim() || '';
    if (!raw) throw new Error('No QR code was read.');
    return stripQrPayload(raw);
  } catch (pluginErr) {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      return scanWithDetector();
    }
    throw pluginErr instanceof Error ? pluginErr : new Error('QR scanning is not available on this device. Paste the address instead.');
  }
}

function stripQrPayload(raw: string) {
  const trimmed = raw.trim();
  if (trimmed.startsWith('wc:')) return trimmed;
  const ethereum = trimmed.match(/ethereum:([0-9a-zA-Z]+)/i);
  if (ethereum) return ethereum[1].startsWith('0x') ? ethereum[1] : `0x${ethereum[1]}`;
  const bitcoin = trimmed.match(/^(bitcoin:)?(bc1[a-z0-9]+|[13][a-km-zA-HJ-NP-Z1-9]{25,})/i);
  if (bitcoin) return bitcoin[2];
  return trimmed.replace(/^solana:/i, '');
}

async function scanWithDetector(): Promise<string> {
  const Detector = (window as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
  const detector = new Detector({ formats: ['qr_code'] });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  const video = document.createElement('video');
  video.srcObject = stream;
  await video.play();
  try {
    for (let i = 0; i < 40; i += 1) {
      const codes = await detector.detect(video);
      const raw = codes[0]?.rawValue?.trim();
      if (raw) return stripQrPayload(raw);
      await new Promise((resolve) => window.setTimeout(resolve, 250));
    }
    throw new Error('No QR code was read. Paste the address instead.');
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
}
