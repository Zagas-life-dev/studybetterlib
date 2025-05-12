-- Update feedback status field to accept any text value without constraint

-- First, we drop the constraint on the status column
ALTER TABLE feedback
DROP CONSTRAINT IF EXISTS feedback_status_check;

-- Make sure the default status is "pending"
ALTER TABLE feedback
ALTER COLUMN status SET DEFAULT 'pending';

-- Add comment to explain the field
COMMENT ON COLUMN feedback.status IS 'Status of the feedback (common values: pending, in_progress, resolved)';

-- Optional: Create an index on status for faster filtering
CREATE INDEX IF NOT EXISTS feedback_status_idx ON feedback(status);