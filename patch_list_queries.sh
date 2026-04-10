cd backend/internal/repository/postgres

sed -i '' 's/WHERE t.risk_id = $1/WHERE t.risk_id = $1 AND (cardinality($2::uuid\[\]) = 0 OR r.org_id = ANY($2::uuid\[\]))/' mitigation_task.go
sed -i '' 's/ORDER BY t.due_date DESC`, riskID)/ORDER BY t.due_date DESC`, riskID, orgIDs)/' mitigation_task.go

sed -i '' 's/WHERE t.mitigation_id = $1/WHERE t.mitigation_id = $1 AND (cardinality($2::uuid\[\]) = 0 OR r.org_id = ANY($2::uuid\[\]))/' mitigation_task.go
sed -i '' 's/ORDER BY t.due_date ASC`, mitigationID)/ORDER BY t.due_date ASC`, mitigationID, orgIDs)/' mitigation_task.go

