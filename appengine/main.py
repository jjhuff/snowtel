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
        sensors = []
        for s in datastore.Sensor.all():
            #cur = s.reading_set.order('-timestamp').get()
            d = {
                'id': s.key().id_or_name(),
                'url': '/sensor/%s/readings'%s.key().id_or_name(),
                'name': s.location_name
                }
            #if cur:
            #    d.update({'air': cur.ambient_temp,
            #    'surface': cur.surface_temp,
            #    'depth': cur.snow_height
            #    })
            sensors.append(d)
        sensors_json = json.dumps(sensors)
        if self.request.get('format', None) == 'json':
            self.response.out.write(sensors_json)
        else:
            template_values={
                'sensors_json': sensors_json
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
            readings = sensor.reading_set.order('-timestamp')

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

        for r in data:
            if r[2] and r[3]:
                offset = sensor.snow_sensor_height*(.6/331.4)*r[2]
                r.append(r[3] - offset)
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
        snow_height = None
        if distance:
            if distance < 400:
                snow_height = sensor.snow_sensor_height-distance
            else:
                logging.info("Invalid height reading: %f"%distance)

        reading = datastore.Reading(
            sensor = sensor,
            ambient_temp = safe_float(self.request.POST.get('ambient_temp', None)),
            surface_temp = safe_float(self.request.POST.get('surface_temp', None)),
            snow_height = snow_height
        )
        reading.put()
        return webapp2.Response('')

class FilterSensorReadings(webapp2.RequestHandler):
    def get(self, sensor_id):
        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)
        readings = sensor.reading_set.order('-timestamp')
        max_height = safe_float(self.request.GET.get('max_height', None))
        min_height = safe_float(self.request.GET.get('min_height', None))
        for r in readings:
            if r.snow_height:
                if max_height and r.snow_height > max_height :
                    logging.info('removing %s height:%f'%(r.timestamp, r.snow_height))
                    r.snow_height = None
                    r.put()
                if min_height and r.snow_height < min_height :
                    logging.info('removing %s height:%f'%(r.timestamp, r.snow_height))
                    r.snow_height = None
                    r.put()

class MergeSensorReadings(webapp2.RequestHandler):
    def get(self, sensor_id):
        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)

        from_id = self.request.GET.get('from')
        from_sensor = datastore.Sensor.get( db.Key.from_path('Sensor', from_id))
        from_readings = from_sensor.reading_set.order('-timestamp')

        c = 0
        start = time.time()
        for r in from_readings:
            logging.info("merging: %s"%r.timestamp)
            reading = datastore.Reading(sensor = sensor)
            reading.timestamp = r.timestamp
            reading.ambient_temp = r.ambient_temp
            reading.surface_temp = r.surface_temp
            reading.snow_height = r.snow_height
            reading.put()
            r.delete()
            c+=1
            if time.time()-start >= 20:
                break
        return webapp2.Response(str(c))


app = webapp2.WSGIApplication([
        ('/', MainPage),
        ('/sensor/(.*)/readings', SensorReadings),
        ('/sensor/(.*)/filter_readings', FilterSensorReadings),
        ('/sensor/(.*)/merge', MergeSensorReadings),
    ],debug=True)

