import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import type { Hex } from "viem";

export interface DocEntry { bit: number; key: string; label: string; sha256: Hex }

/** Merkle tree over (bit, sha256) leaves of the documents that are present. Returns the root, mask and proofs. */
export function buildDocsTree(docs: DocEntry[]) {
  const sorted = [...docs].sort((a, b) => a.bit - b.bit);
  if (sorted.length === 0) return { root: ("0x" + "00".repeat(32)) as Hex, mask: 0, proofs: {} as Record<string, Hex[]> };
  const tree = StandardMerkleTree.of(sorted.map((d) => [d.bit, d.sha256]), ["uint8", "bytes32"]);
  const proofs: Record<string, Hex[]> = {};
  for (const [i, v] of tree.entries()) proofs[sorted.find((d) => d.bit === v[0])!.key] = tree.getProof(i) as Hex[];
  return { root: tree.root as Hex, mask: sorted.reduce((m, d) => m | (1 << d.bit), 0) >>> 0, proofs };
}
