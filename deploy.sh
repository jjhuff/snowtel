#!/bin/bash

source functions.sh

DockerBuild
DockerRun "" "deploy"
