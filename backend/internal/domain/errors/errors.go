package errors

import (
	"errors"
	"fmt"
)

// AppError represents a domain error
type AppError struct {
	Code    string
	Message string
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

// Predefined domain errors
var (
	// Validation errors
	ErrInvalidInput        = &AppError{Code: "INVALID_INPUT", Message: "invalid input"}
	ErrInvalidRequestType  = &AppError{Code: "INVALID_REQUEST_TYPE", Message: "request type must be 'risk' or 'incident'"}
	ErrInvalidStatus       = &AppError{Code: "INVALID_STATUS", Message: "invalid status"}
	ErrInvalidApproverRole = &AppError{Code: "INVALID_APPROVER_ROLE", Message: "invalid approver role"}
	ErrInvalidAction       = &AppError{Code: "INVALID_ACTION", Message: "action must be 'approve' or 'reject'"}

	// Entity validation errors
	ErrInvalidName        = &AppError{Code: "INVALID_NAME", Message: "name cannot be empty"}
	ErrInvalidEmail       = &AppError{Code: "INVALID_EMAIL", Message: "invalid email format"}
	ErrInvalidUsername    = &AppError{Code: "INVALID_USERNAME", Message: "username cannot be empty"}
	ErrInvalidPassword    = &AppError{Code: "INVALID_PASSWORD", Message: "password cannot be empty"}
	ErrInvalidRole        = &AppError{Code: "INVALID_ROLE", Message: "invalid role"}
	ErrInvalidTitle       = &AppError{Code: "INVALID_TITLE", Message: "title cannot be empty"}
	ErrInvalidDescription = &AppError{Code: "INVALID_DESCRIPTION", Message: "description cannot be empty"}
	ErrInvalidCode        = &AppError{Code: "INVALID_CODE", Message: "code cannot be empty"}
	ErrInvalidControlType = &AppError{Code: "INVALID_CONTROL_TYPE", Message: "invalid control type"}
	ErrInvalidMetric      = &AppError{Code: "INVALID_METRIC", Message: "invalid metric"}
	ErrInvalidThreshold   = &AppError{Code: "INVALID_THRESHOLD", Message: "invalid threshold range"}
	ErrInvalidProgress    = &AppError{Code: "INVALID_PROGRESS", Message: "progress percentage must be between 0-100"}
	ErrInvalidActualCost  = &AppError{Code: "INVALID_ACTUAL_COST", Message: "actual cost must be zero or greater"}
	ErrInvalidEvidenceURL = &AppError{Code: "INVALID_EVIDENCE_URL", Message: "evidence URL must be a valid http(s) URL"}
	ErrInvalidNotes       = &AppError{Code: "INVALID_NOTES", Message: "notes must be between 10 and 1000 characters"}
	ErrInvalidKRIValue    = &AppError{Code: "INVALID_KRI_VALUE", Message: "KRI value must be zero or greater"}
	ErrInvalidSourceType  = &AppError{Code: "INVALID_SOURCE_TYPE", Message: "invalid source type"}
	ErrInvalidSeverity    = &AppError{Code: "INVALID_SEVERITY", Message: "invalid severity"}
	ErrInvalidProbability = &AppError{Code: "INVALID_PROBABILITY", Message: "probability must be between 1-5"}
	ErrInvalidImpact      = &AppError{Code: "INVALID_IMPACT", Message: "impact must be between 1-5"}
	ErrInvalidOwner       = &AppError{Code: "INVALID_OWNER", Message: "owner cannot be empty"}
	ErrInvalidFileType    = &AppError{Code: "INVALID_FILE_TYPE", Message: "only PDF files are supported"}
	ErrFileTooLarge       = &AppError{Code: "FILE_TOO_LARGE", Message: "file exceeds the maximum allowed size"}
	ErrDocumentUnreadable = &AppError{Code: "DOCUMENT_UNREADABLE", Message: "document could not be read as text"}

	// Not found errors
	ErrNotFound         = &AppError{Code: "NOT_FOUND", Message: "resource not found"}
	ErrApprovalNotFound = &AppError{Code: "APPROVAL_NOT_FOUND", Message: "approval request not found"}
	ErrRiskNotFound     = &AppError{Code: "RISK_NOT_FOUND", Message: "risk not found"}
	ErrIncidentNotFound = &AppError{Code: "INCIDENT_NOT_FOUND", Message: "incident not found"}

	// Business logic errors
	ErrAlreadyPending     = &AppError{Code: "ALREADY_PENDING", Message: "already pending approval"}
	ErrNotPending         = &AppError{Code: "NOT_PENDING", Message: "approval request is not pending"}
	ErrUnauthorized       = &AppError{Code: "UNAUTHORIZED", Message: "unauthorized access"}
	ErrForbidden          = &AppError{Code: "FORBIDDEN", Message: "insufficient permissions"}
	ErrInvalidCredentials = &AppError{Code: "INVALID_CREDENTIALS", Message: "invalid username or password"}
	ErrAccountInactive    = &AppError{Code: "ACCOUNT_INACTIVE", Message: "account is inactive"}
	ErrTokenGeneration    = &AppError{Code: "TOKEN_GENERATION", Message: "failed to generate token"}

	// System errors
	ErrDatabase = &AppError{Code: "DATABASE_ERROR", Message: "database error"}
	ErrInternal = &AppError{Code: "INTERNAL_ERROR", Message: "internal server error"}
)

// Wrap wraps an error with additional context
func Wrap(err error, message string) error {
	if err == nil {
		return nil
	}
	return &AppError{
		Message: message,
		Err:     err,
	}
}

// IsNotFound checks if error is a not found error
func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound) ||
		errors.Is(err, ErrApprovalNotFound) ||
		errors.Is(err, ErrRiskNotFound) ||
		errors.Is(err, ErrIncidentNotFound)
}

