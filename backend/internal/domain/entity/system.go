package entity

// SlowQuery represents a slow database query
type SlowQuery struct {
	QueryID    int     `json:"queryId"`
	Query      string  `json:"query"`
	Calls      int64   `json:"calls"`
	TotalTime  float64 `json:"totalTime"`
	MeanTime   float64 `json:"meanTime"`
	StdDevTime float64 `json:"stdDevTime"`
}

// SystemPerformance represents system performance metrics
type SystemPerformance struct {
	SlowQueries []*SlowQuery `json:"slowQueries"`
}
