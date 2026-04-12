ALTER TABLE working_paper_signatories ADD COLUMN signer_jabatan VARCHAR(300) DEFAULT '';
ALTER TABLE working_paper_signatories RENAME signer_role_label TO signer_pangkat;