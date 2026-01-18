import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OrgState {
  pharmacyId?: string;
  locationId?: string;
  pharmacyName?: string;
  locationName?: string;
  setPharmacy: (id: string, name?: string) => void;
  setLocation: (id: string, name?: string) => void;
  clear: () => void;
}

export const useOrg = create<OrgState>()(
  persist(
    (set) => ({
      pharmacyId: undefined,
      locationId: undefined,
      pharmacyName: undefined,
      locationName: undefined,
      setPharmacy: (id: string, name?: string) => set({ pharmacyId: id, pharmacyName: name }),
      setLocation: (id: string, name?: string) => set({ locationId: id, locationName: name }),
      clear: () => set({ pharmacyId: undefined, locationId: undefined, pharmacyName: undefined, locationName: undefined }),
    }),
    {
      name: 'terasync-pharmacy-org',
    }
  )
);

