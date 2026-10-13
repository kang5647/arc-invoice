"use client";
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { abi, fmtUsdc, Invoice, Status, short } from "@/lib/contract";
import { CONTRACT_ADDRESS, EXPLORER, chain, NETWORK_LABEL } from "@/lib/config";
import { TxStatus } from "@/components/TxStatus";
import { ConnectButton } from "@/components/ConnectButton";

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
  if (!inv || inv.status === 0) return <div className="card"><div className="empty"><b>Invoice #{idStr} not found</b>No such invoice on {NETWORK_LABEL}.</div></div>;
  const expired = inv.status === 1 && inv.expiresAt !== 0n && Number(inv.expiresAt) * 1000 < Date.now();
  const st = expired ? "Expired" : Status[inv.status];
  const payable = inv.status === 1 && !expired;
  const isMerchant = address?.toLowerCase() === inv.merchant.toLowerCase();

  return (
    <div className="checkout">
      <div className="co-left">
        <div className="payto"><span className="avatar" />Pay <a className="mono" href={`${EXPLORER}/address/${inv.merchant}`} target="_blank" rel="noreferrer">{short(inv.merchant)}</a>{isMerchant && <span className="muted">(you)</span>}</div>
        <div className="big">{fmtUsdc(inv.amount)}<small>USDC</small></div>
        <div style={{ marginTop: 20 }}>
          <div className="line"><span>{inv.memo || `Invoice #${idStr}`}</span><span className="amount">{fmtUsdc(inv.amount)} USDC</span></div>
          <div className="line"><span className="muted">Network fee</span><span className="muted">≈ 0.001 USDC, paid in USDC</span></div>
          <div className="line" style={{ fontWeight: 600 }}><span>Total due</span><span>{fmtUsdc(inv.amount)} USDC</span></div>
        </div>
        <div className="kv">
          <span>Invoice</span><b>#{idStr} · <span className={`st st-${st}`}>{st}</span></b>
          <span>Network</span><b>{NETWORK_LABEL} · chain {chain.id}</b>
          <span>Created</span><b>{new Date(Number(inv.createdAt) * 1000).toLocaleString()}</b>
          {inv.expiresAt !== 0n && <><span>Expires</span><b>{new Date(Number(inv.expiresAt) * 1000).toLocaleString()}</b></>}
          {inv.status === 2 && <><span>Paid by</span><b><a className="mono" href={`${EXPLORER}/address/${inv.payer}`} target="_blank" rel="noreferrer">{short(inv.payer)}</a> · {new Date(Number(inv.paidAt) * 1000).toLocaleString()}</b></>}
        </div>
      </div>

      <div className="co-right">
        {payable && (
          <>
            <h2>Pay with wallet</h2>
            {!address ? (
              <>
                <p className="muted" style={{ margin: "0 0 14px" }}>Connect any EVM wallet holding USDC on {NETWORK_LABEL}. The app adds the network for you.</p>
                <ConnectButton />
              </>
            ) : !ready ? (
              <><p className="muted" style={{ margin: "0 0 14px" }}>Your wallet is on another network.</p><ConnectButton /></>
            ) : (
              <>
                <div className="line" style={{ paddingTop: 0 }}><span className="muted">From</span><span className="mono">{short(address)}</span></div>
                <button className="btn btn-big" style={{ marginTop: 8 }} disabled={isPending} onClick={() => writeContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "pay", args: [id], value: inv.amount })}>
                  {isPending ? <><span className="spin" />Confirm in wallet</> : `Pay ${fmtUsdc(inv.amount)} USDC`}
                </button>
              </>
            )}
            <p className="note">One transaction, no token approval. USDC is forwarded directly to the merchant and the payment is final in one block.</p>
            <TxStatus hash={hash} error={error} onDone={() => q.refetch()} />
            <div style={{ marginTop: 26 }}>
              <label style={{ marginTop: 0 }}>Share this payment link</label>
              <div className="copy">
                <input readOnly value={link} onFocus={(e) => e.target.select()} />
                <button className="btn btn-ghost btn-sm" onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</button>
              </div>
            </div>
          </>
        )}
        {inv.status === 2 && (
          <>
            <h2>Receipt</h2>
            <div className="paid"><div className="check">✓</div><div><b>Payment successful.</b><br />{fmtUsdc(inv.amount)} USDC was forwarded to the merchant. Settlement is final.</div></div>
            <div className="kv" style={{ marginTop: 18 }}>
              <span>Paid by</span><b><a className="mono" href={`${EXPLORER}/address/${inv.payer}`} target="_blank" rel="noreferrer">{inv.payer}</a></b>
              <span>Paid at</span><b>{new Date(Number(inv.paidAt) * 1000).toLocaleString()}</b>
              <span>Verify</span><b><a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}?tab=logs`} target="_blank" rel="noreferrer">Contract events on Arc explorer ↗</a></b>
            </div>
            <TxStatus hash={hash} error={error} />
          </>
        )}
        {inv.status === 3 && <><h2>Cancelled</h2><p className="muted">The merchant cancelled this invoice. It can no longer be paid.</p></>}
        {expired && <><h2>Expired</h2><p className="muted">This invoice expired on {new Date(Number(inv.expiresAt) * 1000).toLocaleString()} and can no longer be paid.</p></>}
      </div>
    </div>
  );
}
