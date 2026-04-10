// Package hash provides cryptographic hashing utilities for document integrity verification.
package hash

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
)

// ComputeDocumentHash generates a deterministic SHA-256 hash from JSON data.
// It normalizes the JSON to ensure the same data always produces the same hash.
func ComputeDocumentHash(data json.RawMessage) string {
	// Unmarshal to normalize: ensures deterministic, compact JSON format
	var normalized interface{}
	if err := json.Unmarshal(data, &normalized); err != nil {
		// If unmarshaling fails, hash the raw bytes
		hash := sha256.Sum256(data)
		return hex.EncodeToString(hash[:])
	}

	// Re-marshal to ensure compact, deterministic representation
	normalizedBytes, err := json.Marshal(normalized)
	if err != nil {
		// Fallback to hashing raw bytes if re-marshaling fails
		hash := sha256.Sum256(data)
		return hex.EncodeToString(hash[:])
	}

	// Compute SHA-256 of normalized JSON
	hash := sha256.Sum256(normalizedBytes)
	return hex.EncodeToString(hash[:])
}

// VerifyDocumentHash checks if a given hash matches the computed hash of the data.
func VerifyDocumentHash(data json.RawMessage, expectedHash string) bool {
	return ComputeDocumentHash(data) == expectedHash
}
