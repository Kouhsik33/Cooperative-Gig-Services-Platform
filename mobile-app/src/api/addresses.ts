import { apiClient } from "./client";

export interface CustomerAddress {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  pincode: string;
  latitude: number;
  longitude: number;
  contactName: string | null;
  contactPhone: string | null;
  isDefault: boolean;
}

export interface CreateAddressPayload {
  label: string;
  line1: string;
  line2?: string;
  landmark?: string;
  pincode: string;
  latitude: number;
  longitude: number;
  contactName?: string;
  contactPhone?: string;
  isDefault?: boolean;
}

export async function listAddresses(): Promise<CustomerAddress[]> {
  const { data } = await apiClient.get<CustomerAddress[]>("/addresses");
  return data;
}

export async function createAddress(payload: CreateAddressPayload): Promise<CustomerAddress> {
  const { data } = await apiClient.post<CustomerAddress>("/addresses", payload);
  return data;
}

export async function deleteAddress(id: string): Promise<void> {
  await apiClient.delete(`/addresses/${id}`);
}
