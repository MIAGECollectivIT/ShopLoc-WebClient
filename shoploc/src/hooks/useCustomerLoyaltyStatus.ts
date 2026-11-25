import * as React from 'react';
import { getUserPointsBalance, getUserVfpStatus } from '@/lib/api';
import type { UserVfpStatus } from '@/types/loyalty';

export interface CustomerLoyaltyStatus {
  userPoints: number | null;
  isLoadingPoints: boolean;
  vfpStatus: UserVfpStatus | null;
  isVfp: boolean;
}

/**
 * Fetches and manages the authenticated customer's loyalty points balance and VFP status.
 * Resets cleanly when unauthenticated and guards against unmounted state updates.
 */
export function useCustomerLoyaltyStatus(
  isAuthenticated: boolean,
  userId?: string,
  token?: string | null
): CustomerLoyaltyStatus {
  const [userPoints, setUserPoints] = React.useState<number | null>(null);
  const [isLoadingPoints, setIsLoadingPoints] = React.useState(false);
  const [vfpStatus, setVfpStatus] = React.useState<UserVfpStatus | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    if (!isAuthenticated || !userId) {
      setUserPoints(null);
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
    isLoadingPoints,
    vfpStatus,
    isVfp: Boolean(vfpStatus?.isVfp),
  };
}
