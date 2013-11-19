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

import datetime
from google.appengine.ext import db

class Sensor(db.Model):
    location_name = db.StringProperty(default="New Sensor")
    snow_sensor_height = db.FloatProperty(default=0.0)
    webcam_url = db.LinkProperty(default=None)
    station_id = db.StringProperty(default=None)

class Reading(db.Model):
    sensor = db.ReferenceProperty(Sensor, required=True)
    timestamp = db.DateTimeProperty(auto_now_add=True)

    ambient_temp = db.FloatProperty()       # Snow sensor ambient temp (as reported by the IR sensor)
    surface_temp = db.FloatProperty()       # Ground/snow temp
    head_temp =  db.FloatProperty()         # Temp in the snow sensor head
    enclosure_temp =  db.FloatProperty()    # Temp in the RasberryPi enclosure

    station_temp = db.FloatProperty()       # Temp from weather station

    snow_depth = db.FloatProperty()         # Calculated snow depth

