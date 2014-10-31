package methowsnow

import (
	"appengine"
	"appengine/datastore"
	"net/http"
	"time"

	"github.com/ant0ine/go-json-rest/rest"
)

type Sensor struct {
	Name                        string  `datastore:"location_name,noindex"`
	Height                      float32 `datastore:"snow_sensor_height,noindex"`
	WebcamURL                   string  `datastore:"webcam_url,noindex"`
	WeatherUndergroundStationId string  `datastore:"station_id,noindex"`
}

const sensorEntityKind = "Sensor"

type Reading struct {
	Timestamp   time.Time `datastore:"timestamp"`
	AmbientTemp float32   `datastore:"ambient_temp,noindex"`
	SurfaceTemp float32   `datastore:"surface_temp,noindex"`
	HeadTemp    float32   `datastore:"head_temp,noindex"`
	StationTemp float32   `datastore:"station_temp,noindex"`
	SnowDepth   float32   `datastore:"snow_depth,noindex"`
}

const readingEntityKind = "Reading"

func (app *AppContext) GetSensors(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	var sensors []Sensor = make([]Sensor, 0)
	_, err := datastore.NewQuery(sensorEntityKind).GetAll(ctx, &sensors)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteJson(sensors)
}

func (app *AppContext) GetReadings(w rest.ResponseWriter, req *rest.Request) {
}

func (app *AppContext) PostReading(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}

	ctx.Infof("surface_temp=%s", req.FormValue("surface_temp"))
}
