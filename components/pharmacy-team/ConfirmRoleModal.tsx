'use client';

import { useState, useEffect } from 'react';
import { usePharmacyContext } from '@/store/usePharmacyContext';
import { useConfirmRole } from '@/features/pharmacy-team/hooks';
import type { TeamMember } from '@/features/pharmacy-team/service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import type { PharmacyRoleType } from '@/features/onboarding/types';

interface ConfirmRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personId: string;
  person?: TeamMember;
}

export function ConfirmRoleModal({
  open,
  onOpenChange,
  personId,
  person,
}: ConfirmRoleModalProps) {
  const { pharmacyId, pharmacyName } = usePharmacyContext();
  const confirmRoleMutation = useConfirmRole();

  const [formData, setFormData] = useState({
    pcnNumber: '',
    licenseExpiryDate: '',
    attestations: {} as Record<string, boolean>,
    signature: '',
  });

  useEffect(() => {
    if (person) {
      setFormData({
        pcnNumber: '',
        licenseExpiryDate: '',
        attestations: {},
        signature: '',
      });
    }
  }, [person]);

  const roleType = person?.roleType as PharmacyRoleType;

  const handleAttestation = (key: string, checked: boolean) => {
    setFormData({
      ...formData,
      attestations: {
        ...formData.attestations,
        [key]: checked,
      },
    });
  };

  const isFormValid = () => {
    if (!roleType) return false;

    switch (roleType) {
      case 'SUPERINTENDENT_PHARMACIST':
        return (
          formData.pcnNumber &&
          formData.attestations.acceptRegulatoryResponsibility === true
        );
      case 'SUPERVISING_PHARMACIST':
        return (
          formData.attestations.confirmDailyOversight === true &&
          formData.attestations.acknowledgeNoFinancialAccess === true
        );
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid() || !pharmacyId) {
      return;
    }

    try {
      await confirmRoleMutation.mutateAsync({
        personId,
        data: {
          pcnNumber: formData.pcnNumber || undefined,
          licenseExpiryDate: formData.licenseExpiryDate || undefined,
          attestations: formData.attestations,
          signature: formData.signature || undefined,
        },
      });

      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const renderRoleSpecificFields = () => {
    switch (roleType) {
      case 'SUPERINTENDENT_PHARMACIST':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="pcnNumber">PCN License Number *</Label>
              <Input
                id="pcnNumber"
                placeholder="Enter PCN license number"
                value={formData.pcnNumber}
                onChange={(e) => setFormData({ ...formData, pcnNumber: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="licenseExpiryDate">License Expiry Date</Label>
              <Input
                id="licenseExpiryDate"
                type="date"
                value={formData.licenseExpiryDate}
                onChange={(e) =>
                  setFormData({ ...formData, licenseExpiryDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Required Attestations</h4>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="acceptRegulatoryResponsibility"
                  checked={formData.attestations.acceptRegulatoryResponsibility || false}
                  onCheckedChange={(checked) =>
                    handleAttestation('acceptRegulatoryResponsibility', checked as boolean)
                  }
                />
                <Label htmlFor="acceptRegulatoryResponsibility" className="text-sm leading-tight">
                  I confirm that I am a registered pharmacist with the Pharmacy Council of Nigeria
                  (PCN) and I accept full regulatory responsibility for this pharmacy's
                  operations and compliance.
                  <strong className="block mt-2 text-foreground">
                    I confirm that this pharmacy operates under my PCN licence and that I accept
                    regulatory responsibility for dispensing activities conducted via this platform.
                  </strong>
                </Label>
              </div>
            </div>
          </>
        );

      case 'SUPERVISING_PHARMACIST':
        return (
          <>
            <div className="space-y-2">
              <Label htmlFor="pcnNumber">PCN License Number</Label>
              <Input
                id="pcnNumber"
                placeholder="Enter PCN license number (optional)"
                value={formData.pcnNumber}
                onChange={(e) => setFormData({ ...formData, pcnNumber: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium text-sm">Required Attestations</h4>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="confirmDailyOversight"
                  checked={formData.attestations.confirmDailyOversight || false}
                  onCheckedChange={(checked) =>
                    handleAttestation('confirmDailyOversight', checked as boolean)
                  }
                />
                <Label htmlFor="confirmDailyOversight" className="text-sm leading-tight">
                  I confirm that I will provide day-to-day pharmaceutical oversight at this pharmacy,
                  including prescription verification and dispensing supervision.
                </Label>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="acknowledgeNoFinancialAccess"
                  checked={formData.attestations.acknowledgeNoFinancialAccess || false}
                  onCheckedChange={(checked) =>
                    handleAttestation('acknowledgeNoFinancialAccess', checked as boolean)
                  }
                />
                <Label htmlFor="acknowledgeNoFinancialAccess" className="text-sm leading-tight">
                  I understand that as a Supervising Pharmacist, I will not have access to
                  financial information, payouts, or pricing controls.
                </Label>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  if (!person) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm Role: {person.roleDisplayName}</DialogTitle>
          <DialogDescription>
            Confirm the role for {person.name} at {pharmacyName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Pharmacy</Label>
            <Input value={pharmacyName} disabled />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={person.roleDisplayName} disabled />
          </div>

          <div className="space-y-2">
            <Label>Person</Label>
            <Input value={person.name} disabled />
          </div>

          {renderRoleSpecificFields()}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!isFormValid() || confirmRoleMutation.isPending}>
              {confirmRoleMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirm Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
