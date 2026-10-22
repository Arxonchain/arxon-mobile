import { useState, type CSSProperties, type ReactNode } from 'react';
import { font } from '@/walletFigma/tokens';
import { sessionStore } from '@/chainWallet/session';
import { useLiveFrame } from './liveFrame';

const icon = (name: string) => `/wallet-figma/create/${name}`;

type Go = (id: string, remember?: boolean) => void;

export function CreateWalletScreens({
  id,
  go,
  back,
  password,
  setPassword,
  confirm,
  setConfirm,
  agree,
  setAgree,
  backup,
  setBackup,
}: {
  id: string;
  go: Go;
  back?: () => void;
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  backup: 'drive' | 'manual';
  setBackup: (v: 'drive' | 'manual') => void;
}) {
  if (id === 'create') {
    return (
      <CreatePassword
        password={password}
        setPassword={setPassword}
        confirm={confirm}
        setConfirm={setConfirm}
        agree={agree}
        setAgree={setAgree}
        onBack={() => (back ? back() : go(sessionStore.setupPath() === 'import' ? 'import' : 'phrase-confirm', false))}
        onContinue={() => go(sessionStore.setupPath() === 'import' ? 'ready-skip' : 'backup')}
      />
    );
  }
  if (id === 'drive-connect' || id === 'drive-confirm' || id === 'drive-done') {
    return (
      <DriveBackup
        id={id}
        go={go}
        back={back}
        password={password}
      />
    );
  }
  const choice = id === 'backup-manual' ? 'manual' : backup;
  return (
    <Backup
      choice={choice}
      onPick={(next) => {
        setBackup(next);
        go(next === 'drive' ? 'backup' : 'backup-manual', false);
      }}
      onBack={() => (back ? back() : go('create', false))}
      onContinue={() => go(choice === 'drive' ? 'drive-connect' : sessionStore.phraseVerified() ? 'ready-skip' : 'caution1')}
      onLater={() => go('ready-skip')}
    />
  );
}

