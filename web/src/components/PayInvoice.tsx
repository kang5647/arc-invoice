"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { abi, fmtUsdc, Invoice, Status, short } from "@/lib/contract";
import { CONTRACT_ADDRESS, EXPLORER, chain, NETWORK_LABEL } from "@/lib/config";
import { TxStatus } from "@/components/TxStatus";

export function PayInvoice({ idStr }: { idStr: string }) {
  const id = BigInt(idStr);
  const { address, chainId } = useAccount();
  const ready = !!address && chainId === chain.id;
  const q = useReadContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "getInvoice", args: [id], query: { refetchInterval: 3000 } });
  const { writeContract, data: hash, error, isPending } = useWriteContract();
  const inv = q.data as Invoice | undefined;
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setLink(window.location.href), []);

  if (q.isLoading) return <p className="msg"><span className="spin" />Loading invoice from Arc…</p>;
  if (q.error) return <div className="card"><h2>Could not reach Arc</h2><p className="msg msg-err">{q.error.message}</p></div>;
  if (!inv || inv.status === 0) return <div className="card"><h2>Invoice #{idStr} not found</h2><p className="msg">No such invoice on {NETWORK_LABEL}.</p></div>;
  const expired = inv.status === 1 && inv.expiresAt !== 0n && Number(inv.expiresAt) * 1000 < Date.now();
  const st = expired ? "Expired" : Status[inv.status];
  const payable = inv.status === 1 && !expired;
  const isMerchant = address?.toLowerCase() === inv.merchant.toLowerCase();

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Invoice #{idStr}</h2>
        <span className={`st st-${st}`}>{st}</span>
      </div>
      <div className="big">{fmtUsdc(inv.amount)}<small>USDC</small></div>
      {inv.memo && <p style={{ margin: 0, fontSize: 17 }}>{inv.memo}</p>}
      <div className="kv">
        <span>Pay to</span><b><a href={`${EXPLORER}/address/${inv.merchant}`} target="_blank" rel="noreferrer">{inv.merchant}</a>{isMerchant && " (you)"}</b>
        <span>Network</span><b>{NETWORK_LABEL} · chain {chain.id}</b>
        <span>Created</span><b>{new Date(Number(inv.createdAt) * 1000).toLocaleString()}</b>
        {inv.expiresAt !== 0n && <><span>Expires</span><b>{new Date(Number(inv.expiresAt) * 1000).toLocaleString()}</b></>}
        {inv.status === 2 && <><span>Paid by</span><b><a href={`${EXPLORER}/address/${inv.payer}`} target="_blank" rel="noreferrer">{short(inv.payer)}</a> · {new Date(Number(inv.paidAt) * 1000).toLocaleString()}</b></>}
      </div>

      {payable && (
        <button className="btn btn-big" disabled={!ready || isPending} onClick={() => writeContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "pay", args: [id], value: inv.amount })}>
          {!address ? "Connect a wallet to pay" : !ready ? `Switch to ${NETWORK_LABEL}` : isPending ? "Confirm in wallet…" : `Pay ${fmtUsdc(inv.amount)} USDC`}
        </button>
      )}
      {payable && <p className="msg" style={{ textAlign: "center", fontSize: 12 }}>Single transaction. No token approval. Gas is paid in USDC too (a fraction of a cent).</p>}
      {inv.status === 2 && (
        <div className="paid"><div className="check">✓</div><div><b>Paid.</b> <span style={{ color: "var(--mut)" }}>Settlement was final on inclusion. USDC was forwarded directly to the merchant.</span></div></div>
      )}
      {inv.status === 3 && <p className="msg">This invoice was cancelled by the merchant.</p>}
      {expired && <p className="msg">This invoice expired and can no longer be paid.</p>}
      <TxStatus hash={hash} error={error} onDone={() => q.refetch()} />

      {payable && (
        <>
          <label>Share this payment link</label>
          <div className="copy">
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
            <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</button>
          </div>
        </>
      )}
    </div>
  );
}
