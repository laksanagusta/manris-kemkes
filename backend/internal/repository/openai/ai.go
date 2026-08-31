package openai

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/manris/backend/internal/domain/repository"
	"github.com/sashabaranov/go-openai"
)

type AIModelProvider interface {
	GetModelForFeature(feature string) string
}

// aiRepository implements AIRepository using OpenAI API
type aiRepository struct {
	client        *openai.Client
	riskRepo      repository.RiskRepository
	modelProvider AIModelProvider
}

// NewAIRepository creates a new OpenAI-based AI repository
func NewAIRepository(apiKey string, riskRepo repository.RiskRepository, modelProvider AIModelProvider) repository.AIRepository {
	client := openai.NewClient(apiKey)
	return &aiRepository{
		client:        client,
		riskRepo:      riskRepo,
		modelProvider: modelProvider,
	}
}

// GenerateFishbone generates root cause analysis using fishbone diagram
func (r *aiRepository) GenerateFishbone(ctx context.Context, req entity.AIRequest, orgContext string) (*entity.FishboneAnalysis, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	// Validate input
	if err := req.Validate(); err != nil {
		return nil, err
	}

	// Build prompt
	prompt := r.buildFishbonePrompt(req.Title, req.Description)

	// Call OpenAI API
	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko profesional. Anda hanya merespons menggunakan JSON yang tersusun rapi dan valid.", "cause", orgContext)
	if err != nil {
		return nil, err
	}

	// Parse response
	var analysis entity.FishboneAnalysis
	if err := json.Unmarshal([]byte(content), &analysis); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	return &analysis, nil
}

