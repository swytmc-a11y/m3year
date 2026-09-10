import { supabase } from "@/lib/supabase";

export type InvoiceLine = { name: string; total: number };

export type Invoice = {
  id: string;
  number: string;
  issued_at: string;
  seller_name: string;
  seller_vat_number: string;
  seller_cr_number: string;
  seller_address: string;
  buyer_name: string | null;
  buyer_phone: string | null;
  rental_total: number;
  addons_total: number;
  discount_amount: number;
  wallet_amount: number;
  delivery_fee: number;
  vat_rate: number;
  vat_amount: number;
  total: number;
  lines: InvoiceLine[];
  /** TLV payload the ZATCA reader expects, already base64-encoded. */
  qr_base64: string;
  extension_id: string | null;
};

const COLUMNS =
  "id, number, issued_at, seller_name, seller_vat_number, seller_cr_number, seller_address, buyer_name, buyer_phone, rental_total, addons_total, discount_amount, wallet_amount, delivery_fee, vat_rate, vat_amount, total, lines, qr_base64, extension_id";

function hydrate(row: Record<string, unknown>): Invoice {
  return {
    ...(row as unknown as Invoice),
    rental_total: Number(row.rental_total),
    addons_total: Number(row.addons_total),
    discount_amount: Number(row.discount_amount),
    wallet_amount: Number(row.wallet_amount),
    delivery_fee: Number(row.delivery_fee),
    vat_rate: Number(row.vat_rate),
    vat_amount: Number(row.vat_amount),
    total: Number(row.total),
    lines: (row.lines as InvoiceLine[] | null) ?? [],
  };
}

/**
 * Every invoice raised against a booking: the rental itself, plus one per
 * paid extension. They are separate tax documents and are listed as such
 * rather than merged into a running total.
 */
export async function listBookingInvoices(bookingId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select(COLUMNS)
    .eq("booking_id", bookingId)
    .order("issued_at", { ascending: true });

  if (error) {
    console.error("[invoices] list failed", error);
    return [];
  }
  return (data ?? []).map((r) => hydrate(r as Record<string, unknown>));
}

export async function fetchInvoice(id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return hydrate(data as Record<string, unknown>);
}
