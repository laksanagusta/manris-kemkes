package pdfreport

import (
	"testing"

	"github.com/manris/backend/internal/domain/entity"
)

func TestRenderTrendChartPNG(t *testing.T) {
	data := []entity.CycleTrendPoint{
		{Cycle: "2025-H1", Rendah: 5, Sedang: 8, Tinggi: 3, Ekstrem: 1},
		{Cycle: "2025-H2", Rendah: 4, Sedang: 7, Tinggi: 4, Ekstrem: 2},
		{Cycle: "2026-H1", Rendah: 6, Sedang: 9, Tinggi: 2, Ekstrem: 0},
	}
	bytes, err := RenderTrendChart(data)
	if err != nil {
		t.Fatalf("RenderTrendChart failed: %v", err)
	}
	if len(bytes) == 0 {
		t.Fatal("RenderTrendChart returned empty bytes")
	}
	if len(bytes) < 1000 {
		t.Fatalf("RenderTrendChart returned suspiciously small PNG: %d bytes", len(bytes))
	}
	if bytes[0] != 0x89 || bytes[1] != 0x50 || bytes[2] != 0x4E || bytes[3] != 0x47 {
		t.Fatalf("RenderTrendChart returned invalid PNG magic bytes: %x", bytes[:4])
	}
}
