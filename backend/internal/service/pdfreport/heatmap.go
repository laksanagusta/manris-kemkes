package pdfreport

import (
	"strconv"

	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/border"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

func cellBgColor(prob, impact int) *props.Color {
	score := float64(prob+1) * float64(impact+1)
	switch {
	case score >= 20:
		return EkstremBg
	case score >= 15:
		return TinggiBg
	case score >= 10:
		return SedangBg
	case score >= 5:
		return RendahBg
	default:
		return RendahBg
	}
}

// RenderHeatmapGrid renders the 5×5 risk heatmap with axis labels and legend.
func RenderHeatmapGrid(heatmap [5][5]int) []core.Row {
	var rows []core.Row
	rowHeight := 14.0

	likelihoodLabels := []string{
		"1-Jarang",
		"2-Kml Kecil",
		"3-Kml Sedang",
		"4-Kml Besar",
		"5-Hampir Pasti",
	}

	// Y-axis title row.
	yTitleRow := row.New(8)
	yTitleRow.Add(col.New(2).Add(text.New("PROBABILITAS ↑", props.Text{
		Size:   FontSizeLabel,
		Align:  align.Center,
		Style:  fontstyle.Bold,
		Color:  BlackColor,
		Family: fontfamily.Arial,
	})))
	yTitleRow.Add(col.New(10))
	rows = append(rows, yTitleRow)

	// Heatmap data rows (top = probability 5, bottom = probability 1).
	for r := 4; r >= 0; r-- {
		labelCol := col.New(2).Add(text.New(likelihoodLabels[r], props.Text{
			Size:   FontSizeLabel,
			Align:  align.Right,
			Color:  BlackColor,
			Right:  2,
			Top:    3,
			Family: fontfamily.Arial,
		}))
		rowCols := []core.Col{labelCol}
		for c := 0; c < 5; c++ {
			count := heatmap[r][c]
			cellText := ""
			if count > 0 {
				cellText = strconv.Itoa(count)
			}
			cellCol := col.New(2).Add(text.New(cellText, props.Text{
				Size:   FontSizeBody,
				Align:  align.Center,
				Top:    3,
				Color:  WhiteBg,
				Style:  fontstyle.Bold,
				Family: fontfamily.Arial,
			}))
			cellCol.WithStyle(&props.Cell{
				BackgroundColor: cellBgColor(r, c),
				BorderColor:     WhiteBg,
				BorderType:      border.Full,
				BorderThickness: 1.0,
			})
			rowCols = append(rowCols, cellCol)
		}
		rows = append(rows, row.New(rowHeight).Add(rowCols...))
	}

	// X-axis labels.
	impactLabels := []string{
		"1-Tdk Sign.",
		"2-Kecil",
		"3-Sedang",
		"4-Besar",
		"5-Katastropik",
	}
	labelRow := row.New(8)
	labelRow.Add(col.New(2))
	for _, label := range impactLabels {
		labelRow.Add(col.New(2).Add(text.New(label, props.Text{
			Size:   FontSizeLabel,
			Align:  align.Center,
			Color:  BlackColor,
			Family: fontfamily.Arial,
		})))
	}
	rows = append(rows, labelRow)

	// X-axis title.
	xTitleRow := row.New(6)
	xTitleRow.Add(col.New(2))
	xTitleRow.Add(col.New(10).Add(text.New("DAMPAK / IMPACT →", props.Text{
		Size:   FontSizeLabel,
		Align:  align.Center,
		Style:  fontstyle.Bold,
		Color:  BlackColor,
		Family: fontfamily.Arial,
	})))
	rows = append(rows, xTitleRow)

	// Legend row.
	type legendItem struct {
		label string
		bg    *props.Color
	}
	legends := []legendItem{
		{"Rendah", HeatmapGreen},
		{"Sedang", HeatmapYellow},
		{"Tinggi", HeatmapOrange},
		{"Ekstrem", HeatmapRed},
	}
	legendRow := row.New(8)
	legendRow.Add(col.New(2))
	for _, leg := range legends {
		c := col.New(2)
		c.Add(text.New(leg.label, props.Text{
			Size:   FontSizeLabel,
			Align:  align.Center,
			Color:  WhiteBg,
			Style:  fontstyle.Bold,
			Top:    1,
			Family: fontfamily.Arial,
		}))
		c.WithStyle(&props.Cell{BackgroundColor: leg.bg})
		legendRow.Add(c)
	}
	legendRow.Add(col.New(2))
	rows = append(rows, legendRow)

	return rows
}
