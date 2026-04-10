cd backend/internal/repository/postgres

# Update GetByID to use correct args
sed -i '' 's/WHERE t.id = $1 AND (cardinality($2::uuid\[\]) = 0 OR r.org_id = ANY($2::uuid\[\])), id, orgIDs,/WHERE t.id = $1 AND (cardinality($2::uuid\[\]) = 0 OR r.org_id = ANY($2::uuid\[\]))`, id, orgIDs,/' mitigation_task.go

# Update ListByUser
sed -i '' 's/WHERE m.owner_user_id = $1`/WHERE m.owner_user_id = $1 AND (cardinality($2::uuid\[\]) = 0 OR r.org_id = ANY($2::uuid\[\]))`/' mitigation_task.go
sed -i '' 's/args := \[\]interface{}{userID}/args := \[\]interface{}{userID, orgIDs}/' mitigation_task.go
sed -i '' 's/query += ` AND t.status = $2`/query += ` AND t.status = $3`/' mitigation_task.go
sed -i '' 's/args = append(args, status)/args = append(args, status)/' mitigation_task.go
