import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useChainWallet } from './ChainWalletContext';
import { storage } from './storage';
import {
  approveNamespaces,
  disconnectAll,
  disconnectTopic,
  executeWcRequest,
  getSdkError,
  getWalletKit,
  initWalletKit,
  listSessions,
  rpcFail,
  rpcResult,
  rpcUserReject,
  wcReady,
  type WcProposal,
  type WcRequest,
  type WcSessionRow,
} from './wc';

type WcState = {
  projectId: string;
  ready: boolean;
  error: string | null;
  sessions: WcSessionRow[];
  proposal: WcProposal | null;
  request: WcRequest | null;
  busy: boolean;
  setProjectId: (id: string) => Promise<void>;
  pair: (uri: string) => Promise<void>;
  approveProposal: () => Promise<void>;
  rejectProposal: () => Promise<void>;
  approveRequest: () => Promise<void>;
  rejectRequest: () => Promise<void>;
  disconnect: (topic: string) => Promise<void>;
};

const Ctx = createContext<WcState | null>(null);

export function WcProvider({ children }: { children: ReactNode }) {
  const { address, mnemonic, rpcUrl, ready: walletReady } = useChainWallet();
  const [projectId, setProjectIdState] = useState('');
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<WcSessionRow[]>([]);
  const [proposal, setProposal] = useState<WcProposal | null>(null);
  const [request, setRequest] = useState<WcRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const deps = useRef({ address, mnemonic, rpcUrl });
  deps.current = { address, mnemonic, rpcUrl };

  const refreshSessions = useCallback(() => {
    setSessions(listSessions());
  }, []);

  const boundId = useRef('');
  const onProposal = useCallback((next: WcProposal) => {
    setProposal(next);
  }, []);
  const onRequest = useCallback((next: WcRequest) => {
    setRequest(next);
  }, []);
  const onDelete = useCallback(() => {
    refreshSessions();
  }, [refreshSessions]);

  const bindKit = useCallback(
    async (id: string) => {
      if (typeof window === 'undefined') return;
      const trimmed = id.trim();
      if (!trimmed) {
        setReady(false);
        return;
      }
      const kit = await initWalletKit(trimmed);
      if (boundId.current !== trimmed) {
        kit.on('session_proposal', onProposal);
        kit.on('session_request', onRequest);
        kit.on('session_delete', onDelete);
        boundId.current = trimmed;
      }
      setReady(true);
      setError(null);
      refreshSessions();
    },
    [onProposal, onRequest, onDelete, refreshSessions]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved =
        (await storage.getWcProjectId())?.trim() ||
        (typeof import.meta !== 'undefined' ? (import.meta.env.VITE_WC_PROJECT_ID as string | undefined) : '') ||
        '';
      if (cancelled) return;
      setProjectIdState(saved);
      if (!saved) return;
      try {
        await bindKit(saved);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bindKit]);

  useEffect(() => {
    if (walletReady && !address && wcReady()) {
      void disconnectAll().then(refreshSessions);
    }
  }, [walletReady, address, refreshSessions]);

  const setProjectId = useCallback(
    async (id: string) => {
      const next = id.trim();
      await storage.setWcProjectId(next);
      setProjectIdState(next);
      try {
        await bindKit(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        throw e;
      }
    },
    [bindKit]
  );

  const pair = useCallback(async (uri: string) => {
    const trimmed = uri.trim();
    if (!trimmed.startsWith('wc:')) {
      throw new Error('Paste a wc: URI from the dapp.');
    }
    setBusy(true);
    setError(null);
    try {
      await getWalletKit().pair({ uri: trimmed });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      throw e;
    } finally {
      setBusy(false);
    }
  }, []);

  const approveProposal = useCallback(async () => {
    if (!proposal) return;
    const addr = deps.current.address;
    if (!addr) throw new Error('No wallet');
    setBusy(true);
    setError(null);
    try {
      const namespaces = approveNamespaces(proposal, addr);
      if (!namespaces || Object.keys(namespaces).length === 0) {
        throw new Error('Dapp required another chain. This wallet is 7171 only.');
      }
      await getWalletKit().approveSession({
        id: proposal.id,
        namespaces,
      });
      setProposal(null);
      refreshSessions();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        msg.includes('Non conforming') || msg.includes("don't satisfy")
          ? 'Dapp required another chain. This wallet is 7171 only.'
          : msg
      );
      try {
        await getWalletKit().rejectSession({
          id: proposal.id,
          reason: getSdkError('USER_REJECTED'),
        });
      } catch {
        /* proposal may already be gone */
      }
      setProposal(null);
    } finally {
      setBusy(false);
    }
  }, [proposal, refreshSessions]);

  const rejectProposal = useCallback(async () => {
    if (!proposal) return;
    setBusy(true);
    try {
      await getWalletKit().rejectSession({
        id: proposal.id,
        reason: getSdkError('USER_REJECTED'),
      });
    } finally {
      setProposal(null);
      setBusy(false);
    }
  }, [proposal]);

  const approveRequest = useCallback(async () => {
    if (!request) return;
    const { mnemonic: phrase, address: addr, rpcUrl: rpc } = deps.current;
    if (!phrase || !addr) throw new Error('No wallet');
    setBusy(true);
    setError(null);
    try {
      const result = await executeWcRequest(request, {
        mnemonic: phrase,
        address: addr,
        rpcUrl: rpc,
      });
      await getWalletKit().respondSessionRequest({
        topic: request.topic,
        response: rpcResult(request.id, result),
      });
      setRequest(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      try {
        await getWalletKit().respondSessionRequest({
          topic: request.topic,
          response: rpcFail(request.id, msg),
        });
      } catch {
        /* session dropped */
      }
      setRequest(null);
    } finally {
      setBusy(false);
    }
  }, [request]);

  const rejectRequest = useCallback(async () => {
    if (!request) return;
    setBusy(true);
    try {
      await getWalletKit().respondSessionRequest({
        topic: request.topic,
        response: rpcUserReject(request.id),
      });
    } finally {
      setRequest(null);
      setBusy(false);
    }
  }, [request]);

  const disconnect = useCallback(
    async (topic: string) => {
      await disconnectTopic(topic);
      refreshSessions();
    },
    [refreshSessions]
  );

  const value = useMemo(
    () => ({
      projectId,
      ready,
      error,
      sessions,
      proposal,
      request,
      busy,
      setProjectId,
      pair,
      approveProposal,
      rejectProposal,
      approveRequest,
      rejectRequest,
      disconnect,
    }),
    [
      projectId,
      ready,
      error,
      sessions,
      proposal,
      request,
      busy,
      setProjectId,
      pair,
      approveProposal,
      rejectProposal,
      approveRequest,
      rejectRequest,
      disconnect,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWc() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWc outside WcProvider');
  return ctx;
}

export function WcGate() {
  const { proposal, request } = useWc();
  const navigate = useNavigate();
  const location = useLocation();
  const last = useRef('');
  useEffect(() => {
    const key = proposal ? `p:${proposal.id}` : request ? `r:${request.id}` : '';
    if (!key || key === last.current) return;
    last.current = key;
    if (location.pathname.startsWith('/connect')) return;
    navigate('/connect');
  }, [proposal, request, navigate, location.pathname]);
  return null;
}
