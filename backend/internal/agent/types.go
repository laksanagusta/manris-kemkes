// Package agent implements private, persistent Manris agent conversations.
package agent

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

var (
	ErrNotFound        = errors.New("Percakapan atau hasil tidak ditemukan")
	ErrForbidden       = errors.New("Akses ke data ini tidak tersedia")
	ErrInvalid         = errors.New("Permintaan tidak valid")
	ErrConflict        = errors.New("Pekerjaan aktif atau revisi usulan telah berubah")
	ErrStale           = errors.New("Data telah berubah. Tinjau usulan kembali")
	ErrUnavailable     = errors.New("Agent belum tersedia. Periksa pengaturan AI")
	ErrStorageNotReady = errors.New("Penyimpanan Agent belum siap. Jalankan migrasi database aplikasi")
	ErrInvalidInput    = ErrInvalid
	ErrBusy            = ErrConflict
	ErrLeaseLost       = errors.New("agent worker lease lost")
)

type Skill struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
}
type Conversation struct {
	ID        uuid.UUID `json:"id"`
	Title     string    `json:"title"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
type ConversationDetail struct {
	Conversation Conversation `json:"conversation"`
	Messages     []Message    `json:"messages"`
	Runs         []Run        `json:"runs"`
	Proposals    []Proposal   `json:"proposals"`
}
type Message struct {
	ID             uuid.UUID    `json:"id"`
	ConversationID uuid.UUID    `json:"conversationId"`
	RunID          *uuid.UUID   `json:"runId,omitempty"`
	Role           string       `json:"role"`
	Content        string       `json:"content"`
	Widgets        []Widget     `json:"widgets"`
	Attachments    []Attachment `json:"attachments"`
	CreatedAt      time.Time    `json:"createdAt"`
}
type Attachment struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	MIMEType  string    `json:"mimeType"`
	Size      int64     `json:"size"`
	CreatedAt time.Time `json:"createdAt"`
	Warnings  []string  `json:"warnings,omitempty"`
}
type Run struct {
	ID             uuid.UUID  `json:"id"`
	ConversationID uuid.UUID  `json:"conversationId"`
	Status         string     `json:"status"`
	Events         []Activity `json:"events"`
	StartedAt      *time.Time `json:"startedAt,omitempty"`
	FinishedAt     *time.Time `json:"finishedAt,omitempty"`
	Error          string     `json:"error,omitempty"`
}
type Activity struct {
	ID        string    `json:"id"`
	Label     string    `json:"label"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}
type Widget struct {
	ID            string            `json:"id"`
	Type          string            `json:"type"`
	Title         string            `json:"title"`
	Description   string            `json:"description,omitempty"`
	SnapshotAt    time.Time         `json:"snapshotAt"`
	ScopeLabel    string            `json:"scopeLabel,omitempty"`
	Columns       []Column          `json:"columns,omitempty"`
	Rows          []map[string]any  `json:"rows,omitempty"`
	Metrics       []Metric          `json:"metrics,omitempty"`
	SourceIDs     []string          `json:"sourceIds,omitempty"`
	Risk          *RiskDetail       `json:"risk,omitempty"`
	Priorities    *PriorityList     `json:"priorities,omitempty"`
	Comparison    *PeriodComparison `json:"comparison,omitempty"`
	Actions       []WidgetAction    `json:"actions,omitempty"`
	RefreshAction *WidgetAction     `json:"refreshAction,omitempty"`
	Warnings      []string          `json:"warnings,omitempty"`
}
type Column struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}
type Metric struct {
	Label       string `json:"label"`
	Value       any    `json:"value"`
	Description string `json:"description,omitempty"`
}
type Proposal struct {
	ID             uuid.UUID     `json:"id"`
	ConversationID uuid.UUID     `json:"conversationId"`
	RunID          uuid.UUID     `json:"runId"`
	Revision       int           `json:"revision"`
	Status         string        `json:"status"`
	Title          string        `json:"title"`
	Operations     []Operation   `json:"operations"`
	CreatedAt      time.Time     `json:"createdAt"`
	AppliedAt      *time.Time    `json:"appliedAt,omitempty"`
	Receipt        []ReceiptItem `json:"receipt,omitempty"`
}
type Operation struct {
	ID                string         `json:"id"`
	Kind              string         `json:"kind"`
	TargetID          string         `json:"targetId,omitempty"`
	Title             string         `json:"title"`
	Reason            string         `json:"reason,omitempty"`
	Included          bool           `json:"included"`
	Before            map[string]any `json:"before,omitempty"`
	After             map[string]any `json:"after"`
	ExpectedUpdatedAt string         `json:"expectedUpdatedAt,omitempty"`
	OrganizationID    string         `json:"organizationId,omitempty"`
}
type ReceiptItem struct {
	OperationID string `json:"operationId"`
	Title       string `json:"title"`
	Href        string `json:"href,omitempty"`
}

