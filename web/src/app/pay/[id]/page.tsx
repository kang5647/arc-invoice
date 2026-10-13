import { PayInvoice } from "@/components/PayInvoice";

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayInvoice idStr={id} />;
}
