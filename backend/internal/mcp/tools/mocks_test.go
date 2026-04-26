package tools

import (
	"context"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	approvaluc "github.com/manris/backend/internal/usecase/approval"
	riskuc "github.com/manris/backend/internal/usecase/risk"
)

type mockRiskCreateUC struct {
	output *riskuc.CreateRiskOutput
	err    error
}

func (m *mockRiskCreateUC) Execute(ctx context.Context, input riskuc.CreateRiskInput) (*riskuc.CreateRiskOutput, error) {
	return m.output, m.err
}

type mockRiskUpdateUC struct {
	output *riskuc.UpdateRiskOutput
	err    error
	input  riskuc.UpdateRiskInput
	orgIDs []uuid.UUID
}

func (m *mockRiskUpdateUC) Execute(ctx context.Context, input riskuc.UpdateRiskInput, orgIDs []uuid.UUID) (*riskuc.UpdateRiskOutput, error) {
	m.input = input
	m.orgIDs = append([]uuid.UUID(nil), orgIDs...)
	return m.output, m.err
}

type mockRiskGetUC struct {
	risk *entity.Risk
	err  error
}

func (m *mockRiskGetUC) Execute(ctx context.Context, id uuid.UUID, orgIDs []uuid.UUID) (*entity.Risk, error) {
	return m.risk, m.err
}

type mockRiskListUC struct {
	risks []*entity.Risk
	err   error
}

func (m *mockRiskListUC) Execute(ctx context.Context, input riskuc.ListRisksInput) ([]*entity.Risk, error) {
	return m.risks, m.err
}

type mockRiskReassessmentUC struct {
	output *riskuc.CreateRiskReassessmentOutput
	err    error
}

func (m *mockRiskReassessmentUC) Execute(ctx context.Context, input riskuc.CreateRiskReassessmentInput) (*riskuc.CreateRiskReassessmentOutput, error) {
	return m.output, m.err
}

type mockApprovalSubmitUC struct {
	output *approvaluc.SubmitApprovalOutput
	err    error
}

func (m *mockApprovalSubmitUC) Execute(ctx context.Context, input approvaluc.SubmitApprovalInput) (*approvaluc.SubmitApprovalOutput, error) {
	return m.output, m.err
}
