import { keccak256, toBytes, type Hex } from "viem";

const canon = (v: unknown): string =>
  JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x), 0);

/** Statement digest: keccak256 of the canonical JSON of the statement body. The PDF footer prints the same digest. */
export function statementDigest(body: unknown): Hex {
  return keccak256(toBytes(canon(body)));
}
export const hashText = (s: string): Hex => keccak256(toBytes(s));
