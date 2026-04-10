cd backend/internal/repository/postgres
sed -i '' 's/WHERE rp.kri_id = $1/WHERE rp.kri_id = $1 AND (cardinality($2::uuid\[\]) = 0 OR rs.org_id = ANY($2::uuid\[\]))/' kri_report.go
sed -i '' 's/ORDER BY rp.due_date DESC`, kriID)/ORDER BY rp.due_date DESC`, kriID, orgIDs)/' kri_report.go
