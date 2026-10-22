import { useRef, type CSSProperties } from 'react';
import { photoFromFile, writeProfilePhoto } from './profilePhoto';

function Camera({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 7.5 10.2 6h3.6L15 7.5h2.5A1.5 1.5 0 0 1 19 9v8.5A1.5 1.5 0 0 1 17.5 19h-11A1.5 1.5 0 0 1 5 17.5V9A1.5 1.5 0 0 1 6.5 7.5H9Z"
        stroke="#8b9097"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="3.1" stroke="#8b9097" strokeWidth="1.6" />
    </svg>
  );
}

export function ProfileAvatar({
  size,
  photo,
  accountIndex,
  onOpen,
}: {
  size: number;
  photo: string | null;
  accountIndex: number;
  /** Home: open account. Account: omit so a tap opens the photo picker. */
  onOpen?: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  async function onFile(file?: File) {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      writeProfilePhoto(accountIndex, await photoFromFile(file));
    } catch {
      /* keep the previous photo */
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label={onOpen ? 'Profile' : photo ? 'Change profile photo' : 'Add profile photo'}
        onClick={() => (onOpen ? onOpen() : input.current?.click())}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          border: 'none',
          padding: 0,
          overflow: 'hidden',
          background: '#1c2025',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {photo ? (
          <img src={photo} alt="" width={size} height={size} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Camera size={Math.round(size * 0.46)} />
        )}
      </button>
      {onOpen ? null : (
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            void onFile(file);
          }}
        />
      )}
    </>
  );
}

export const profileRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 };
