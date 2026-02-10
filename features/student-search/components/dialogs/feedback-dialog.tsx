import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type FeedbackDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feedbackComment: string;
  onFeedbackCommentChange: (value: string) => void;
  feedbackError: string | null;
  feedbackSuccess: string | null;
  isSubmittingFeedback: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export function FeedbackDialog({
  open,
  onOpenChange,
  feedbackComment,
  onFeedbackCommentChange,
  feedbackError,
  feedbackSuccess,
  isSubmittingFeedback,
  onSubmit,
}: FeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="mx-auto w-[92vw] max-w-lg rounded-xl border border-[var(--brand-border-soft)] bg-[rgba(253,254,255,0.95)] backdrop-blur-xl shadow-[0_22px_45px_-28px_rgba(0,53,84,0.8)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-[var(--brand-primary)]">
            Provide Feedback
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <textarea
            value={feedbackComment}
            onChange={(event) => onFeedbackCommentChange(event.target.value)}
            placeholder="Tell us what could be improved..."
            className="min-h-32 w-full resize-y rounded-md border border-[var(--brand-border)] bg-[var(--brand-surface-elevated)] px-3 py-2 text-sm text-[var(--brand-body)] shadow-sm focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,94,184,0.35)]"
          />
          {feedbackError && (
            <p className="text-xs font-medium text-[var(--brand-danger)]">{feedbackError}</p>
          )}
          {feedbackSuccess && (
            <p className="text-xs font-medium text-[var(--brand-success-deep)]">
              {feedbackSuccess}
            </p>
          )}
          <Button
            type="submit"
            disabled={isSubmittingFeedback}
            className="h-9 w-full bg-[var(--brand-primary)] text-sm font-medium text-white shadow-sm hover:bg-[var(--brand-primary-deep)] disabled:opacity-60"
          >
            {isSubmittingFeedback ? "Submitting..." : "Submit feedback"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
