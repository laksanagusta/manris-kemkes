package ai

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/manris/backend/internal/domain/entity"
)

func normalizedDocumentText(s string) string { return strings.Join(strings.Fields(s), " ") }

func normalizeRiskEventExtraction(result *entity.RiskEventExtractionResult, text string) {
	items := make([]entity.RiskEventExtractionItem, 0, len(result.Items))
	seen := map[string]int{}
	source := normalizedDocumentText(text)
	for _, item := range result.Items {
		item.Event.Description = strings.TrimSpace(item.Event.Description)
		if item.Event.Description == "" {
			continue
		}
		refs := make([]entity.DocumentSourceRef, 0)
		for _, ref := range normalizeSourceRefs(item.SourceRefs) {
			if strings.Contains(source, normalizedDocumentText(ref.Quote)) {
				refs = append(refs, ref)
			}
		}
		if len(refs) == 0 {
			continue
		}
		item.SourceRefs = refs
		item.Confidence = clampConfidence(item.Confidence)
		if _, err := time.Parse("2006-01-02", item.Event.OccurredAt); err != nil {
			item.Event.OccurredAt = ""
		}
		switch item.Event.Severity {
		case "low", "medium", "high", "extreme":
		default:
			item.Event.Severity = ""
		}
		switch item.Event.PostResponseCondition {
		case "recovered", "controlled", "ongoing", "worsening", "unknown":
		default:
			item.Event.PostResponseCondition = ""
		}
		types := make([]string, 0)
		for _, t := range item.Event.ImpactTypes {
			switch t {
			case "operational", "service", "financial", "health_safety", "reputation", "compliance", "other":
				types = append(types, t)
			}
		}
		item.Event.ImpactTypes = types
		if item.Event.FinancialLoss != nil && *item.Event.FinancialLoss < 0 {
			item.Event.FinancialLoss = nil
		}
		if item.Event.FinancialLossKnown != nil && *item.Event.FinancialLossKnown && item.Event.FinancialLoss == nil {
			item.Event.FinancialLossKnown = nil
		}
		item.MissingFields = []string{}
		for _, impactType := range types {
			if impactType == "financial" && item.Event.FinancialLossKnown == nil {
				item.MissingFields = append(item.MissingFields, "Status nilai kerugian")
			}
			if impactType == "other" && strings.TrimSpace(item.Event.OtherImpactType) == "" {
				item.MissingFields = append(item.MissingFields, "Jenis dampak lainnya")
			}
		}
		if item.Event.OccurredAt == "" {
			item.MissingFields = append(item.MissingFields, "Tanggal kejadian")
		}
		if len(types) == 0 {
			item.MissingFields = append(item.MissingFields, "Jenis dampak")
		}
		if item.Event.Severity == "" {
			item.MissingFields = append(item.MissingFields, "Tingkat kejadian")
		}
		if item.Event.ActualImpact == "" {
			item.MissingFields = append(item.MissingFields, "Dampak aktual")
		}
		if item.Event.ImmediateResponse == "" {
			item.MissingFields = append(item.MissingFields, "Penanganan langsung")
		}
		if item.Event.PostResponseCondition == "" {
			item.MissingFields = append(item.MissingFields, "Kondisi setelah penanganan")
		}
		payload, _ := json.Marshal(item.Event)
		key := fmt.Sprintf("%x", sha256.Sum256(append([]byte(source+"\n"), payload...)))
		item.ClientKey = key
		if index, ok := seen[key]; ok {
			items[index].SourceRefs = append(items[index].SourceRefs, refs...)
			continue
		}
		seen[key] = len(items)
		items = append(items, item)
	}
	result.Items = items
}
