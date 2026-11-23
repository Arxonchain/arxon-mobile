import { useState } from 'react';
import { AlertTriangle, Check, Clock, Mail, Shield, Trash2, Wallet } from 'lucide-react';
import type { AccountDeletionRequest } from '@/hooks/useAccountDeletion';
import { toast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import {
  Body,
  Field,
  FrostPanel,
  GhostBtn,
  GlassSheet,
  pc,
  PrimaryBtn,
  ProfileHead,
  TokenRow,
} from '@/features/arxon-v2/design/ProfileChrome';

type Step = 'info' | 'warn' | 'confirm';

const TEAM = 'team@arxonchain.org';

function formatWhen(iso?: string | null) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function DeleteAccountFlow({
  open,
  onClose,
  request,
  busy,
  submit,
  cancel,
}: {
  open: boolean;
  onClose: () => void;
  request: AccountDeletionRequest | null;
  busy: boolean;
  submit: (confirmation: string) => Promise<unknown>;
  cancel: () => Promise<unknown>;
}) {
  const [step, setStep] = useState<Step>('info');
  const [typed, setTyped] = useState('');

  if (!open) return null;

  const pending = request && (request.status === 'pending' || request.status === 'approved');

  const close = () => {
    setStep('info');
    setTyped('');
    onClose();
  };

  const onSubmit = async () => {
    try {
      await submit('DELETE');
      toast({ title: 'Deletion requested', description: `The Arxon team was emailed at ${TEAM}.` });
    } catch (e: unknown) {
      toast(publicErrorToast(e, 'account'));
    }
  };

  const onCancel = async () => {
    try {
      await cancel();
      toast({ title: 'Request cancelled', description: 'Your account will stay active.' });
      close();
    } catch (e: unknown) {
      toast(publicErrorToast(e, 'account'));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: pc.page,
        color: '#fff',
        fontFamily: neon.font,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <ProfileHead
        title="Delete account"
        subtitle="30-day request · team review"
        onBack={close}
      />

      <div style={{ padding: '0 16px 40px', flex: 1 }}>
        {pending && request ? (
          <PendingCard
            status={request.status}
            scheduled={request.scheduled_for}
            requested={request.requested_at}
            busy={busy}
            onCancel={onCancel}
          />
        ) : step === 'info' ? (
          <InfoCard onNext={() => setStep('warn')} />
        ) : step === 'warn' ? (
          <WarnCard onBack={() => setStep('info')} onNext={() => setStep('confirm')} />
        ) : (
          <ConfirmCard
            typed={typed}
            setTyped={setTyped}
            busy={busy}
            onBack={() => setStep('warn')}
            onSubmit={onSubmit}
          />
        )}
      </div>
    </div>
  );
}

function InfoCard({ onNext }: { onNext: () => void }) {
  return (
    <>
      <FrostPanel>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 750, color: pc.ink, letterSpacing: '-0.3px', fontFamily: neon.font }}>
          How deletion works
        </p>
        <div style={{ marginTop: 8 }}>
          <Body ink>
            This is a request, not an instant wipe. The wait exists so the wrong account is not removed, and so there is a record if anything is disputed.
          </Body>
        </div>
      </FrostPanel>

      <GlassSheet title="The 30-day process">
        <TokenRow wrap icon={<span style={{ fontSize: 12, fontWeight: 700 }}>1</span>} title="You submit a request" sub={`We email you and ${TEAM}.`} />
        <TokenRow wrap icon={<span style={{ fontSize: 12, fontWeight: 700 }}>2</span>} title="The Arxon team reviews it" sub="An admin must approve before anything is removed." />
        <TokenRow wrap icon={<span style={{ fontSize: 12, fontWeight: 700 }}>3</span>} title="30-day waiting period" sub="The clock starts the day you submit." />
        <TokenRow wrap icon={<span style={{ fontSize: 12, fontWeight: 700 }}>4</span>} title="You can cancel" sub="Any time before the scheduled date." />
      </GlassSheet>

      <GlassSheet title="Removed when deletion completes">
        <TokenRow wrap icon={<Trash2 size={14} />} title="Profile and login" sub="Username, photo, and access to this account." />
        <TokenRow wrap icon={<Trash2 size={14} />} title="ARX-P, mining, tasks" sub="Promotional points have no cash value and are forfeited." />
        <TokenRow wrap icon={<Trash2 size={14} />} title="Referrals on this account" sub="Your link stops working. Friends keep their own accounts." />
      </GlassSheet>

      <GlassSheet title="What we cannot undo from here">
        <TokenRow wrap icon={<Shield size={14} />} title="Records required by law" sub="Limited fraud, tax, or dispute records may be kept for a retention period." />
        <TokenRow wrap icon={<Wallet size={14} />} title="Wallet on your phone" sub="Your seed lives on the device. Back it up first — we cannot recover it." />
      </GlassSheet>

      <PrimaryBtn label="Continue" danger onClick={onNext} />
    </>
  );
}

