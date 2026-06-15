ALTER TABLE mitigation_tasks
  ADD COLUMN monitoring_id UUID REFERENCES risk_monitorings(id) ON DELETE SET NULL,
  ADD COLUMN report_output TEXT NOT NULL DEFAULT '',
  ADD COLUMN report_obstacle TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_mitigation_tasks_monitoring_id
  ON mitigation_tasks(monitoring_id)
  WHERE monitoring_id IS NOT NULL;
