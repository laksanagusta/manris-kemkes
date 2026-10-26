package agenttools

import (
	"encoding/json"

	"github.com/manris/backend/internal/agent"
)

func object(properties map[string]any, required ...string) map[string]any {
	if required == nil {
		required = []string{}
	}
	return map[string]any{"type": "object", "properties": properties, "required": required, "additionalProperties": false}
}
func str() map[string]any { return map[string]any{"type": "string"} }
func num(min, max int) map[string]any {
	return map[string]any{"type": "integer", "minimum": min, "maximum": max}
}
func list(item any) map[string]any {
	return map[string]any{"type": "array", "items": item, "maxItems": 100}
}
func enum(values ...string) map[string]any { return map[string]any{"type": "string", "enum": values} }
func definition(name, description string, parameters any) agent.ToolDefinition {
	raw, _ := json.Marshal(parameters)
	return agent.ToolDefinition{Name: name, Description: description, Parameters: raw}
}

func riskFields() map[string]any {
	return map[string]any{
		"title": str(), "description": str(), "category": enum("operasional", "kebijakan", "kepatuhan", "fraud_korupsi", "reputasi", "legal"),
		"cause": list(str()), "riskSource": str(), "controllability": str(), "impactDesc": list(str()),
		"existingControl": str(), "controlEffectiveness": str(), "probability": num(1, 5), "impact": num(1, 5),
		"riskPriority": num(0, 5), "riskAppetite": str(), "treatmentOption": str(),
		"targetProbability": num(0, 5), "targetImpact": num(0, 5), "nextReviewDate": str(),
		"reviewScheduleText": str(), "assessmentCycle": str(), "reviewType": str(), "changeReason": str(), "reviewSummary": str(),
	}
}
func mitigationFields() map[string]any {
	return map[string]any{
		"action": str(), "owner": str(), "ownerUserId": str(), "dueDate": str(), "frequency": enum("rutin", "insidental"),
		"recurringInterval": str(), "reportDay": num(0, 6), "reportDate": num(1, 31), "executionScheduleText": str(),
		"targetCost": map[string]any{"type": "number", "minimum": 0}, "mitigationType": enum("reduce_probability", "reduce_impact", "reduce_both"),
		"activityStage": str(), "expectedOutput": str(), "quantitativeTarget": str(), "supportingUnit": str(),
		"resourcesRequired": str(), "contingencyPlan": str(), "potentialObstacle": str(),
		"isBreakthroughActivity": map[string]any{"type": "boolean"}, "isExistingControl": map[string]any{"type": "boolean"},
	}
}
func eventFields() map[string]any {
	return map[string]any{
		"description": str(), "occurredAt": str(), "impactTypes": list(str()), "otherImpactType": str(), "actualImpact": str(),
		"severity": enum("low", "medium", "high", "extreme"), "immediateResponse": str(),
		"postResponseCondition": enum("recovered", "controlled", "ongoing", "worsening", "unknown"),
		"location":              str(), "affectedParties": str(), "suspectedCause": str(), "disruptionDuration": str(),
		"extraordinaryReason": str(), "ongoingAction": str(), "evidenceUrl": str(),
		"financialLoss": map[string]any{"type": "number", "minimum": 0}, "financialLossKnown": map[string]any{"type": "boolean"},
		"riskIds": list(str()), "sourceDocumentName": str(), "sourceRefs": list(object(map[string]any{"quote": str(), "location": str()}, "quote")), "extractionKey": str(),
	}
}
func reportFields() map[string]any {
	return map[string]any{
		"notes":       map[string]any{"type": "string", "minLength": 10, "maxLength": 1000},
		"evidenceUrl": str(),
	}
}

func monitoringValueFields() map[string]any {
	fields := map[string]any{
		"title": str(), "description": str(), "category": enum("operasional", "kebijakan", "kepatuhan", "fraud_korupsi", "reputasi", "legal"),
		"cause": list(str()), "riskSource": str(), "controllability": str(), "impactDesc": list(str()),
		"existingControl": str(), "controlEffectiveness": str(), "treatmentOption": str(), "changeReason": str(),
	}
	mitigations := mitigationFields()
	mitigations["id"] = str()
	fields["mitigations"] = list(object(mitigations))
	return fields
}

