// Package config loads environment configuration.
package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds the application configuration loaded from environment variables.
type Config struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	JWTExpiry   int // hours
	CORSOrigins string
	OpenAIKey   string
}

// Load reads .env and populates a Config struct.
func Load() *Config {
	_ = godotenv.Load()

	expiry, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "24"))

	return &Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/manris?sslmode=disable"),
		JWTSecret:   getEnv("JWT_SECRET", "change-me"),
		JWTExpiry:   expiry,
		CORSOrigins: getEnv("CORS_ORIGINS", "http://localhost:3000"),
		OpenAIKey:   getEnv("OPENAI_API_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
