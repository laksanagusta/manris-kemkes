BEGIN;

LOCK TABLE mitigations IN ACCESS EXCLUSIVE MODE;

-- Existing controls belong to the risk's control description. Preserve plans
-- already linked to tasks so the foreign key cannot cascade into report history.
WITH retired_controls AS (
    DELETE FROM mitigations m
    WHERE m.is_existing_control
      AND NOT EXISTS (
          SELECT 1 FROM mitigation_tasks t WHERE t.mitigation_id = m.id
      )
    RETURNING m.risk_id, m.action, m.sort_order, m.id
), controls_by_risk AS (
    SELECT risk_id, string_agg(btrim(action), E'\n' ORDER BY sort_order, id) AS actions
    FROM retired_controls
    WHERE btrim(action) <> ''
    GROUP BY risk_id
)
UPDATE risks r
SET existing_control = concat_ws(E'\n', NULLIF(btrim(r.existing_control), ''), c.actions)
FROM controls_by_risk c
WHERE r.id = c.risk_id;

-- Draft monitoring payloads are editable copies of the risk plan. Keep final
-- and superseded snapshots intact as historical evidence.
WITH retired_fields AS (
    SELECT ARRAY[
        'activityStage', 'expectedOutput', 'quantitativeTarget', 'supportingUnit',
        'resourcesRequired', 'contingencyPlan', 'potentialObstacle',
        'isBreakthroughActivity', 'isExistingControl'
    ] AS keys
), draft_plans AS (
    SELECT rm.id,
           COALESCE(
               jsonb_agg(m.plan - f.keys ORDER BY m.position)
                   FILTER (WHERE NOT m.plan @> '{"isExistingControl":true}'::jsonb),
               '[]'::jsonb
           ) AS plans,
           string_agg(NULLIF(btrim(m.plan->>'action'), ''), E'\n' ORDER BY m.position)
               FILTER (WHERE m.plan @> '{"isExistingControl":true}'::jsonb) AS controls
    FROM risk_monitorings rm
    CROSS JOIN retired_fields f
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(rm.draft_payload->'mitigations') = 'array'
             THEN rm.draft_payload->'mitigations' ELSE '[]'::jsonb END
    ) WITH ORDINALITY AS m(plan, position)
    WHERE rm.status = 'draft'
    GROUP BY rm.id
    HAVING bool_or(m.plan ?| f.keys)
)
UPDATE risk_monitorings rm
SET draft_payload = rm.draft_payload || jsonb_build_object(
    'mitigations', d.plans,
    'existingControl', concat_ws(E'\n', NULLIF(btrim(rm.draft_payload->>'existingControl'), ''), d.controls)
)
FROM draft_plans d
WHERE rm.id = d.id;

ALTER TABLE mitigations
    DROP COLUMN activity_stage,
    DROP COLUMN expected_output,
    DROP COLUMN quantitative_target,
    DROP COLUMN supporting_unit,
    DROP COLUMN resources_required,
    DROP COLUMN contingency_plan,
    DROP COLUMN potential_obstacle,
    DROP COLUMN is_breakthrough_activity,
    DROP COLUMN is_existing_control;

COMMIT;
