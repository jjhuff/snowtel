export GOOGLE_CLOUD_PROJECT := methowsnow
export CURRENT_UID := $(shell id -u):$(shell id -g)
ROOT_DIR := $(shell dirname $(realpath $(lastword $(MAKEFILE_LIST))))

include docker.mk

deploy: _docker_gcloud
	$(DOCKER_RUN) -i  methowsnow_gcloud gcloud builds submit
	$(DOCKER_RUN) -i  methowsnow_gcloud gcloud run deploy frontend \
		--image gcr.io/methowsnow/frontend \
		--platform managed \
		--allow-unauthenticated \
		--region=us-central1 \
		--set-env-vars "GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}"

logs: _docker_gcloud
	$(DOCKER_RUN) -i  methowsnow_gcloud gcloud app logs tail

run: _docker_godev _docker_webpack
	docker-compose up

godev: _docker_godev
	$(DOCKER_RUN) -i methowsnow_godev /bin/bash

gcloud: _docker_gcloud
	$(DOCKER_RUN) -i methowsnow_gcloud /bin/bash

webpack: _docker_webpack
	$(DOCKER_RUN) -i methowsnow_webpack /bin/bash

login: ## Login to various Google stuff
	gcloud config set project $(GOOGLE_CLOUD_PROJECT)
	gcloud auth application-default login
	gcloud auth login

help: ## Help!
	@grep -h -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'
