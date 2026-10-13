"use client";
import { useMemo, useState } from "react";
import { parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import Link from "next/link";
import { abi, fmtUsdc, Invoice, Status, short } from "@/lib/contract";
import { CONTRACT_ADDRESS, EXPLORER, chain, NETWORK_LABEL } from "@/lib/config";
import { TxStatus } from "@/components/TxStatus";

export default function Home() {
  const { address, chainId } = useAccount();
  const ready = !!address && chainId === chain.id;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [hours, setHours] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const ids = useReadContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "merchantInvoices", args: [address!], query: { enabled: !!address, refetchInterval: 5000 } });
  const idList = useMemo(() => ((ids.data ?? []) as readonly bigint[]).slice().reverse(), [ids.data]);
  const invoices = useReadContract({
    abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "getInvoices", args: [idList],
    query: { enabled: idList.length > 0, refetchInterval: 5000 },
  });
  const list = (invoices.data ?? []) as readonly Invoice[];
  const { writeContract, data: hash, error, isPending, reset } = useWriteContract();
  const cancelW = useWriteContract();

  const stats = useMemo(() => {
    let collected = 0n, openN = 0, paidN = 0;
    for (const inv of list) { if (inv.status === 2) { collected += inv.amount; paidN++; } if (inv.status === 1) openN++; }
    return { collected, openN, paidN };
  }, [list]);

  function create(e: React.FormEvent) {
    e.preventDefault();
    let value: bigint;
    try { value = parseEther(amount.trim()); } catch { return; }
    if (value === 0n) return;
    const exp = hours ? BigInt(Math.floor(Date.now() / 1000) + Number(hours) * 3600) : 0n;
    writeContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "createInvoice", args: [value, exp, memo.trim()] });
  }
  function copyLink(id: bigint) {
    navigator.clipboard.writeText(`${window.location.origin}/pay/${id}`);
    setCopiedId(id.toString()); setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Invoices</h1>
          <p className="sub">Payment links settled in native USDC on {NETWORK_LABEL}.</p>
        </div>
        <button className="btn" onClick={() => setOpen(true)} disabled={!address}>+ Create invoice</button>
      </div>

      {address && (
        <div className="stats">
          <div className="stat"><h3>Collected</h3><div className="v">{fmtUsdc(stats.collected)}<small>USDC</small></div></div>
          <div className="stat"><h3>Open</h3><div className="v">{stats.openN}</div></div>
          <div className="stat"><h3>Paid</h3><div className="v">{stats.paidN}</div></div>
        </div>
      )}

      <div className="card">
        {!address && (
          <div className="empty">
            <b>Connect a wallet to get started</b>
            Your invoices are read straight from the Arc blockchain. Nothing is stored anywhere else.
            <div className="steps" style={{ marginTop: 28, textAlign: "left" }}>
              <div className="step"><i>1</i><b>Create</b>Set an amount and memo. One transaction records the invoice on Arc.</div>
              <div className="step"><i>2</i><b>Share</b>Send the pay link to anyone holding USDC on Arc.</div>
              <div className="step"><i>3</i><b>Get paid</b>They pay in one click, no approval. USDC lands in your wallet, final in one block.</div>
            </div>
          </div>
        )}
        {address && idList.length === 0 && <div className="empty"><b>No invoices yet</b>Create your first invoice to get a shareable payment link.</div>}
        {address && idList.length > 0 && (
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Amount</th><th>Status</th><th>Memo</th><th>Invoice</th><th>Created</th><th></th></tr></thead>
              <tbody>
                {list.map((inv, i) => {
                  const id = idList[i];
                  const expired = inv.status === 1 && inv.expiresAt !== 0n && Number(inv.expiresAt) * 1000 < Date.now();
                  const st = expired ? "Expired" : Status[inv.status];
                  return (
                    <tr key={id.toString()}>
                      <td className="amount">{fmtUsdc(inv.amount)} <span className="muted" style={{ fontWeight: 400 }}>USDC</span></td>
                      <td><span className={`st st-${st}`}>{st}</span></td>
                      <td>{inv.memo || <span className="muted">—</span>}{inv.status === 2 && <div className="muted" style={{ fontSize: 12 }}>paid by <a className="mono" href={`${EXPLORER}/address/${inv.payer}`} target="_blank" rel="noreferrer">{short(inv.payer)}</a></div>}</td>
                      <td><Link href={`/pay/${id}`} className="mono">#{id.toString()}</Link></td>
                      <td className="muted">{new Date(Number(inv.createdAt) * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {inv.status === 1 && !expired && <button className="btn btn-ghost btn-sm" onClick={() => copyLink(id)}>{copiedId === id.toString() ? "Copied" : "Copy link"}</button>}{" "}
                        {inv.status === 1 && <button className="btn btn-ghost btn-sm" disabled={cancelW.isPending} onClick={() => cancelW.writeContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "cancel", args: [id] })}>Cancel</button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <TxStatus hash={cancelW.data} error={cancelW.error} onDone={() => { invoices.refetch(); cancelW.reset(); }} />
      </div>

      <p className="muted" style={{ fontSize: 12 }}>Contract <a className="mono" href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer">{CONTRACT_ADDRESS}</a> · amounts are native USDC (18 decimals on-chain)</p>

      {open && (
        <>
          <div className="overlay" onClick={() => { if (!isPending) { setOpen(false); reset(); } }} />
          <div className="panel" role="dialog" aria-label="Create invoice">
            <button className="close" onClick={() => { setOpen(false); reset(); }} aria-label="Close">×</button>
            <h2>Create invoice</h2>
            <p className="sub" style={{ marginTop: -6 }}>Signed by your wallet. The link is ready as soon as Arc confirms.</p>
            <form onSubmit={create}>
              <label>Amount</label>
              <div className="amt"><input autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0.00" required /><span>USDC</span></div>
              <label>Memo</label>
              <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={140} placeholder="Invoice #1042 · logo design" />
              <label>Expires in (hours, optional)</label>
              <input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="numeric" placeholder="Never" />
              <button className="btn btn-big" disabled={!ready || isPending}>
                {!ready ? `Switch wallet to ${NETWORK_LABEL}` : isPending ? <><span className="spin" />Confirm in wallet</> : "Create invoice"}
              </button>
              <TxStatus hash={hash} error={error} onDone={() => { ids.refetch(); invoices.refetch(); setAmount(""); setMemo(""); setHours(""); reset(); setOpen(false); }} />
              <p className="note">Gas is paid in USDC and costs a fraction of a cent.</p>
            </form>
          </div>
        </>
      )}
    </>
  );
}
