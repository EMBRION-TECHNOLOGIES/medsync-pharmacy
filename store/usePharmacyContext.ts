/**
 * Pharmacy Context Store
 * Holds the current user's pharmacy role, permissions, and governance status
 *
 * IMPORTANT: canOperate should come from the backend's pharmacyOperationalService
 * to ensure consistency between UI and API enforcement.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PharmacyRoleType, GovernanceStatus } from '@/features/onboarding/types';
import type { Permissions } from '@/lib/permissions';

// Approval mode type (mirrors backend)
export type ApprovalMode = 'PRODUCTION' | 'TEST';

export interface PharmacyContext {
  // Core identifiers
  pharmacyId: string | null;
  pharmacyName: string | null;

  // Governance role
  roleType: PharmacyRoleType | null;
  roleDisplayName: string | null;

  // Permissions (loaded from backend or derived from role)
  permissions: Permissions | null;

  // Governance status
  governanceStatus: GovernanceStatus | null;
  canOperate: boolean;

  // Test mode (AC-TEST-02)
  approvalMode: ApprovalMode;
  isTestMode: boolean;

  // Loading state
  isLoaded: boolean;

  // Actions
  setContext: (context: Partial<PharmacyContext>) => void;
  clearContext: () => void;
}

const initialState = {
  pharmacyId: null,
  pharmacyName: null,
  roleType: null,
  roleDisplayName: null,
  permissions: null,
  governanceStatus: null,
  canOperate: false,
  approvalMode: 'PRODUCTION' as ApprovalMode,
  isTestMode: false,
  isLoaded: false,
};

export const usePharmacyContext = create<PharmacyContext>()(
  persist(
    (set) => ({
      ...initialState,

      setContext: (context) => {
        // #region agent log
        const permKeys = context.permissions ? Object.keys(context.permissions) : null;
        fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePharmacyContext.ts:setContext',message:'Setting pharmacy context',data:{pharmacyId:context.pharmacyId,roleType:context.roleType,canOperate:context.canOperate,governanceStatus:context.governanceStatus,permissionKeyCount:permKeys?.length,permissionKeys:permKeys},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        set((state) => ({
          ...state,
          ...context,
          isLoaded: true,
        }));
      },

      clearContext: () => {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 [PHARMACY CONTEXT] Clearing context');
        }
        set(initialState);
      },
    }),
    {
      name: 'terasync-pharmacy-context',
      // Version 3: Force refresh to fix corrupted permissions
      version: 3,
      partialize: (state) => ({
        pharmacyId: state.pharmacyId,
        pharmacyName: state.pharmacyName,
        roleType: state.roleType,
        roleDisplayName: state.roleDisplayName,
        governanceStatus: state.governanceStatus,
        canOperate: state.canOperate,
        approvalMode: state.approvalMode,
        isTestMode: state.isTestMode,
        // Don't persist permissions - always derive from roleType on load
        // This prevents stale/corrupted permissions
      }),
      onRehydrateStorage: () => (state) => {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/8742bb62-3513-4e7a-a664-beff543ec89f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'usePharmacyContext.ts:onRehydrate',message:'Zustand rehydrated from storage',data:{rehydratedState:state?{pharmacyId:state.pharmacyId,canOperate:state.canOperate,governanceStatus:state.governanceStatus,roleType:state.roleType,isLoaded:state.isLoaded,hasPermissions:!!state.permissions}:null},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1-H5'})}).catch(()=>{});
        // #endregion
      },
    }
  )
);
