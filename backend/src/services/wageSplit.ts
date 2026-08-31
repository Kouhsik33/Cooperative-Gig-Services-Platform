import { env } from "../config/env";

export interface WageSplit {
  totalAmount: number;
  workerShare: number;
  federationFee: number;
  welfareContribution: number;
  emergencyBonus: number;
}

// Part F — wage-split & fairness logic, implemented exactly as specified.
// Critical fairness rule: emergencyBonus flows entirely to workerShare —
// federationFee and welfareContribution are computed only off basePrice,
// never off the surge.
export function computeWageSplit(
  basePrice: number,
  isEmergency: boolean
): WageSplit {
  const emergencyBonus = isEmergency
    ? round2(basePrice * env.fairness.emergencySurgePercent)
    : 0;
  const totalAmount = round2(basePrice + emergencyBonus);

  const federationFee = round2(basePrice * env.fairness.federationFeePercent);
  const welfareContribution = round2(basePrice * env.fairness.welfarePercent);
  const workerShare = round2(totalAmount - federationFee - welfareContribution);

  return { totalAmount, workerShare, federationFee, welfareContribution, emergencyBonus };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
