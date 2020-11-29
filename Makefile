GOOGLE_CLOUD_PROJECT := methowsnow
CURRENT_UID := $(shell id -u):$(shell id -g)
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

include docker.mk


build: _docker_gcloud _docker_nodejs
	$(DOCKER_RUN) -i methowsnow_nodejs build

deploy: _docker_gcloud
	$(DOCKER_RUN) -i  methowsnow_gcloud app deploy -y go/snow.mspin.net/frontend/app.yaml

gcloud: _docker_gcloud
	$(DOCKER_RUN) -i --entrypoint= methowsnow_gcloud /bin/bash

nodejs: _docker_nodejs
	$(DOCKER_RUN) -i --entrypoint= methowsnow_nodejs /bin/bash

login: ## Login to various Google stuff
	gcloud config set project $(GOOGLE_CLOUD_PROJECT)
	gcloud auth application-default login
	gcloud auth login

help: ## Help!
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