// GenerateImpact generates impact description for a risk
func (r *aiRepository) GenerateImpact(ctx context.Context, req entity.AIRequest, orgContext string) (string, error) {
	if r.client == nil {
		return "", fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	prompt := r.buildImpactPrompt(req.Title, req.Description)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko andal. Berikan respon sesuai instruksi secara langsung tanpa basa-basi.", "impact", orgContext)
	if err != nil {
		return "", err
	}

	return content, nil
}

// GenerateMitigation generates mitigation action recommendations
func (r *aiRepository) GenerateMitigation(ctx context.Context, req entity.AIRequest, orgContext string) (entity.MitigationAction, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	prompt := r.buildMitigationPrompt(req.Title, req.Description, req.Cause, req.Impact)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah pakar manajemen resiko. Anda hanya merespons menggunakan JSON array yang berisi 5 (lima) baris aksi mitigasi.", "mitigation", orgContext)
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var actions entity.MitigationAction
	if err := json.Unmarshal([]byte(content), &actions); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	return actions, nil
}

// GenerateMeetingMinutes generates structured meeting minutes from transcript
func (r *aiRepository) GenerateMeetingMinutes(ctx context.Context, transcript string, orgContext string) (*entity.MeetingMinutes, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	prompt := r.buildMinutesPrompt(transcript)

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah notulis profesional. Hanya merespons menggunakan JSON yang tersusun rapi.", "minutes", orgContext)
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var minutes entity.MeetingMinutes
	if err := json.Unmarshal([]byte(content), &minutes); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	return &minutes, nil
}

// AnalyzeTranscript analyzes meeting transcript and extracts risk suggestions
func (r *aiRepository) AnalyzeTranscript(ctx context.Context, transcript string, orgContext string) (*entity.TranscriptAnalysis, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	existingRisks, err := r.riskRepo.List(ctx, nil, "", "")
	if err != nil {
		existingRisks = []*entity.Risk{}
	}

	type riskCandidate struct {
		ID     string `json:"id"`
		Code   string `json:"code"`
		Title  string `json:"title"`
		Status string `json:"status"`
	}

	candidates := make([]riskCandidate, 0, len(existingRisks))
	for _, risk := range existingRisks {
		candidates = append(candidates, riskCandidate{
			ID:     risk.ID.String(),
			Code:   risk.Code,
			Title:  risk.Title,
			Status: risk.Status,
		})
	}

	existingRisksJSON, _ := json.Marshal(candidates)
	prompt := r.buildTranscriptPrompt(transcript, string(existingRisksJSON))

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko. Hanya merespons menggunakan JSON valid tanpa markdown.", "transcript", orgContext)
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var analysis entity.TranscriptAnalysis
	if err := json.Unmarshal([]byte(content), &analysis); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	return &analysis, nil
}

// GeneratePredictive generates predictive risk scoring based on historical data
func (r *aiRepository) GeneratePredictive(ctx context.Context, risks []entity.Risk, orgContext string) ([]entity.PredictiveRisk, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	// Limit to top 10 risks
	limit := 10
	if len(risks) < limit {
		limit = len(risks)
	}

	if limit == 0 {
		return []entity.PredictiveRisk{}, nil
	}

	prompt := r.buildPredictivePrompt(risks[:limit])

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis resiko AI. Hanya balas dengan valid array of JSON objects.", "predictive", orgContext)
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var predictions []entity.PredictiveRisk
	if err := json.Unmarshal([]byte(content), &predictions); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	return predictions, nil
}

// GenerateRiskSuggestions generates unique risk suggestions different from existing ones
func (r *aiRepository) GenerateRiskSuggestions(ctx context.Context, orgContext string) (*entity.RiskSuggestions, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	// Fetch existing risks
	existingRisks, err := r.riskRepo.List(ctx, nil, "", "")
	if err != nil {
		// Continue even if we can't fetch existing risks
		existingRisks = []*entity.Risk{}
	}

	// Build list of existing titles
	existingTitles := make(map[string]bool)
	for _, risk := range existingRisks {
		existingTitles[strings.ToLower(strings.TrimSpace(risk.Title))] = true
	}

	// Create array of existing titles
	existingTitlesList := make([]string, 0, len(existingTitles))
	for title := range existingTitles {
		existingTitlesList = append(existingTitlesList, title)
	}

	existingTitlesJSON, _ := json.Marshal(existingTitlesList)

	// Build prompt
	prompt := r.buildRiskSuggestionPrompt(string(existingTitlesJSON))

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis risiko profesional di sektor kesehatan pemerintahan. Anda hanya merespons menggunakan JSON yang valid.", "risk-suggestion", orgContext)
	if err != nil {
		return nil, err
	}

	// Clean markdown
	content = cleanMarkdown(content)

	// Parse response
	var suggestions entity.RiskSuggestions
	if err := json.Unmarshal([]byte(content), &suggestions); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	return &suggestions, nil
}

// GenerateIncidentBatchExtraction extracts one or more incident candidates from a PDF-derived text document.
func (r *aiRepository) GenerateIncidentBatchExtraction(ctx context.Context, req entity.IncidentExtractionRequest, orgContext string) (*entity.IncidentBatchExtraction, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	riskCandidatesJSON, err := r.buildIncidentRiskCandidatesJSON(ctx, req.OrganizationID)
	if err != nil {
		return nil, err
	}
	prompt := r.buildIncidentBatchExtractionPrompt(req.DocumentText, string(riskCandidatesJSON))

	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis insiden dan risiko di sektor kesehatan pemerintahan. Kembalikan JSON valid saja, tanpa markdown.", "incident", orgContext)
	if err != nil {
		return nil, err
	}

	content = cleanMarkdown(content)

	var extraction entity.IncidentBatchExtraction
	if err := json.Unmarshal([]byte(content), &extraction); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	extraction.SourcePreview = truncateText(strings.TrimSpace(req.DocumentText), 1200)
	return &extraction, nil
}

// GenerateManualIncidentRiskSuggestions suggests related risks for a manual incident form input.
func (r *aiRepository) GenerateManualIncidentRiskSuggestions(ctx context.Context, req entity.ManualIncidentRiskSuggestionRequest, orgContext string) ([]entity.IncidentRiskSuggestion, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	riskCandidatesJSON, err := r.buildIncidentRiskCandidatesJSON(ctx, req.OrganizationID)
	if err != nil {
		return nil, err
	}

	prompt := r.buildManualIncidentRiskSuggestionPrompt(req, string(riskCandidatesJSON))
	content, err := r.callOpenAI(ctx, prompt, "Anda adalah analis insiden dan risiko di sektor kesehatan pemerintahan. Kembalikan JSON valid saja, tanpa markdown.", "incident", orgContext)
	if err != nil {
		return nil, err
	}

	content = cleanMarkdown(content)

	var envelope struct {
		Suggestions []entity.IncidentRiskSuggestion `json:"suggestions"`
	}
	if err := json.Unmarshal([]byte(content), &envelope); err == nil {
		return envelope.Suggestions, nil
	}

	var suggestions []entity.IncidentRiskSuggestion
	if err := json.Unmarshal([]byte(content), &suggestions); err != nil {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	return suggestions, nil
}

// Helper methods

func (r *aiRepository) callOpenAI(ctx context.Context, prompt string, systemMessage string, feature string, orgContext string) (string, error) {
	if orgContext != "" {
		systemMessage = "Konteks Piagam MR:\n" + orgContext + "\n\n" + systemMessage
	}

	model := "gpt-4o-mini"
	if r.modelProvider != nil {
		model = r.modelProvider.GetModelForFeature(feature)
	}

	log.Println(model)
	resp, err := r.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: model,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: systemMessage,
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
		},
	)
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("OpenAI tidak mengembalikan pilihan")
	}

	return resp.Choices[0].Message.Content, nil
}

