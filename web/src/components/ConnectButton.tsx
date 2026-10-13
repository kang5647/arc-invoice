"use client";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { chain, NETWORK_LABEL } from "@/lib/config";
import { short } from "@/lib/contract";

export function ConnectButton() {
  const { address, chainId, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  if (!isConnected)
    return (
      <button className="btn" disabled={isPending} onClick={() => connect({ connector: connectors[0] })}>
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  if (chainId !== chain.id)
    return (
      <button className="btn btn-warn" disabled={switching} onClick={() => switchChain({ chainId: chain.id })}>
        {switching ? "Switching…" : `Switch to ${NETWORK_LABEL}`}
      </button>
    );
  return (
    <button className="btn btn-ghost" onClick={() => disconnect()} title="Disconnect">
      {short(address!)}
    </button>
  );
}
