import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import LegalLinks from './LegalLinks';
import StakingDisclaimer from './StakingDisclaimer';

interface AgeGateDialogProps {
  open: boolean;
  onConfirm: () => void;
  onDecline: () => void;
}

/** First-stake age + compliance gate (P0 #11, combined with P0 #12 disclaimer) */
export default function AgeGateDialog({ open, onConfirm, onDecline }: AgeGateDialogProps) {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setChecked(false);
          onDecline();
        }
      }}
    >
      <DialogContent className="max-w-md border-primary/20 bg-card">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
            </div>
            <DialogTitle className="text-left">Before you stake</DialogTitle>
          </div>
          <DialogDescription className="text-left text-sm">
            Arena predictions and Dice wagers use ARX-P points for entertainment. Please confirm
            you meet the requirements below.
          </DialogDescription>
        </DialogHeader>

        <StakingDisclaimer />

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <Checkbox
            checked={checked}
            onCheckedChange={(v) => setChecked(v === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground leading-relaxed">
            I am <strong>18 years or older</strong>, understand ARX-P has no cash value, and agree
            to the <LegalLinks linkClassName="text-primary hover:underline font-medium" />.
          </span>
        </label>

        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={onConfirm} disabled={!checked} className="w-full">
            I understand — continue
          </Button>
          <Button variant="ghost" onClick={onDecline} className="w-full text-muted-foreground">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