func (r *aiRepository) callOpenAIJSON(ctx context.Context, prompt string, systemMessage string, feature string, orgContext string, maxTokens int) (string, error) {
	if orgContext != "" {
		systemMessage = "Konteks Piagam MR:\n" + orgContext + "\n\n" + systemMessage
	}

	model := "gpt-4o-mini"
	if r.modelProvider != nil {
		model = r.modelProvider.GetModelForFeature(feature)
	}

	log.Println(model)
	resp, err := r.client.CreateChatCompletion(
		ctx,
		openai.ChatCompletionRequest{
			Model: model,
			Messages: []openai.ChatCompletionMessage{
				{
					Role:    openai.ChatMessageRoleSystem,
					Content: systemMessage,
				},
				{
					Role:    openai.ChatMessageRoleUser,
					Content: prompt,
				},
			},
			MaxCompletionTokens: maxTokens,
			ResponseFormat: &openai.ChatCompletionResponseFormat{
				Type: openai.ChatCompletionResponseFormatTypeJSONObject,
			},
		},
	)
	if err != nil {
		return "", err
	}

	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("OpenAI tidak mengembalikan pilihan")
	}

	choice := resp.Choices[0]
	content := strings.TrimSpace(choice.Message.Content)
	log.Printf("OpenAI JSON feature=%s finish_reason=%s content_length=%d", feature, choice.FinishReason, len(content))

	if choice.FinishReason == openai.FinishReasonLength {
		return "", fmt.Errorf("respons OpenAI terpotong sebelum JSON selesai")
	}
	if choice.FinishReason == openai.FinishReasonContentFilter {
		return "", fmt.Errorf("respons OpenAI diblokir oleh filter konten")
	}
	if content == "" {
		return "", fmt.Errorf("OpenAI mengembalikan respons JSON kosong")
	}

	return content, nil
}

func cleanMarkdown(content string) string {
	content = strings.TrimPrefix(content, "```json\n")
	content = strings.TrimPrefix(content, "```json")
	content = strings.TrimPrefix(content, "```\n")
	content = strings.TrimPrefix(content, "```")
	content = strings.TrimSuffix(content, "\n```")
	content = strings.TrimSuffix(content, "```")
	return content
}

func (r *aiRepository) buildFishbonePrompt(title, description string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional di Kementerian Kesehatan, buatkan penjabaran akar masalah (Fishbone Diagram) untuk profil risiko di bawah ini.
Judul Risiko: %s
Deskripsi Risiko: %s

Gambarkan akar masalah dalam 5 kategori standar Ishikawa yaitu "manusia", "metode", "mesin", "material", dan "lingkungan".
Setiap kategori minimal 1 dan maksimal 3 penyebab spesifik (dalam Bahasa Indonesia format kalimat pendek).
Kembalikan respon hanya dalam bentuk JSON murni (pastikan valid) tanpa markdown atau backticks 'json' di awal/akhir dengan format berikut:
{
  "categories": {
    "manusia": ["Penyebab 1", "Penyebab 2"],
    "metode": ["Penyebab 1"],
    "mesin": [],
    "material": [],
    "lingkungan": []
  }
}
Pastikan hanya mengembalikan JSON tersebut dan jangan sertakan teks pembuka atau penutup apapun.`, title, description)
}

func (r *aiRepository) buildImpactPrompt(title, description string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional di pemerintahan / kesehatan, buatkan deskripsi dampak (impact) terukur dari profil risiko di bawah ini jika benar-benar terjadi.
Judul Risiko: %s
Deskripsi Risiko: %s

Sebutkan 3 - 4 kerugian konkrit (bisa berupa poin-poin). Usahakan dampaknya relevan dengan sektor kesehatan / instansi publik.
Kembalikan dalam bentuk teks biasa (plain text format) berupa list berurutan dengan menggunakan angka (1., 2., dst.).
Jangan sertakan teks pembuka maupun penutup, langsung berikan list dampaknya saja.`, title, description)
}

