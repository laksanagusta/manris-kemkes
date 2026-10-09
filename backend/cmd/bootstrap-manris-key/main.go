// Provision the first Manris credential without rotating or invalidating existing sessions.
package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/joho/godotenv"
	identity "github.com/manris/backend/internal/identity/service"
)

func main() {
	output := flag.String("env-file", "../frontend/.env.local", "server-only frontend environment file")
	flag.Parse()
	if err := provision(*output); err != nil {
		// Never print database errors: they may contain connection credentials.
		fmt.Fprintln(os.Stderr, "Bootstrap failed; check database access, migration 71, and existing Manris key configuration. Existing credentials are never overwritten.")
		os.Exit(1)
	}
	fmt.Println("Manris APP_KEY configured in server environment; existing sessions preserved.")
}

func provision(output string) error {
	_ = godotenv.Load()
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	conn, err := pgx.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		return err
	}
	defer conn.Close(ctx)
	tx, err := conn.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	var existing *string
	var active bool
	if err := tx.QueryRow(ctx, "SELECT key_hash, active FROM auth_applications WHERE id='manris' FOR UPDATE").Scan(&existing, &active); err != nil {
		return err
	}
	if !active {
		return fmt.Errorf("inactive application")
	}
	content, err := os.ReadFile(output)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	values, err := godotenv.Unmarshal(string(content))
	if err != nil {
		return err
	}
	key := values["MANRIS_APP_KEY"]
	if existing != nil {
		if key == "" || fmt.Sprintf("%x", sha256.Sum256([]byte(key))) != *existing {
			return fmt.Errorf("existing key mismatch")
		}
		return tx.Commit(ctx)
	}
	if key == "" {
		key, err = identity.NewAppKey()
		if err != nil {
			return err
		}
	}
	decoded, decodeErr := base64.RawURLEncoding.DecodeString(strings.TrimPrefix(key, "auth_app_"))
	if !strings.HasPrefix(key, "auth_app_") || decodeErr != nil || len(decoded) != 32 {
		return fmt.Errorf("invalid key")
	}
	lines := strings.Split(strings.TrimRight(string(content), "\n"), "\n")
	kept := make([]string, 0, len(lines)+1)
	for _, line := range lines {
		field := strings.TrimPrefix(strings.TrimSpace(line), "export ")
		if strings.TrimSpace(strings.SplitN(field, "=", 2)[0]) != "MANRIS_APP_KEY" {
			kept = append(kept, line)
		}
	}
	kept = append(kept, "MANRIS_APP_KEY="+key)
	tmp, err := os.CreateTemp(filepath.Dir(output), ".auth-env-*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.WriteString(strings.Join(kept, "\n") + "\n"); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(key)))
	if _, err := tx.Exec(ctx, "UPDATE auth_applications SET key_hash=$1, updated_at=NOW() WHERE id='manris'", hash); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, "INSERT INTO auth_application_events(id,application_id,action) VALUES($1,'manris','rotate_key')", uuid.New()); err != nil {
		return err
	}
	// Keep key_version unchanged for the initial credential; old bound sessions remain valid.
	if err := os.Rename(tmp.Name(), output); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
