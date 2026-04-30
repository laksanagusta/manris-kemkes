# KMK Batch A Rollout Notes

- `KMK_OBJECTIVE_REQUIRED=false` pada rilis awal.
- Aktifkan ke `true` hanya setelah organisasi aktif sudah memiliki minimal satu objective.
- Risiko existing tetap valid tanpa backfill objective.
- Risiko baru dapat mulai mengadopsi linkage objective selama masa transisi.
- Migrasi baru Batch A:
  - `000044_risk_charters`
  - `000045_risk_objectives`
  - `000046_risks_add_objective_id`
- API baru Batch A:
  - `GET/POST/PUT /api/v1/risk-charters`
  - `GET /api/v1/risk-charters/:id`
  - `GET/POST/PUT/DELETE /api/v1/risk-objectives`
  - `GET /api/v1/risk-objectives/:id`