type SendMessageInput struct {
	Content        string   `json:"content"`
	Skills         []string `json:"skills"`
	AttachmentIDs  []string `json:"attachmentIds"`
	IdempotencyKey string   `json:"idempotencyKey,omitempty"`
}
type AttachmentInput struct {
	Name           string
	MimeType       string
	Size           int64
	Text           string
	IdempotencyKey string
	Warnings       []string
}

type ApplicationContext struct {
	Content         string
	OrganizationIDs []uuid.UUID
}

type Toolkit interface {
	Context(context.Context, uuid.UUID) (ApplicationContext, error)
	Authorize(context.Context, uuid.UUID, []uuid.UUID) error
	Definitions([]string) []ToolDefinition
	Execute(context.Context, uuid.UUID, string, json.RawMessage) (ToolResult, error)
	ValidateOperations(context.Context, uuid.UUID, []Operation) ([]Operation, error)
	Apply(context.Context, pgx.Tx, uuid.UUID, []Operation) ([]ReceiptItem, error)
}
type ToolDefinition struct {
	Name, Description string
	Parameters        json.RawMessage
}
type ToolResult struct {
	Content         string
	Widgets         []Widget
	Operations      []Operation
	OrganizationIDs []uuid.UUID
}

type ToolCall struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Arguments json.RawMessage `json:"arguments"`
}
type Turn struct {
	Role       string     `json:"role"`
	Content    string     `json:"content,omitempty"`
	ToolCallID string     `json:"toolCallId,omitempty"`
	ToolCalls  []ToolCall `json:"toolCalls,omitempty"`
}
type Model interface {
	Complete(context.Context, []Turn, []ToolDefinition) (Turn, error)
}

// Record is private persistence state. Never serialize it as an HTTP response.
// Scope is maintained by trusted tool results, independently of editable DTO fields.
type Record struct {
	OwnerID         uuid.UUID                 `json:"ownerId"`
	Conversation    Conversation              `json:"conversation"`
	Messages        []StoredMessage           `json:"messages"`
	Attachments     []StoredAttachment        `json:"attachments"`
	Runs            []StoredRun               `json:"runs"`
	Proposals       []StoredProposal          `json:"proposals"`
	OrganizationIDs []uuid.UUID               `json:"organizationIds"`
	Requests        map[string]RequestReceipt `json:"requests,omitempty"`
}
type StoredMessage struct {
	Message         Message     `json:"message"`
	OrganizationIDs []uuid.UUID `json:"organizationIds"`
}
type StoredAttachment struct {
	Attachment      Attachment  `json:"attachment"`
	Text            string      `json:"text"`
	OrganizationIDs []uuid.UUID `json:"organizationIds"`
}
type StoredProposal struct {
	Proposal        Proposal    `json:"proposal"`
	OrganizationIDs []uuid.UUID `json:"organizationIds"`
	ApplyKey        string      `json:"applyKey,omitempty"`
	ContentHash     string      `json:"contentHash"`
}
type StoredRun struct {
	Run             Run         `json:"run"`
	OrganizationIDs []uuid.UUID `json:"organizationIds"`
	CancelRequested bool        `json:"cancelRequested"`
	Checkpoint      Checkpoint  `json:"checkpoint"`
}
type Checkpoint struct {
	Turns       []Turn      `json:"turns"`
	Skills      []string    `json:"skills"`
	Steps       int         `json:"steps"`
	ToolCount   int         `json:"toolCount"`
	Widgets     []Widget    `json:"widgets"`
	Operations  []Operation `json:"operations"`
	Initialized bool        `json:"initialized"`
	CreatedAt   time.Time   `json:"createdAt"`
}

type Claim struct {
	ConversationID uuid.UUID
	RunID          uuid.UUID
	OwnerID        uuid.UUID
	WorkerID       string
	Generation     int64
}

// Store serializes each conversation mutation. Apply callbacks receive the same
// transaction used to persist the receipt. Worker mutations must fence old leases.
type Store interface {
	List(context.Context, uuid.UUID) ([]Record, error)
	Create(context.Context, *Record) error
	Read(context.Context, uuid.UUID, uuid.UUID) (*Record, error)
	Mutate(context.Context, uuid.UUID, uuid.UUID, func(*Record, pgx.Tx) error) error
	Claim(context.Context, string, time.Duration) (*Claim, error)
	Heartbeat(context.Context, *Claim, time.Duration) error
	MutateClaim(context.Context, *Claim, func(*Record, *StoredRun, pgx.Tx) error) error
}

type RequestReceipt struct {
	Hash         string    `json:"hash"`
	RunID        uuid.UUID `json:"runId,omitempty"`
	AttachmentID uuid.UUID `json:"attachmentId,omitempty"`
}

// TransactionalAuthorizer avoids re-entering a connection pool while a record is locked.
type TransactionalAuthorizer interface {
	AuthorizeInTx(context.Context, pgx.Tx, uuid.UUID, []uuid.UUID) error
}
type TransactionalOperationValidator interface {
	ValidateOperationsInTx(context.Context, pgx.Tx, uuid.UUID, []Operation) ([]Operation, error)
}
