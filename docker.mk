# Define shared docker vars

export DOCKER_BUILDKIT=1

DOCKER_RUN := docker run --rm -t \
	--net host \
	--user $(CURRENT_UID) \
	-v ~/.config/gcloud:/.config/gcloud \
	-v $(ROOT_DIR):/code:cached \
	-e GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT} \

DOCKER_BUILD := docker build \
	--build-arg BUILDKIT_INLINE_CACHE=1 \

# Patterns for container builds
_docker_%: DOCKER_FILE=Dockerfile.$*
_docker_%: DOCKER_CONTEXT=.
_docker_%:
	$(DOCKER_BUILD) \
		-f $(DOCKER_FILE) \
		-t methowsnow_$* \
		-t methowsnow_$*:latest \
		$(DOCKER_CONTEXT)

