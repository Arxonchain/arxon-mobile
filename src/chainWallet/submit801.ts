import { encodeFunctionData, type Hex } from 'viem';

import { PRECOMPILE } from './chain';
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

export const SUBMIT_ABI = [
  {
    name: 'shield',
    type: 'function',
    inputs: [
      OUTPUT,
      { type: 'uint8', name: 'maskBits' },
      { type: 'uint256', name: 'expiryBlock' },
      PROOFS,
    ],
  },
  {
    name: 'unshield',
    type: 'function',
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
  },
  {
    name: 'submitPrivateTransfer',
    type: 'function',
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
  },
] as const;

export const SHIELD_ABI = SUBMIT_ABI;

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

export function shieldCalldata(proof: ShieldProof): Hex {
  return encodeFunctionData({
    abi: SUBMIT_ABI,
    functionName: 'shield',
    args: [
      outputsArg(proof.outputs),
      proof.mask_bits,
      BigInt(proof.expiry_block),
      proofsArg(proof.proofs),
    ],
  });
}

export function transferCalldata(proof: SpendProof): Hex {
  const none = { present: false, outputIndex: 0, id: ZERO32 };
  return encodeFunctionData({
    abi: SUBMIT_ABI,
    functionName: 'submitPrivateTransfer',
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

export function unshieldCalldata(proof: SpendProof, recipient: `0x${string}`): Hex {
  return encodeFunctionData({
    abi: SUBMIT_ABI,
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

export { PRECOMPILE };