func (r *aiRepository) buildMitigationPrompt(title, description, cause, impact string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional, buatkan usulan tindakan mitigasi (treatment option) yang praktis, realistis, dan efektif untuk profil risiko berikut.
Judul Risiko: %s
Deskripsi Risiko: %s
Penyebab: %s
Dampak: %s

Berikan tepat 5 rekomendasi konkrit (dalam Bahasa Indonesia format kalimat aktif).
Kembalikan respon DALAM BENTUK JSON array of strings, contoh:
[
  "Menyusun SOP baru...",
  "Melakukan inspeksi rutin...",
  "Mengadakan pelatihan..."
]
Jangan sertakan teks penjelasan apapun selain JSON tersebut.`, title, description, cause, impact)
}

func (r *aiRepository) buildMinutesPrompt(transcript string) string {
	return fmt.Sprintf(`Sebagai asisten notulis ahli di pemerintahan, buatkan struktur Notulensi Rapat (Minutes of Meeting) berdasarkan transkrip berikut:
Transkrip: %s

Kembalikan respon HANYA dalam bentuk JSON yang sesuai dengan struktur berikut, tanpa awalan/akhiran apapun:
{
  "title": "...",
  "date": "YYYY-MM-DD",
  "participants": ["..."],
  "agenda": ["..."],
  "summary": "...",
  "keyPoints": ["..."],
  "decisions": ["..."],
  "openIssues": ["..."],
  "actionItems": [
    {
      "task": "...",
      "pic": "...",
      "ownerUnit": "...",
      "deadline": "YYYY-MM-DD",
      "priority": "High|Medium|Low",
      "status": "open|on_track|blocked",
      "notes": "...",
      "relatedDecision": "...",
      "needsConfirmation": ["pic"]
    }
  ],
  "nextCheckIn": "YYYY-MM-DD"
}

Aturan penting:
- Fokuskan notulen sebagai alat tindak lanjut operasional.
- Isi keyPoints dengan 3-7 bullet poin pembahasan penting rapat, bukan kutipan mentah.
- Jangan membuat action item jika tugas konkretnya tidak jelas.
- Jika PIC tidak disebut, isi string kosong dan tambahkan "pic" ke needsConfirmation.
- Jika deadline tidak disebut, isi string kosong dan tambahkan "deadline" ke needsConfirmation.
- Jika priority tidak jelas, gunakan "Medium".
- Jika status tidak jelas, gunakan "open".
- Jika tidak ada keputusan eksplisit, biarkan decisions kosong.
- Jika tidak ada isu terbuka, biarkan openIssues kosong.
- Jangan menambahkan teks penjelasan di luar JSON.
}`, transcript)
}

func (r *aiRepository) buildTranscriptPrompt(transcript, existingRisksJSON string) string {
	return fmt.Sprintf(`Tugas Anda adalah meninjau transkrip rapat dan menghasilkan rekomendasi perubahan risiko yang siap dipakai untuk review operasional.

Daftar risiko existing aktif saat ini:
%s

Transkrip:
%s

Kembalikan respon HANYA dalam bentuk JSON object berikut:
{
  "suggestions": [
    {
      "id": "grp-1",
      "targetType": "existing|new",
      "targetRiskId": "uuid",
      "targetRiskCode": "R-001",
      "targetRiskTitle": "Judul risiko existing",
      "matchConfidence": 88,
      "candidateRisks": [
        {
          "id": "uuid",
          "code": "R-001",
          "title": "Judul risiko"
        }
      ],
      "quote": "Kutipan pendukung dari transkrip",
      "reasoning": "Alasan kenapa pembahasan ini dianggap existing atau new",
      "changes": [
        {
          "id": "chg-1",
          "field": "description|cause|impactDesc|existingControl|treatmentOption|mitigations|probability|impact",
          "operation": "set|append",
          "label": "Ringkasan perubahan",
          "value": "... atau object/array sesuai field",
          "reasoning": "Alasan perubahan",
          "quote": "Kutipan pendukung"
        }
      ],
      "draftPrefill": {
        "title": "...",
        "description": "...",
        "source": "Internal|Eksternal",
        "probability": 3,
        "impact": 4,
        "mitigation": "...",
        "treatmentOption": "avoid|mitigate|transfer|accept"
      }
    }
  ]
}

Aturan penting:
- Jika pembahasan jelas merujuk ke satu risiko existing, gunakan "targetType": "existing".
- Jika pembahasan belum cocok dengan risiko existing manapun, gunakan "targetType": "new".
- Kelompokkan beberapa perubahan yang membahas risiko existing yang sama menjadi satu suggestion group.
- Hanya gunakan targetRiskId/Code/Title dari daftar risiko existing yang diberikan.
- Jika confidence pencocokan rendah, tetap beri target existing terbaik dan isi candidateRisks dengan 1-3 alternatif dari daftar yang diberikan.
- Untuk field scalar seperti description, existingControl, treatmentOption, probability, dan impact gunakan operasi "set".
- Untuk field daftar seperti cause, impactDesc, dan mitigations gunakan operasi "append".
- Jangan sarankan operasi delete atau menghapus data existing.
- Untuk mitigations, value harus berupa object misalnya:
  {
    "action": "Audit laporan",
    "owner": "",
    "dueDate": null,
    "frequency": "insidental"
  }
- Untuk risk baru, isi draftPrefill dan boleh kosongkan changes.
- Untuk risk existing, isi changes dan boleh kosongkan draftPrefill.
- Jangan menambahkan teks apa pun di luar JSON.`, existingRisksJSON, transcript)
}

func (r *aiRepository) buildPredictivePrompt(risks []entity.Risk) string {
	riskSummary := ""
	for _, r := range risks {
		score := float64(r.Probability) * float64(r.Impact) * r.Weight
		lvl := "Sangat Rendah"
		if score >= 20 {
			lvl = "Sangat Tinggi"
		} else if score >= 15 {
			lvl = "Tinggi"
		} else if score >= 10 {
			lvl = "Sedang"
		} else if score >= 5 {
			lvl = "Rendah"
		}
		riskSummary += fmt.Sprintf("ID: %s | Title: %s | Level: %s\n", r.Code, r.Title, lvl)
	}

	return fmt.Sprintf(`Sebagai AI Predictive Risk, berikan prediksi tren risiko (naik, turun, stabil) secara analitis dari daftar risiko berikut:
