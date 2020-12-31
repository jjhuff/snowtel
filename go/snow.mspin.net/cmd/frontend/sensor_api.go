package main

import (
	"context"
	"encoding/json"
	"io/ioutil"
	"log"
	"math"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"cloud.google.com/go/datastore"
	"github.com/ant0ine/go-json-rest/rest"
)

type Sensor struct {
	Id                          string  `json:"id" datastore:"-"`
	Name                        string  `json:"name" datastore:"location_name,noindex"`
	Height                      float32 `json:"height" datastore:"snow_sensor_height,noindex"`
	WebcamURL                   string  `json:"webcam_url" datastore:"webcam_url,noindex"`
	WeatherUndergroundStationId string  `json:"station_id" datastore:"station_id,noindex"`
}

const sensorEntityKind = "Sensor"

type NullableFloat float32

func (v NullableFloat) MarshalJSON() ([]byte, error) {
	if math.IsNaN(float64(v)) {
		return json.Marshal(nil)
	} else {
		return json.Marshal(float32(v))
	}
}

func ParseNullableFloat(s string) NullableFloat {
	if s == "" {
		return NullableFloat(math.NaN())
	}
	v, err := strconv.ParseFloat(s, 32)
	if err != nil {
		return NullableFloat(math.NaN())
	} else {
		return NullableFloat(v)
	}
}

type Reading struct {
	Sensor       *datastore.Key `json:"-" datastore:"sensor"`
	Timestamp    time.Time      `json:"timestamp" datastore:"timestamp"`
	AmbientTemp  NullableFloat  `json:"ambient_temp" datastore:"ambient_temp,noindex"`
	SurfaceTemp  NullableFloat  `json:"surface_temp" datastore:"surface_temp,noindex"`
	HeadTemp     NullableFloat  `json:"head_temp" datastore:"head_temp,noindex"`
	StationTemp  NullableFloat  `json:"station_temp" datastore:"station_temp,noindex"`
	SnowDepth    float32        `json:"snow_depth" datastore:"snow_depth,noindex"`
	SensorHeight float32        `json:"-" datastore:"sensor_height,noindex"`
	LIDARSignal  NullableFloat  `json:"lidar_signal" datastore:",noindex"`
}

const readingEntityKind = "Reading"

func (app *AppContext) getSensor(ctx context.Context, id string) (Sensor, error) {
	sensorKey := datastore.NameKey(sensorEntityKind, id, nil)

	var sensor Sensor
	err := app.Datastore.Get(ctx, sensorKey, &sensor)
	sensor.Id = id
	if err != nil {
		if _, ok := err.(*datastore.ErrFieldMismatch); !ok {
			return sensor, err
		}
	}
	return sensor, nil
}

func (app *AppContext) putSensor(ctx context.Context, sensor Sensor) error {
	sensorKey := datastore.NameKey(sensorEntityKind, sensor.Id, nil)
	_, err := app.Datastore.Put(ctx, sensorKey, &sensor)
	return err
}

func (app *AppContext) getWeatherUndergroundTemp(ctx context.Context, stationId string) (float32, error) {
	resp, err := http.Get("https://api.wunderground.com/api/" + app.Config.WeatherUndergroundKey + "/conditions/q/" + stationId + ".json")
	if err != nil {
		return float32(math.NaN()), err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return float32(math.NaN()), err
	}

	var responseJSON struct {
		CurrentObservation struct {
			Temperature float32 `json:"temp_c"`
		} `json:"current_observation"`
	}

	err = json.Unmarshal(body, &responseJSON)
	if err != nil {
		return float32(math.NaN()), err
	}
	return responseJSON.CurrentObservation.Temperature, nil
}