function CreatePassword({
  password,
  setPassword,
  confirm,
  setConfirm,
  agree,
  setAgree,
  onBack,
  onContinue,
}: {
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  agree: boolean;
  setAgree: (v: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const [show, setShow] = useState(false);
  const rules = [
    password.length >= 8,
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const met = rules.filter(Boolean).length;
  const strong = met === 3;
  const matched = confirm.length > 0 && confirm === password;
  const ready = strong && matched && agree;

  return (
    <Screen>
      <Back onClick={onBack} />
      <div style={{ position: 'absolute', left: 24, top: 112, width: 330 }}>
        <h1 style={title}>Create a password</h1>
        <p style={{ ...body, marginTop: 8 }}>
          You’ll use this to unlock Arxon on this device. It can’t be recovered, so keep it safe.
        </p>
      </div>
      <Label top={258}>Password</Label>
      <Field
        top={284}
        value={password}
        onChange={setPassword}
        secret={!show}
        accent={false}
        aside={
          <button type="button" onClick={() => setShow((v) => !v)} style={iconBtn} aria-label={show ? 'Hide password' : 'Show password'}>
            <img src={icon('eye.svg')} alt="" width={20} height={20} />
          </button>
        }
      />
      <div style={{ position: 'absolute', left: 18, top: 350, width: 354, height: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} style={{ width: 56, height: 4, borderRadius: 2, background: i < met ? '#3ddc84' : '#26292f' }} />
        ))}
        <span style={{ flex: 1 }} />
        {strong && <span style={{ color: '#3ddc84', fontFamily: font.sans, fontWeight: 600, fontSize: 13 }}>Strong</span>}
      </div>
      <Label top={394}>Confirm password</Label>
      <Field
        top={420}
        value={confirm}
        onChange={setConfirm}
        secret
        accent={matched}
        aside={matched ? <img src={icon('check.svg')} alt="" width={20} height={20} /> : <span style={{ width: 20 }} />}
      />
      <div style={{ position: 'absolute', left: 18, top: 498, display: 'flex', gap: 8 }}>
        {['8+ characters', 'A number', 'A symbol'].map((label, i) => (
          <span key={label} style={pill}>
            {rules[i] && <img src={icon('check-sm.svg')} alt="" width={14} height={14} />}
            {label}
          </span>
        ))}
      </div>
      <button type="button" onClick={() => setAgree(!agree)} style={{ position: 'absolute', left: 24, top: 616, width: 348, display: 'flex', gap: 10, alignItems: 'flex-start', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ width: 22, height: 22, borderRadius: 6, background: agree ? '#accafe' : '#1c2025', border: agree ? 'none' : '1px solid #2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 22px' }}>
          {agree && <img src={icon('check-box.svg')} alt="" width={14} height={14} />}
        </span>
        <span style={{ ...body, fontSize: 13, width: 316 }}>
          I understand Arxon can’t recover this password, and I agree to the Terms of Service.
        </span>
      </button>
      <Continue top={712} disabled={!ready} onClick={onContinue} />
    </Screen>
  );
}

function Backup({
  choice,
  onPick,
  onBack,
  onContinue,
  onLater,
}: {
  choice: 'drive' | 'manual';
  onPick: (v: 'drive' | 'manual') => void;
  onBack: () => void;
  onContinue: () => void;
  onLater: () => void;
}) {
  return (
    <Screen>
      <Back onClick={onBack} />
      <div style={{ position: 'absolute', left: 23, top: 112, width: 344 }}>
        <h1 style={title}>Back up your wallet</h1>
        <p style={{ ...body, marginTop: 6 }}>
          Secure your blockchain journey. If you lose this device, a backup is the only way back in.
        </p>
      </div>
      <Option
        top={236}
        selected={choice === 'drive'}
        iconName="cloud.svg"
        title="Google Drive"
        badge="Recommended"
        detail="Encrypted with your password"
        onClick={() => onPick('drive')}
      />
      <Option
        top={332}
        selected={choice === 'manual'}
        iconName="edit.svg"
        title="Manual backup"
        detail="Write down your 12-word phrase"
        onClick={() => onPick('manual')}
      />
      <Continue top={658} onClick={onContinue} />
      <button type="button" onClick={onLater} style={later}>Maybe later</button>
    </Screen>
  );
}

function DriveBackup({ id, go, back, password }: { id: string; go: Go; back?: () => void; password: string }) {
  if (id === 'drive-connect') {
    return (
      <Screen>
        <Back onClick={() => (back ? back() : go('backup', false))} />
        <div style={{ position: 'absolute', left: 18, top: 112, width: 354, display: 'flex', flexDirection: 'column', gap: 223 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
            <div style={{ width: 330 }}>
              <h1 style={title}>Connect Google Drive</h1>
              <p style={{ ...body, marginTop: 6 }}>
                Save an encrypted copy of your wallet. Restore it on any device with your password.
              </p>
            </div>
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <InfoRow iconName="cloud.svg" title="Saved in your Google Drive" detail="In a private Arxon app folder" />
              <InfoRow iconName="shield.svg" title="Encrypted with your password" detail="Arxon and Google can’t read it" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <button type="button" onClick={() => go('drive-confirm')} style={wideBtn}>Continue with Google</button>
            <button type="button" onClick={() => (back ? back() : go('backup', false))} style={textBtn}>Choose another method</button>
          </div>
        </div>
      </Screen>
    );
  }
  if (id === 'drive-confirm') {
    return <DriveConfirm password={password} onBack={() => (back ? back() : go('drive-connect', false))} onContinue={() => go('drive-done')} />;
  }
  return (
    <Screen status="ready">
      <div style={{ position: 'absolute', left: 121, top: 134, width: 148, height: 148, borderRadius: 74, background: '#11161f', border: '1px solid #2a3447', boxSizing: 'border-box' }} />
      <div style={{ position: 'absolute', left: 147, top: 160, width: 96, height: 96, borderRadius: 48, background: '#1c2025', border: '1px solid #accafe', boxSizing: 'border-box' }} />
      <img src={icon('shield-ready.svg')} alt="" width={48} height={48} style={{ position: 'absolute', left: 171, top: 184 }} />
      <h1 style={{ ...title, position: 'absolute', left: 24, top: 320, width: 342, textAlign: 'center' }}>Your wallet is ready</h1>
      <p style={{ position: 'absolute', left: 40, top: 366, width: 310, margin: 0, textAlign: 'center', color: '#8b9097', fontFamily: font.sans, fontSize: 15, fontWeight: 400, lineHeight: '22px' }}>
        Account 01 is created and protected. You choose what stays private on every payment.
      </p>
      <div style={{ position: 'absolute', left: 18, top: 452, width: 354, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ReadyRow title="Google Drive backup on" detail="Encrypted with your password" />
        <ReadyRow title="Password set" detail="Unlocks Arxon on this device" />
        <ReadyRow title="Privacy defaults set" detail="You choose what each payment hides" />
      </div>
      <button type="button" onClick={() => go('home')} style={{ ...wideBtn, position: 'absolute', left: 19, top: 712, width: 353 }}>Enter Arxon</button>
    </Screen>
  );
}

function DriveConfirm({ password, onBack, onContinue }: { password: string; onBack: () => void; onContinue: () => void }) {
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const ready = value.length > 0 && (password.length === 0 || value === password);
  return (
    <Screen>
      <Back onClick={onBack} />
      <div style={{ position: 'absolute', left: 24, top: 112, width: 340 }}>
        <h1 style={title}>Confirm your password</h1>
        <p style={{ ...body, marginTop: 8, width: 330 }}>
          Enter your Arxon password to encrypt your backup before it’s saved to Google Drive.
        </p>
      </div>
      <Label top={258}>Password</Label>
      <Field
        top={284}
        value={value}
        onChange={setValue}
        secret={!show}
        accent={false}
        aside={
          <button type="button" onClick={() => setShow((v) => !v)} style={iconBtn} aria-label={show ? 'Hide password' : 'Show password'}>
            <img src={icon('eye.svg')} alt="" width={20} height={20} />
          </button>
        }
      />
      <p style={{ position: 'absolute', left: 24, top: 356, width: 316, margin: 0, color: '#8b9097', fontFamily: font.sans, fontSize: 13, fontWeight: 400 }}>
        You’ll need this password to restore your wallet from Google Drive.
      </p>
      <Continue top={712} label="Back up to Google Drive" disabled={!ready} onClick={onContinue} />
    </Screen>
  );
}

function InfoRow({ iconName, title: label, detail }: { iconName: string; title: string; detail: string }) {
  return (
    <div style={{ height: 88, boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, padding: 16 }}>
      <span style={{ width: 44, height: 44, borderRadius: 22, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 44px' }}>
        <img src={icon(iconName)} alt="" width={22} height={22} />
      </span>
      <span>
        <span style={{ display: 'block', color: '#fff', fontWeight: 600, fontSize: 16 }}>{label}</span>
        <span style={{ display: 'block', marginTop: 4, color: '#8b9097', fontSize: 13 }}>{detail}</span>
      </span>
    </div>
  );
}

function ReadyRow({ title: label, detail }: { title: string; detail: string }) {
  return (
    <div style={{ boxSizing: 'border-box', background: '#1c2025', border: '1px solid #2a3447', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
      <span style={{ width: 28, height: 28, borderRadius: 14, background: '#12261d', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 28px' }}>
        <img src={icon('check-ready.svg')} alt="" width={16} height={16} />
      </span>
      <span>
        <span style={{ display: 'block', color: '#fff', fontWeight: 600, fontSize: 15 }}>{label}</span>
        <span style={{ display: 'block', marginTop: 2, color: '#8b9097', fontSize: 13 }}>{detail}</span>
      </span>
    </div>
  );
}

function Screen({ children, status = 'flow' }: { children: ReactNode; status?: 'flow' | 'ready' }) {
  const live = useLiveFrame();
  return (
    <div style={{ position: 'relative', width: 390, height: 844, background: '#050505', overflow: 'hidden', fontFamily: font.sans, color: '#fff' }}>
      {live?.app ? null : (
      <div style={{ position: 'absolute', left: 0, top: 0, width: 390, height: 44 }}>
        {status === 'ready' ? (
          <span style={{ position: 'absolute', left: 28, top: 13, fontSize: 15, fontWeight: 600 }}>9:41</span>
        ) : (
          <span style={{ position: 'absolute', left: 21, top: 14, width: 54, textAlign: 'center', fontSize: 14, fontWeight: 600, letterSpacing: -0.28 }}>9:41</span>
        )}
        <img src="/wallet-figma/welcome/status.svg" alt="" width={66.6} height={11.33} style={{ position: 'absolute', left: status === 'ready' ? 296 : 288.67, top: status === 'ready' ? 17 : 17.33 }} />
      </div>
      )}
      {children}
      {live?.app ? null : (
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', justifyContent: 'center', opacity: 0.25 }}>
        <div style={{ width: 134, height: 5, borderRadius: 100, background: '#fff' }} />
      </div>
      )}
    </div>
  );
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Back" style={{ position: 'absolute', left: 18, top: 56, width: 40, height: 40, borderRadius: 20, border: 'none', background: '#1c2025', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      <img src={icon('chev.svg')} alt="" width={20} height={20} />
    </button>
  );
}

function Label({ top, children }: { top: number; children: ReactNode }) {
  return <p style={{ position: 'absolute', left: 24, top, margin: 0, fontSize: 14, fontWeight: 500 }}>{children}</p>;
}

function Field({
  top,
  value,
  onChange,
  secret,
  accent,
  aside,
}: {
  top: number;
  value: string;
  onChange: (v: string) => void;
  secret: boolean;
  accent: boolean;
  aside: ReactNode;
}) {
  return (
    <label style={{ position: 'absolute', left: 18, top, width: 354, height: 56, boxSizing: 'border-box', background: '#1c2025', border: accent ? '1.5px solid #accafe' : '1px solid #2a3447', borderRadius: 14, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8 }}>
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontFamily: font.sans, fontWeight: 500, fontSize: 18 }}
      />
      {aside}
    </label>
  );
}

function Option({
  top,
  selected,
  iconName,
  title,
  badge,
  detail,
  onClick,
}: {
  top: number;
  selected: boolean;
  iconName: string;
  title: string;
  badge?: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} style={{ position: 'absolute', left: 18, top, width: 354, height: 88, boxSizing: 'border-box', background: '#1c2025', border: selected ? '1.5px solid #accafe' : '1px solid #2a3447', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14, padding: 16, cursor: 'pointer', textAlign: 'left', fontFamily: font.sans }}>
      <span style={{ width: 44, height: 44, borderRadius: 22, background: '#2a3447', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 44px' }}>
        <img src={icon(iconName)} alt="" width={22} height={22} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>{title}</span>
          {badge && <span style={{ background: '#2a3447', color: '#accafe', fontWeight: 600, fontSize: 11, borderRadius: 10, padding: '3px 8px' }}>{badge}</span>}
        </span>
        <span style={{ display: 'block', marginTop: 4, color: '#8b9097', fontSize: 13 }}>{detail}</span>
      </span>
      <img src={icon(selected ? 'radio-on.svg' : 'radio-off.svg')} alt="" width={22} height={22} />
    </button>
  );
}

function Continue({ top, onClick, disabled = false, label = 'Continue' }: { top: number; onClick: () => void; disabled?: boolean; label?: string }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} style={{ position: 'absolute', left: 19, top, width: 353, height: 55, border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      {label}
    </button>
  );
}

const title: CSSProperties = { margin: 0, fontFamily: font.sans, fontWeight: 700, fontSize: 30, lineHeight: 'normal', color: '#fff' };
const body: CSSProperties = { margin: 0, fontFamily: font.sans, fontWeight: 400, fontSize: 16, lineHeight: 'normal', color: '#8b9097' };
const pill: CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, background: '#11161f', color: '#8b9097', borderRadius: 18, padding: '7px 12px 7px 10px', fontFamily: font.sans, fontWeight: 500, fontSize: 12 };
const iconBtn: CSSProperties = { width: 20, height: 20, padding: 0, border: 'none', background: 'none', cursor: 'pointer' };
const later: CSSProperties = { position: 'absolute', left: 18, top: 721, width: 354, height: 55, border: 'none', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontWeight: 600, fontSize: 15, cursor: 'pointer' };
const wideBtn: CSSProperties = { height: 55, width: '100%', border: 'none', borderRadius: 8, background: '#accafe', color: '#0c1018', fontFamily: font.sans, fontWeight: 600, fontSize: 16, cursor: 'pointer' };
const textBtn: CSSProperties = { border: 'none', background: 'transparent', color: '#accafe', fontFamily: font.sans, fontWeight: 600, fontSize: 15, cursor: 'pointer', padding: 0 };
