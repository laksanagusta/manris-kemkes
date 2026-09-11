UPDATE risk_charters AS charter
SET upr_structure = COALESCE((
    SELECT jsonb_agg((member || jsonb_build_object(
        'id', COALESCE(NULLIF(member->>'id', ''), gen_random_uuid()::text),
        'role', COALESCE(NULLIF(member->>'role', ''), 'member'),
        'name', COALESCE(member->>'name', ''),
        'position', COALESCE(NULLIF(member->>'position', ''), member->>'title', '')
    )) - 'title')
    FROM jsonb_array_elements(charter.upr_structure) AS member
), '[]'::jsonb)
WHERE jsonb_typeof(charter.upr_structure) = 'array';