// IsUnauthorized checks if error is an unauthorized error
func IsUnauthorized(err error) bool {
	return errors.Is(err, ErrUnauthorized)
}

// IsForbidden checks if error is a forbidden error
func IsForbidden(err error) bool {
	return errors.Is(err, ErrForbidden)
}

// IsInvalidCredentials checks if error is an invalid credentials error
func IsInvalidCredentials(err error) bool {
	return errors.Is(err, ErrInvalidCredentials)
}

// IsAccountInactive checks if error is an account inactive error
func IsAccountInactive(err error) bool {
	return errors.Is(err, ErrAccountInactive)
}

// IsValidation checks if error is a validation error
func IsValidation(err error) bool {
	return errors.Is(err, ErrInvalidInput) ||
		errors.Is(err, ErrInvalidRequestType) ||
		errors.Is(err, ErrInvalidStatus) ||
		errors.Is(err, ErrInvalidApproverRole) ||
		errors.Is(err, ErrInvalidAction) ||
		errors.Is(err, ErrInvalidName) ||
		errors.Is(err, ErrInvalidEmail) ||
		errors.Is(err, ErrInvalidUsername) ||
		errors.Is(err, ErrInvalidPassword) ||
		errors.Is(err, ErrInvalidRole) ||
		errors.Is(err, ErrInvalidTitle) ||
		errors.Is(err, ErrInvalidDescription) ||
		errors.Is(err, ErrInvalidCode) ||
		errors.Is(err, ErrInvalidControlType) ||
		errors.Is(err, ErrInvalidMetric) ||
		errors.Is(err, ErrInvalidThreshold) ||
		errors.Is(err, ErrInvalidProgress) ||
		errors.Is(err, ErrInvalidActualCost) ||
		errors.Is(err, ErrInvalidEvidenceURL) ||
		errors.Is(err, ErrInvalidNotes) ||
		errors.Is(err, ErrInvalidKRIValue) ||
		errors.Is(err, ErrInvalidSourceType) ||
		errors.Is(err, ErrInvalidSeverity) ||
		errors.Is(err, ErrInvalidProbability) ||
		errors.Is(err, ErrInvalidImpact) ||
		errors.Is(err, ErrInvalidOwner) ||
		errors.Is(err, ErrInvalidFileType) ||
		errors.Is(err, ErrFileTooLarge) ||
		errors.Is(err, ErrDocumentUnreadable)
}
