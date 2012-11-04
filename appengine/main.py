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
import pickle
import json
import time
import zlib

import webapp2
from google.appengine.api import memcache
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
    def _getReadings(self, sensor):
        readings_cache_key = 'r-'+sensor.key().id_or_name()
        data = memcache.get(readings_cache_key)
        if data:
            data = pickle.loads(zlib.decompress(data))
            oldest_dt = datetime.datetime.fromtimestamp(1+max(data, key=lambda r:r[0])[0]) # add an extra second to acount for fractional seconds
            readings = sensor.reading_set.filter('timestamp >', oldest_dt)
        else:
            data = []
            readings = sensor.reading_set

        # append any readings we need to
        cache_set = False
        for r in readings:
            cache_set = True
            data.append([
                time.mktime(r.timestamp.timetuple()),
                r.ambient_temp,
                r.surface_temp,
                r.snow_height
            ])
        if cache_set:
            dump = zlib.compress( pickle.dumps(data, pickle.HIGHEST_PROTOCOL), 9)
            logging.info('Readings compressed size: %d'%len(dump))
            memcache.set(readings_cache_key, dump)
        return data

    def get(self, sensor_id):
        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)
        readings = self._getReadings(sensor)
        readings_json = json.dumps(readings)
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