function WarnCard({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <>
      <FrostPanel>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 750, color: pc.ink, letterSpacing: '-0.3px', fontFamily: neon.font }}>
          Read this before you continue
        </p>
        <div style={{ marginTop: 8 }}>
          <Body ink>
            After the 30-day window and admin approval, this mining identity is closed for good. If you only need a break, sign out instead.
          </Body>
        </div>
      </FrostPanel>

      <GlassSheet title="What this means" danger>
        <TokenRow
          wrap
          danger
          icon={<AlertTriangle size={14} />}
          title="Permanent after approval + 30 days"
          sub="Friends you referred keep their accounts. Your referral link stops."
        />
        <TokenRow
          wrap
          danger
          icon={<AlertTriangle size={14} />}
          title="Do not abuse this request"
          sub="Requests for someone else’s account, or to dodge a ban or unpaid obligation, may be denied."
        />
      </GlassSheet>

      <PrimaryBtn label="I understand" danger onClick={onNext} />
      <GhostBtn label="Go back" onClick={onBack} />
    </>
  );
}

function ConfirmCard({
  typed,
  setTyped,
  busy,
  onBack,
  onSubmit,
}: {
  typed: string;
  setTyped: (v: string) => void;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const ok = typed.trim() === 'DELETE';
  return (
    <>
      <FrostPanel>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 750, color: pc.ink, letterSpacing: '-0.3px', fontFamily: neon.font }}>
          Confirm the request
        </p>
        <div style={{ marginTop: 8 }}>
          <Body ink>
            Type DELETE to email {TEAM}. The 30-day clock starts now. An admin still has to approve before anything is removed.
          </Body>
        </div>
      </FrostPanel>

      <GlassSheet title="Type DELETE to submit">
        <div style={{ padding: '8px 0 10px' }}>
          <Field value={typed} onChange={setTyped} placeholder="DELETE" />
        </div>
      </GlassSheet>

      <PrimaryBtn
        label={busy ? 'Sending…' : 'Submit request'}
        danger
        disabled={!ok || busy}
        onClick={() => { if (ok && !busy) void onSubmit(); }}
      />
      <GhostBtn label="Go back" onClick={onBack} />
    </>
  );
}

function PendingCard({
  status,
  scheduled,
  requested,
  busy,
  onCancel,
}: {
  status: string;
  scheduled: string;
  requested: string;
  busy: boolean;
  onCancel: () => void;
}) {
  const approved = status === 'approved';
  return (
    <>
      <FrostPanel>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 650, color: pc.muted, fontFamily: neon.font }}>
          {approved ? 'Approved — waiting period' : 'Awaiting team review'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 20, fontWeight: 750, color: pc.ink, letterSpacing: '-0.4px', fontFamily: neon.font }}>
          Request received
        </p>
        <div style={{ marginTop: 8 }}>
          <Body ink>
            {approved
              ? `An admin approved this request. The account stays active until ${formatWhen(scheduled)}. You can still cancel before then.`
              : `Nothing is deleted until an admin approves and the 30-day wait ends.`}
          </Body>
        </div>
      </FrostPanel>

      <GlassSheet title="Schedule">
        <TokenRow wrap icon={<Mail size={14} />} title="Submitted" sub={formatWhen(requested)} />
        <TokenRow wrap icon={<Clock size={14} />} title="Scheduled deletion" sub={formatWhen(scheduled)} />
        <TokenRow
          wrap
          icon={approved ? <Check size={14} /> : <Clock size={14} />}
          title="Status"
          sub={approved ? 'Approved — waiting for the date' : `Team emailed at ${TEAM}`}
        />
      </GlassSheet>

      <PrimaryBtn label={busy ? 'Cancelling…' : 'Cancel deletion request'} onClick={onCancel} disabled={busy} />
    </>
  );
}
