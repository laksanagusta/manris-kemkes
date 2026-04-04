package errors

var (
	ErrFormNotFound             = &AppError{Code: "FORM_NOT_FOUND", Message: "form not found"}
	ErrFormLocked               = &AppError{Code: "FORM_LOCKED", Message: "form is locked: has existing responses"}
	ErrFormNotPublished         = &AppError{Code: "FORM_NOT_PUBLISHED", Message: "form is not published"}
	ErrFormClosed               = &AppError{Code: "FORM_CLOSED", Message: "form is closed and not accepting responses"}
	ErrFormAlreadyPublished     = &AppError{Code: "FORM_ALREADY_PUBLISHED", Message: "form is already published"}
	ErrDuplicateResponse        = &AppError{Code: "DUPLICATE_RESPONSE", Message: "user has already submitted a response to this form"}
	ErrFormNotAssigned          = &AppError{Code: "FORM_NOT_ASSIGNED", Message: "form is not assigned to your organization"}
	ErrInvalidFormTitle         = &AppError{Code: "INVALID_FORM_TITLE", Message: "form title cannot be empty"}
	ErrEmptySection             = &AppError{Code: "EMPTY_SECTION", Message: "each section must have at least one field"}
	ErrFieldMissingOptions      = &AppError{Code: "FIELD_MISSING_OPTIONS", Message: "radio, checkbox, and dropdown fields must have at least 2 options"}
	ErrInvalidFieldType         = &AppError{Code: "INVALID_FIELD_TYPE", Message: "invalid field type"}
	ErrInvalidConditionalSource = &AppError{Code: "INVALID_CONDITIONAL_SOURCE", Message: "conditional source field is invalid or cannot be used as source"}
)