%s

Kembalikan HANYA array of JSON dengan struktur persis seperti ini:
[
  {
    "riskCode": "...",
    "title": "...",
    "currentLevel": "Sangat Rendah|Rendah|Sedang|Tinggi|Sangat Tinggi",
    "predictedLevel": "Sangat Rendah|Rendah|Sedang|Tinggi|Sangat Tinggi",
    "trend": "up|down|stable",
    "confidence": 85,
    "reasoning": "..."
  }
]`, riskSummary)
}

func (r *aiRepository) buildRiskSuggestionPrompt(existingTitlesJSON string) string {
	return fmt.Sprintf(`Sebagai analis risiko profesional di Kementerian Kesehatan Indonesia, buatkan 5 contoh risiko yang BERBEDA dan UNIK untuk organisasi kesehatan pemerintah.

Konteks utama untuk penyusunan risiko adalah Piagam MR aktif yang sudah diberikan pada pesan sistem. Gunakan istilah, mandat, ruang lingkup, proses, layanan, dan kondisi operasional yang muncul dari Piagam MR tersebut.

Risiko yang SUDAH ADA di database (HINDARI risiko-risiko ini atau variasi yang mirip):
%s

Tugas:
1. Buat 5 risiko baru yang BERBEDA dari daftar di atas
2. Jadikan sekitar 80%% isi risiko bersifat teknis dan spesifik terhadap konteks Piagam MR, dan sekitar 20%% menjelaskan dampak operasional atau non-teknis yang mudah dipahami
3. Setiap risiko harus spesifik, realistis, dan relevan dengan mandat, layanan, atau proses yang tertulis atau tersirat dari Piagam MR
4. Berikan judul risiko yang jelas, tajam, dan menggunakan istilah teknis yang sesuai konteks unit
5. Hindari judul dan deskripsi yang terlalu generik seperti "kurang koordinasi" atau "keterlambatan proses" tanpa menyebut proses/layanan/mandat spesifik yang terdampak
6. Pastikan judul risiko unik dan tidak mirip dengan yang sudah ada
7. Untuk setiap risiko, tentukan "category" yang paling tepat. Gunakan salah satu nilai ini: "kebijakan", "reputasi", "fraud_korupsi", "legal", "kepatuhan", "operasional".

Format respons JSON (hanya JSON, tanpa markdown):
{
  "suggestions": [
    {
      "title": "Judul Risiko Spesifik",
      "description": "Deskripsi kronologi kejadian risiko yang detail...",
      "category": "operasional"
    },
    ...
  ]
}

PENTING:
- urutkan ke risiko yang paling berbahaya
- utamakan risiko yang prioritas nasional pemerintah Indonesia
- Judul harus berbeda dari daftar yang sudah ada
- Jangan buat variasi kecil dari risiko yang sudah ada
- Berikan konteks yang spesifik dan realistis
- Gunakan istilah teknis yang sesuai dengan konteks Piagam MR, bukan bahasa generik`, existingTitlesJSON)
}

func (r *aiRepository) buildIncidentBatchExtractionPrompt(documentText, riskCandidatesJSON string) string {
	return fmt.Sprintf(`Tugas Anda adalah membaca narasi dokumen insiden dan memecahnya menjadi beberapa kandidat insiden yang berbeda.

Aturan penting:
1. Hanya ekstrak fakta yang eksplisit tertulis di dokumen.
2. Jika satu informasi tidak tersedia, biarkan string kosong atau nilai null untuk tanggal.
3. Pisahkan item hanya jika memang ada insiden berbeda. Jangan memecah satu insiden menjadi beberapa item.
4. severity hanya boleh salah satu: "insignificant", "minor", "major", "critical".
5. riskSuggestions hanya boleh memilih dari daftar risiko existing yang diberikan.
6. Untuk setiap risk suggestion, isi reason singkat dan confidence 0-100.
7. Jika dokumen ambigu, tambahkan warning di level item atau documentWarnings.

Daftar risiko existing:
%s

Dokumen:
%s

