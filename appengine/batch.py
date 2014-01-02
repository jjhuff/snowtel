#!/usr/bin/env python
#
# Copyright 2011 Justin Huff <jjhuff@mspin.net>
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
#
import datetime
import logging
import json
import time
import urllib2
import zlib

import webapp2
from google.appengine.ext import db
from google.appengine.ext.webapp.util import run_wsgi_app

import datastore

TIMESTAMP = 0
AMBIENT_TEMP = 1
SURFACE_TEMP = 2
SNOW_DEPTH = 3

def safe_float(s):
    try:
        return float(s)
    except:
        return None

class ExportReadings(webapp2.RequestHandler):
    def get(self, sensor_id):
        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)

        readings = sensor.reading_set

        if 'from' in self.request.GET:
            from_ts = int(self.request.GET.get('from'))
            from_ts = datetime.datetime.fromtimestamp(from_ts)
            readings = readings.filter('timestamp >',from_ts)

        if 'to' in self.request.GET:
            to_ts = int(self.request.GET.get('to'))
            to_ts = datetime.datetime.fromtimestamp(to_ts)
            readings = readings.filter('timestamp <',to_ts)

        readings = readings.order('-timestamp')

        def format_float(f):
            return "%0.1f"%f if f else ""

        self.response.headers.add("Content-Disposition", "attachment; filename='sensor_%s.csv'"%sensor_id)
        self.response.out.write("Timestamp(UTC),SurfaceTemp,AirTemp1,AirTemp2,WeatherStationTemp,SnowDepth\n")
        for r in readings:
            line = ["%s"%r.timestamp.replace(microsecond=0),
                format_float(r.surface_temp),
                format_float(r.ambient_temp),
                format_float(r.head_temp),
                format_float(r.station_temp),
                format_float(r.snow_depth)
            ]
            self.response.out.write(','.join(line)+'\n')


app = webapp2.WSGIApplication([
        ('/export/(.*)', ExportReadings),
    ],debug=True)

