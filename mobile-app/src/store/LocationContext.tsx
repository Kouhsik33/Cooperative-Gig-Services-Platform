import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { listAddresses } from "../api/addresses";
import type { CustomerAddress } from "../api/addresses";
import { DEMO_LOCATION } from "../lib/location";
import { useAuth } from "./AuthContext";

// Location is the fixed DEMO_LOCATION / a saved address — never real
// device GPS. This is a deliberate, kept constraint: the live-tracking
// demo (simulated worker movement) must run identically every time, and
// a real GPS position would make the customer↔worker distance vary per
// device / per run.

// The customer's current service location (product-flow update §4-11).
// Deliberately separate from "profile address": this is just whichever
// address is currently driving service discovery / the next booking's
// default — not a saved record itself.
export interface ServiceLocation {
  addressId?: string;
  label: string;
  line1?: string;
  line2?: string;
  landmark?: string;
  pincode?: string;
  latitude: number;
  longitude: number;
  contactName?: string;
  contactPhone?: string;
  // True only for the DEMO_LOCATION fallback — never claim real GPS
  // (product-flow update §7).
  isDemo?: boolean;
}

export function addressToLocation(address: CustomerAddress): ServiceLocation {
  return {
    addressId: address.id,
    label: address.label,
    line1: address.line1,
    line2: address.line2 ?? undefined,
    landmark: address.landmark ?? undefined,
    pincode: address.pincode,
    latitude: address.latitude,
    longitude: address.longitude,
    contactName: address.contactName ?? undefined,
    contactPhone: address.contactPhone ?? undefined,
  };
}

export const DEMO_SERVICE_LOCATION: ServiceLocation = {
  label: "Current location (demo)",
  line1: "Pune demo service area",
  pincode: "411038",
  latitude: DEMO_LOCATION.latitude,
  longitude: DEMO_LOCATION.longitude,
  isDemo: true,
};

interface LocationContextValue {
  location: ServiceLocation | null;
  setLocation: (location: ServiceLocation) => void;
  addresses: CustomerAddress[];
  loadingAddresses: boolean;
  refreshAddresses: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location, setLocation] = useState<ServiceLocation | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const refreshAddresses = useCallback(async () => {
    if (user?.role !== "CUSTOMER") {
      setLoadingAddresses(false);
      return;
    }
    setLoadingAddresses(true);
    try {
      const list = await listAddresses();
      setAddresses(list);
      setLocation((current) => {
        if (current) return current;
        const preferred = list.find((a) => a.isDefault) ?? list[0];
        return preferred ? addressToLocation(preferred) : DEMO_SERVICE_LOCATION;
      });
    } catch {
      setLocation((current) => current ?? DEMO_SERVICE_LOCATION);
    } finally {
      setLoadingAddresses(false);
    }
  }, [user?.role]);

  useEffect(() => {
    refreshAddresses();
  }, [refreshAddresses]);

  return (
    <LocationContext.Provider
      value={{
        location,
        setLocation,
        addresses,
        loadingAddresses,
        refreshAddresses,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useServiceLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useServiceLocation must be used within a LocationProvider");
  }
  return ctx;
}
