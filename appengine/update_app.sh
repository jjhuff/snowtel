#!/bin/bash
APP=$( dirname "${BASH_SOURCE[0]}" )
~/google_appengine/appcfg.py --oauth2 update $APP
