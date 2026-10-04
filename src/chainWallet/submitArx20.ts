import { encodeFunctionData, type Hex } from 'viem';

import type { ShieldProof, SpendProof } from './prove';

const OUTPUT = {
  type: 'tuple[]',
  name: 'outputs',
  components: [
    { type: 'bytes32', name: 'cm' },
    { type: 'bytes32', name: 'cv' },
    { type: 'bytes32', name: 'revealedReceiver' },
    { type: 'bytes32', name: 'revealedAmount' },
    { type: 'bytes', name: 'encryptedNote' },
  ],
} as const;

const INPUT = {
  type: 'tuple[]',
  name: 'inputs',
  components: [
    { type: 'bytes32', name: 'nullifier' },
    { type: 'bytes32', name: 'cv' },
    { type: 'bytes32', name: 'revealedSender' },
  ],
} as const;

const PROOFS = {
  type: 'tuple',
  name: 'proofs',
  components: [
    { type: 'bytes', name: 'spend' },
    { type: 'bytes', name: 'output' },
    { type: 'bytes', name: 'balance' },
    { type: 'bytes', name: 'receipt' },
    { type: 'bytes', name: 'compliance' },
  ],
} as const;

const PTR = {
  type: 'tuple',
  name: 'ptr',
  components: [
    { type: 'bool', name: 'present' },
    { type: 'uint8', name: 'outputIndex' },
    { type: 'bytes32', name: 'id' },
  ],
} as const;

export const IARX20_ABI = [
  {
    name: 'shield',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'uint256', name: 'amount' },
      OUTPUT,
      { type: 'uint8', name: 'maskBits' },
      { type: 'uint256', name: 'expiryBlock' },
      PROOFS,
    ],
    outputs: [],
  },
  {
    name: 'unshield',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'recipient' },
      { type: 'uint256', name: 'amount' },
      { type: 'bytes32', name: 'anchor' },
      INPUT,
      OUTPUT,
      { type: 'uint8', name: 'maskBits' },
      { type: 'uint256', name: 'expiryBlock' },
      PROOFS,
    ],
    outputs: [],
  },
  {
    name: 'transferPrivate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'bytes32', name: 'anchor' },
      INPUT,
      OUTPUT,
      { type: 'uint8', name: 'maskBits' },
      { type: 'uint256', name: 'expiryBlock' },
      PTR,
      { ...PTR, name: 'compliance' },
      PROOFS,
    ],
    outputs: [],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'value' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

const ZERO32 = `0x${'00'.repeat(32)}` as Hex;

function proofsArg(p: SpendProof['proofs'] | ShieldProof['proofs']) {
  return {
    spend: p.spend,
    output: p.output,
    balance: p.balance,
    receipt: p.receipt,
    compliance: p.compliance,
  };
}

function outputsArg(outputs: ShieldProof['outputs']) {
  return outputs.map((o) => ({
    cm: o.cm,
    cv: o.cv,
    revealedReceiver: o.revealed_receiver,
    revealedAmount: o.revealed_amount,
    encryptedNote: o.encrypted_note,
  }));
}

function inputsArg(inputs: SpendProof['inputs']) {
  return inputs.map((i) => ({
    nullifier: i.nullifier,
    cv: i.cv,
    revealedSender: i.revealed_sender,
  }));
}

export function arx20ShieldCalldata(proof: ShieldProof): Hex {
  return encodeFunctionData({
    abi: IARX20_ABI,
    functionName: 'shield',
    args: [
      BigInt(proof.amount_wei),
      outputsArg(proof.outputs),
      proof.mask_bits,
      BigInt(proof.expiry_block),
      proofsArg(proof.proofs),
    ],
  });
}

export function arx20TransferCalldata(proof: SpendProof): Hex {
  const none = { present: false, outputIndex: 0, id: ZERO32 };
  return encodeFunctionData({
    abi: IARX20_ABI,
    functionName: 'transferPrivate',
    args: [
      proof.anchor,
      inputsArg(proof.inputs),
      outputsArg(proof.outputs),
      proof.mask_bits,
      BigInt(proof.expiry_block),
      none,
      none,
      proofsArg(proof.proofs),
    ],
  });
}

export function arx20UnshieldCalldata(proof: SpendProof, recipient: `0x${string}`): Hex {
  return encodeFunctionData({
    abi: IARX20_ABI,
    functionName: 'unshield',
    args: [
      recipient,
      BigInt(proof.amount_wei),
      proof.anchor,
      inputsArg(proof.inputs),
      outputsArg(proof.outputs),
      proof.mask_bits,
      BigInt(proof.expiry_block),
      proofsArg(proof.proofs),
    ],
  });
}

export function erc20TransferCalldata(to: `0x${string}`, value: bigint): Hex {
  return encodeFunctionData({
    abi: IARX20_ABI,
    functionName: 'transfer',
    args: [to, value],
  });
}
