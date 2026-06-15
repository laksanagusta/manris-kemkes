package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"time"

	"github.com/manris/backend/internal/config"
	"github.com/manris/backend/internal/database"
	postgresrepo "github.com/manris/backend/internal/repository/postgres"
	krireportuc "github.com/manris/backend/internal/usecase/kri_report"
)

func main() {
	// Parse CLI flags
	dateStr := flag.String("date", "", "Date to run the cron for (format: YYYY-MM-DD). If empty, uses time.Now().")
	flag.Parse()

	now := time.Now()
	if *dateStr != "" {
		parsed, err := time.Parse("2006-01-02", *dateStr)
		if err != nil {
			log.Fatalf("Invalid date format, expected YYYY-MM-DD: %v", err)
		}
		now = parsed
	}

	log.Printf("⏰ Cron started for reference date: %v", now.Format("2006-01-02"))

	cfg := config.Load()

	// Connect to database
	pool, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer pool.Close()

	// Repositories
	domainKRIReportRepo := postgresrepo.NewKRIReportRepository(pool)

	// Usecases
	kriReportGenerateUC := krireportuc.NewGenerateReportsUseCase(domainKRIReportRepo)
	kriReportOverdueUC := krireportuc.NewMarkOverdueUseCase(domainKRIReportRepo)

	ctx := context.Background()

	// KRI Reports
	fmt.Println("\n=== KRI REPORTS ===")
	kriCreated, err := kriReportGenerateUC.Execute(ctx, now)
	if err != nil {
		log.Printf("KRI report generation error: %v", err)
	} else {
		log.Printf("Generated %d new KRI reports", kriCreated)
	}
	
	kriMarked, err := kriReportOverdueUC.Execute(ctx, now)
	if err != nil {
		log.Printf("KRI overdue check error: %v", err)
	} else {
		log.Printf("Marked %d KRI reports as overdue", kriMarked)
	}

	fmt.Println("\n🎉 Cron finished successfully!")
}
