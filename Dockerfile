FROM buildpack-deps:jessie

# Install deps
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
		g++ \
		gcc \
		libc6-dev \
		make \
        unzip \
        python \
        ruby-compass \
    && rm -rf /var/lib/apt/lists/*


# Install NodeJS
ENV NODE_VERSION 6.9.3
RUN curl -SLO "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.gz" \
	&& tar -xzf "node-v$NODE_VERSION-linux-x64.tar.gz" -C /usr/local --strip-components=1 \
	&& rm "node-v$NODE_VERSION-linux-x64.tar.gz"

# Install Golang
ENV GOLANG_VERSION 1.6.2
ENV GOLANG_DOWNLOAD_URL https://golang.org/dl/go$GOLANG_VERSION.linux-amd64.tar.gz
RUN curl -fsSL "$GOLANG_DOWNLOAD_URL" -o golang.tar.gz \
	&& tar -C /usr/local -xzf golang.tar.gz \
	&& rm golang.tar.gz
ENV GOPATH /go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH
RUN mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 777 "$GOPATH"

# Install AppEngine SDK
ENV GAE_VER 1.9.48
ENV GAE_ZIP go_appengine_sdk_linux_amd64-$GAE_VER.zip
RUN curl -SLO "https://storage.googleapis.com/appengine-sdks/featured/$GAE_ZIP" \
  && unzip "$GAE_ZIP" -d /usr/local \
  && rm "$GAE_ZIP"
ENV PATH $PATH:/usr/local/go_appengine/

# Install Google Cloud SDK
ENV CLOUDSDK_VER 138.0.0
ENV CLOUDSDK_ZIP google-cloud-sdk-$CLOUDSDK_VER-linux-x86_64.tar.gz
RUN curl -SLO "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/$CLOUDSDK_ZIP" \
  && tar -C /usr/local -xzf "$CLOUDSDK_ZIP" \
  && rm "$CLOUDSDK_ZIP"

ENV CLOUDSDK_PYTHON_SITEPACKAGES 1
RUN /usr/local/google-cloud-sdk/install.sh --usage-reporting=true --path-update=true --bash-completion=true --additional-components app-engine-python app-engine-go app kubectl alpha beta docker-credential-gcr
ENV PATH $PATH:/usr/local/google-cloud-sdk/bin/

# Disable updater check for the whole installation.
# Users won't be bugged with notifications to update to the latest version of gcloud.
RUN /usr/local/google-cloud-sdk/bin/gcloud config set --installation component_manager/disable_update_check true
RUN sed -i -- 's/\"disable_updater\": false/\"disable_updater\": true/g' /usr/local/google-cloud-sdk/lib/googlecloudsdk/core/config.json

#########################
RUN mkdir -p /src/app
WORKDIR /src/app

# Make ports accessible
EXPOSE 8080-8090
EXPOSE 8000

#Install global tools
RUN npm install -g bower gulp

#install our Node deps
COPY package.json /src/
RUN npm install

ENTRYPOINT ["gulp"]
