package pdfreport

import (
	"strconv"

	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/components/text"
	"github.com/johnfercher/maroto/v2/pkg/consts/align"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/vicanso/go-charts/v2"
)

const (
	chartWidth  = 800
	chartHeight = 400
)

// RenderTrendChart generates a bar chart PNG from trend data.
func RenderTrendChart(data []entity.CycleTrendPoint) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	rendah := make([]float64, len(data))
	sedang := make([]float64, len(data))
	tinggi := make([]float64, len(data))
	ekstrem := make([]float64, len(data))
	labels := make([]string, len(data))

	for i, dp := range data {
		rendah[i] = float64(dp.Rendah)
		sedang[i] = float64(dp.Sedang)
		tinggi[i] = float64(dp.Tinggi)
		ekstrem[i] = float64(dp.Ekstrem)
		labels[i] = dp.Cycle
	}

	p, err := charts.BarRender(
		[][]float64{rendah, sedang, tinggi, ekstrem},
		charts.XAxisDataOptionFunc(labels),
		charts.LegendLabelsOptionFunc([]string{"Rendah", "Sedang", "Tinggi", "Ekstrem"}, charts.PositionRight),
		charts.PNGTypeOption(),
		charts.TitleTextOptionFunc("Tren Risiko / Risk Trend"),
		func(opt *charts.ChartOption) {
			opt.Width = chartWidth
			opt.Height = chartHeight
		},
		func(opt *charts.ChartOption) {
			opt.SeriesList[0].Style.FillColor = chartColor(34, 197, 94)
			opt.SeriesList[1].Style.FillColor = chartColor(234, 179, 8)
			opt.SeriesList[2].Style.FillColor = chartColor(249, 115, 22)
			opt.SeriesList[3].Style.FillColor = chartColor(239, 68, 68)
		},
	)
	if err != nil {
		return nil, err
	}

	return p.Bytes()
}

func chartColor(r, g, b uint8) charts.Color {
	return charts.Color{R: r, G: g, B: b}
}

// RenderTrendChartRow renders the trend chart as a single row (backward-compatible).
func RenderTrendChartRow(data []entity.CycleTrendPoint) (core.Row, error) {
	imgBytes, err := RenderTrendChart(data)
	if err != nil {
		return nil, err
	}
	if imgBytes == nil {
		return row.New(10), nil
	}

	imgRow := row.New(float64(chartHeight) * 0.25)
	img := image.NewFromBytes(imgBytes, extension.Png, props.Rect{})
	imgRow.Add(col.New().Add(img))
	return imgRow, nil
}

// RenderTrendChartRows renders the trend chart with a fallback table and caption.
func RenderTrendChartRows(data []entity.CycleTrendPoint) []core.Row {
	if len(data) == 0 {
		return nil
	}

	imgBytes, err := RenderTrendChart(data)
	if err != nil || imgBytes == nil {
		return renderTrendFallbackTable(data)
	}

	var rows []core.Row

	// Chart image.
	imgRow := row.New(float64(chartHeight) * 0.25)
	img := image.NewFromBytes(imgBytes, extension.Png, props.Rect{})
	imgRow.Add(col.New().Add(img))
	rows = append(rows, imgRow)

	// Caption below chart.
	captionRow := row.New(8)
	captionRow.Add(col.New().Add(text.New(
		"Grafik Tren Risiko per Siklus / Risk Trend Chart per Cycle",
		props.Text{
			Size:  FontSizeLabel,
			Align: align.Center,
			Color: MutedText,
		},
	)))
	rows = append(rows, captionRow)

	return rows
}

func renderTrendFallbackTable(data []entity.CycleTrendPoint) []core.Row {
	header := []string{"Siklus", "Rendah", "Sedang", "Tinggi", "Ekstrem", "Total"}
	colWidths := []uint{2, 2, 2, 2, 2, 2}

	var tableRows [][]string
	for _, d := range data {
		total := d.Rendah + d.Sedang + d.Tinggi + d.Ekstrem
		tableRows = append(tableRows, []string{
			d.Cycle,
			strconv.Itoa(d.Rendah),
			strconv.Itoa(d.Sedang),
			strconv.Itoa(d.Tinggi),
			strconv.Itoa(d.Ekstrem),
			strconv.Itoa(total),
		})
	}

	return RenderTable(header, tableRows, colWidths, WithFontSize(FontSizeSmall))
}
