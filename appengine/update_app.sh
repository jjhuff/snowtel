#!/bin/bash
APP=$( dirname "${BASH_SOURCE[0]}" )
appcfg.py --oauth2 -A methowsnow update default.yaml batch.yaml
appcfg.py --oauth2 -A methowsnow update_dispatch $APP
