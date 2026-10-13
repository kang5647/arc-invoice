import { arc, arcTestnet } from "viem/chains";
import { createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";

const network = process.env.NEXT_PUBLIC_ARC_NETWORK === "testnet" ? "testnet" : "mainnet";
export const chain = network === "testnet" ? arcTestnet : arc;
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const EXPLORER = chain.blockExplorers.default.url;
export const NETWORK_LABEL = network === "testnet" ? "Arc Testnet" : "Arc Mainnet";

export const wagmiConfig = createConfig({
  chains: [arc, arcTestnet],
  connectors: [injected()],
  transports: { [arc.id]: http(arc.rpcUrls.default.http[0]), [arcTestnet.id]: http(arcTestnet.rpcUrls.default.http[0]) },
  ssr: true,
});

declare module "wagmi" {
  interface Register { config: typeof wagmiConfig }
}
