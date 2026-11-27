import * as React from 'react';
import { getGiftCartEligibility, getUserPointsBalance, getUserVfpStatus } from '@/lib/api';
import type { UserVfpStatus } from '@/types/loyalty';

export interface CustomerLoyaltyStatus {
  userPoints: number | null;
  availablePoints: number | null;
  heldPoints: number;
  eligibleStoreUids: string[];
  isLoadingPoints: boolean;
  vfpStatus: UserVfpStatus | null;
  isVfp: boolean;
}

/**
 * Fetches and manages the authenticated customer's loyalty points balance, available points,
 * eligible store UIDs, and VFP status.
 */
export function useCustomerLoyaltyStatus(
  isAuthenticated: boolean,
  userId?: string,
  token?: string | null
): CustomerLoyaltyStatus {
  const [userPoints, setUserPoints] = React.useState<number | null>(null);
  const [availablePoints, setAvailablePoints] = React.useState<number | null>(null);
  const [heldPoints, setHeldPoints] = React.useState<number>(0);
  const [eligibleStoreUids, setEligibleStoreUids] = React.useState<string[]>([]);
  const [isLoadingPoints, setIsLoadingPoints] = React.useState(false);
  const [vfpStatus, setVfpStatus] = React.useState<UserVfpStatus | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !userId) {
      setUserPoints(null);
      setAvailablePoints(null);
      setHeldPoints(0);
      setEligibleStoreUids([]);
      setVfpStatus(null);
      setIsLoadingPoints(false);
      return;
    }

    setIsLoadingPoints(true);

    getUserPointsBalance(userId, token || undefined)
      .then((res) => {
        if (isMounted) {
          const balance = typeof res.balance === 'number' ? res.balance : (res.points ?? 0);
          setUserPoints(balance);
        }
      })
      .catch(() => {
        if (isMounted) {
          setUserPoints(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPoints(false);
        }
      });

    getGiftCartEligibility(undefined, token || undefined)
      .then((elig) => {
        if (isMounted) {
          setAvailablePoints(elig.availablePoints);
          setHeldPoints(elig.heldPoints);
          setEligibleStoreUids(elig.eligibleStoreUids ?? []);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAvailablePoints(null);
          setHeldPoints(0);
          setEligibleStoreUids([]);
        }
      });

    getUserVfpStatus(userId)
      .then((status) => {
        if (isMounted) {
          setVfpStatus(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setVfpStatus(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, userId, token]);

  return {
    userPoints,
    availablePoints: availablePoints ?? userPoints,
    heldPoints,
    eligibleStoreUids,
    isLoadingPoints,
    vfpStatus,
    isVfp: Boolean(vfpStatus?.isVfp),
  };
}
