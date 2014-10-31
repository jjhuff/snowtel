package config

import (
	"appengine"
	"sync"
)

type Config struct {
	GoogleAnalyticsID string `json:"google_analytics_id"`
	Minified          bool   `json:"minified"`
}

var configs = map[string]Config{
	"methowsnow": Config{
		GoogleAnalyticsID: "",
		Minified:          true,
	},
	"methowsnow-dev": Config{
		GoogleAnalyticsID: "",
		Minified:          false,
	},
	"testapp": Config{
		GoogleAnalyticsID: "",
		Minified:          false,
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
