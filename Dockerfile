FROM google/cloud-sdk:latest

ARG GOPATH=/go
ENV GOPATH=${GOPATH} \
	PATH=/go/bin:/usr/local/go/bin:$PATH

ARG GOLANG_VERSION=1.14.3
ARG GOLANG_DOWNLOAD_SHA256=1c39eac4ae95781b066c144c58e45d6859652247f7515f0d2cba7be7d57d2226

RUN set -eux && \
	apt-get update && \
	apt-get install -yqq --no-install-suggests --no-install-recommends \
		libc6-dev \
		make \
		unzip && \
	rm -rf /var/lib/apt/lists/* && \
	\
	curl -o go.tgz -sSL "https://golang.org/dl/go${GOLANG_VERSION}.linux-amd64.tar.gz" && \
	echo "${GOLANG_DOWNLOAD_SHA256} *go.tgz" | sha256sum -c - && \
	tar -C /usr/local -xzf go.tgz && \
	rm go.tgz && \
	mkdir ${GOPATH}

VOLUME ["/root/.config"]

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
