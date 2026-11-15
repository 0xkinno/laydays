import { keccak256, toBytes, type Address, type Hex } from "viem";
import { CHAIN_ID } from "./addresses";

export interface TermsArg {
  owner: Address; charterer: Address; token: Address; completionOfDischarge: bigint; timeBarDays: number;
  requiredDocsMask: number; charterPartyHash: Hex; rulebookHash: Hex;
}

export const domain = (verifyingContract: Address, chainId = CHAIN_ID) => ({ name: "Laydays", version: "1", chainId, verifyingContract }) as const;

const TermsType = [
  { name: "owner", type: "address" }, { name: "charterer", type: "address" }, { name: "token", type: "address" },
  { name: "completionOfDischarge", type: "uint64" }, { name: "timeBarDays", type: "uint16" }, { name: "requiredDocsMask", type: "uint32" },
  { name: "charterPartyHash", type: "bytes32" }, { name: "rulebookHash", type: "bytes32" },
] as const;

export const voyageIdOf = (slug: string): Hex => keccak256(toBytes(slug));

export function openTyped(verifying: Address, voyageId: Hex, terms: TermsArg, nonce: bigint, deadline: bigint) {
  return {
    domain: domain(verifying),
    types: { Open: [{ name: "voyageId", type: "bytes32" }, { name: "terms", type: "Terms" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }], Terms: TermsType },
    primaryType: "Open" as const,
    message: { voyageId, terms, nonce, deadline },
  };
}

export function presentTyped(verifying: Address, p: { voyageId: Hex; amount: bigint; statementDigest: Hex; docsRoot: Hex; providedDocsMask: number; nonce: bigint; deadline: bigint }) {
  return {
    domain: domain(verifying),
    types: { Present: [
      { name: "voyageId", type: "bytes32" }, { name: "amount", type: "uint256" }, { name: "statementDigest", type: "bytes32" }, { name: "docsRoot", type: "bytes32" },
      { name: "providedDocsMask", type: "uint32" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
    primaryType: "Present" as const,
    message: p,
  };
}

export function answerTyped(verifying: Address, p: { voyageId: Hex; accepted: bigint; disputeDigest: Hex; nonce: bigint; deadline: bigint }) {
  return {
    domain: domain(verifying),
    types: { Answer: [{ name: "voyageId", type: "bytes32" }, { name: "accepted", type: "uint256" }, { name: "disputeDigest", type: "bytes32" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
    primaryType: "Answer" as const,
    message: p,
  };
}

export function settleTyped(verifying: Address, p: { voyageId: Hex; toOwner: bigint; nonce: bigint; deadline: bigint }) {
  return {
    domain: domain(verifying),
    types: { Settle: [{ name: "voyageId", type: "bytes32" }, { name: "toOwner", type: "uint256" }, { name: "nonce", type: "uint256" }, { name: "deadline", type: "uint256" }] },
    primaryType: "Settle" as const,
    message: p,
  };
}

/** USDC authorization the charterer signs to fund the ledger (EIP-3009 ReceiveWithAuthorization). */
export function receiveAuthTyped(usdc: Address, usdcName: string, usdcVersion: string, p: { from: Address; to: Address; value: bigint; validAfter: bigint; validBefore: bigint; nonce: Hex }) {
  return {
    domain: { name: usdcName, version: usdcVersion, chainId: CHAIN_ID, verifyingContract: usdc },
    types: { ReceiveWithAuthorization: [
      { name: "from", type: "address" }, { name: "to", type: "address" }, { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" }, { name: "validBefore", type: "uint256" }, { name: "nonce", type: "bytes32" }] },
    primaryType: "ReceiveWithAuthorization" as const,
    message: p,
  };
}
