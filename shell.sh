#!/bin/bash

source functions.sh

DockerBuild
DockerRun "--entrypoint=/bin/bash"
