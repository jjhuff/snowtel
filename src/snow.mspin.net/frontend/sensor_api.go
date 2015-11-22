package methowsnow

import (
	"appengine"
	"appengine/datastore"
	"appengine/urlfetch"

	"encoding/json"
	"io/ioutil"
	"net/http"
	"strconv"
	"time"

	"github.com/ant0ine/go-json-rest/rest"

	"snow.mspin.net/config"
)

type Sensor struct {
	Id                          string  `json:"id" datastore:"-"`
	Name                        string  `json:"name" datastore:"location_name,noindex"`
	Height                      float32 `json:"height" datastore:"snow_sensor_height,noindex"`
	WebcamURL                   string  `json:"webcam_url" datastore:"webcam_url,noindex"`
	WeatherUndergroundStationId string  `json:"station_id" datastore:"station_id,noindex"`
}

const sensorEntityKind = "Sensor"

type Reading struct {
	Sensor       *datastore.Key `json:"-" datastore:"sensor"`
	Timestamp    time.Time      `json:"timestamp" datastore:"timestamp"`
	AmbientTemp  float32        `json:"ambient_temp" datastore:"ambient_temp,noindex"`
	SurfaceTemp  float32        `json:"surface_temp" datastore:"surface_temp,noindex"`
	HeadTemp     float32        `json:"head_temp" datastore:"head_temp,noindex"`
	StationTemp  float32        `json:"station_temp" datastore:"station_temp,noindex"`
	SnowDepth    float32        `json:"snow_depth" datastore:"snow_depth,noindex"`
	SensorHeight float32        `json:"-" datastore:"sensor_height,noindex"`
	LIDARSignal  float32        `json:"lidar_signal" datastore:",noindex"`
}

const readingEntityKind = "Reading"

func getSensor(ctx appengine.Context, id string) (Sensor, error) {
	sensorKey := datastore.NewKey(ctx, sensorEntityKind, id, 0, nil)

	var sensor Sensor
	err := datastore.Get(ctx, sensorKey, &sensor)
	sensor.Id = id
	if err != nil {
		if _, ok := err.(*datastore.ErrFieldMismatch); !ok {
			return sensor, err
		}
	}
	return sensor, nil
}

func putSensor(ctx appengine.Context, sensor Sensor) error {
	sensorKey := datastore.NewKey(ctx, sensorEntityKind, sensor.Id, 0, nil)
	_, err := datastore.Put(ctx, sensorKey, &sensor)
	return err
}

func getWeatherUndergroundTemp(ctx appengine.Context, stationId string) (float32, error) {
	client := urlfetch.Client(ctx)
	resp, err := client.Get("https://api.wunderground.com/api/" + config.Get(ctx).WeatherUndergroundKey + "/conditions/q/" + stationId + ".json")
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return 0, err
	}

	var responseJSON struct {
		CurrentObservation struct {
			Temperature float32 `json:"temp_c"`
		} `json:"current_observation"`
	}

	err = json.Unmarshal(body, &responseJSON)
	if err != nil {
		return 0, err
	}
	return responseJSON.CurrentObservation.Temperature, nil
}

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
	sensor, err := getSensor(ctx, sensorId)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteJson(sensor)
}

func (app *AppContext) PutSensor(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensor, err := getSensor(ctx, sensorId)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	err = req.DecodeJsonPayload(&sensor)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err = putSensor(ctx, sensor)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

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

	// Helper to parse a float form field
	getFloat := func(field string) (float32, error) {
		f, err := strconv.ParseFloat(req.FormValue(field), 32)
		if err != nil {
			rest.Error(w, "Bad param: "+field, http.StatusBadRequest)
			return 0, err
		} else {
			return float32(f), nil
		}
	}

	// Parse reading data
	var err error
	reading := Reading{
		Sensor:    datastore.NewKey(ctx, sensorEntityKind, sensorId, 0, nil),
		Timestamp: time.Now(),
	}

	if reading.AmbientTemp, err = getFloat("ambient_temp"); err != nil {
		return
	}
	if reading.SurfaceTemp, err = getFloat("surface_temp"); err != nil {
		return
	}
	if reading.HeadTemp, err = getFloat("head_temp"); err != nil {
		return
	}
	if req.FormValue("lidar_signal") != "" {
		if reading.LIDARSignal, err = getFloat("lidar_signal"); err != nil {
			return
		}
	}
	var snow_dist float32
	if snow_dist, err = getFloat("snow_dist"); err != nil {
		return
	}

	// Get/Create the sensor
	var sensor Sensor
	sensor, err = getSensor(ctx, sensorId)
	if err != nil {
		if err == datastore.ErrNoSuchEntity {
			ctx.Warningf("Creating new sensor: %s", sensorId)
			sensor.Id = sensorId
			sensor.Name = "Unknown - " + sensorId
			sensor.Height = snow_dist
			err = putSensor(ctx, sensor)
		}
		if err != nil {
			rest.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}

	// Calculate snow depth
	reading.SnowDepth = sensor.Height - snow_dist
	reading.SensorHeight = sensor.Height

	// Fetch info from WeatherUnderground
	if sensor.WeatherUndergroundStationId != "" {
		reading.StationTemp, err = getWeatherUndergroundTemp(ctx, sensor.WeatherUndergroundStationId)
		if err != nil {
			ctx.Warningf("Failed to read station temp: %s", err.Error())
		}
	}

	readingKey := datastore.NewIncompleteKey(ctx, readingEntityKind, nil)
	_, err = datastore.Put(ctx, readingKey, &reading)
	if err != nil {
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func (app *AppContext) DeleteReadings(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NewKey(ctx, sensorEntityKind, sensorId, 0, nil)

	q := datastore.NewQuery(readingEntityKind).
		Filter("sensor =", sensorKey).
		KeysOnly()

	keys, err := q.GetAll(ctx, nil)
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
		err = datastore.DeleteMulti(ctx, delKeys)
		if err != nil {
			ctx.Warningf("i: %d, len:%d", i, len(keys))
			rest.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
}

func (app *AppContext) AdjustReadings(w rest.ResponseWriter, req *rest.Request) {
	ctx := appengine.NewContext(req.Request)

	sensorId := req.PathParam("id")
	if sensorId == "" {
		rest.Error(w, "Missing sensor id", http.StatusBadRequest)
		return
	}
	sensorKey := datastore.NewKey(ctx, sensorEntityKind, sensorId, 0, nil)

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

	ctx.Infof("Adjusting height old:%f new:%f delta:%f", oldHeight, newHeight, delta)

	var readings []Reading = make([]Reading, 0)
	keys, err := q.GetAll(ctx, &readings)
	if err != nil {
		ctx.Warningf("GetAll Error: %v", err)
		rest.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for i, r := range readings {
		if r.SensorHeight == float32(oldHeight) || r.SensorHeight == 0 {
			r.SensorHeight = float32(newHeight)
			r.SnowDepth += float32(delta)
			//ctx.Infof("Adjust: %v Depth:%f SensorHeight:%f", r.Timestamp, r.SnowDepth, r.SensorHeight)
			_, err = datastore.Put(ctx, keys[i], &r)
			if err != nil {
				ctx.Warningf("Put err: %s, %v", keys[i], err)
				rest.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
		}
	}
}
