//go:build ignore

package main

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/config"
	"github.com/manris/backend/internal/database"
	postgresrepo "github.com/manris/backend/internal/repository/postgres"
)

func main() {
	cfg := config.Load()
	pool, _ := database.Connect(cfg.DatabaseURL)
	repo := postgresrepo.NewMitigationTaskRepository(pool)
	
	id, _ := uuid.Parse("932eaac6-6dd0-4063-8d77-3f3360ec3d72")
	tasks, err := repo.ListByRisk(context.Background(), id)
	fmt.Printf("Error: %v\nTasks count: %d\n", err, len(tasks))
}
