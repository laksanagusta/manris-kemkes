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

type tableConfig struct {
	rowHeight   float64
	fontSize    float64
	leftAligned map[int]bool
}

// TableOption configures RenderTable behavior.
type TableOption func(*tableConfig)

// WithRowHeight sets the row height for table rows.
func WithRowHeight(h float64) TableOption {
	return func(c *tableConfig) { c.rowHeight = h }
}

// WithFontSize sets the font size for body cells.
func WithFontSize(sz float64) TableOption {
	return func(c *tableConfig) { c.fontSize = sz }
}

// WithLeftAligned marks specific column indices as left-aligned.
func WithLeftAligned(cols ...int) TableOption {
	return func(c *tableConfig) {
		if c.leftAligned == nil {
			c.leftAligned = make(map[int]bool)
		}
		for _, idx := range cols {
			c.leftAligned[idx] = true
		}
	}
}

// RenderTable renders a plain bordered table with a standard header row.
// colWidths should ideally sum to gridSize (12) for exact column sizing.
func RenderTable(header []string, rows [][]string, colWidths []uint, opts ...TableOption) []core.Row {
	cfg := tableConfig{rowHeight: RowHeight, fontSize: FontSizeBody}
	for _, o := range opts {
		o(&cfg)
	}

	propWidths := normalizeWidths(colWidths)

	var result []core.Row

	// Header row.
	headerRow := row.New(cfg.rowHeight)
	for i, h := range header {
		cell := col.New(propWidths[i])
		cell.Add(text.New(h, props.Text{
			Size:   cfg.fontSize,
			Align:  align.Center,
			Color:  BlackColor,
			Style:  fontstyle.Bold,
			Family: fontfamily.Arial,
			Top:    2,
			Left:   2,
			Right:  2,
		}))
		cell.WithStyle(CellBorder())
		headerRow.Add(cell)
	}
	result = append(result, headerRow)

	// Data rows.
	for _, rowData := range rows {
		dataRow := row.New(cfg.rowHeight)
		for i, cellText := range rowData {
			if i >= len(propWidths) {
				break
			}
			cellAlign := align.Center
			if cfg.leftAligned[i] {
				cellAlign = align.Left
			}
			cell := col.New(propWidths[i])
			cell.Add(text.New(cellText, props.Text{
				Size:   cfg.fontSize,
				Align:  cellAlign,
				Color:  BlackColor,
				Family: fontfamily.Arial,
				Style:  fontstyle.Normal,
				Top:    2,
				Left:   3,
				Right:  3,
			}))
			cell.WithStyle(CellBorder())
			dataRow.Add(cell)
		}
		result = append(result, dataRow)
	}

	return result
}

// normalizeWidths converts proportional weights to grid-unit widths summing to gridSize.
func normalizeWidths(colWidths []uint) []int {
	total := 0
	for _, w := range colWidths {
		total += int(w)
	}
	if total == 0 {
		return nil
	}

	result := make([]int, len(colWidths))
	allocated := 0
	for i, w := range colWidths {
		if i == len(colWidths)-1 {
			v := gridSize - allocated
			if v < 1 {
				v = 1
			}
			result[i] = v
		} else {
			v := int(float64(w)/float64(total)*float64(gridSize) + 0.5)
			if v < 1 {
				v = 1
			}
			result[i] = v
		}
		allocated += result[i]
	}
	return result
}
