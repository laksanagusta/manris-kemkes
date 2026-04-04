package pdfreport

import (
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontfamily"
	"github.com/johnfercher/maroto/v2/pkg/consts/fontstyle"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
)

const gridSize = 12

func cellBgColor(prob, impact int) *props.Color {
	score := (prob + 1) * (impact + 1)
	switch {
	case score >= 15:
		return EkstremBg
	case score >= 10:
		return TinggiBg
	case score >= 5:
		return SedangBg
	default:
		return RendahBg
	}
}

func RenderHeatmapGrid(heatmap [5][5]int) []core.Row {
	var rows []core.Row

	likelihoodLabels := []string{"Rare", "Unlikely", "Possible", "Likely", "Almost Certain"}
	rowHeight := 14.0

	for r := 4; r >= 0; r-- {
		labelCol := col.New(2)
		labelCol.Add(text.New(
			likelihoodLabels[r],
			props.Text{
				Size:  FontSizeSmall,
				Align: align.Right,
				Color: BlackColor,
				Right: 2,
			},
		))

		rowCols := make([]core.Col, 0, 5)
		for c := 0; c < 5; c++ {
			count := heatmap[r][c]
			cellText := ""
			if count > 0 {
				cellText = string(rune('0' + count))
				if count > 9 {
					cellText = "9+"
				}
			}
			cellCol := col.New(2).Add(text.New(
				cellText,
				props.Text{
					Size:  FontSizeSmall,
					Align: align.Center,
					Top:   2,
					Color: WhiteBg,
				},
			)).WithStyle(&props.Cell{BackgroundColor: cellBgColor(r, c)})
			rowCols = append(rowCols, cellCol)
		}

		allCols := append([]core.Col{labelCol}, rowCols...)
		heatmapRow := row.New(rowHeight).Add(allCols...)
		rows = append(rows, heatmapRow)
	}

	labelRow := row.New(8)
	labelRow.Add(col.New(2))
	impactLabels := []string{"Insignificant", "Minor", "Moderate", "Major", "Catastrophic"}
	for i := 0; i < 5; i++ {
		impactCol := col.New(2)
		impactCol.Add(text.New(
			impactLabels[i],
			props.Text{
				Size:  FontSizeLabel,
				Align: align.Center,
				Color: BlackColor,
			},
		))
		labelRow.Add(impactCol)
	}
	rows = append(rows, labelRow)

	axisLabelRow := row.New(6)
	axisLabelRow.Add(col.New(2))
	axisLabelCol := col.New(10)
	axisLabelCol.Add(text.New(
		"DAMPAK / IMPACT  →",
		props.Text{
			Size:   FontSizeLabel,
			Align:  align.Center,
			Top:    0,
			Family: fontfamily.Helvetica,
			Style:  fontstyle.Normal,
			Color:  BlackColor,
		},
	))
	axisLabelRow.Add(axisLabelCol)
	rows = append(rows, axisLabelRow)

	return rows
}
