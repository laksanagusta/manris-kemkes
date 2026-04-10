cd backend/internal/repository/postgres

sed -i '' 's/GetByID(ctx context.Context, id uuid.UUID) (\*entity.KRIReport, error)/GetByID(ctx context.Context, id uuid.UUID, orgIDs \[\]uuid.UUID) (\*entity.KRIReport, error)/' kri_report.go
sed -i '' 's/WHERE rp.id = $1`, id,/WHERE rp.id = $1 AND (cardinality($2::uuid\[\]) = 0 OR rs.org_id = ANY($2::uuid\[\]))`, id, orgIDs,/' kri_report.go

sed -i '' 's/ListByKRI(ctx context.Context, kriID uuid.UUID) (\[\]\*entity.KRIReport, error)/ListByKRI(ctx context.Context, kriID uuid.UUID, orgIDs \[\]uuid.UUID) (\[\]\*entity.KRIReport, error)/' kri_report.go
sed -i '' 's/WHERE rp.kri_id = $1`/WHERE rp.kri_id = $1 AND (cardinality($2::uuid\[\]) = 0 OR rs.org_id = ANY($2::uuid\[\]))`/' kri_report.go
sed -i '' 's/r.queryReports(ctx, query, kriID)/r.queryReports(ctx, query, kriID, orgIDs)/' kri_report.go

sed -i '' 's/ListByUser(ctx context.Context, userID uuid.UUID, status string) (\[\]\*entity.KRIReport, error)/ListByUser(ctx context.Context, userID uuid.UUID, status string, orgIDs \[\]uuid.UUID) (\[\]\*entity.KRIReport, error)/' kri_report.go
sed -i '' 's/WHERE k.owner_user_id = $1/WHERE k.owner_user_id = $1 AND (cardinality($2::uuid\[\]) = 0 OR rs.org_id = ANY($2::uuid\[\]))/' kri_report.go
sed -i '' 's/args := \[\]interface{}{userID}/args := \[\]interface{}{userID, orgIDs}/' kri_report.go
sed -i '' 's/query += ` AND rp.status = $2`/query += ` AND rp.status = $3`/' kri_report.go

sed -i '' 's/ListByStatus(ctx context.Context, status string) (\[\]\*entity.KRIReport, error)/ListByStatus(ctx context.Context, status string, orgIDs \[\]uuid.UUID) (\[\]\*entity.KRIReport, error)/' kri_report.go
sed -i '' 's/WHERE rp.status = $1/WHERE rp.status = $1 AND (cardinality($2::uuid\[\]) = 0 OR rs.org_id = ANY($2::uuid\[\]))/' kri_report.go
sed -i '' 's/r.queryReports(ctx, query, status)/r.queryReports(ctx, query, status, orgIDs)/' kri_report.go
