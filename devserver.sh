#!/bin/bash

source functions.sh

DockerBuild
DockerRun "-p 8000:8000 -p 8080-8090:8080-8090" "server"
