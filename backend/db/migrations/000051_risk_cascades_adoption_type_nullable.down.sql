ALTER TABLE risk_cascades
	DROP CONSTRAINT IF EXISTS risk_cascades_adoption_type_check;

ALTER TABLE risk_cascades
	ADD CONSTRAINT risk_cascades_adoption_type_check
	CHECK (adoption_type IN ('full', 'partial'));
