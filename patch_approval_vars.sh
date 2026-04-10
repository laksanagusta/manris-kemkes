cd backend/internal/repository/postgres
sed -i '' 's/\/\/ args := \[\]interface{}{}/args := \[\]interface{}{}/' approval.go
sed -i '' 's/\/\/ argIdx := 1/argIdx := 1/' approval.go
