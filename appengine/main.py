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

import webapp2
from google.appengine.ext import db
from google.appengine.ext.webapp.util import run_wsgi_app
from django.template.loader import render_to_string

import datastore

class MainPage(webapp2.RequestHandler):
    def get(self):
        template_values={
            'sensors': datastore.Sensor.all()
        }
        self.response.out.write(render_to_string('index.djhtml', template_values))

def safe_float(s):
    try:
        return float(s)
    except:
        return None

class SensorReadings(webapp2.RequestHandler):
    def get(self, sensor_id):
        self.response.out.write(render_to_string('readings.djhtml', {}))
        return
        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)
        # only show last 24hrs
        #dt = datetime.datetime.now() - datetime.timedelta(hours=24)
        #readings = sensor.reading_set.filter('timestamp >', dt).order('-timestamp')
        readings = sensor.reading_set
        ret = []
        for r in readings:
            ret.append([
                r.timestamp.isoformat(),
                r.ambient_temp,
                r.surface_temp,
                r.snow_height
            ])
        readings_json = json.dumps(ret)
        if self.request.get('format', None) == 'json':
            self.response.out.write(readings_json)
        else:
            template_values={
                'readings_json': readings_json,
                'sensor': sensor
            }
            self.response.out.write(render_to_string('readings.djhtml', template_values))

    def post(self, sensor_id):
        distance = safe_float(self.request.POST.get('snow_height', None))

        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)
        if not sensor:
            sensor = datastore.Sensor(
                key_name = sensor_id,
                snow_sensor_height = distance       # Pick the first reading as the height
            )
            sensor.put()
        distance = safe_float(self.request.POST.get('snow_height', None))
        if distance:
            snow_height = sensor.snow_sensor_height-distance
        else:
            snow_height = None
        reading = datastore.Reading(
            sensor = sensor,
            ambient_temp = safe_float(self.request.POST.get('ambient_temp', None)),
            surface_temp = safe_float(self.request.POST.get('surface_temp', None)),
            snow_height = snow_height
        )
        reading.put()
        return webapp2.Response('')


app = webapp2.WSGIApplication([
        ('/', MainPage),
        ('/sensor/(.*)/readings', SensorReadings),
    ],debug=True)