Kembalikan HANYA JSON valid dengan struktur persis:
{
  "items": [
    {
      "clientKey": "string-unik",
      "incident": {
        "title": "",
        "what": "",
        "who": "",
        "when": "2026-03-30T10:00:00Z",
        "where": "",
        "whyHow": "",
        "severity": "minor",
        "correctiveAction": "",
        "preventiveAction": ""
      },
      "riskSuggestions": [
        {
          "riskId": "uuid-dari-daftar-risk-existing",
          "riskCode": "",
          "riskTitle": "",
          "reason": "",
          "confidence": 0
        }
      ],
      "missingFields": ["who", "when"],
      "warnings": ["Tanggal tidak tertulis eksplisit"],
      "confidence": 0
    }
  ],
  "sourcePreview": "",
  "documentWarnings": []
}`, riskCandidatesJSON, documentText)
}

func (r *aiRepository) buildManualIncidentRiskSuggestionPrompt(req entity.ManualIncidentRiskSuggestionRequest, riskCandidatesJSON string) string {
	when := ""
	if req.When != nil {
		when = req.When.UTC().Format(time.RFC3339)
	}

	return fmt.Sprintf(`Tugas Anda adalah memilih risiko existing yang paling relevan atau paling terdampak oleh sebuah insiden yang sedang dilaporkan.

Aturan penting:
1. Hanya pilih dari daftar risiko existing yang diberikan.
2. Kembalikan maksimal 5 suggestion, urut dari yang paling relevan.
3. Jika tidak ada yang benar-benar relevan dengan data insiden secara keseluruhan, kembalikan array kosong.
4. confidence harus berupa angka 0-100.
5. reason harus singkat, spesifik, dan menjelaskan kaitan insiden dengan risiko.

Daftar risiko existing:
%s

Data insiden:
{
  "title": %q,
  "what": %q,
  "who": %q,
  "when": %q,
  "where": %q,
  "whyHow": %q,
  "severity": %q
}

Kembalikan HANYA JSON valid dengan struktur persis:
{
  "suggestions": [
    {
      "riskId": "uuid-dari-daftar-risk-existing",
      "riskCode": "",
      "riskTitle": "",
      "reason": "",
      "confidence": 0
    }
  ]
}

contoh: data insiden{
  "title": "Dugaan keracunan pangan massal pada pelaksanaan MBG di sekolah,
  "what": "Puluhan siswa dari beberapa sekolah mengalami mual, muntah, dan diare beberapa jam setelah mengonsumsi makanan dari program MBG. Investigasi awal menemukan indikasi masalah pada proses pengolahan makanan, menu tinggi gula/kalori pada beberapa hari sebelumnya, dan keterlambatan koordinasi respons dari unit teknis daerah.",
}

hasilnya dia akan berkaitan dengan risiko Potensi Kejadian Luar Biasa (KLB) Keracunan Pangan terkait Program Makan Bergizi Gratis (MBG) dan Obesitas belum dianggap penting sebagai faktor risiko penyakit degeneratif.`,
		riskCandidatesJSON,
		req.Title,
		req.What,
		req.Who,
		when,
		req.Where,
		req.WhyHow,
		req.Severity,
	)
}

func (r *aiRepository) buildIncidentRiskCandidatesJSON(ctx context.Context, organizationID *uuid.UUID) ([]byte, error) {
	var orgIDs []uuid.UUID
	if organizationID != nil {
		orgIDs = []uuid.UUID{*organizationID}
	}
	existingRisks, err := r.riskRepo.List(ctx, orgIDs, "", "")
	if err != nil {
		return nil, err
	}

	log.Println(existingRisks)

	type riskCandidate struct {
		ID    string `json:"id"`
		Code  string `json:"code"`
		Title string `json:"title"`
	}

	candidates := make([]riskCandidate, 0, len(existingRisks))
	for _, risk := range existingRisks {
		if strings.EqualFold(risk.Status, entity.RiskStatusDraft) {
			continue
		}
		candidates = append(candidates, riskCandidate{
			ID:    risk.ID.String(),
			Code:  risk.Code,
			Title: risk.Title,
		})
	}

	return json.Marshal(candidates)
}

func truncateText(value string, limit int) string {
	if len(value) <= limit {
		return value
	}
	return value[:limit]
}

func (r *aiRepository) AnalyzeDocument(ctx context.Context, req entity.DocumentAnalysisRequest, orgContext string) (*entity.DocumentIntelligenceResult, error) {
	if r.client == nil {
		return nil, fmt.Errorf("klien OpenAI belum dikonfigurasi")
	}

	prompt := r.buildDocumentIntelligencePrompt(req)
	content, err := r.callOpenAIJSON(ctx, prompt, "Anda adalah analis manajemen risiko sektor kesehatan pemerintahan. Kembalikan JSON valid saja tanpa markdown.", "document-intelligence", orgContext, 6000)
	if err != nil {
		return nil, err
	}

	content = cleanMarkdown(content)
	log.Printf("document-intelligence raw response length=%d", len(content))

	result, err := parseDocumentIntelligenceResult(req.Mode, content)
	if err != nil {
		log.Printf("document-intelligence parse error: %v; raw response=%q", err, content)
		return nil, err
	}

	result.Mode = req.Mode
	return result, nil
}

func parseDocumentIntelligenceResult(mode entity.DocumentAnalysisMode, content string) (*entity.DocumentIntelligenceResult, error) {
	content = strings.TrimSpace(cleanMarkdown(content))
	if content == "" {
		return nil, fmt.Errorf("gagal mengurai respons AI: respons kosong")
	}

	var envelope entity.DocumentIntelligenceResult
	if err := json.Unmarshal([]byte(content), &envelope); err == nil {
		if envelope.SOP != nil || envelope.Audit != nil || envelope.Strategic != nil || envelope.Mitigation != nil {
			envelope.Mode = mode
			return &envelope, nil
		}
	} else {
		return nil, fmt.Errorf("gagal mengurai respons AI: %w", err)
	}

	result := &entity.DocumentIntelligenceResult{Mode: mode}
	switch mode {
	case entity.DocumentModeSOPRiskUniverse:
		var sop entity.SOPRiskUniverseResult
		if err := json.Unmarshal([]byte(content), &sop); err != nil {
			return nil, fmt.Errorf("gagal mengurai respons AI SOP: %w", err)
		}
		result.SOP = &sop
	case entity.DocumentModeAuditFindingMapper:
		var audit entity.AuditFindingMapperResult
		if err := json.Unmarshal([]byte(content), &audit); err != nil {
			return nil, fmt.Errorf("gagal mengurai respons AI audit: %w", err)
		}
		result.Audit = &audit
	case entity.DocumentModeStrategicObjectiveRisk:
		var strategic entity.StrategicObjectiveRiskResult
		if err := json.Unmarshal([]byte(content), &strategic); err != nil {
			return nil, fmt.Errorf("gagal mengurai respons AI strategis: %w", err)
		}
		result.Strategic = &strategic
	case entity.DocumentModeMitigationReportMapper:
		var mitigation entity.MitigationReportMapperResult
		if err := json.Unmarshal([]byte(content), &mitigation); err != nil {
			return nil, fmt.Errorf("gagal mengurai respons AI mitigasi: %w", err)
		}
		result.Mitigation = &mitigation
	default:
		return nil, fmt.Errorf("gagal mengurai respons AI: mode dokumen tidak valid %q", mode)
	}

	return result, nil
}

func (r *aiRepository) buildDocumentIntelligencePrompt(req entity.DocumentAnalysisRequest) string {
	baseInstructions := `Aturan wajib:
