import { Core } from '@walletconnect/core';
import { formatJsonRpcError, formatJsonRpcResult } from '@walletconnect/jsonrpc-utils';
import { buildApprovedNamespaces, getSdkError } from '@walletconnect/utils';
import { WalletKit, type WalletKitTypes } from '@reown/walletkit';
import {
  formatEther,
  hexToString,
  isAddress,
  isHex,
  type Address,
  type Hex,
} from 'viem';
import { mnemonicToAccount } from 'viem/accounts';

import { ARXON, ARXON_CAIP, walletClient } from './chain';
import { pushActivity } from './activity';

export type WcProposal = WalletKitTypes.SessionProposal;
export type WcRequest = WalletKitTypes.SessionRequest;

export type WcSessionRow = {
  topic: string;
  name: string;
  url: string;
};

const WC_METHODS = [
  'eth_accounts',
  'eth_requestAccounts',
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_sign',
  'personal_sign',
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'wallet_switchEthereumChain',
  'wallet_addEthereumChain',
];

const METADATA = {
  name: 'Arxon',
  description: 'Arxon wallet · chain 7171',
  url: 'https://arxon.io',
  icons: [] as string[],
};

type Kit = Awaited<ReturnType<typeof WalletKit.init>>;

let kit: Kit | null = null;
let kitProjectId = '';

export function wcReady(): boolean {
  return kit != null;
}

export async function initWalletKit(projectId: string): Promise<Kit> {
  const id = projectId.trim();
  if (!id) {
    throw new Error('WalletConnect Project ID is empty. Paste it in Settings (cloud.reown.com).');
  }
  if (kit && kitProjectId === id) return kit;
  const core = new Core({ projectId: id });
  kit = await WalletKit.init({
    core,
    metadata: METADATA,
    signConfig: { disableRequestQueue: true },
  });
  kitProjectId = id;
  return kit;
}

export function getWalletKit(): Kit {
  if (!kit) {
    throw new Error('WalletConnect is not started. Save a Project ID in Settings.');
  }
  return kit;
}

export function listSessions(): WcSessionRow[] {
  if (!kit) return [];
  return Object.values(kit.getActiveSessions()).map((session) => ({
    topic: session.topic,
    name: session.peer.metadata.name || 'dapp',
    url: session.peer.metadata.url || '',
  }));
}

type ProposalStruct = {
  requiredNamespaces?: Record<string, { chains?: string[]; methods?: string[]; events?: string[] }>;
  optionalNamespaces?: Record<string, { chains?: string[]; methods?: string[]; events?: string[] }>;
  proposer?: { metadata?: { name?: string; url?: string; icons?: string[]; description?: string } };
};

export function supportedNamespaces(address: Address) {
  return {
    eip155: {
      chains: [ARXON_CAIP],
      methods: WC_METHODS,
      events: ['chainChanged', 'accountsChanged'],
      accounts: [`${ARXON_CAIP}:${address}`],
    },
  };
}

function proposalStruct(proposal: WcProposal): ProposalStruct {
  const row = proposal as unknown as { params?: ProposalStruct } & ProposalStruct;
  if (row.params && (row.params.proposer || row.params.requiredNamespaces || row.params.optionalNamespaces)) {
    return row.params;
  }
  return row;
}

function chainRefs(ns: ProposalStruct['requiredNamespaces']): string[] {
  if (!ns) return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(ns)) {
    if (key.includes(':')) out.push(key.toLowerCase());
    for (const chain of value.chains ?? []) {
      out.push(chain.includes(':') ? chain.toLowerCase() : `${key}:${chain}`.toLowerCase());
    }
  }
  return out;
}

function mentions7171(params: ProposalStruct): boolean {
  const refs = [...chainRefs(params.requiredNamespaces), ...chainRefs(params.optionalNamespaces)];
  if (refs.some((c) => c === ARXON_CAIP || c.endsWith(':7171') || c.endsWith(':0x1c03'))) return true;
  return JSON.stringify(params).includes('7171');
}

function requiredBlocks7171(params: ProposalStruct): boolean {
  const required = chainRefs(params.requiredNamespaces);
  if (required.length === 0) return false;
  return !required.some((c) => c === ARXON_CAIP || c.endsWith(':7171') || c.endsWith(':0x1c03'));
}

function namespacesHaveAccounts(ns: Record<string, { accounts?: string[] }>): boolean {
  return Object.values(ns).some((row) => (row.accounts?.length ?? 0) > 0);
}

