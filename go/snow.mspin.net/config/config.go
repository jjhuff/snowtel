package config

import (
	"os"
)

type Config struct {
	GoogleAnalyticsID     string `json:"google_analytics_id"`
	Minified              bool   `json:"minified"`
	WeatherUndergroundKey string `json:"-"`
}

var configs = map[string]Config{
	"methowsnow": Config{
		GoogleAnalyticsID:     "",
		Minified:              true,
		WeatherUndergroundKey: "fca0029770ca8fd4",
	},
	"methowsnow-dev": Config{
		GoogleAnalyticsID:     "",
		Minified:              false,
		WeatherUndergroundKey: "fca0029770ca8fd4",
	},
	"testapp": Config{
		GoogleAnalyticsID:     "",
		Minified:              false,
		WeatherUndergroundKey: "fca0029770ca8fd4",
	},
}

func Get() Config {
	appid := os.Getenv("GOOGLE_CLOUD_PROJECT")
	return configs[appid]
}