- Balas JSON valid tanpa markdown.
- Jangan mengarang kutipan sumber. sourceRefs.quote harus potongan teks yang benar-benar ada di dokumen.
- confidence memakai angka 0 sampai 100.
- Jika data tidak ditemukan, isi string kosong atau array kosong.
- Gunakan bahasa Indonesia formal dan ringkas.`

	switch req.Mode {
	case entity.DocumentModeSOPRiskUniverse:
		return fmt.Sprintf(`Tugas Anda adalah membaca dokumen SOP, pedoman, atau alur proses bisnis dan menyusun universe risiko per tahapan proses.

Nama file: %s
Periode konteks: %s
Teks dokumen:
%s

Kembalikan HANYA JSON valid dengan struktur:
{
  "processStages": [
    {
      "clientKey": "stage-1",
      "stageName": "Nama tahap proses",
      "description": "Apa yang terjadi di tahap ini",
      "existingControl": "Kontrol yang disebutkan di dokumen",
      "controlGap": "Celah kontrol yang terlihat",
      "confidence": 0,
      "sourceRefs": [
        { "quote": "kutipan dokumen", "location": "Halaman 3" }
      ],
      "suggestedRisks": [
        {
          "clientKey": "risk-1",
          "title": "Judul risiko",
          "description": "Deskripsi risiko",
          "category": "operasional",
          "riskSource": "internal",
          "cause": ["..."],
          "impactDesc": ["..."],
          "existingControl": "",
          "controlGap": "",
          "probability": 3,
          "impact": 4,
          "treatmentOption": "mitigate",
          "mitigations": [
            { "action": "Aksi mitigasi", "owner": "", "dueDate": "", "frequency": "insidental" }
          ],
          "reasoning": "Alasan",
          "confidence": 0,
          "sourceRefs": [
            { "quote": "kutipan", "location": "Halaman 3" }
          ]
        }
      ]
    }
  ]
}

%s`, req.Filename, req.Period, req.DocumentText, baseInstructions)
	case entity.DocumentModeAuditFindingMapper:
		return fmt.Sprintf(`Tugas Anda adalah membaca dokumen audit/reviu/evaluasi lalu memetakan temuan menjadi risiko existing atau draft risiko baru.

Nama file: %s
Periode konteks: %s
Risiko existing:
%s

Teks dokumen:
%s

