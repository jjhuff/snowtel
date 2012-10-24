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

import webapp2
from google.appengine.ext.webapp import template
from google.appengine.ext.webapp.util import run_wsgi_app

import datastore

class MainPage(webapp2.RequestHandler):
    def get(self):
        template_values={
                }
        self.response.out.write(template.render('templates/index.djhtml', template_values))

class AddRating(webapp2.RequestHandler):
    def post(self):
        pass

app = webapp2.WSGIApplication([
        ('/', MainPage),
    ],debug=True)

