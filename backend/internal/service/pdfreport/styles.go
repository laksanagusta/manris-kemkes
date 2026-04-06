package pdfreport

import (
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

const (
	// Page dimensions (landscape A4).
	PageWidth  = 297.6
	PageHeight = 210.0
	Margin     = 15.0

	// Grid system.
	gridSize = 12

	// Font sizes.
	FontSizeH1    = 16.0
	FontSizeH2    = 13.0
	FontSizeH3    = 11.0
	FontSizeBody  = 9.0
	FontSizeSmall = 8.0
	FontSizeLabel = 7.0

	// Layout.
	RowHeight      = 12.0
	SectionSpacing = 8.0
	CellWidthMax   = 50.0

	// Border.
	BorderThkn = 0.3
)

var (
	// Primary palette.
	HeaderBg   = &props.Color{Red: 23, Green: 37, Blue: 84}
	AltRowBg   = &props.Color{Red: 248, Green: 249, Blue: 250}
	BorderClr  = &props.Color{Red: 200, Green: 210, Blue: 220}
	MutedText  = &props.Color{Red: 100, Green: 110, Blue: 120}
	WhiteBg    = &props.Color{Red: 255, Green: 255, Blue: 255}
	BlackColor = &props.Color{Red: 0, Green: 0, Blue: 0}

	// Backward-compatible alias.
	BorderColor = BorderClr

	// Heatmap zone colors (4 zones).
	HeatmapGreen  = &props.Color{Red: 34, Green: 197, Blue: 94}
	HeatmapYellow = &props.Color{Red: 234, Green: 179, Blue: 8}
	HeatmapOrange = &props.Color{Red: 249, Green: 115, Blue: 22}
	HeatmapRed    = &props.Color{Red: 239, Green: 68, Blue: 68}

	// Aliases used by heatmap cell coloring.
	RendahBg  = HeatmapGreen
	SedangBg  = HeatmapYellow
	TinggiBg  = HeatmapOrange
	EkstremBg = HeatmapRed

	// Risk-level badge colors keyed by Indonesian entity level strings.
	RiskLevelColors = map[string]*props.Color{
		"sangat_rendah": {Red: 34, Green: 197, Blue: 94},
		"rendah":        {Red: 22, Green: 163, Blue: 74},
		"sedang":        {Red: 234, Green: 179, Blue: 8},
		"tinggi":        {Red: 249, Green: 115, Blue: 22},
		"sangat_tinggi": {Red: 239, Green: 68, Blue: 68},
	}
)

// GetRiskLevelColor returns the badge color for an Indonesian risk level.
func GetRiskLevelColor(level string) *props.Color {
	if c, ok := RiskLevelColors[level]; ok {
		return c
	}
	return MutedText
}

// CellBorder returns a cell style with full borders and no background.
func CellBorder() *props.Cell {
	return &props.Cell{
		BorderType:      border.Full,
		BorderColor:     BorderClr,
		BorderThickness: BorderThkn,
	}
}

// CellBorderWithBg returns a cell style with full borders and a background.
func CellBorderWithBg(bg *props.Color) *props.Cell {
	return &props.Cell{
		BackgroundColor: bg,
		BorderType:      border.Full,
		BorderColor:     BorderClr,
		BorderThickness: BorderThkn,
	}
}

// HeaderCellStyle returns the dark header cell style.
func HeaderCellStyle() *props.Cell {
	return &props.Cell{
		BackgroundColor: HeaderBg,
		BorderType:      border.Full,
		BorderColor:     HeaderBg,
		BorderThickness: BorderThkn,
	}
}
