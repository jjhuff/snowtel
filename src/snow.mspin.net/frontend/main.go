package methowsnow

import (
	"appengine"
	"encoding/json"
	"html/template"
	"io/ioutil"
	"net/http"

	"github.com/ant0ine/go-json-rest/rest"

	"snow.mspin.net/config"
)

type AppContext struct {
}

var fileHashes = make(map[string]string)

var templateFuncs = template.FuncMap{
	"static": func(name string) string {
		if v, ok := fileHashes[name]; ok {
			return v
		} else {
			return name
		}
	},
}

var indexTmpl = template.Must(template.New("index.html").Funcs(templateFuncs).ParseFiles("html/index.html"))

type indexArgs struct {
	Config config.Config
}

func (app *AppContext) handleIndex(w http.ResponseWriter, req *http.Request) {
	ctx := appengine.NewContext(req)
	data := indexArgs{
		Config: config.Get(ctx),
	}

	w.Header().Set("Cache-Control", "private, max-age=0, no-cache")

	if err := indexTmpl.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}

}

func loadFileHashes(fname string) {
	file, err := ioutil.ReadFile(fname)
	if err != nil {
		panic("Failed to load: " + fname)
	}

	var hashes map[string]string
	err = json.Unmarshal(file, &hashes)
	if err != nil {
		panic("Failed to parse: " + fname)
	}

	for k, v := range hashes {
		fileHashes[k] = v
	}
}

func init() {
	app := &AppContext{}

	loadFileHashes("build/appjs-manifest.json")
	loadFileHashes("build/libjs-manifest.json")
	loadFileHashes("build/css-manifest.json")

	restHandler := rest.ResourceHandler{
		EnableRelaxedContentType: true,
	}
	restHandler.SetRoutes(
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors", Func: app.GetSensors},
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors/:id", Func: app.GetSensor},
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors/:id/readings", Func: app.GetReadings},
		&rest.Route{HttpMethod: "POST", PathExp: "/sensors/:id/readings", Func: app.PostReading},
	)
	http.Handle("/_/api/v1/", http.StripPrefix("/_/api/v1", &restHandler))

	http.HandleFunc("/", app.handleIndex)
}
