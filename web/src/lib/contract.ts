export { abi } from "./abi";
import { formatEther } from "viem";

export const Status = ["None", "Open", "Paid", "Cancelled"] as const;
export type Invoice = {
  merchant: `0x${string}`;
  amount: bigint;
  createdAt: bigint;
  expiresAt: bigint;
  status: number;
  payer: `0x${string}`;
  paidAt: bigint;
  memo: string;
};
/** Native USDC on Arc has 18 decimals; 1 USDC == 1e18. Display with 6 decimals max. */
export function fmtUsdc(v: bigint) {
  const s = formatEther(v);
  const [i, d = ""] = s.split(".");
  const dd = d.slice(0, 6).replace(/0+$/, "");
  return dd ? `${i}.${dd}` : i;
}
export const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
