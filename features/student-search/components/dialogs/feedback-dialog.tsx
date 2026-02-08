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
      <DialogContent className="bg-white/95 backdrop-blur-xl border border-slate-200 w-[92vw] max-w-lg mx-auto rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-slate-900 text-xl font-bold flex items-center gap-2 text-blue-600">
            Provide Feedback
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <textarea
            value={feedbackComment}
            onChange={(event) => onFeedbackCommentChange(event.target.value)}
            placeholder="Tell us what could be improved..."
            className="w-full min-h-32 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/60 focus:border-blue-500 resize-y"
          />
          {feedbackError && (
            <p className="text-xs font-medium text-red-600">{feedbackError}</p>
          )}
          {feedbackSuccess && (
            <p className="text-xs font-medium text-green-700">
              {feedbackSuccess}
            </p>
          )}
          <Button
            type="submit"
            disabled={isSubmittingFeedback}
            className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm disabled:opacity-60"
          >
            {isSubmittingFeedback ? "Submitting..." : "Submit feedback"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
