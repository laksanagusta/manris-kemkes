package pdfreport

import (
	"github.com/johnfercher/maroto/v2/pkg/props"
)

const (
	PageWidth  = 297.6
	PageHeight = 210.0
	Margin     = 15.0

	FontSizeH1    = 18.0
	FontSizeH2    = 14.0
	FontSizeH3    = 11.0
	FontSizeBody  = 9.0
	FontSizeSmall = 8.0
	FontSizeLabel = 7.0

	RowHeight    = 8.0
	CellWidthMax = 50.0
)

var (
	RendahBg  = &props.Color{Red: 34, Green: 197, Blue: 94}
	SedangBg  = &props.Color{Red: 234, Green: 179, Blue: 8}
	TinggiBg  = &props.Color{Red: 249, Green: 115, Blue: 22}
	EkstremBg = &props.Color{Red: 239, Green: 68, Blue: 68}

	WhiteBg     = &props.Color{Red: 255, Green: 255, Blue: 255}
	BlackColor  = &props.Color{Red: 0, Green: 0, Blue: 0}
	HeaderBg    = &props.Color{Red: 30, Green: 30, Blue: 30}
	AltRowBg    = &props.Color{Red: 245, Green: 245, Blue: 245}
	BorderColor = &props.Color{Red: 200, Green: 200, Blue: 200}

	RiskLevelColors = map[string]*props.Color{
		"low":     RendahBg,
		"medium":  SedangBg,
		"high":    TinggiBg,
		"extreme": EkstremBg,
	}
)

func GetRiskLevelColor(level string) *props.Color {
	if c, ok := RiskLevelColors[level]; ok {
		return c
	}
	return WhiteBg
}
