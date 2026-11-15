export const BASE_SEPOLIA_USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const CHAIN_ID = 84532;
export const EXPLORER = "https://sepolia.basescan.org";
export const txUrl = (h: string) => `${EXPLORER}/tx/${h}`;
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`;
