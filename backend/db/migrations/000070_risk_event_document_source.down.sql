DROP INDEX IF EXISTS incidents_extraction_key_unique;
ALTER TABLE incidents DROP COLUMN extraction_key, DROP COLUMN source_refs, DROP COLUMN source_document_name;
