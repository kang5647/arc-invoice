"use client";
import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import Link from "next/link";
import { abi, fmtUsdc, Invoice, Status } from "@/lib/contract";
import { CONTRACT_ADDRESS, EXPLORER, chain, NETWORK_LABEL } from "@/lib/config";
import { TxStatus } from "@/components/TxStatus";

export default function Home() {
  const { address, chainId } = useAccount();
  const ready = !!address && chainId === chain.id;
  const [amount, setAmount] = useState("1");
  const [memo, setMemo] = useState("");
  const [hours, setHours] = useState("");

  const ids = useReadContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "merchantInvoices", args: [address!], query: { enabled: !!address, refetchInterval: 5000 } });
  const idList = ((ids.data ?? []) as readonly bigint[]).slice().reverse();
  const invoices = useReadContract({
    abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "getInvoices", args: [idList],
    query: { enabled: idList.length > 0, refetchInterval: 5000 },
  });
  const { writeContract, data: hash, error, isPending, reset } = useWriteContract();
  const cancelW = useWriteContract();

  function create(e: React.FormEvent) {
    e.preventDefault();
    let value: bigint;
    try { value = parseEther(amount.trim()); } catch { return; }
    if (value === 0n) return;
    const exp = hours ? BigInt(Math.floor(Date.now() / 1000) + Number(hours) * 3600) : 0n;
    writeContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "createInvoice", args: [value, exp, memo.trim()] });
  }
  const list = (invoices.data ?? []) as readonly Invoice[];

  return (
    <>
      <h1>Get paid in USDC on Arc.</h1>
      <p className="sub">Create an invoice and share the link. The payer settles it in one transaction with native USDC, the gas token of Arc. Funds land in your wallet instantly, final in one block.</p>

      <div className="steps">
        <div className="step"><i>1</i><b>Create</b>Set an amount and memo. One transaction records the invoice on Arc.</div>
        <div className="step"><i>2</i><b>Share</b>Send the pay link to anyone with a wallet holding USDC on Arc.</div>
        <div className="step"><i>3</i><b>Get paid</b>They pay in one click, no token approval. The contract forwards USDC straight to you.</div>
      </div>

      <div className="card">
        <h2>New invoice</h2>
        <form onSubmit={create}>
          <div className="grid2">
            <div>
              <label>Amount</label>
              <div className="amt"><input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required /><span>USDC</span></div>
            </div>
            <div>
              <label>Expires in (hours, optional)</label>
              <input value={hours} onChange={(e) => setHours(e.target.value)} inputMode="numeric" placeholder="never" />
            </div>
          </div>
          <label>Memo</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={140} placeholder="Invoice #1042 · logo design" />
          <button className="btn btn-big" disabled={!ready || isPending}>
            {!address ? "Connect a wallet to create" : !ready ? `Switch to ${NETWORK_LABEL}` : isPending ? "Confirm in wallet…" : "Create invoice"}
          </button>
          <TxStatus hash={hash} error={error} onDone={() => { ids.refetch(); invoices.refetch(); reset(); }} />
        </form>
      </div>

      <div className="card">
        <h2>Your invoices{address && idList.length > 0 ? ` (${idList.length})` : ""}</h2>
        {!address && <p className="msg">Connect a wallet to see invoices you created.</p>}
        {address && idList.length === 0 && <p className="msg">No invoices yet. Create one above.</p>}
        {list.map((inv, i) => {
          const id = idList[i];
          const expired = inv.status === 1 && inv.expiresAt !== 0n && Number(inv.expiresAt) * 1000 < Date.now();
          const st = expired ? "Expired" : Status[inv.status];
          return (
            <div className="row" key={id.toString()}>
              <div style={{ minWidth: 0 }}>
                <Link href={`/pay/${id}`}><b>#{id.toString()}</b> · {inv.memo || "(no memo)"}</Link>
                <div style={{ color: "var(--mut)", fontSize: 12, marginTop: 2 }}>
                  {fmtUsdc(inv.amount)} USDC
                  {inv.status === 2 && <> · paid by <a href={`${EXPLORER}/address/${inv.payer}`} target="_blank" rel="noreferrer">{inv.payer.slice(0, 8)}…</a></>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={`st st-${st}`}>{st}</span>
                {inv.status === 1 && !expired && <Link className="btn btn-ghost btn-sm" href={`/pay/${id}`}>Open link</Link>}
                {inv.status === 1 && (
                  <button className="btn btn-ghost btn-sm" disabled={cancelW.isPending} onClick={() => cancelW.writeContract({ abi, address: CONTRACT_ADDRESS, chainId: chain.id, functionName: "cancel", args: [id] })}>Cancel</button>
                )}
              </div>
            </div>
          );
        })}
        <TxStatus hash={cancelW.data} error={cancelW.error} onDone={() => { invoices.refetch(); cancelW.reset(); }} />
      </div>

      <div className="card why">
        <h2>Why Arc</h2>
        <b>USDC is the gas token.</b> A payer needs nothing but USDC: no second asset for fees, no approval step. The invoice amount travels as native value in the same transaction that records the payment.<br />
        <b>Final in one block.</b> Arc finality is deterministic on inclusion, so the receipt is final the moment the wallet confirms.<br />
        <b>Verifiable receipts.</b> Every payment emits an on-chain event plus Arc&apos;s native USDC Transfer log, so any explorer shows who paid what, when.<br />
        <span style={{ display: "block", marginTop: 10 }}>Contract <a href={`${EXPLORER}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noreferrer"><code>{CONTRACT_ADDRESS}</code></a></span>
      </div>
    </>
  );
}
