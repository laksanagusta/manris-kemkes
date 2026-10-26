package agent

import (
	"encoding/json"

	"github.com/google/uuid"
)

func validateWidgetActions(actions []WidgetAction) error {
	if len(actions) > 5 {
		return ErrInvalid
	}
	for _, a := range actions {
		if a.Label == "" || len(a.Label) > 120 || a.Prompt == "" || len(a.Prompt) > 8000 || len(a.Skills) > 4 {
			return ErrInvalid
		}
		for _, skill := range a.Skills {
			if !knownSkill(skill) {
				return ErrInvalid
			}
		}
	}
	return nil
}
func validateRiskDetail(r *RiskDetail) error {
	if r == nil {
		return ErrInvalid
	}
	if id, err := uuid.Parse(r.ID); err != nil || id == uuid.Nil {
		return ErrInvalid
	}
	if id, err := uuid.Parse(r.OrganizationID); err != nil || id == uuid.Nil {
		return ErrInvalid
	}
	if !safeHref(r.Href) || len(r.Mitigations) > 200 || len(r.Causes) > 100 || len(r.Impacts) > 100 {
		return ErrInvalid
	}
	return validateWidgetActions(r.Actions)
}
func validateResponseWidget(w Widget) error {
	if err := validateWidgetActions(w.Actions); err != nil {
		return err
	}
	if w.RefreshAction != nil {
		if err := validateWidgetActions([]WidgetAction{*w.RefreshAction}); err != nil {
			return err
		}
	}
	switch w.Type {
	case "risk_detail":
		if err := validateRiskDetail(w.Risk); err != nil {
			return err
		}
	case "priority_list":
		p := w.Priorities
		if p == nil || p.Page < 1 || p.Limit < 1 || p.Limit > 100 || p.Total < len(p.Items) || len(p.Items) > p.Limit {
			return ErrInvalid
		}
		for _, item := range p.Items {
			if err := validateRiskDetail(&item.Risk); err != nil {
				return err
			}
			if len(item.Tasks) > 5 || item.OverdueCount < len(item.Tasks) || item.OverdueDays < 0 {
				return ErrInvalid
			}
			for _, task := range item.Tasks {
				if !safeHref(task.Href) {
					return ErrInvalid
				}
			}
		}
	case "period_comparison":
		if w.Comparison == nil || len(w.Comparison.Rows) > 10 || !safeHref(w.Comparison.Href) {
			return ErrInvalid
		}
		for _, row := range w.Comparison.Rows {
			if row.Delta != nil && (row.Current == nil || row.Previous == nil || *row.Delta != *row.Current-*row.Previous) {
				return ErrInvalid
			}
		}
	}
	encoded, err := json.Marshal(w)
	if err != nil || len(encoded) > 1000000 {
		return ErrInvalid
	}
	return nil
}
