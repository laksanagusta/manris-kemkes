cd backend/internal/repository/postgres
sed -i '' '/WHERE 1=1`/a\
\
	args := []interface{}{}\
	argIdx := 1\
\
	if len(orgIDs) > 0 {\
		query += ` AND (\
			(ar.request_type = '"'"'risk'"'"' AND EXISTS (SELECT 1 FROM risks r WHERE r.id = ar.entity_id AND r.org_id = ANY($1)))\
			OR \
			(ar.request_type = '"'"'incident'"'"' AND EXISTS (SELECT 1 FROM incidents i WHERE i.id = ar.entity_id AND i.org_id = ANY($1)))\
			OR \
			(ar.request_type NOT IN ('"'"'risk'"'"', '"'"'incident'"'"'))\
		)`\
		args = append(args, orgIDs)\
		argIdx++\
	}\
' approval.go
sed -i '' 's/	args := \[\]interface{}{}/	\/\/ args := \[\]interface{}{}/' approval.go
sed -i '' 's/	argIdx := 1/	\/\/ argIdx := 1/' approval.go