export function approveNamespaces(proposal: WcProposal, address: Address) {
  const params = proposalStruct(proposal);
  const supported = supportedNamespaces(address);
  if (requiredBlocks7171(params) && !mentions7171(params)) {
    throw new Error('Dapp required another chain. This wallet is 7171 only.');
  }
  try {
    const built = buildApprovedNamespaces({
      proposal: params as Parameters<typeof buildApprovedNamespaces>[0]['proposal'],
      supportedNamespaces: supported,
    });
    if (built && namespacesHaveAccounts(built)) return built;
  } catch {
    /* AppKit often keys optional chains as eip155:7171; builder then returns {}. */
  }
  if (mentions7171(params) || !params.requiredNamespaces || Object.keys(params.requiredNamespaces).length === 0) {
    return supported;
  }
  throw new Error('Dapp required another chain. This wallet is 7171 only.');
}

export function dappLabel(proposal: WcProposal): { name: string; url: string } {
  const meta = proposalStruct(proposal).proposer?.metadata;
  return { name: meta?.name || 'dapp', url: meta?.url || '' };
}

export function requestLabel(req: WcRequest): { name: string; url: string; method: string; detail: string } {
  const session = kit?.getActiveSessions()[req.topic];
  const method = req.params.request.method;
  return {
    name: session?.peer.metadata.name || 'dapp',
    url: session?.peer.metadata.url || '',
    method,
    detail: requestDetail(method, req.params.request.params),
  };
}

function asRecord(params: unknown): Record<string, unknown> | null {
  if (Array.isArray(params) && params[0] && typeof params[0] === 'object') {
    return params[0] as Record<string, unknown>;
  }
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    return params as Record<string, unknown>;
  }
  return null;
}

function requestDetail(method: string, params: unknown): string {
  if (method === 'eth_sendTransaction' || method === 'eth_signTransaction') {
    const tx = asRecord(params);
    if (!tx) return '';
    const to = typeof tx.to === 'string' ? tx.to : '';
    let amount = '';
    try {
      if (typeof tx.value === 'string' && tx.value !== '0x' && tx.value !== '0x0') {
        amount = `${formatEther(BigInt(tx.value))} tARX`;
      }
    } catch {
      amount = '';
    }
    return [to, amount].filter(Boolean).join(' · ');
  }
  if (method === 'personal_sign' || method === 'eth_sign') {
    const raw = method === 'eth_sign' ? paramAt(params, 1) : paramAt(params, 0);
    return previewMessage(raw);
  }
  if (method.startsWith('eth_signTypedData')) {
    return 'typed data';
  }
  if (method === 'wallet_switchEthereumChain' || method === 'wallet_addEthereumChain') {
    const row = asRecord(params);
    return typeof row?.chainId === 'string' ? row.chainId : '';
  }
  return '';
}

function paramAt(params: unknown, i: number): unknown {
  return Array.isArray(params) ? params[i] : undefined;
}

function previewMessage(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  try {
    if (isHex(raw)) {
      const text = hexToString(raw);
      return text.length > 96 ? `${text.slice(0, 96)}…` : text;
    }
  } catch {
    /* hex that is not utf8 */
  }
  return raw.length > 96 ? `${raw.slice(0, 96)}…` : raw;
}

function chainOk(chainId: string): boolean {
  const n = chainId.includes(':') ? chainId.split(':')[1] : chainId;
  if (n === '7171' || n.toLowerCase() === '0x1c03') return true;
  try {
    return Number(n) === ARXON.id;
  } catch {
    return false;
  }
}

export async function executeWcRequest(
  req: WcRequest,
  input: { mnemonic: string; address: Address; rpcUrl: string }
): Promise<unknown> {
  const { method, params } = req.params.request;
  const chainId = req.params.chainId;
  if (chainId && !chainOk(chainId) && method !== 'wallet_switchEthereumChain' && method !== 'wallet_addEthereumChain') {
    throw new Error(`Dapp asked for ${chainId}. This wallet is chain 7171.`);
  }

  const account = mnemonicToAccount(input.mnemonic.trim());
  if (account.address.toLowerCase() !== input.address.toLowerCase()) {
    throw new Error('Wallet account mismatch');
  }

  switch (method) {
    case 'eth_accounts':
    case 'eth_requestAccounts':
      return [input.address];
    case 'personal_sign':
      return signPersonal(account, paramAt(params, 0));
    case 'eth_sign':
      return signHash(account, paramAt(params, 1));
    case 'eth_signTypedData':
    case 'eth_signTypedData_v3':
    case 'eth_signTypedData_v4':
      return signTyped(account, paramAt(params, 1) ?? paramAt(params, 0));
    case 'eth_sendTransaction':
      return sendTx(params, input);
    case 'eth_signTransaction':
      return signTx(params, input);
    case 'wallet_switchEthereumChain':
    case 'wallet_addEthereumChain':
      return switchOrAdd(params);
    default:
      throw new Error(`Method ${method} is not supported`);
  }
}

