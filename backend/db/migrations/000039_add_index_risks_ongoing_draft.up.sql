-- Add index for ongoing draft lookup performance
-- Optimizes the LEFT JOIN in List query that finds ongoing assessment drafts
CREATE INDEX idx_risks_ongoing_draft 
ON risks(code, created_at DESC) 
WHERE status IN ('assessment_draft', 'assessment_in_review') 
  AND archived_at IS NULL;
