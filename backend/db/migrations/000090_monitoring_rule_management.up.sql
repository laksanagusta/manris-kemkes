-- Keep writes out between normalization and index creation.
LOCK TABLE monitoring_rules IN SHARE ROW EXCLUSIVE MODE;

-- Keep the most-used active rule per year. Ties prefer the oldest rule, then ID.
-- Deactivation only affects new selections; existing profiles retain their rules.
WITH ranked AS (
 SELECT r.id,row_number() OVER (
  PARTITION BY r.year ORDER BY
   (SELECT count(*) FROM annual_risk_profile_versions p WHERE p.monitoring_rule_id=r.id) DESC,
   r.created_at,r.id
 ) AS position
 FROM monitoring_rules r WHERE r.active
)
UPDATE monitoring_rules SET active=false WHERE id IN (SELECT id FROM ranked WHERE position>1);

-- Complete deferred validation before building an index on the updated table.
SET CONSTRAINTS monitoring_rule_complete IMMEDIATE;

CREATE UNIQUE INDEX monitoring_rules_one_active_per_year ON monitoring_rules(year) WHERE active;
