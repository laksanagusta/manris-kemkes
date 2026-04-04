package pdfreport

import (
	"github.com/johnfercher/maroto/v2/pkg/components/col"
	"github.com/johnfercher/maroto/v2/pkg/components/image"
	"github.com/johnfercher/maroto/v2/pkg/components/row"
	"github.com/johnfercher/maroto/v2/pkg/consts/extension"
	"github.com/johnfercher/maroto/v2/pkg/core"
	"github.com/johnfercher/maroto/v2/pkg/props"
	"github.com/manris/backend/internal/domain/entity"
	"github.com/vicanso/go-charts/v2"
)

const chartWidth = 600
const chartHeight = 300

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

func RenderTrendChartRow(data []entity.CycleTrendPoint) (core.Row, error) {
	imgBytes, err := RenderTrendChart(data)
	if err != nil {
		return nil, err
	}
	if imgBytes == nil {
		r := row.New(10)
		r.Add(col.New(gridSize))
		return r, nil
	}

	imgRow := row.New(float64(chartHeight) * 0.25)
	imgRow.Add(col.New(gridSize))
	img := image.NewFromBytes(imgBytes, extension.Png, props.Rect{})
	imgCol := col.New(gridSize).Add(img)
	imgRow.Add(imgCol)
	imgRow.Add(col.New(gridSize))
	return imgRow, nil
}
