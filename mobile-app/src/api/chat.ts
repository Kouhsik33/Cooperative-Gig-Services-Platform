import { apiClient } from "./client";

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: "CUSTOMER" | "WORKER" | "FEDERATION_ADMIN";
  text: string;
  createdAt: string;
}

// Worker <-> customer chat (product-flow update §22/§23). Only reachable
// once a booking is past REQUESTED — enforced server-side.
export async function listMessages(bookingId: string): Promise<ChatMessage[]> {
  const { data } = await apiClient.get<ChatMessage[]>(`/bookings/${bookingId}/messages`);
  return data;
}

export async function sendMessage(bookingId: string, text: string): Promise<ChatMessage> {
  const { data } = await apiClient.post<ChatMessage>(`/bookings/${bookingId}/messages`, { text });
  return data;
}
