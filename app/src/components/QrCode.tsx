import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

// QR code généré 100 % localement (lib qrcode, aucune requête réseau).
export function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: '#0b2523', light: '#ffffff' } })
      .then((d) => { if (alive) setSrc(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [value, size]);
  if (!src) return <div className="animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" style={{ width: size, height: size }} />;
  return <img src={src} alt="QR fiche patient" width={size} height={size} className="rounded-lg bg-white p-1" />;
}
