#!/usr/bin/python
from optparse import OptionParser
import sys
import time
from uuid import getnode
import urllib
import urllib2

import serial


def safe_float(s):
    try:
        return float(s)
    except ValueError:
        return None

def read(ser):
    d = {
        'ambient_temp': None,
        'surface_temp': None,
        'snow_height': None
    }

    try:
        ser.write('t')
        l = ser.readline().strip().split()
        if len(l):
            d['surface_temp'] = safe_float(l[0])
            d['ambient_temp'] = safe_float(l[1])

        ser.write('d')
        l = ser.readline().strip().split()
        if len(l):
            d['snow_height'] = safe_float(l[1]) # TODO: temp correction
    except Exception, e:
        print e

    return d

def median(data):
    data = sorted(data)
    length = len(data)
    if not length % 2:
        return (data[length / 2] + data[length / 2 - 1]) / 2.0
    return data[length / 2]

def calc_medians(data):
    medians = {}
    for d in data:
        for k,v in d.items():
            medians.setdefault(k,[]).append(v)

    for k,v in medians.items():
        v = median(v)
        if v != None:
            medians[k] = v
        else:
            del medians[k]

    return medians



#################################################
if __name__ == "__main__":
    usage = "usage: %prog [options]"
    parser = OptionParser(usage=usage)
    parser.add_option("-i", "--id", dest="sensor_id", default=getnode(),
                      help="Server to talk to")
    parser.add_option("-s", "--server", dest="server", default="methowsnow.appspot.com",
                      help="Server to talk to")
    parser.add_option("-r", "--rate", dest="rate", default=10,
                    help="How often to send data to the server")
    parser.add_option("-p", "--port", dest="port", default="/dev/ttyUSB0",
                      help="Sensor id")

    (options, args) = parser.parse_args()

    ser = serial.Serial(options.port, 9600, timeout=10, xonxoff=True)

    server_url = 'http://%s/sensor/%s/readings'%(options.server, options.sensor_id)

    readings = []
    report_interval = options.rate
    last_report = time.time()

    while True:
        try:
            d = read(ser);
            readings.append(d);
            if time.time() - last_report > report_interval:
                last_report = time.time()
                m = calc_medians(readings)
                print '\t'.join('%s: %.1f'%x for x in m.iteritems())
                ret = urllib2.urlopen(server_url, urllib.urlencode(m));
                sys.stdout.flush()
                readings = []
        except Exception,e:
            print e
        time.sleep(.25)