Kembalikan HANYA JSON valid dengan struktur:
{
  "findings": [
    {
      "clientKey": "finding-1",
      "findingTitle": "Judul temuan",
      "findingDescription": "Deskripsi temuan",
      "rootCause": "Akar masalah",
      "impact": "Dampak",
      "affectedArea": "Area terdampak",
      "mappingStatus": "map_to_existing|create_new_risk|needs_review",
      "existingRiskId": "",
      "existingRiskCode": "",
      "existingRiskTitle": "",
      "suggestedRisk": {
        "clientKey": "risk-1",
        "title": "Judul risiko baru",
        "description": "Deskripsi risiko baru",
        "category": "kepatuhan",
        "riskSource": "internal",
        "cause": ["..."],
        "impactDesc": ["..."],
        "existingControl": "",
        "controlGap": "",
        "probability": 3,
        "impact": 4,
        "treatmentOption": "mitigate",
        "mitigations": [],
        "reasoning": "Alasan",
        "confidence": 0,
        "sourceRefs": [
          { "quote": "kutipan", "location": "Halaman 5" }
        ]
      },
      "reasoning": "Alasan pemetaan",
      "confidence": 0,
      "sourceRefs": [
        { "quote": "kutipan dokumen", "location": "Halaman 5" }
      ]
    }
  ]
}

%s`, req.Filename, req.Period, req.ExistingRisksJSON, req.DocumentText, baseInstructions)
	case entity.DocumentModeStrategicObjectiveRisk:
		return fmt.Sprintf(`Tugas Anda adalah membaca dokumen strategis dan mengekstrak Sasaran, IKU, dan RO, lalu menyusun risiko yang terkait ke setiap IKU dan RO.

Nama file: %s
Periode konteks: %s
Sasaran existing:
%s

Teks dokumen:
%s

Kembalikan HANYA JSON valid dengan struktur:
{
  "objectives": [
    {
      "clientKey": "obj-1",
      "tujuan": "Tujuan organisasi",
      "sasaran": "Sasaran strategis",
      "period": "2026-H1",
      "unit": "Unit terkait",
      "confidence": 0,
      "sourceRefs": [
        { "quote": "kutipan dokumen", "location": "Halaman 2" }
      ],
      "ikus": [
        {
          "clientKey": "iku-1",
          "name": "Nama IKU",
          "target": "90%%",
          "program": "Program",
          "kegiatan": "Kegiatan",
          "roTitle": "RO",
          "processBusiness": "Proses bisnis",
          "confidence": 0,
          "sourceRefs": [
            { "quote": "kutipan dokumen", "location": "Halaman 2" }
          ],
          "suggestedRisks": [
            {
              "clientKey": "risk-1",
              "title": "Judul risiko",
              "description": "Risiko terhadap IKU ini",
              "category": "strategis",
              "riskSource": "internal",
              "cause": ["..."],
              "impactDesc": ["..."],
              "existingControl": "",
              "controlGap": "",
              "probability": 3,
              "impact": 4,
              "treatmentOption": "mitigate",
              "mitigations": [],
              "reasoning": "Alasan",
              "confidence": 0,
              "sourceRefs": [
                { "quote": "kutipan", "location": "Halaman 2" }
              ],
              "relatedObjectiveText": "Tujuan organisasi",
              "relatedIkuText": "Nama IKU"
            }
          ]
        }
      ]
    }
  ]
}

%s`, req.Filename, req.Period, req.ObjectivesJSON, req.DocumentText, baseInstructions)
	case entity.DocumentModeMitigationReportMapper:
		return fmt.Sprintf(`Tugas Anda adalah membaca dokumen laporan/bukti dan mencocokkannya dengan task mitigasi yang masih open.

Nama file: %s
Periode konteks: %s
Task mitigasi open:
%s

Teks dokumen:
%s

Kembalikan HANYA JSON valid dengan struktur:
{
  "taskMatches": [
    {
      "clientKey": "match-1",
      "taskId": "uuid-task",
      "riskCode": "R-001",
      "riskTitle": "Judul risiko",
      "mitigationAction": "Aksi mitigasi",
      "periodLabel": "2026-H1",
      "suggestedStatus": "done|on_track|blocked|pending",
      "progressPct": 100,
      "actualCost": 0,
      "reportNotes": "Ringkasan pelaporan yang bisa dipakai",
      "blocker": "",
      "reasoning": "Alasan pencocokan dokumen dengan task",
      "confidence": 0,
      "sourceRefs": [
        { "quote": "kutipan dokumen", "location": "Halaman 3" }
      ]
    }
  ]
}

Aturan tambahan:
- Hanya gunakan taskId dari daftar task open yang diberikan.
- Jangan isi evidenceUrl.
- Jika belum cukup bukti, gunakan suggestedStatus = "pending".

%s`, req.Filename, req.Period, req.OpenTasksJSON, req.DocumentText, baseInstructions)
	default:
		return fmt.Sprintf(`%s

Teks dokumen:
%s`, baseInstructions, req.DocumentText)
	}
}
