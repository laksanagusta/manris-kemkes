cd backend/internal/repository/postgres

sed -i '' 's/query := `SELECT COUNT(\*) FROM approval_requests WHERE current_status='"'"'pending'"'"'`/query := `SELECT COUNT(\*) FROM approval_requests ar WHERE ar.current_status='"'"'pending'"'"'`/' approval.go
sed -i '' 's/AND current_approver_role/AND ar.current_approver_role/' approval.go
sed -i '' 's/AND current_approver_user_id/AND ar.current_approver_user_id/' approval.go

sed -i '' '/if approverUserID != nil {/i\
	if len(orgIDs) > 0 {\
		query += fmt.Sprintf(" AND (\\n" +\
			"(ar.request_type = '"'"'risk'"'"' AND EXISTS (SELECT 1 FROM risks r WHERE r.id = ar.entity_id AND r.org_id = ANY($%d)))\\n" +\
			"OR (ar.request_type = '"'"'incident'"'"' AND EXISTS (SELECT 1 FROM incidents i WHERE i.id = ar.entity_id AND i.org_id = ANY($%d)))\\n" +\
			"OR (ar.request_type NOT IN ('"'"'risk'"'"', '"'"'incident'"'"'))\\n" +\
			")", len(args)+1, len(args)+1)\
		args = append(args, orgIDs)\
	}\
' approval.go

