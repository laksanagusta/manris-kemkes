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

func RenderTable(header []string, rows [][]string, colWidths []uint, opts ...TableOption) []core.Row {
	cfg := tableConfig{rowHeight: RowHeight, fontSize: FontSizeBody}
	for _, o := range opts {
		o(&cfg)
	}

	totalWidth := 0
	for _, w := range colWidths {
		totalWidth += int(w)
	}

	var result []core.Row

	headerRow := row.New(cfg.rowHeight)
	headerRow.Add(col.New(gridSize))
	for i, h := range header {
		w := colWidths[i]
		propWidth := uint(float64(w) / float64(totalWidth) * float64(gridSize))
		cell := col.New(int(propWidth))
		cell.Add(text.New(
			h,
			props.Text{
				Size:   cfg.fontSize,
				Align:  align.Center,
				Color:  WhiteBg,
				Style:  fontstyle.Bold,
				Family: fontfamily.Helvetica,
			},
		))
		cell.WithStyle(&props.Cell{BackgroundColor: HeaderBg})
		headerRow.Add(cell)
	}
	headerRow.Add(col.New(gridSize))
	result = append(result, headerRow)

	for rowIdx, rowData := range rows {
		isAlt := rowIdx%2 == 1
		dataRow := row.New(cfg.rowHeight)
		dataRow.Add(col.New(gridSize))
		for i, cellText := range rowData {
			if i >= len(colWidths) {
				break
			}
			w := colWidths[i]
			propWidth := uint(float64(w) / float64(totalWidth) * float64(gridSize))
			cell := col.New(int(propWidth))
			cell.Add(text.New(
				cellText,
				props.Text{
					Size:   cfg.fontSize,
					Align:  align.Center,
					Color:  BlackColor,
					Family: fontfamily.Helvetica,
					Style:  fontstyle.Normal,
				},
			))
			if isAlt {
				cell.WithStyle(&props.Cell{BackgroundColor: AltRowBg})
			}
			dataRow.Add(cell)
		}
		dataRow.Add(col.New(gridSize))
		result = append(result, dataRow)
	}

	return result
}

type tableConfig struct {
	rowHeight float64
	fontSize  float64
}

type TableOption func(*tableConfig)

func WithRowHeight(h float64) TableOption {
	return func(c *tableConfig) {
		c.rowHeight = h
	}
}

func WithFontSize(sz float64) TableOption {
	return func(c *tableConfig) {
		c.fontSize = sz
	}
}
