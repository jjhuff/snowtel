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
import urllib2
import zlib

import webapp2
from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.ext.webapp.util import run_wsgi_app
from django.template.loader import render_to_string

import datastore

TIMESTAMP = 0
AMBIENT_TEMP = 1
SURFACE_TEMP = 2
SNOW_DEPTH = 3

class MainPage(webapp2.RequestHandler):
    def get(self):
        sensors = []
        for s in datastore.Sensor.all():
            d = {
                'id': s.key().id_or_name(),
                'url': '/sensor/%s'%s.key().id_or_name(),
                'name': s.location_name
                }
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

def safe_int(s):
    try:
        return int(round(float(s)))
    except:
        return None

def calc_distance(time_of_flight, temp):
    if time_of_flight == None:
        return None
    return 100 * (time_of_flight*1e-6) * (331.4 + 0.6*temp)

def getStationTemp(station_id):
    url = "http://api.wunderground.com/api/fca0029770ca8fd4/conditions/q/%s.json"%station_id
    try:
        result = urllib2.urlopen(url)
        data = json.loads(result.read())
        return data.get('current_observation',{}).get('temp_c', None)
    except urllib2.URLError, e:
        return None

class SensorPage(webapp2.RequestHandler):
    def _getReadings(self, sensor):
        readings_cache_key = 'r-'+sensor.key().id_or_name()
        data = memcache.get(readings_cache_key)
        if data:
            data = pickle.loads(zlib.decompress(data))
            oldest_dt = datetime.datetime.fromtimestamp(1+max(data, key=lambda r:r[0])[0]) # add an extra second to acount for fractional seconds
            readings = sensor.reading_set.filter('timestamp >', oldest_dt)
        else:
            data = []
            limit = datetime.datetime.now() - datetime.timedelta(days=30)
            readings = sensor.reading_set.filter('timestamp >', limit)

        # append any readings we need to
        cache_set = False
        for r in readings.order('-timestamp'):
            cache_set = True
            data.append([
                time.mktime(r.timestamp.timetuple()),
                r.station_temp,
                r.surface_temp,
                r.snow_depth
            ])
        data = sorted(data, key=lambda r:r[0])
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
                'real_data': len(readings)>1,
                'readings_json': readings_json,
                'sensor': sensor
            }
            self.response.out.write(render_to_string('readings.djhtml', template_values))

class SensorReadings(webapp2.RequestHandler):
    def get(self, sensor_id):
        self.redirect("/sensor/%s"%sensor_id)

    def post(self, sensor_id):
        ambient_temp = safe_float(self.request.POST.get('ambient_temp', None))
        surface_temp = safe_float(self.request.POST.get('surface_temp', None))
        time_of_flight = safe_int(self.request.POST.get('time_of_flight', None))

        # Calculate the temp-corrected distance
        distance = calc_distance(time_of_flight, ambient_temp)

        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)
        if not sensor:
            sensor = datastore.Sensor(
                key_name = sensor_id,
                snow_sensor_height = distance       # Pick the first reading as the height
            )
            sensor.put()

        if distance:
            snow_depth = sensor.snow_sensor_height - distance
        else:
            snow_depth = None

        station_temp = getStationTemp(sensor.station_id)

        reading = datastore.Reading(
            sensor = sensor,
            ambient_temp = ambient_temp,
            surface_temp = surface_temp,
            station_temp = station_temp,
            time_of_flight = time_of_flight,
            sensor_height = sensor.snow_sensor_height,
            snow_depth = snow_depth
        )
        reading.put()
        return webapp2.Response('')

class FixSensorReadings(webapp2.RequestHandler):
    def get(self, sensor_id):
        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)
        readings = sensor.reading_set.order('-timestamp')
        c = 0
        start = time.time()
        for r in readings:
            if time.time()-start >= 25:
                break
            if r.snow_depth != None and r.sensor_height == 176.7:
                c+=1
                r.snow_depth = r.snow_depth - (176.7-163.8)
                r.sensor_height = 163.8
                r.put()

        return webapp2.Response("%d\n"%c)

class RemoveSnowReadings(webapp2.RequestHandler):
    def get(self, sensor_id):
        sensor_key = db.Key.from_path('Sensor', sensor_id)
        sensor = datastore.Sensor.get(sensor_key)

        from_ts = int(self.request.GET.get('from'))
        from_ts = datetime.datetime.fromtimestamp(from_ts)
        to_ts = int(self.request.GET.get('to'))
        to_ts = datetime.datetime.fromtimestamp(to_ts)
        readings = sensor.reading_set.filter('timestamp >',from_ts).filter('timestamp <',to_ts)

        c = 0
        start = time.time()
        for r in readings:
            if time.time()-start >= 25:
                break
            r.snow_depth = None
            r.time_of_flight = None
            r.save()
            c+=1

        return webapp2.Response("%d\n"%c)

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
            reading.time_of_flight = r.time_of_flight
            reading.sensor_height = r.sensor_height
            reading.snow_depth = r.snow_depth
            reading.put()
            r.delete()
            c+=1
            if time.time()-start >= 25:
                break
        return webapp2.Response("%d\n"%c)


app = webapp2.WSGIApplication([
        ('/', MainPage),
        ('/sensor/([^/]*)', SensorPage),
        ('/sensor/(.*)/readings', SensorReadings),
        #('/sensor/(.*)/remove', RemoveSnowReadings),
        #('/sensor/(.*)/fix', FixSensorReadings),
        #('/sensor/(.*)/merge', MergeSensorReadings),
    ],debug=True)

