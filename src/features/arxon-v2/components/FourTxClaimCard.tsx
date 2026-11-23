import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Flag, Check, Shield, Send, ArrowDownToLine, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFourTxClaim } from '@/hooks/useFourTxClaim';
import { toast } from '@/hooks/use-toast';
import { publicErrorToast } from '@/lib/publicError';
import { neon } from '@/features/arxon-v2/design/neonTokens';
import { shortAddress } from '@/lib/testnetWalletLink';
import { startTestnetConnect } from '@/lib/testnetConnectSession';
import ConnectWalletModal from './ConnectWalletModal';

const STEPS: {
  key: 'shield' | 'privatePay' | 'unshieldSelf' | 'unshieldOther';
  label: string;
  Icon: typeof Shield;
}[] = [
  { key: 'shield', label: 'Shield', Icon: Shield },
  { key: 'privatePay', label: 'Private pay', Icon: Send },
  { key: 'unshieldSelf', label: 'Unshield to you', Icon: ArrowDownToLine },
  { key: 'unshieldOther', label: 'Unshield to other', Icon: ArrowUpRight },
];

type Filter = 'all' | 'todo' | 'done';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'todo', label: 'To Do' },
  { id: 'done', label: 'Done' },
];

function todayLabel() {
  return new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function timeLabel(at?: number) {
  if (!at) return 'Today';
  return new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function FourTxClaimCard({ preview = false }: { preview?: boolean }) {
  const {
    progress,
    claimedToday,
    claiming,
    claim,
    amount,
    linkedAddress,
    history,
    unlinkWallet,
  } = useFourTxClaim(!preview);

  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [pickerOpen, setPickerOpen] = useState(false);

  const complete = !!progress?.complete;
  const showClaim = !preview && complete && !claimedToday && !!linkedAddress;

  const todayTasks = STEPS.map((step) => {
    const row = progress?.[step.key];
    return {
      ...step,
      done: !!row,
      at: row?.at as number | undefined,
    };
  });

  const list = useMemo(() => {
    if (filter === 'done') {
      return history.map((h) => ({
        key: h.key,
        label: h.label,
        done: true,
        at: h.at,
        utcDate: h.utcDate,
      }));
    }
    return todayTasks.filter((t) => {
      if (filter === 'todo') return !t.done;
      return true;
    });
  }, [complete, filter, history, todayTasks]);

  const openPicker = () => {
    if (preview) return;
    setPickerOpen(true);
  };

  const pickArxon = () => {
    setPickerOpen(false);
    startTestnetConnect();
    navigate('/mine/connect');
  };

  if (!linkedAddress) {
    return (
      <div data-tour="wallet-connect" style={{ fontFamily: neon.font, color: '#0c1018' }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 750, letterSpacing: '-0.6px' }}>Testnet Tasks</p>
        <p style={{ margin: '4px 0 16px', fontSize: 13, color: '#8c8f99' }}>{todayLabel()}</p>
        <p style={{ margin: '0 0 16px', fontSize: 13, lineHeight: 1.4, color: '#5c6370' }}>
          Connect your arxon testnet wallet to this mining account. Only txns from the wallet you connect are credited.
        </p>
        <button
          type="button"
          onClick={openPicker}
          style={{
            width: '100%',
            height: 48,
            borderRadius: 14,
            border: 'none',
            background: '#0c1018',
            color: '#fff',
            fontFamily: neon.font,
            fontSize: 15,
            fontWeight: 700,
            cursor: preview ? 'default' : 'pointer',
          }}
        >
          Connect wallet
        </button>
        <ConnectWalletModal
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onPickArxon={pickArxon}
        />
      </div>
    );
  }

  return (
    <div data-tour="wallet-connect" style={{ position: 'relative', fontFamily: neon.font, color: '#0c1018' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div>
          <p style={{ margin: 0, fontSize: 22, fontWeight: 750, letterSpacing: '-0.6px' }}>Testnet Tasks</p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8c8f99' }}>{todayLabel()}</p>
        </div>
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <button
            type="button"
            onClick={unlinkWallet}
            style={{
              height: 34,
              padding: '0 14px',
              border: 'none',
              borderRadius: 12,
              background: '#0c1018',
              color: '#fff',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: neon.font,
            }}
          >
            Disconnect
          </button>
          <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 600, color: '#8c8f99' }}>
            {shortAddress(linkedAddress)}
          </p>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 4,
          marginTop: 14,
          padding: 4,
          borderRadius: 18,
          background: '#eef0f4',
        }}
      >
        {FILTERS.map((tab) => {
          const on = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              style={{
                flex: 1,
                height: 30,
                border: 'none',
                borderRadius: 15,
                background: on ? '#fff' : 'transparent',
                color: on ? '#0c1018' : '#8c8f99',
                fontSize: 11,
                fontWeight: 650,
                cursor: 'pointer',
                fontFamily: neon.font,
                boxShadow: on ? '0 2px 8px rgba(12,16,24,0.10)' : 'none',
                whiteSpace: 'nowrap',
                padding: '0 4px',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
        {list.length === 0 ? (
          <p style={{ margin: '8px 0', fontSize: 13, color: '#8c8f99', textAlign: 'center' }}>
            {filter === 'done' ? 'No completed tasks yet' : 'Nothing here'}
          </p>
        ) : (
          list.map((task) => (
            <div
              key={`${task.key}-${'utcDate' in task ? task.utcDate : 'today'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 16,
                background: '#fff',
                border: '1px solid #eceef2',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: task.done ? 'none' : '2px solid #d5d8e0',
                  background: task.done ? '#3d6dff' : 'transparent',
                  color: '#fff',
                }}
              >
                {task.done ? <Check size={13} strokeWidth={2.8} /> : null}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 650,
                    color: '#0c1018',
                    textDecoration: task.done ? 'line-through' : 'none',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.label}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 11, color: '#8c8f99', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={11} strokeWidth={2.2} />
                  {'utcDate' in task && task.utcDate ? task.utcDate : timeLabel(task.at)}
                </p>
              </div>
              <Flag
                size={16}
                strokeWidth={2}
                color={task.done ? '#3d6dff' : '#c5c9d4'}
                fill={task.done ? '#3d6dff' : 'none'}
              />
            </div>
          ))
        )}
      </div>


      <AnimatePresence>
        {showClaim && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            disabled={claiming}
            onClick={() => {
              void claim().then((res) => {
                if (res.success && !res.already) {
                  toast({ title: `+${amount.toLocaleString()} ARX-P`, description: 'Added to your balance.' });
                } else if (res.already) {
                  toast({ title: 'Already claimed', description: 'This UTC day is already credited.' });
                } else {
                  toast(publicErrorToast(undefined, 'claim'));
                }
              });
            }}
            style={{
              width: '100%',
              marginTop: 12,
              height: 48,
              borderRadius: 14,
              border: 'none',
              background: '#0c1018',
              color: '#fff',
              cursor: claiming ? 'wait' : 'pointer',
              fontFamily: neon.font,
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            {claiming ? 'Claiming…' : 'Claim 5k ARX-P'}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
