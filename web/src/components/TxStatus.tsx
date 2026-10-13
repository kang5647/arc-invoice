"use client";
import { useEffect } from "react";
import { useWaitForTransactionReceipt } from "wagmi";
import { EXPLORER } from "@/lib/config";

export function TxStatus({ hash, error, pending, onDone }: { hash?: `0x${string}`; error?: Error | null; pending?: boolean; onDone?: () => void }) {
  const { data: receipt, isLoading } = useWaitForTransactionReceipt({ hash, query: { enabled: !!hash } });
  useEffect(() => { if (receipt && onDone) onDone(); }, [receipt]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) {
    const m = (error as { shortMessage?: string }).shortMessage ?? error.message;
    return <p className="msg msg-err">{m.includes("User rejected") ? "Transaction rejected in wallet." : m}</p>;
  }
  if (pending) return <p className="msg"><span className="spin" />Confirm in your wallet…</p>;
  if (!hash) return null;
  return (
    <p className={`msg ${receipt ? (receipt.status === "success" ? "msg-ok" : "msg-err") : ""}`}>
      {isLoading ? <><span className="spin" />Waiting for Arc to finalize… </> : receipt?.status === "success" ? "✓ Confirmed on Arc. " : "Transaction reverted. "}
      <a href={`${EXPLORER}/tx/${hash}`} target="_blank" rel="noreferrer">View transaction ↗</a>
    </p>
  );
}
