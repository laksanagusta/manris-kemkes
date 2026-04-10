cd backend/internal/repository/postgres

sed -i '' 's/WHERE ar.id = $1`, id,/WHERE ar.id = $1 AND (cardinality($2::uuid\[\]) = 0 OR (\
			(ar.request_type = '"'"'risk'"'"' AND EXISTS (SELECT 1 FROM risks r WHERE r.id = ar.entity_id AND r.org_id = ANY($2::uuid\[\])))\
			OR\
			(ar.request_type = '"'"'incident'"'"' AND EXISTS (SELECT 1 FROM incidents i WHERE i.id = ar.entity_id AND i.org_id = ANY($2::uuid\[\])))\
			OR\
			(ar.request_type NOT IN ('"'"'risk'"'"', '"'"'incident'"'"'))\
		))`, id, orgIDs,/' approval.go

sed -i '' 's/WHERE ar.request_type = $1 AND ar.entity_id = $2`, requestType, entityID,/WHERE ar.request_type = $1 AND ar.entity_id = $2 AND (cardinality($3::uuid\[\]) = 0 OR (\
			(ar.request_type = '"'"'risk'"'"' AND EXISTS (SELECT 1 FROM risks r WHERE r.id = ar.entity_id AND r.org_id = ANY($3::uuid\[\])))\
			OR\
			(ar.request_type = '"'"'incident'"'"' AND EXISTS (SELECT 1 FROM incidents i WHERE i.id = ar.entity_id AND i.org_id = ANY($3::uuid\[\])))\
			OR\
			(ar.request_type NOT IN ('"'"'risk'"'"', '"'"'incident'"'"'))\
		))`, requestType, entityID, orgIDs,/' approval.go

