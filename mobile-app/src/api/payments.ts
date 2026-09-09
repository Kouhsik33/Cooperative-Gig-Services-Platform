import { apiClient } from "./client";

export interface PaymentOrder {
  razorpayOrderId: string;
  razorpayKeyId: string | null;
  isMock: boolean;
  amount: number;
  currency: string;
  breakdown: {
    totalAmount: number;
    workerShare: number;
    federationFee: number;
    welfareContribution: number;
    emergencyBonus: number;
  };
  paymentId: string;
}

export interface Invoice {
  invoiceId: string;
  bookingId: string;
  issuedAt: string | null;
  customer: { id: string; name: string; phone: string };
  worker: { id: string; name: string };
  service: { name: string; category: string };
  isEmergency: boolean;
  lineItems: {
    basePrice: number;
    emergencyBonus: number;
    totalAmount: number;
    workerShare: number;
    federationFee: number;
    welfareContribution: number;
  };
  paymentStatus: string;
  paymentMethod?: "cod" | "online";
}

export async function createPaymentOrder(bookingId: string): Promise<PaymentOrder> {
  const { data } = await apiClient.post<PaymentOrder>("/payments/create-order", {
    bookingId,
  });
  return data;
}

export async function getInvoice(bookingId: string): Promise<Invoice> {
  const { data } = await apiClient.get<Invoice>(`/payments/${bookingId}/invoice`);
  return data;
}

// Not in Part E — demo-only stand-in for Razorpay's webhook callback, so
// the app has a real tappable end-to-end payment step without live
// Razorpay keys. Runs the same signature-verified capture logic as the
// real webhook server-side; see payment.controller.ts.
export async function simulatePaymentCallback(
  bookingId: string
): Promise<{ alreadyProcessed: boolean }> {
  const { data } = await apiClient.post<{ alreadyProcessed: boolean }>(
    "/payments/simulate-callback",
    { bookingId }
  );
  return data;
}

// Cash on delivery — the customer will pay the professional in person
// after the job. No money moves now; the booking proceeds and the
// payment settles at completion (see backend payment.controller.ts).
export async function payWithCod(
  bookingId: string
): Promise<{ method: "cod" }> {
  const { data } = await apiClient.post<{ method: "cod" }>(
    `/payments/${bookingId}/cod`
  );
  return data;
}
