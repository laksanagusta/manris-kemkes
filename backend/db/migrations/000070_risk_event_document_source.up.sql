ALTER TABLE incidents
 ADD COLUMN source_document_name text NOT NULL DEFAULT '',
 ADD COLUMN source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
 ADD COLUMN extraction_key text;
CREATE UNIQUE INDEX incidents_extraction_key_unique ON incidents (organization_id, extraction_key) WHERE extraction_key IS NOT NULL;
