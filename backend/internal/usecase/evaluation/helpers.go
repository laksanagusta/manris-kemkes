package evaluation

import (
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
)

const DefaultTemplateKey = "monitoring_evaluation_kmk"

type ItemInput struct {
	ID             *uuid.UUID `json:"id,omitempty"`
	TemplateItemID *uuid.UUID `json:"templateItemId,omitempty"`
	ItemKey        string     `json:"itemKey"`
	ItemNo         string     `json:"itemNo"`
	Label          string     `json:"label"`
	Answer         string     `json:"answer"`
	Condition      string     `json:"condition"`
	Description    string     `json:"description"`
	Analysis       string     `json:"analysis"`
	SortOrder      int        `json:"sortOrder"`
}

type SectionInput struct {
	ID                *uuid.UUID  `json:"id,omitempty"`
	TemplateSectionID *uuid.UUID  `json:"templateSectionId,omitempty"`
	SectionKey        string      `json:"sectionKey"`
	Title             string      `json:"title"`
	Description       string      `json:"description"`
	Conclusion        string      `json:"conclusion"`
	SortOrder         int         `json:"sortOrder"`
	Items             []ItemInput `json:"items"`
}

func canRead(scope *entity.AccessScope, orgID uuid.UUID) bool {
	return scope != nil && scope.CanRead(orgID)
}

func canWrite(scope *entity.AccessScope, orgID uuid.UUID) bool {
	return scope != nil && scope.CanWrite(orgID)
}

func normalizeText(value string) string {
	return strings.TrimSpace(value)
}

func snapshotFromTemplate(template *entity.EvaluationTemplate) []entity.EvaluationSection {
	if template == nil || len(template.Sections) == 0 {
		return []entity.EvaluationSection{}
	}

	sections := make([]entity.EvaluationSection, 0, len(template.Sections))
	for _, templateSection := range template.Sections {
		templateSectionID := templateSection.ID
		section := entity.EvaluationSection{
			TemplateSectionID: &templateSectionID,
			SectionKey:        normalizeText(templateSection.SectionKey),
			Title:             normalizeText(templateSection.Title),
			Description:       normalizeText(templateSection.Description),
			SortOrder:         templateSection.SortOrder,
			Items:             make([]entity.EvaluationItem, 0, len(templateSection.Items)),
		}

		for _, templateItem := range templateSection.Items {
			templateItemID := templateItem.ID
			section.Items = append(section.Items, entity.EvaluationItem{
				TemplateItemID: &templateItemID,
				ItemKey:        normalizeText(templateItem.ItemKey),
				ItemNo:         normalizeText(templateItem.ItemNo),
				Label:          normalizeText(templateItem.Label),
				Answer:         entity.EvaluationAnswerUnset,
				Condition:      normalizeText(templateItem.DefaultCondition),
				Description:    normalizeText(templateItem.DefaultDescription),
				Analysis:       normalizeText(templateItem.DefaultAnalysis),
				SortOrder:      templateItem.SortOrder,
			})
		}
		sections = append(sections, section)
	}
	return sections
}

func sectionsFromInputs(inputs []SectionInput) ([]entity.EvaluationSection, error) {
	if len(inputs) == 0 {
		return []entity.EvaluationSection{}, nil
	}

	sections := make([]entity.EvaluationSection, 0, len(inputs))
	for _, input := range inputs {
		section, err := sectionFromInput(input)
		if err != nil {
			return nil, err
		}
		sections = append(sections, section)
	}
	return sections, nil
}

func sectionFromInput(input SectionInput) (entity.EvaluationSection, error) {
	section := entity.EvaluationSection{
		SectionKey:  normalizeText(input.SectionKey),
		Title:       normalizeText(input.Title),
		Description: normalizeText(input.Description),
		Conclusion:  normalizeText(input.Conclusion),
		SortOrder:   input.SortOrder,
	}
	if input.ID != nil {
		section.ID = *input.ID
	}
	if input.TemplateSectionID != nil {
		templateSectionID := *input.TemplateSectionID
		section.TemplateSectionID = &templateSectionID
	}

	if section.SectionKey == "" {
		return entity.EvaluationSection{}, fmt.Errorf("section key is required")
	}
	if section.Title == "" {
		return entity.EvaluationSection{}, fmt.Errorf("section title is required")
	}

	items, err := itemsFromInputs(input.Items)
	if err != nil {
		return entity.EvaluationSection{}, err
	}
	section.Items = items
	return section, nil
}

func itemsFromInputs(inputs []ItemInput) ([]entity.EvaluationItem, error) {
	if len(inputs) == 0 {
		return []entity.EvaluationItem{}, nil
	}

	items := make([]entity.EvaluationItem, 0, len(inputs))
	for _, input := range inputs {
		item, err := itemFromInput(input)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func itemFromInput(input ItemInput) (entity.EvaluationItem, error) {
	item := entity.EvaluationItem{
		ItemKey:     normalizeText(input.ItemKey),
		ItemNo:      normalizeText(input.ItemNo),
		Label:       normalizeText(input.Label),
		Condition:   normalizeText(input.Condition),
		Description: normalizeText(input.Description),
		Analysis:    normalizeText(input.Analysis),
		SortOrder:   input.SortOrder,
	}
	if input.ID != nil {
		item.ID = *input.ID
	}
	if input.TemplateItemID != nil {
		templateItemID := *input.TemplateItemID
		item.TemplateItemID = &templateItemID
	}

	switch strings.ToLower(strings.TrimSpace(input.Answer)) {
	case "", string(entity.EvaluationAnswerUnset):
		item.Answer = entity.EvaluationAnswerUnset
	case string(entity.EvaluationAnswerYes):
		item.Answer = entity.EvaluationAnswerYes
	case string(entity.EvaluationAnswerNo):
		item.Answer = entity.EvaluationAnswerNo
	default:
		return entity.EvaluationItem{}, fmt.Errorf("invalid evaluation answer")
	}

	if err := item.Validate(); err != nil {
		return entity.EvaluationItem{}, err
	}
	return item, nil
}

func cloneSections(sections []entity.EvaluationSection) []entity.EvaluationSection {
	if len(sections) == 0 {
		return []entity.EvaluationSection{}
	}

	cloned := make([]entity.EvaluationSection, len(sections))
	for i, section := range sections {
		cloned[i] = section
		if section.TemplateSectionID != nil {
			copyID := *section.TemplateSectionID
			cloned[i].TemplateSectionID = &copyID
		}
		if len(section.Items) > 0 {
			cloned[i].Items = make([]entity.EvaluationItem, len(section.Items))
			for j, item := range section.Items {
				cloned[i].Items[j] = item
				if item.TemplateItemID != nil {
					copyID := *item.TemplateItemID
					cloned[i].Items[j].TemplateItemID = &copyID
				}
			}
		}
	}
	return cloned
}

func validateEvaluationSections(sections []entity.EvaluationSection) error {
	if len(sections) == 0 {
		return fmt.Errorf("sections are required")
	}
	for _, section := range sections {
		if normalizeText(section.SectionKey) == "" {
			return fmt.Errorf("section key is required")
		}
		if normalizeText(section.Title) == "" {
			return fmt.Errorf("section title is required")
		}
		for _, item := range section.Items {
			if err := item.Validate(); err != nil {
				return err
			}
		}
	}
	return nil
}
