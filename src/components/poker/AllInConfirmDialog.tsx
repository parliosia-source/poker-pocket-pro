import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface AllInConfirmDialogProps {
  open: boolean;
  amount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

const AllInConfirmDialog = ({ open, amount, onConfirm, onCancel }: AllInConfirmDialogProps) => (
  <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
    <AlertDialogContent className="max-w-[320px] rounded-lg">
      <AlertDialogHeader>
        <AlertDialogTitle className="text-center">
          Confirmer All-in ?
        </AlertDialogTitle>
        <AlertDialogDescription className="text-center font-mono text-lg text-foreground">
          {amount} BB
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row gap-2 sm:flex-row">
        <AlertDialogCancel className="flex-1 mt-0" onClick={onCancel}>
          Annuler
        </AlertDialogCancel>
        <AlertDialogAction
          className="flex-1 bg-poker-red hover:bg-poker-red/90"
          onClick={onConfirm}
        >
          All-in
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default AllInConfirmDialog;
