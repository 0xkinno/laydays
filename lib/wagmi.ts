import { createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [baseSepolia],
  ssr: true,
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Laydays" }),
    ...(projectId ? [walletConnect({ projectId, showQrModal: true })] : []),
  ],
  transports: { [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL ?? "https://sepolia.base.org") },
});
