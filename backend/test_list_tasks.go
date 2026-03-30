//go:build ignore

package main

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manris/backend/internal/config"
	postgresrepo "github.com/manris/backend/internal/repository/postgres"
)

func main() {
	cfg := config.Load()
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
    if err != nil { panic(err) }
	defer pool.Close()

	repo := postgresrepo.NewMitigationTaskRepository(pool)
	id, _ := uuid.Parse("932eaac6-6dd0-4063-8d77-3f3360ec3d72")
	tasks, err := repo.ListByRisk(context.Background(), id)
	fmt.Printf("Tasks count: %d, err: %v\n", len(tasks), err)
    for _, t := range tasks {
        fmt.Printf("- %s | %s - %s\n", t.MitigationAction, t.PeriodStart, t.DueDate)
    }
}
