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

// DefaultAIModels returns fallback AI model configuration when database is unavailable
func DefaultAIModels() map[string]string {
	return map[string]string{
		"default":         getEnvDefault("OPENAI_MODEL_DEFAULT", "gpt-4o-mini"),
		"cause":           getEnvDefault("OPENAI_MODEL_CAUSE", ""),
		"impact":          getEnvDefault("OPENAI_MODEL_IMPACT", ""),
		"mitigation":      getEnvDefault("OPENAI_MODEL_MITIGATION", ""),
		"transcript":      getEnvDefault("OPENAI_MODEL_TRANSCRIPT", ""),
		"predictive":      getEnvDefault("OPENAI_MODEL_PREDICTIVE", ""),
		"minutes":         getEnvDefault("OPENAI_MODEL_MINUTES", ""),
		"kri":             getEnvDefault("OPENAI_MODEL_KRI", ""),
		"risk-suggestion": getEnvDefault("OPENAI_MODEL_RISK_SUGGESTION", ""),
		"incident":        getEnvDefault("OPENAI_MODEL_INCIDENT", ""),
		"cba":             getEnvDefault("OPENAI_MODEL_CBA", ""),
	}
}

func getEnvDefault(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
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