function signPersonal(account: ReturnType<typeof mnemonicToAccount>, raw: unknown) {
  if (typeof raw !== 'string') throw new Error('personal_sign missing message');
  if (isHex(raw)) {
    return account.signMessage({ message: { raw } });
  }
  return account.signMessage({ message: raw });
}

function signHash(account: ReturnType<typeof mnemonicToAccount>, raw: unknown) {
  if (typeof raw !== 'string' || !isHex(raw)) throw new Error('eth_sign missing data');
  if (raw.length === 66) return account.sign({ hash: raw });
  return account.signMessage({ message: { raw } });
}

function signTyped(account: ReturnType<typeof mnemonicToAccount>, raw: unknown) {
  const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!data || typeof data !== 'object') throw new Error('typed data missing');
  const typed = data as {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType?: string;
    message: Record<string, unknown>;
  };
  if (!typed.primaryType) throw new Error('typed data missing primaryType');
  return account.signTypedData(
    typed as unknown as Parameters<typeof account.signTypedData>[0]
  );
}

type TxFields = {
  to?: string;
  from?: string;
  data?: string;
  value?: string;
  gas?: string;
  gasLimit?: string;
  gasPrice?: string;
  nonce?: string;
};

function readTx(params: unknown): TxFields {
  const tx = asRecord(params);
  if (!tx) throw new Error('transaction missing');
  return tx as TxFields;
}

function txArgs(fields: TxFields, address: Address) {
  if (fields.from && isAddress(fields.from) && fields.from.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Transaction from does not match this wallet');
  }
  const to = fields.to && isAddress(fields.to) ? (fields.to as Address) : undefined;
  const data = fields.data && isHex(fields.data) ? (fields.data as Hex) : undefined;
  if (!to && !data) throw new Error('transaction missing to');
  const value = fields.value && fields.value !== '0x' ? BigInt(fields.value) : BigInt(0);
  const gasRaw = fields.gas || fields.gasLimit;
  const gas = gasRaw && gasRaw !== '0x' ? BigInt(gasRaw) : undefined;
  const gasPrice = fields.gasPrice && fields.gasPrice !== '0x' ? BigInt(fields.gasPrice) : undefined;
  const nonce =
    fields.nonce != null && fields.nonce !== '' && fields.nonce !== '0x'
      ? Number(BigInt(fields.nonce))
      : undefined;
  return { to, data, value, gas, gasPrice, nonce, type: 'legacy' as const };
}

async function sendTx(
  params: unknown,
  input: { mnemonic: string; address: Address; rpcUrl: string }
): Promise<Hex> {
  const fields = readTx(params);
  const args = txArgs(fields, input.address);
  const client = walletClient(input.rpcUrl, input.mnemonic);
  let hash: Hex;
  try {
    hash = await client.sendTransaction(args as unknown as Parameters<typeof client.sendTransaction>[0]);
  } catch (e) {
    if (args.gas) throw e;
    hash = await client.sendTransaction({ ...args, gas: BigInt(2_000_000) } as unknown as Parameters<typeof client.sendTransaction>[0]);
  }
  let amount = '';
  try {
    if (args.value > BigInt(0)) amount = formatEther(args.value);
  } catch {
    amount = '';
  }
  await pushActivity({
    hash,
    kind: 'transfer',
    to: args.to ?? '',
    amount,
    maskBits: 0,
    at: Date.now(),
  });
  return hash;
}

async function signTx(
  params: unknown,
  input: { mnemonic: string; address: Address; rpcUrl: string }
): Promise<Hex> {
  const fields = readTx(params);
  const args = txArgs(fields, input.address);
  const client = walletClient(input.rpcUrl, input.mnemonic);
  return client.signTransaction(args as unknown as Parameters<typeof client.signTransaction>[0]);
}

function switchOrAdd(params: unknown): null {
  const row = asRecord(params);
  const chainId = typeof row?.chainId === 'string' ? row.chainId : '';
  if (!chainOk(chainId) && chainId) {
    throw new Error(`This wallet is chain 7171. Dapp asked for ${chainId}.`);
  }
  return null;
}

export function rpcResult(id: number, result: unknown) {
  return formatJsonRpcResult(id, result);
}

export function rpcUserReject(id: number) {
  return formatJsonRpcError(id, getSdkError('USER_REJECTED').message);
}

export function rpcFail(id: number, message: string) {
  return formatJsonRpcError(id, message);
}

export async function disconnectTopic(topic: string) {
  await getWalletKit().disconnectSession({
    topic,
    reason: getSdkError('USER_DISCONNECTED'),
  });
}

export async function disconnectAll() {
  if (!kit) return;
  const sessions = Object.values(kit.getActiveSessions());
  for (const session of sessions) {
    try {
      await kit.disconnectSession({
        topic: session.topic,
        reason: getSdkError('USER_DISCONNECTED'),
      });
    } catch {
      /* already gone */
    }
  }
}

export { getSdkError };
