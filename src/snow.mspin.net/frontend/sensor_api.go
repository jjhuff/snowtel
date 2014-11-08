package methowsnow

import (
	"appengine"
	"appengine/datastore"
	"net/http"
	"time"

	"github.com/ant0ine/go-json-rest/rest"
)

type Sensor struct {
	Id                          string  `json:"id" datastore:-`
	Name                        string  `json:"name" datastore:"location_name,noindex"`
	Height                      float32 `json:"height" datastore:"snow_sensor_height,noindex"`
	WebcamURL                   string  `json:"webcam_url" datastore:"webcam_url,noindex"`
	WeatherUndergroundStationId string  `json:"station_id" datastore:"station_id,noindex"`
}

const sensorEntityKind = "Sensor"

type Reading struct {
	Timestamp   time.Time `json:"timestamp" datastore:"timestamp"`
	AmbientTemp float32   `json:"ambient_temp" datastore:"ambient_temp,noindex"`
	SurfaceTemp float32   `json:"surface_temp" datastore:"surface_temp,noindex"`
	HeadTemp    float32   `json:"head_temp" datastore:"head_temp,noindex"`
	StationTemp float32   `json:"station_temp" datastore:"station_temp,noindex"`
	SnowDepth   float32   `json:"snow_depth" datastore:"snow_depth,noindex"`
}

const readingEntityKind = "Reading"

func (app *AppContext) GetSensors(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	var sensors []Sensor = make([]Sensor, 0)
	keys, err := datastore.NewQuery(sensorEntityKind).GetAll(ctx, &sensors)
	for i, k := range keys {
		sensors[i].Id = k.StringID()
	}
	if err != nil {
		if _, ok := err.(*datastore.ErrFieldMismatch); !ok {
			rest.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	w.WriteJson(sensors)
}

func (app *AppContext) GetSensor(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NewKey(ctx, sensorEntityKind, sensorId, 0, nil)

	var sensor Sensor
	err := datastore.Get(ctx, sensorKey, &sensor)
	if err != nil {
		if _, ok := err.(*datastore.ErrFieldMismatch); !ok {
			rest.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	sensor.Id = sensorId
	w.WriteJson(sensor)
}

func (app *AppContext) GetReadings(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NewKey(ctx, sensorEntityKind, sensorId, 0, nil)

	q := datastore.NewQuery(readingEntityKind).
		Filter("sensor =", sensorKey).
		Order("-timestamp")

	afterStr := req.FormValue("after")
	if afterStr != "" {
		after, err := time.Parse(time.RFC3339Nano, afterStr)
		if err == nil {
			q = q.Filter("timestamp >", after)
		} else {
			rest.Error(w, "Failed to parse param: after", http.StatusBadRequest)
		}
	}

	var readings []Reading = make([]Reading, 0)
	_, err := q.Limit(2500).GetAll(ctx, &readings)

	if err != nil {
		if _, ok := err.(*datastore.ErrFieldMismatch); !ok {
			rest.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	w.WriteJson(readings)
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
