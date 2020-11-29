package main

import (
	"context"
	"encoding/json"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"os"

	"cloud.google.com/go/datastore"
	"github.com/ant0ine/go-json-rest/rest"

	"snow.mspin.net/config"
)

type AppContext struct {
	Config    config.Config
	Datastore *datastore.Client
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

//var indexTmpl = template.Must(template.New("index.html").Funcs(templateFuncs).ParseFiles("html/index.html"))

type indexArgs struct {
	Config config.Config
}

func (app *AppContext) handleIndex(w http.ResponseWriter, req *http.Request) {
	w.Header().Set("Cache-Control", "private, max-age=0, no-cache")

	/*data := indexArgs{
		Config: app.Config,
	}

	if err := indexTmpl.Execute(w, data); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}*/

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

func main() {

	app := &AppContext{
		Config: config.Get(),
	}
	dsClient, err := datastore.NewClient(context.Background(), os.Getenv("GOOGLE_CLOUD_PROJECT"))
	if err != nil {
		log.Fatalf("Error making datastore connection: %s", err)
	}
	app.Datastore = dsClient

	//loadFileHashes("build/appjs-manifest.json")
	//loadFileHashes("build/libjs-manifest.json")
	//loadFileHashes("build/css-manifest.json")

	restHandler := rest.ResourceHandler{
		EnableRelaxedContentType: true,
	}
	restHandler.SetRoutes(
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors", Func: app.GetSensors},
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors/:id", Func: app.GetSensor},
		&rest.Route{HttpMethod: "PUT", PathExp: "/sensors/:id", Func: app.PutSensor},
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors/:id/readings", Func: app.GetReadings},
		&rest.Route{HttpMethod: "POST", PathExp: "/sensors/:id/readings", Func: app.PostReading},
		&rest.Route{HttpMethod: "DELETE", PathExp: "/sensors/:id/readings", Func: app.DeleteReadings},
		&rest.Route{HttpMethod: "POST", PathExp: "/sensors/:id/adjust", Func: app.AdjustReadings},
		&rest.Route{HttpMethod: "POST", PathExp: "/sensors/:id/fix", Func: app.FixReadings},
	)
	http.Handle("/_/api/v1/", http.StripPrefix("/_/api/v1", &restHandler))

	http.HandleFunc("/", app.handleIndex)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
		log.Printf("Defaulting to port %s", port)
	}

	log.Printf("Listening on port %s", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
