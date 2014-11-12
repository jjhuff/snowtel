package config

import (
	"appengine"
	"sync"
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

var appid_once sync.Once
var appid string

func Get(ctx appengine.Context) Config {
	appid_once.Do(func() {
		appid = appengine.AppID(ctx)

	})
	return configs[appid]
}
