package feedback

import (
	"context"
	"strings"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	domainerrors "github.com/manris/backend/internal/domain/errors"
	"github.com/manris/backend/internal/domain/repository"
)

type Service struct{ repo repository.FeedbackRepository }

func NewService(repo repository.FeedbackRepository) *Service { return &Service{repo: repo} }

func (s *Service) Create(ctx context.Context, scope *entity.AccessScope, message string, requestID uuid.UUID) (*entity.Feedback, error) {
	if scope == nil || scope.UserID == uuid.Nil {
		return nil, domainerrors.ErrUnauthorized
	}
	message = strings.TrimSpace(message)
	if message == "" || !utf8.ValidString(message) || utf8.RuneCountInString(message) > 2000 || strings.ContainsRune(message, 0) || requestID == uuid.Nil {
		return nil, domainerrors.ErrInvalidInput
	}
	return s.repo.Create(ctx, &entity.Feedback{CreatedBy: scope.UserID, Message: message, RequestID: requestID})
}
