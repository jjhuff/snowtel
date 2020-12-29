export GOOGLE_CLOUD_PROJECT := methowsnow
export CURRENT_UID := $(shell id -u):$(shell id -g)
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

include docker.mk

run: ## Start the app
run: _docker_godev _docker_jsdev
	docker-compose up

godev: ## Start a go dev shell
godev: _docker_godev
	$(DOCKER_RUN) -i methowsnow_godev /bin/bash

gcloud: ## Start a gcloud shell
gcloud: _docker_gcloud
	$(DOCKER_RUN) -i methowsnow_gcloud /bin/bash

jsdev: ## Start a js dev shell
jsdev: _docker_jsdev
	$(DOCKER_RUN) -i methowsnow_jsdev /bin/bash

login: ## Login to various Google stuff
	gcloud config set project $(GOOGLE_CLOUD_PROJECT)
	gcloud auth application-default login
	gcloud auth login

help: ## Help!
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
