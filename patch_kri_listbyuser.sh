cd backend/internal/repository/postgres
sed -i '' 's/WHERE 1=1`/WHERE 1=1 AND (cardinality($1::uuid\[\]) = 0 OR rs.org_id = ANY($1::uuid\[\]))`/' kri_report.go
sed -i '' 's/args := \[\]interface{}{}/args := \[\]interface{}{orgIDs}/' kri_report.go
sed -i '' 's/argIdx := 1/argIdx := 2/' kri_report.go
