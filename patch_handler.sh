cd backend/internal/handler/http
sed -i '' '/status := c.Query("status", "all")/i\
	orgIDs, ok := c.Locals("orgIds").([]uuid.UUID)\
	if !ok || len(orgIDs) == 0 {\
		return sendProblemDetails(c, 403, "Forbidden", "https://api.manris.com/errors/forbidden", "no accessible organizations")\
	}\
' mitigation_task.go
sed -i '' 's/input := mtuc.ListTasksInput{UserID: &userID, Status: status}/input := mtuc.ListTasksInput{UserID: \&userID, Status: status, OrgIDs: orgIDs}/' mitigation_task.go
