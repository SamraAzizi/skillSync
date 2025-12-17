import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const reviewSchema = z.object({
  rating: z.number().min(1, "Please select a rating").max(5, "Rating must be between 1 and 5"),
  comment: z.string().trim().max(1000, "Comment must be less than 1000 characters").optional(),
});

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  revieweeId: string;
  revieweeName: string;
  skill: string;
  onReviewSubmitted: () => void;
}

const ReviewDialog = ({
  open,
  onOpenChange,
  sessionId,
  revieweeId,
  revieweeName,
  skill,
  onReviewSubmitted,
}: ReviewDialogProps) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});

  const handleSubmit = async () => {
    try {
      // Validate input
      const validation = reviewSchema.safeParse({ rating, comment });
      
      if (!validation.success) {
        const fieldErrors: { rating?: string; comment?: string } = {};
        validation.error.errors.forEach((error) => {
          if (error.path[0] === "rating") {
            fieldErrors.rating = error.message;
          } else if (error.path[0] === "comment") {
            fieldErrors.comment = error.message;
          }
        });
        setErrors(fieldErrors);
        return;
      }

      setErrors({});
      setSubmitting(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to submit a review");
        return;
      }

      // Submit review
      const { error } = await supabase.from("reviews").insert({
        session_id: sessionId,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        rating: validation.data.rating,
        comment: validation.data.comment || null,
      });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      onReviewSubmitted();
      
      // Reset form
      setRating(0);
      setComment("");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setRating(0);
    setComment("");
    setErrors({});
    onOpenChange(false);
    onReviewSubmitted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rate Your Session</DialogTitle>
          <DialogDescription>
            How was your {skill} session with {revieweeName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="space-y-2">
            <Label>Rating *</Label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating} / 5
                </span>
              )}
            </div>
            {errors.rating && (
              <p className="text-sm text-destructive">{errors.rating}</p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Comment (Optional)</Label>
            <Textarea
              id="comment"
              placeholder="Share your experience with this session..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length} / 1000 characters
            </p>
            {errors.comment && (
              <p className="text-sm text-destructive">{errors.comment}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={submitting}
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
