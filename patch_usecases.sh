cd backend/internal/usecase/mitigation_task

sed -i '' 's/return uc.taskRepo.ListByRisk(ctx, \*input.RiskID)/return uc.taskRepo.ListByRisk(ctx, *input.RiskID, input.OrgIDs)/' usecases.go
sed -i '' 's/return uc.taskRepo.ListByMitigation(ctx, \*input.MitigationID)/return uc.taskRepo.ListByMitigation(ctx, *input.MitigationID, input.OrgIDs)/' usecases.go
sed -i '' 's/return uc.taskRepo.ListByUser(ctx, \*input.UserID, input.Status)/return uc.taskRepo.ListByUser(ctx, *input.UserID, input.Status, input.OrgIDs)/' usecases.go

sed -i '' 's/task, err := uc.taskRepo.GetByID(ctx, input.TaskID)/task, err := uc.taskRepo.GetByID(ctx, input.TaskID, input.OrgIDs)/' usecases.go
sed -i '' 's/return uc.taskRepo.GetByID(ctx, task.ID)/return uc.taskRepo.GetByID(ctx, task.ID, input.OrgIDs)/' usecases.go
