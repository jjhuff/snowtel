#!/bin/bash
APP=$( dirname "${BASH_SOURCE[0]}" )
~/google_appengine/appcfg.py --oauth2 update default.yaml batch.yaml
~/google_appengine/appcfg.py --oauth2 update_dispatch $APP
