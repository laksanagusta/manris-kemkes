cd backend/internal/usecase/kri_report

sed -i '' 's/GetByID(ctx context.Context, id uuid.UUID) (\*entity.KRIReport, error)/GetByID(ctx context.Context, id uuid.UUID, orgIDs \[\]uuid.UUID) (\*entity.KRIReport, error)/' usecases_test.go
sed -i '' 's/ListByKRI(ctx context.Context, kriID uuid.UUID) (\[\]\*entity.KRIReport, error)/ListByKRI(ctx context.Context, kriID uuid.UUID, orgIDs \[\]uuid.UUID) (\[\]\*entity.KRIReport, error)/' usecases_test.go
sed -i '' 's/ListByUser(ctx context.Context, userID uuid.UUID, status string) (\[\]\*entity.KRIReport, error)/ListByUser(ctx context.Context, userID uuid.UUID, status string, orgIDs \[\]uuid.UUID) (\[\]\*entity.KRIReport, error)/' usecases_test.go
sed -i '' 's/ListByStatus(ctx context.Context, status string) (\[\]\*entity.KRIReport, error)/ListByStatus(ctx context.Context, status string, orgIDs \[\]uuid.UUID) (\[\]\*entity.KRIReport, error)/' usecases_test.go

