package errors

import (
	"errors"
	"fmt"
)

type AppError struct {
	Code    string
	Message string
	Details any
	Err     error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %v", e.Message, e.Err)
	}
	return e.Message
}

func (e *AppError) Unwrap() error {
	return e.Err
}

var (
	ErrInvalidInput        = &AppError{Code: "INVALID_INPUT", Message: "input tidak valid"}
	ErrInvalidRequestType  = &AppError{Code: "INVALID_REQUEST_TYPE", Message: "tipe request harus 'risk', 'incident', atau 'assessment'"}
	ErrInvalidStatus       = &AppError{Code: "INVALID_STATUS", Message: "status tidak valid"}
	ErrInvalidApproverRole = &AppError{Code: "INVALID_APPROVER_ROLE", Message: "peran approver tidak valid"}
	ErrInvalidAction       = &AppError{Code: "INVALID_ACTION", Message: "aksi harus 'approve' atau 'reject'"}

	ErrNotFound         = &AppError{Code: "NOT_FOUND", Message: "sumber daya tidak ditemukan"}
	ErrApprovalNotFound = &AppError{Code: "APPROVAL_NOT_FOUND", Message: "permintaan persetujuan tidak ditemukan"}
	ErrRiskNotFound     = &AppError{Code: "RISK_NOT_FOUND", Message: "risiko tidak ditemukan"}
	ErrIncidentNotFound = &AppError{Code: "INCIDENT_NOT_FOUND", Message: "insiden tidak ditemukan"}

	ErrAlreadyPending         = &AppError{Code: "ALREADY_PENDING", Message: "sudah menunggu persetujuan"}
	ErrNotPending             = &AppError{Code: "NOT_PENDING", Message: "permintaan persetujuan tidak dalam status menunggu"}
	ErrUnauthorized           = &AppError{Code: "UNAUTHORIZED", Message: "akses tidak sah"}
	ErrForbidden              = &AppError{Code: "FORBIDDEN", Message: "izin tidak mencukupi"}
	ErrConflict               = &AppError{Code: "CONFLICT", Message: "konflik sumber daya"}
	ErrInvalidCredentials     = &AppError{Code: "INVALID_CREDENTIALS", Message: "username atau kata sandi tidak valid"}
	ErrAccountInactive        = &AppError{Code: "ACCOUNT_INACTIVE", Message: "akun tidak aktif"}
	ErrAccountPendingApproval = &AppError{Code: "ACCOUNT_PENDING_APPROVAL", Message: "akun sedang menunggu persetujuan superadmin"}
	ErrTokenGeneration        = &AppError{Code: "TOKEN_GENERATION", Message: "gagal menghasilkan token"}

	ErrDatabase = &AppError{Code: "DATABASE_ERROR", Message: "kesalahan basis data"}
	ErrInternal = &AppError{Code: "INTERNAL_ERROR", Message: "kesalahan server internal"}
)

func Wrap(err error, message string) error {
	if err == nil {
		return nil
	}
	return &AppError{
		Message: message,
		Err:     err,
	}
}

func newValidationError(code, message string) *AppError {
	return &AppError{Code: code, Message: message, Err: ErrInvalidInput}
}

func newStatusError(code, message string) *AppError {
	return &AppError{Code: code, Message: message, Err: ErrInvalidStatus}
}

func newNotFoundError(code, message string) *AppError {
	return &AppError{Code: code, Message: message, Err: ErrNotFound}
}

