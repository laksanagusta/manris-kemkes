package repository

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
)

type InboxFilter struct {
	UserID         uuid.UUID
	AssignedOnly   bool
	Global         bool
	ReadableOrgIDs []uuid.UUID
	OrganizationID *uuid.UUID
	Status         string
	RequestType    string
	Query          string
	SortBy         string
	SortOrder      string
	Page           int
	Limit          int
}

type InboxCounts struct {
	All         int `json:"all"`
	MyApprovals int `json:"myApprovals"`
	Approved    int `json:"approved"`
	Rejected    int `json:"rejected"`
}

type InboxPage struct {
	Data   json.RawMessage `json:"data"`
	Total  int             `json:"total"`
	Counts InboxCounts     `json:"counts"`
	Page   int             `json:"page"`
	Limit  int             `json:"limit"`
}

type InboxRepository interface {
	List(ctx context.Context, filter InboxFilter) (InboxPage, error)
}
