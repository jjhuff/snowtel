package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"cloud.google.com/go/datastore"
	"github.com/ant0ine/go-json-rest/rest"

	"snow.mspin.net/config"
)

type AppContext struct {
	Config    config.Config
	Datastore *datastore.Client
}

type indexArgs struct {
	Config config.Config
}

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "/app/static/index.html")
}

func main() {

	wd, _ := os.Getwd()
	log.Printf("cwd: %s", wd)
	filepath.Walk("/app/",
		func(path string, info os.FileInfo, err error) error {
			if err != nil {
				return err
			}
			log.Println(path, info.Size())
			return nil
		})

	app := &AppContext{
		Config: config.Get(),
	}
	dsClient, err := datastore.NewClient(context.Background(), os.Getenv("GOOGLE_CLOUD_PROJECT"))
	if err != nil {
		log.Fatalf("Error making datastore connection: %s", err)
	}
	app.Datastore = dsClient

	restHandler := rest.ResourceHandler{
		EnableRelaxedContentType: true,
	}
	restHandler.SetRoutes(
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors", Func: app.GetSensors},
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors/:id", Func: app.GetSensor},
		&rest.Route{HttpMethod: "PUT", PathExp: "/sensors/:id", Func: app.PutSensor},
		&rest.Route{HttpMethod: "GET", PathExp: "/sensors/:id/readings", Func: app.GetReadings},
		&rest.Route{HttpMethod: "DELETE", PathExp: "/sensors/:id/readings", Func: app.DeleteReadings},
		&rest.Route{HttpMethod: "POST", PathExp: "/sensors/:id/adjust", Func: app.AdjustReadings},
		&rest.Route{HttpMethod: "POST", PathExp: "/sensors/:id/fix", Func: app.FixReadings},
	)
	http.Handle("/_/api/v1/", http.StripPrefix("/_/api/v1", &restHandler))

	http.HandleFunc("/_/webhook/reading", app.ReadingHandler)

	fs := http.FileServer(http.Dir("/app/static"))
	http.Handle("/_/static/", http.StripPrefix("/_/static", fs))

	http.HandleFunc("/", IndexHandler)

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