func (app *AppContext) GetSensors(w rest.ResponseWriter, req *rest.Request) {
	ctx := req.Request.Context()

	var sensors []Sensor = make([]Sensor, 0)
	q := datastore.NewQuery(sensorEntityKind)
	keys, err := app.Datastore.GetAll(ctx, q, &sensors)
	for i, k := range keys {
		sensors[i].Id = k.Name
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
	ctx := req.Request.Context()

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensor, err := app.getSensor(ctx, sensorId)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteJson(sensor)
}

func (app *AppContext) PutSensor(w rest.ResponseWriter, req *rest.Request) {
	ctx := req.Request.Context()

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensor, err := app.getSensor(ctx, sensorId)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = req.DecodeJsonPayload(&sensor)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = app.putSensor(ctx, sensor)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteJson(sensor)
}

func (app *AppContext) GetReadings(w rest.ResponseWriter, req *rest.Request) {
	ctx := req.Request.Context()

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NameKey(sensorEntityKind, sensorId, nil)

	q := datastore.NewQuery(readingEntityKind).
		Filter("sensor =", sensorKey).
		Order("-timestamp").
		Limit(10000)

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
	_, err := app.Datastore.GetAll(ctx, q, &readings)
	log.Printf("Found %d readings.", len(readings))

	if err != nil {
		if _, ok := err.(*datastore.ErrFieldMismatch); !ok {
			rest.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	b, err := json.Marshal(readings)
	log.Printf("Marshaling: %d %v", len(b), err)

	w.WriteJson(readings)
}

func (app *AppContext) DeleteReadings(w rest.ResponseWriter, req *rest.Request) {
	ctx := req.Request.Context()

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NameKey(sensorEntityKind, sensorId, nil)

	q := datastore.NewQuery(readingEntityKind).
		Filter("sensor =", sensorKey).
		KeysOnly()

	afterStr := req.FormValue("after")
	if afterStr != "" {
		after, err := time.Parse(time.RFC3339Nano, afterStr)
		if err == nil {
			q = q.Filter("timestamp >", after)
		} else {
			rest.Error(w, "Failed to parse param: after", http.StatusBadRequest)
			return
		}
	}

	beforeStr := req.FormValue("before")
	if beforeStr != "" {
		before, err := time.Parse(time.RFC3339Nano, beforeStr)
		if err == nil {
			q = q.Filter("timestamp <=", before)
		} else {
			rest.Error(w, "Failed to parse param: before", http.StatusBadRequest)
			return
		}
	}

	keys, err := app.Datastore.GetAll(ctx, q, nil)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for i := 0; i < len(keys); i += 500 {
		j := i + 500
		if j > len(keys) {
			j = len(keys)
		}
		delKeys := keys[i:j]
		err = app.Datastore.DeleteMulti(ctx, delKeys)
		if err != nil {
			log.Printf("i: %d, len:%d", i, len(keys))
			rest.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func (app *AppContext) AdjustReadings(w rest.ResponseWriter, req *rest.Request) {
	ctx := req.Request.Context()

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NameKey(sensorEntityKind, sensorId, nil)

	q := datastore.NewQuery(readingEntityKind).Filter("sensor =", sensorKey)

	afterStr := req.FormValue("after")
	if afterStr != "" {
		after, err := time.Parse(time.RFC3339Nano, afterStr)
		if err == nil {
			q = q.Filter("timestamp >", after)
		} else {
			rest.Error(w, "Failed to parse param: after", http.StatusBadRequest)
			return
		}
	}

	beforeStr := req.FormValue("before")
	if beforeStr != "" {
		before, err := time.Parse(time.RFC3339Nano, beforeStr)
		if err == nil {
			q = q.Filter("timestamp <=", before)
		} else {
			rest.Error(w, "Failed to parse param: before", http.StatusBadRequest)
			return
		}
	}

	oldHeight, _ := strconv.ParseFloat(req.FormValue("old_height"), 32)
	newHeight, _ := strconv.ParseFloat(req.FormValue("new_height"), 32)
	delta := newHeight - oldHeight
	if req.FormValue("delta") != "" {
		delta, _ = strconv.ParseFloat(req.FormValue("delta"), 32)
	}

	log.Printf("Adjusting height old:%f new:%f delta:%f", oldHeight, newHeight, delta)

	var readings []Reading = make([]Reading, 0)
	keys, err := app.Datastore.GetAll(ctx, q, &readings)
	if err != nil {
		log.Printf("GetAll Error: %v", err)
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Found %d records", len(readings))

	for i, r := range readings {
		if math.Abs(float64(r.SensorHeight)-oldHeight) < 1 {
			r.SensorHeight = float32(newHeight)
			r.SnowDepth += float32(delta)
			//log.Printf("Adjust: %v Depth:%f SensorHeight:%f", r.Timestamp, r.SnowDepth, r.SensorHeight)
			_, err = app.Datastore.Put(ctx, keys[i], &r)
			if err != nil {
				log.Printf("Put err: %s, %v", keys[i], err)
				rest.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}
}

func (app *AppContext) FixReadings(w rest.ResponseWriter, req *rest.Request) {
	ctx := req.Request.Context()

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NameKey(sensorEntityKind, sensorId, nil)

	q := datastore.NewQuery(readingEntityKind).Filter("sensor =", sensorKey)

	afterStr := req.FormValue("after")
	if afterStr != "" {
		after, err := time.Parse(time.RFC3339Nano, afterStr)
		if err == nil {
			q = q.Filter("timestamp >", after)
		} else {
			rest.Error(w, "Failed to parse param: after", http.StatusBadRequest)
			return
		}
	}

	beforeStr := req.FormValue("before")
	if beforeStr != "" {
		before, err := time.Parse(time.RFC3339Nano, beforeStr)
		if err == nil {
			q = q.Filter("timestamp <=", before)
		} else {
			rest.Error(w, "Failed to parse param: before", http.StatusBadRequest)
			return
		}
	}

	var readings []Reading = make([]Reading, 0)
	keys, err := app.Datastore.GetAll(ctx, q, &readings)
	if err != nil {
		log.Printf("GetAll Error: %v", err)
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	log.Printf("Found %d records", len(readings))

	for i, r := range readings {
		changed := false
		if r.StationTemp == 0 {
			r.StationTemp = NullableFloat(math.NaN())
			changed = true
		}
		if r.LIDARSignal == 0 {
			r.LIDARSignal = NullableFloat(math.NaN())
			changed = true
		}

		if changed {
			_, err = app.Datastore.Put(ctx, keys[i], &r)
			if err != nil {
				log.Printf("Put err: %s, %v", keys[i], err)
				rest.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}
}

type webhookRequest struct {
	Event  string `json:"event"`
	Data   string `json:"data"`
	CoreId string `json:"coreid"`
}

func (app *AppContext) ReadingHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	reqBody, _ := ioutil.ReadAll(r.Body)

	var webhook webhookRequest
	err := json.Unmarshal(reqBody, &webhook)
	if err != nil {
		log.Printf("Failed to unmarshal. err:%s", err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	values, err := url.ParseQuery(webhook.Data)
	if err != nil {
		log.Printf("Failed to parse data. data:'%s' err:%s", webhook.Data, err)
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	sensorId := webhook.CoreId

	// Parse reading data
	reading := Reading{
		Sensor:      datastore.NameKey(sensorEntityKind, sensorId, nil),
		Timestamp:   time.Now(),
		AmbientTemp: ParseNullableFloat(values.Get("ambient_temp")),
		SurfaceTemp: ParseNullableFloat(values.Get("surface_temp")),
		HeadTemp:    ParseNullableFloat(values.Get("head_temp")),
		StationTemp: NullableFloat(math.NaN()),
		LIDARSignal: ParseNullableFloat(values.Get("lidar_signal")),
	}

	snow_dist, _ := strconv.ParseFloat(values.Get("snow_dist"), 32)

	// Get/Create the sensor
	var sensor Sensor
	sensor, err = app.getSensor(ctx, sensorId)
	if err != nil {
		if err == datastore.ErrNoSuchEntity {
			log.Printf("Creating new sensor: %s", sensorId)
			sensor.Id = sensorId
			sensor.Name = "Unknown - " + sensorId
			sensor.Height = float32(snow_dist)
			err = app.putSensor(ctx, sensor)
		}
		if err != nil {
			log.Printf("Error creating sensor. id:%s err:%s", sensorId, err)
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
	}

	// Calculate snow depth
	reading.SnowDepth = sensor.Height - float32(snow_dist)
	reading.SensorHeight = sensor.Height
	log.Printf("Webhook reading: %#v", reading)

	readingKey := datastore.IncompleteKey(readingEntityKind, nil)
	_, err = app.Datastore.Put(ctx, readingKey, &reading)
	if err != nil {
		log.Printf("Error writing reading. id:%s err:%s", sensorId, err)
		return
	}
	w.WriteHeader(http.StatusOK)
}