func monitoringFields() map[string]any {
	return map[string]any{
		"observedProbability": num(1, 5), "observedImpact": num(1, 5), "conclusion": str(),
		"mitigationProgressSummary": str(), "mitigationCompletionPercent": num(0, 100),
		"values": object(monitoringValueFields()),
	}
}

func (t *Toolkit) Definitions(skills []string) []agent.ToolDefinition {
	loaded := map[string]bool{}
	for _, skill := range skills {
		loaded[skill] = true
	}
	defs := []agent.ToolDefinition{definition("lookup_pic", "Cari PIC aktif dalam organisasi terpilih. Gunakan ID yang dikembalikan; jangan mengarang identitas.", object(map[string]any{"organizationId": str(), "query": str(), "limit": num(1, 50)}))}
	if loaded["risks"] {
		defs = append(defs,
			definition("get_risk_charter_context", "Baca konteks bisnis piagam risiko aktif organisasi akun untuk tahun YYYY. Tahun berjalan sudah dimuat otomatis pada konteks aplikasi. Gunakan sebelum merumuskan draf untuk tahun berbeda atau bila perlu data terbaru. Tidak membaca piagam organisasi lain.", object(map[string]any{"year": str()})),
			definition("list_risks", "Cari daftar risiko operasional; data dipaginasi, total tersedia. Bawaan organisasi sendiri. Untuk populasi risiko tinggi periode gunakan list_high_risks.", object(map[string]any{"organizationId": str(), "query": str(), "status": enum("all", "draft", "final"), "lifecycle": enum("active", "archived", "all"), "category": str(), "cycle": str(), "page": num(1, 10000), "limit": num(1, 100)})),
			definition("list_high_risks", "Profil final menurut snapshot periode aplikasi, risiko tinggi/sangat tinggi (nilai dibulatkan >=15). Menghitung total dari populasi utuh, mengembalikan maksimal 100 baris per halaman.", object(map[string]any{"organizationId": str(), "cycle": str(), "page": num(1, 10000), "limit": num(1, 100)})),
			definition("get_risk", "Baca profil lengkap, rencana mitigasi, updatedAt, versi, status, dan organisasi risiko yang berwenang.", object(map[string]any{"id": str(), "organizationId": str()}, "id")),
		)
	}
	if loaded["mitigations"] {
		defs = append(defs,
			definition("list_mitigation_tasks", "Cari tugas mitigasi, PIC, tenggat dan progres. overdueOnly menghitung keterlambatan memakai tenggat dan tanggal Jakarta, termasuk tugas pending yang belum ditandai overdue.", object(map[string]any{"organizationId": str(), "query": str(), "riskId": str(), "ownerUserId": str(), "status": enum("pending", "overdue", "done", "not_reported", "skipped"), "period": str(), "overdueOnly": map[string]any{"type": "boolean"}, "page": num(1, 10000), "limit": num(1, 100)})),
			definition("get_mitigation_task", "Baca satu tugas dan updatedAt untuk usulan laporan. Rencana mitigasi ada pada get_risk.", object(map[string]any{"id": str(), "organizationId": str()}, "id")),
		)
	}
	if loaded["risks"] || loaded["mitigations"] {
		defs = append(defs, t.responseDefinitions()[0])
		defs = append(defs, definition("get_risk_monitoring", "Baca transaksi pemantauan kanonis memakai id, atau riskId dan cycle. Mengembalikan expectedUpdatedAt, risiko sumber, values dan ID rencana aktual untuk usulan patch_monitoring. Pemantauan final hanya dapat dibaca; finalisasi/tanda tangan tetap melalui halaman aplikasi.", object(map[string]any{"id": str(), "riskId": str(), "cycle": str(), "organizationId": str()})))
	}
	if loaded["incidents"] {
		defs = append(defs,
			definition("list_risk_events", "Cari kejadian immutable dan relasi risiko tersimpan. riskId membatasi relasi aktual, bukan kemiripan narasi.", object(map[string]any{"organizationId": str(), "riskId": str(), "page": num(1, 10000), "limit": num(1, 100)})),
			definition("get_risk_event", "Baca kejadian beserta relasi risiko yang berada dalam cakupan akses.", object(map[string]any{"id": str(), "organizationId": str()}, "id")),
		)
	}
	if loaded["reports"] {
		defs = append(defs, t.responseDefinitions()[1])
		defs = append(defs, definition("quarterly_report", "Muat laporan kuartalan resmi aplikasi dan ringkasan deterministik, metrik, tabel, grafik, snapshotHash, dan sumber. Default laporan kuartal selesai terakhir.", object(map[string]any{"organizationId": str(), "cycle": str(), "comparisonCycle": str()})))
		defs = append(defs, t.AnalysisDefinitions()...)
	}
	variants := []any{}
	for _, kind := range []string{"create_risk", "patch_risk", "add_mitigation", "patch_mitigation", "report_mitigation_task", "create_risk_event", "reassess_risk", "patch_monitoring", "link_risk_event"} {
		if ((kind == "create_risk" || kind == "patch_risk" || kind == "reassess_risk") && !loaded["risks"]) || ((kind == "add_mitigation" || kind == "patch_mitigation" || kind == "report_mitigation_task") && !loaded["mitigations"]) || (kind == "create_risk_event" && !loaded["incidents"]) {
			continue
		}
		if (kind == "patch_monitoring" && !loaded["risks"] && !loaded["mitigations"]) || (kind == "link_risk_event" && !loaded["incidents"]) {
			continue
		}
		fields := riskFields()
		required := []string{}
		switch kind {
		case "create_risk":
			fields["mitigations"] = list(object(mitigationFields(), "action", "owner"))
			required = []string{"title", "category", "probability", "impact"}
		case "add_mitigation":
			fields = mitigationFields()
			required = []string{"action", "owner"}
		case "patch_mitigation":
			fields = mitigationFields()
			fields["mitigationId"] = str()
			required = []string{"mitigationId"}
		case "report_mitigation_task":
			fields = reportFields()
			required = []string{"notes", "evidenceUrl"}
		case "create_risk_event":
			fields = eventFields()
			required = []string{"description", "occurredAt", "impactTypes", "severity"}
		case "reassess_risk":
			fields = map[string]any{"cycle": str()}
			required = []string{"cycle"}
		case "patch_monitoring":
			fields = monitoringFields()
		case "link_risk_event":
			fields = map[string]any{"riskIds": list(str())}
			required = []string{"riskIds"}
		}
		variants = append(variants, object(map[string]any{"id": str(), "kind": enum(kind), "targetId": str(), "title": str(), "reason": str(), "included": map[string]any{"type": "boolean"}, "after": object(fields, required...), "expectedUpdatedAt": str(), "organizationId": str()}, "kind", "title", "included", "after"))
	}
	if len(variants) > 0 {
		defs = append(defs, definition("propose_operations", "Siapkan paket untuk konfirmasi pengguna, tanpa menulis data bisnis. Target yang ada wajib targetId dan expectedUpdatedAt dari pembacaan terakhir. Risiko final: reassess_risk memulai pemantauan kanonis, lalu get_risk_monitoring dan patch_monitoring mengubah draf dengan konfirmasi baru. Persentase penyelesaian dihitung dari tugas bila tersedia; laporkan progres melalui report_mitigation_task. values digabung dengan draf tersimpan; daftar mitigations wajib mempertahankan seluruh ID rencana aktual, ID baru tidak boleh dikarang. link_risk_event hanya menambah relasi; isi kejadian tetap immutable. Finalisasi/tanda tangan tetap di aplikasi. Jangan mengarang nilai wajib.", object(map[string]any{"operations": map[string]any{"type": "array", "minItems": 1, "maxItems": maxOperations, "items": map[string]any{"oneOf": variants}}}, "operations")))
	}
	return defs
}
