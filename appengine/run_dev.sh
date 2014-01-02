#!/bin/bash
APP=$( dirname "${BASH_SOURCE[0]}" )
~/google_appengine/dev_appserver.py default.yaml batch.yaml dispatch.yaml
