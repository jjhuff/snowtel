#!/bin/bash
APP=$( dirname "${BASH_SOURCE[0]}" )
appcfg.py --oauth2 update default.yaml batch.yaml
appcfg.py --oauth2 update_dispatch $APP
