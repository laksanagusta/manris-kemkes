-- Rollback: Remove working papers and signatories tables

DROP TABLE IF EXISTS working_paper_signatories;
DROP TABLE IF EXISTS working_papers;
DROP TYPE IF EXISTS working_paper_status;