var (
	// ── Entity Validation ──
	ErrInvalidName                  = newValidationError("INVALID_NAME", "nama tidak boleh kosong")
	ErrInvalidEmail                 = newValidationError("INVALID_EMAIL", "format email tidak valid")
	ErrInvalidUsername              = newValidationError("INVALID_USERNAME", "username tidak boleh kosong")
	ErrInvalidPassword              = newValidationError("INVALID_PASSWORD", "kata sandi tidak boleh kosong")
	ErrInvalidRole                  = newValidationError("INVALID_ROLE", "peran tidak valid")
	ErrInvalidTitle                 = newValidationError("INVALID_TITLE", "judul tidak boleh kosong")
	ErrInvalidDescription           = newValidationError("INVALID_DESCRIPTION", "deskripsi tidak boleh kosong")
	ErrInvalidCode                  = newValidationError("INVALID_CODE", "kode tidak boleh kosong")
	ErrInvalidControlType           = newValidationError("INVALID_CONTROL_TYPE", "tipe kontrol tidak valid")
	ErrInvalidMetric                = newValidationError("INVALID_METRIC", "metrik tidak valid")
	ErrInvalidThreshold             = newValidationError("INVALID_THRESHOLD", "rentang ambang batas tidak valid")
	ErrInvalidProgress              = newValidationError("INVALID_PROGRESS", "persentase progres harus antara 0-100")
	ErrInvalidEvidenceURL           = newValidationError("INVALID_EVIDENCE_URL", "URL bukti harus berupa http(s) yang valid")
	ErrInvalidNotes                 = newValidationError("INVALID_NOTES", "catatan harus antara 10 dan 1000 karakter")
	ErrInvalidKRIValue              = newValidationError("INVALID_KRI_VALUE", "nilai KRI harus nol atau lebih besar")
	ErrSubmissionWindowClosed       = newValidationError("SUBMISSION_WINDOW_CLOSED", "laporan KRI hanya dapat dikirim antara H+1 dan H+3 setelah periode berakhir")
	ErrMitigationSubmissionTooEarly = newValidationError("MITIGATION_SUBMISSION_TOO_EARLY", "laporan progres hanya dapat dikirim mulai H+1 setelah periode berakhir")
	ErrInvalidSourceType            = newValidationError("INVALID_SOURCE_TYPE", "tipe sumber tidak valid")
	ErrInvalidSeverity              = newValidationError("INVALID_SEVERITY", "severitas tidak valid")
	ErrInvalidProbability           = newValidationError("INVALID_PROBABILITY", "probabilitas harus antara 1-5")
	ErrInvalidImpact                = newValidationError("INVALID_IMPACT", "dampak harus antara 1-5")
	ErrInvalidRiskCategory          = newValidationError("INVALID_RISK_CATEGORY", "kategori risiko tidak valid")
	ErrInvalidMitigationType        = newValidationError("INVALID_MITIGATION_TYPE", "tipe mitigasi tidak valid")
	ErrInvalidOwner                 = newValidationError("INVALID_OWNER", "pemilik tidak boleh kosong")
	ErrInvalidFileType              = newValidationError("INVALID_FILE_TYPE", "hanya file PDF yang didukung")
	ErrFileTooLarge                 = newValidationError("FILE_TOO_LARGE", "file melebihi ukuran maksimum yang diizinkan")
	ErrDocumentUnreadable           = newValidationError("DOCUMENT_UNREADABLE", "dokumen tidak dapat dibaca sebagai teks")

	// ── Not Found ──
	ErrOrganizationNotFound        = newNotFoundError("ORGANIZATION_NOT_FOUND", "organisasi tidak ditemukan")
	ErrParentOrganizationNotFound  = newNotFoundError("PARENT_ORGANIZATION_NOT_FOUND", "organisasi induk tidak ditemukan")
	ErrTargetOrganizationNotFound  = newNotFoundError("TARGET_ORGANIZATION_NOT_FOUND", "organisasi target tidak ditemukan")
	ErrLinkedRiskNotFound          = newNotFoundError("LINKED_RISK_NOT_FOUND", "risiko terkait tidak ditemukan")
	ErrRiskCascadeNotFound         = newNotFoundError("RISK_CASCADE_NOT_FOUND", "kaskade risiko tidak ditemukan")
	ErrPreviousRiskVersionNotFound = newNotFoundError("PREVIOUS_RISK_VERSION_NOT_FOUND", "versi risiko sebelumnya tidak ditemukan")
	ErrUploaderNotFound            = newNotFoundError("UPLOADER_NOT_FOUND", "pengunggah tidak ditemukan")
	ErrCreatorNotFound             = newNotFoundError("CREATOR_NOT_FOUND", "pembuat tidak ditemukan")
	ErrUserNotFound                = newNotFoundError("USER_NOT_FOUND", "pengguna tidak ditemukan")
	ErrROIDNotFound                = newNotFoundError("RO_ID_NOT_FOUND", "RO ID tidak ditemukan")

	// ── Risk Status / Cycle ──
	ErrOnlyApprovedCurrentMonitored    = newStatusError("RISK_NOT_MONITORABLE", "hanya risiko yang disetujui dan aktif yang dapat dipantau")
	ErrOnlyApprovedCurrentReassessed   = newStatusError("RISK_NOT_REASSESSABLE", "hanya risiko yang disetujui dan aktif yang dapat dinilai ulang")
	ErrOnlyApprovedCurrentArchived     = newStatusError("RISK_NOT_ARCHIVABLE", "hanya risiko yang disetujui dan aktif yang dapat diarsipkan")
	ErrOnlyActiveApprovedEscalated     = newStatusError("RISK_NOT_ESCALATABLE", "hanya risiko yang disetujui dan aktif yang dapat dieskalasi")
	ErrOnlyDraftRisksDeleted           = newStatusError("RISK_NOT_DELETABLE", "hanya risiko draft yang dapat dihapus")
	ErrCannotChangeStatusFromApproved  = newStatusError("RISK_STATUS_CHANGE_FORBIDDEN", "tidak dapat mengubah status dari disetujui kecuali ke draft")
	ErrRiskWithMonitoringDraftEscalate = newStatusError("RISK_MONITORING_DRAFT_ESCALATE", "risiko dengan draft pemantauan aktif tidak dapat dieskalasi")
	ErrRiskArchived                    = newStatusError("RISK_ALREADY_ARCHIVED", "risiko sudah diarsipkan")
	ErrRiskNotArchived                 = newStatusError("RISK_NOT_ARCHIVED", "risiko belum diarsipkan")
	ErrSourceRiskNoLongerActive        = newStatusError("SOURCE_RISK_NOT_ACTIVE", "risiko sumber sudah tidak aktif")

	// ── Cycle ──
	ErrCycleFormat             = newValidationError("RISK_CYCLE_FORMAT", "format assessment_cycle harus YYYY-HN (contoh: 2026-H1)")
	ErrSemesterFormat          = newValidationError("RISK_SEMESTER_FORMAT", "format assessment_cycle harus YYYY-HN (contoh: 2026-H1)")
	ErrAnyCycleFormat          = newValidationError("RISK_ANY_CYCLE_FORMAT", "format assessment_cycle harus YYYY-HN (contoh: 2026-H1)")
	ErrAssessmentCycleRequired = newValidationError("ASSESSMENT_CYCLE_REQUIRED", "siklus penilaian wajib diisi")
	ErrBackCycle               = newValidationError("MONITORING_BACK_CYCLE", "tidak dapat membuat pemantauan untuk semester lebih awal jika semester lebih baru sudah ada")

	// ── Monitoring ──
	ErrMonitoringNotDraft         = newStatusError("MONITORING_NOT_DRAFT", "hanya pemantauan draft yang dapat diperbarui")
	ErrMonitoringNotFinalizable   = newStatusError("MONITORING_NOT_FINALIZABLE", "hanya pemantauan draft yang dapat difinalisasi")
	ErrMonitoringAlreadyFinalized = newStatusError("MONITORING_ALREADY_FINALIZED", "pemantauan untuk siklus ini sudah difinalisasi")

	// ── Working Paper ──
	ErrWorkingPaperLocked = newValidationError("WORKING_PAPER_LOCKED", "versi risiko dikunci oleh kertas kerja yang sedang ditandatangani atau sudah selesai")

	// ── Organization ──
	ErrOrganizationRequired          = newValidationError("ORGANIZATION_REQUIRED", "organisasi wajib diisi")
	ErrOrganizationRequiredNonAdmin  = newValidationError("ORGANIZATION_REQUIRED_NON_ADMIN", "organisasi wajib diisi untuk pengguna non-superadmin")
	ErrOrganizationIDCannotChange    = newValidationError("ORGANIZATION_ID_CANNOT_CHANGE", "id organisasi tidak dapat diubah")
	ErrOrganizationCannotBeOwnParent = newValidationError("ORGANIZATION_CANNOT_BE_OWN_PARENT", "organisasi tidak dapat menjadi induknya sendiri")
	ErrOrganizationHasChildren       = newValidationError("ORGANIZATION_HAS_CHILDREN", "tidak dapat menghapus organisasi yang memiliki sub-organisasi")
	ErrCircularReference             = newValidationError("CIRCULAR_REFERENCE", "referensi melingkar: tidak dapat menetapkan turunan sebagai induk")
	ErrOwnerOrgIDRequired            = newValidationError("OWNER_ORG_ID_REQUIRED", "id organisasi pemilik wajib diisi")
	ErrOwnerOrgNotGroupMember        = newValidationError("OWNER_ORG_NOT_GROUP_MEMBER", "organisasi pemilik tidak boleh menjadi anggota grup")
	ErrMemberOrgIDRequired           = newValidationError("MEMBER_ORG_ID_REQUIRED", "id organisasi anggota wajib diisi")
	ErrMemberOrgMustBeDescendant     = newValidationError("MEMBER_ORG_MUST_BE_DESCENDANT", "organisasi anggota harus merupakan turunan pemilik")
	ErrReferencedOrgOrGroupNotFound  = newValidationError("REFERENCED_ORG_OR_GROUP_NOT_FOUND", "organisasi atau grup yang dirujuk tidak ditemukan")
	ErrOrgGroupNameAlreadyExists     = newValidationError("ORG_GROUP_NAME_ALREADY_EXISTS", "nama grup organisasi sudah ada untuk pemilik ini")

	// ── Auth / Registration ──
	ErrNIPRequired             = newValidationError("NIP_REQUIRED", "nip tidak boleh kosong")
	ErrNIPAlreadyExists        = newValidationError("NIP_ALREADY_EXISTS", "nip sudah ada")
	ErrEmailAlreadyExists      = newValidationError("EMAIL_ALREADY_EXISTS", "email sudah ada")
	ErrPasswordConfirmation    = newValidationError("PASSWORD_CONFIRMATION_MISMATCH", "konfirmasi kata sandi tidak cocok")
	ErrPhoneRequired           = newValidationError("PHONE_REQUIRED", "nomor telepon tidak boleh kosong")
	ErrCurrentPasswordRequired = newValidationError("CURRENT_PASSWORD_REQUIRED", "kata sandi saat ini wajib diisi untuk pengguna aktif")
	ErrNewPasswordRequired     = newValidationError("NEW_PASSWORD_REQUIRED", "kata sandi baru dan konfirmasi kata sandi wajib diisi")
	ErrCreatedByRequired       = newValidationError("CREATED_BY_REQUIRED", "pembuat wajib diisi")

	// ── Risk Attributes ──
	ErrTitleRequired               = newValidationError("TITLE_REQUIRED", "judul wajib diisi")
	ErrStatusRequired              = newValidationError("STATUS_REQUIRED", "status wajib diisi")
	ErrModeRequired                = newValidationError("MODE_REQUIRED", "mode wajib diisi")
	ErrControllabilityInvalid      = newValidationError("CONTROLLABILITY_INVALID", "controllability harus C atau UC")
	ErrControlEffectivenessInvalid = newValidationError("CONTROL_EFFECTIVENESS_INVALID", "efektivitas kontrol harus Efektif atau Tidak Efektif")
	ErrRiskSourceInvalid           = newValidationError("RISK_SOURCE_INVALID", "sumber risiko harus Internal atau Eksternal")
	ErrTreatmentOptionInvalid      = newValidationError("TREATMENT_OPTION_INVALID", "opsi perlakuan harus Menghindari Risiko, Berbagi Risiko, Mitigasi, atau Menerima Risiko")
	ErrSourceRiskOrgRequired       = newValidationError("SOURCE_RISK_ORG_REQUIRED", "risiko sumber harus memiliki organisasi")
	ErrSourceRiskRequired          = newValidationError("SOURCE_RISK_REQUIRED", "risiko sumber wajib diisi")
	ErrMitigationRequired          = newValidationError("MITIGATION_REQUIRED", "rencana mitigasi wajib diisi")
	ErrMitigationOwnerRequired     = newValidationError("MITIGATION_OWNER_REQUIRED", "pemilik mitigasi wajib diisi")
	ErrArchiveReasonRequired       = newValidationError("ARCHIVE_REASON_REQUIRED", "alasan pengarsipan wajib diisi")
	ErrChangeReasonRequired        = newValidationError("CHANGE_REASON_REQUIRED", "alasan perubahan wajib diisi jika pemantauan mengubah substansi risiko")
	ErrMitigationValidationFailed  = newValidationError("MITIGATION_VALIDATION_FAILED", "validasi mitigasi gagal")
	ErrRiskUtamaMitigationRequired = newValidationError("RISK_UTAMA_MITIGATION_REQUIRED", "risiko utama dengan perlakuan mitigasi memerlukan minimal satu rencana mitigasi baru")

	// ── Profile Change Validation ──
	ErrInvalidTitleChange           = newValidationError("INVALID_TITLE_CHANGE", "perubahan judul tidak valid")
	ErrInvalidDescriptionChange     = newValidationError("INVALID_DESCRIPTION_CHANGE", "perubahan deskripsi tidak valid")
	ErrInvalidCategoryChange        = newValidationError("INVALID_CATEGORY_CHANGE", "perubahan kategori tidak valid")
	ErrInvalidCauseChange           = newValidationError("INVALID_CAUSE_CHANGE", "perubahan penyebab tidak valid")
	ErrInvalidImpactChange          = newValidationError("INVALID_IMPACT_CHANGE", "perubahan dampak tidak valid")
	ErrInvalidProbabilityChange     = newValidationError("INVALID_PROBABILITY_CHANGE", "perubahan probabilitas tidak valid")
	ErrInvalidMitigationChange      = newValidationError("INVALID_MITIGATION_CHANGE", "perubahan mitigasi tidak valid")
	ErrInvalidExistingControlChange = newValidationError("INVALID_EXISTING_CONTROL_CHANGE", "perubahan kontrol eksisting tidak valid")
	ErrInvalidTreatmentOptionChange = newValidationError("INVALID_TREATMENT_OPTION_CHANGE", "perubahan opsi perlakuan tidak valid")

	// ── TMPMR / Evaluation ──
	ErrTMPMRAssessmentExists       = newValidationError("TMPMR_ASSESSMENT_EXISTS", "penilaian TMPMR untuk organisasi dan periode ini sudah ada")
	ErrEvaluationExists            = newValidationError("EVALUATION_EXISTS", "evaluasi untuk organisasi dan periode ini sudah ada")
	ErrOnlyDraftTMPMRUpdated       = newStatusError("TMPMR_NOT_DRAFT", "hanya penilaian TMPMR draft yang dapat diperbarui")
	ErrOnlyDraftTMPMRSubmitted     = newStatusError("TMPMR_NOT_SUBMITTABLE", "hanya penilaian TMPMR draft yang dapat dikirim")
	ErrOnlySubmittedTMPMRReviewed  = newStatusError("TMPMR_NOT_REVIEWABLE", "hanya penilaian TMPMR yang sudah dikirim yang dapat ditinjau")
	ErrOnlyReviewedTMPMRApproved   = newStatusError("TMPMR_NOT_APPROVABLE", "hanya penilaian TMPMR yang sudah ditinjau yang dapat disetujui")
	ErrAllTMPMRItemsNeedScore      = newValidationError("TMPMR_ALL_ITEMS_NEED_SCORE", "semua item TMPMR harus memiliki skor sebelum dikirim")
	ErrOnlyDraftEvaluationUpdated  = newStatusError("EVALUATION_NOT_DRAFT", "hanya evaluasi draft yang dapat diperbarui")
	ErrOnlyFinalEvaluationReopened = newStatusError("EVALUATION_NOT_FINAL", "hanya evaluasi final yang dapat dibuka kembali")
	ErrEvaluationAlreadyFinal      = newStatusError("EVALUATION_ALREADY_FINAL", "evaluasi sudah final")

	// ── Risk Charter ──
	ErrRiskCharterExists = newValidationError("RISK_CHARTER_EXISTS", "piagam risiko untuk organisasi, periode, dan level UPR ini sudah ada")
	ErrUPRLevelInvalid   = newValidationError("UPR_LEVEL_INVALID", "level UPR harus kementerian, upr_t1, atau upr_t2")

	// ── Cascade ──
	ErrCascadeNotDecidable        = newStatusError("CASCADE_NOT_DECIDABLE", "kaskade tidak dalam status yang dapat diputuskan")
	ErrCascadeDecisionInvalid     = newValidationError("CASCADE_DECISION_INVALID", "keputusan harus accept atau reject")
	ErrOnlyProposedCascadeDeleted = newStatusError("CASCADE_NOT_DELETABLE", "hanya kaskade yang diusulkan yang dapat dihapus")
	ErrAdoptionTypeInvalid        = newValidationError("ADOPTION_TYPE_INVALID", "tipe adopsi harus full atau partial")

	// ── File / PDF ──
	ErrOnlyPDFAndXLSX                = newValidationError("ONLY_PDF_AND_XLSX", "hanya file PDF dan XLSX yang didukung")
	ErrRiskPDFExportNotAvailable     = newValidationError("RISK_PDF_EXPORT_NOT_AVAILABLE", "ekspor PDF risiko hanya tersedia untuk risiko yang sudah difinalisasi")
	ErrRiskPDFDepsNotConfigured      = &AppError{Code: "RISK_PDF_DEPS_NOT_CONFIGURED", Message: "dependensi ekspor PDF risiko belum dikonfigurasi", Err: ErrInternal}
	ErrEvalPDFDepsNotConfigured      = &AppError{Code: "EVAL_PDF_DEPS_NOT_CONFIGURED", Message: "dependensi ekspor PDF evaluasi belum dikonfigurasi", Err: ErrInternal}
	ErrFormalReportDepsNotConfigured = &AppError{Code: "FORMAL_REPORT_DEPS_NOT_CONFIGURED", Message: "dependensi unduh laporan formal belum dikonfigurasi", Err: ErrInternal}
	ErrRiskPDFEmpty                  = &AppError{Code: "RISK_PDF_EMPTY", Message: "render PDF risiko menghasilkan file kosong", Err: ErrInternal}
	ErrEvalPDFEmpty                  = &AppError{Code: "EVAL_PDF_EMPTY", Message: "render PDF evaluasi menghasilkan file kosong", Err: ErrInternal}
	ErrFormalReportPDFEmpty          = &AppError{Code: "FORMAL_REPORT_PDF_EMPTY", Message: "render PDF laporan formal menghasilkan file kosong", Err: ErrInternal}

	// ── Misc ──
	ErrInvalidRiskCategoryDetail   = newValidationError("INVALID_RISK_CATEGORY_DETAIL", "kategori risiko tidak valid")
	ErrInvalidDocumentAnalysisMode = newValidationError("INVALID_DOCUMENT_ANALYSIS_MODE", "mode analisis dokumen tidak valid")
	ErrInvalidFormalReportType     = newValidationError("INVALID_FORMAL_REPORT_TYPE", "tipe laporan formal tidak valid")
	ErrInvalidImpactDescChange     = newValidationError("INVALID_IMPACT_DESCRIPTION_CHANGE", "perubahan deskripsi dampak tidak valid")
)

func ErrBackCycleMsg(requestedCycle, existingCycle string) error {
	return &AppError{
		Code:    "MONITORING_BACK_CYCLE",
		Message: fmt.Sprintf("tidak dapat membuat pemantauan untuk %s karena pemantauan untuk periode yang lebih baru (%s) sudah ada", requestedCycle, existingCycle),
		Err:     ErrInvalidInput,
	}
}

func IsNotFound(err error) bool {
	return errors.Is(err, ErrNotFound)
}

func IsUnauthorized(err error) bool {
	return errors.Is(err, ErrUnauthorized)
}

func IsForbidden(err error) bool {
	return errors.Is(err, ErrForbidden)
}

func IsConflict(err error) bool {
	return errors.Is(err, ErrConflict)
}

func IsAccountPendingApproval(err error) bool {
	return errors.Is(err, ErrAccountPendingApproval)
}

func IsInvalidCredentials(err error) bool {
	return errors.Is(err, ErrInvalidCredentials)
}

func IsAccountInactive(err error) bool {
	return errors.Is(err, ErrAccountInactive)
}

func IsValidation(err error) bool {
	return errors.Is(err, ErrInvalidInput) || errors.Is(err, ErrInvalidStatus)
}
