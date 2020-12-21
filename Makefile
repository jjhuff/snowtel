GOOGLE_CLOUD_PROJECT := methowsnow
CURRENT_UID := $(shell id -u):$(shell id -g)
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

include docker.mk


deploy: _docker_gcloud
	$(DOCKER_RUN) -i  methowsnow_gcloud app deploy go/snow.mspin.net/frontend/app.yaml

logs: _docker_gcloud
	$(DOCKER_RUN) -i  methowsnow_gcloud app logs tail

run: _docker_frontend
	$(DOCKER_RUN) -i -p 8080:8080 methowsnow_frontend

gcloud: _docker_gcloud
	$(DOCKER_RUN) -i --entrypoint= methowsnow_gcloud /bin/bash

webpack_shell: _docker_webpack
	$(DOCKER_RUN) -i --entrypoint= methowsnow_webpack /bin/bash

webpack: _docker_webpack
	$(DOCKER_RUN) -i methowsnow_webpack --mode development


login: ## Login to various Google stuff
	gcloud config set project $(GOOGLE_CLOUD_PROJECT)
	gcloud auth application-default login
	gcloud auth login

help: ## Help!
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
