#!/usr/bin/python
from optparse import OptionParser
import sys
import time
import traceback
from uuid import getnode
import urllib
import urllib2

import serial

enclosure_sensor = ''

def safe_float(s):
    try:
        return float(s)
    except ValueError:
        return None

def read_data(ser):
    d = { }

    try:
        ser.flushInput()
        ser.write('t')
        l = ser.readline().strip().split()
        if len(l):
            d['surface_temp'] = safe_float(l[0])
            d['ambient_temp'] = safe_float(l[1])

        ser.flushInput()
        ser.write('d')
        l = ser.readline().strip().split()
        #print "D: %s"%repr(l)
        if len(l):
            h = safe_float(l[0])
            if h<500:
                d['snow_dist'] = h

        ser.flushInput()
        ser.write('o')
        l = ser.readline().strip().split()
        if len(l):
            d['head_temp'] = safe_float(l[0])

        if enclosure_sensor:
            try:
                temp = open('/mnt/1wire/uncached/%s/temperature'%enclosure_sensor).read()
                d['enclosure_temp'] = safe_float(temp)
            except IOError:
                pass

    except Exception, e:
        print e
        traceback.print_exc()
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
        m = median(v)
        print "%s: len:%d median:%.1f"%(k, len(v), m)
        if m != None and len(v)>=30:
            medians[k] = m
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
    parser.add_option("-e", "--enclosure", dest="enclosure", default="",
                      help="Enclosure 1wire sensor")
    parser.add_option("-r", "--rate", dest="rate", default=10,
                    help="How often to send data to the server")
    parser.add_option("-p", "--port", dest="port", default="/dev/ttyUSB0",
                      help="Sensor id")

    (options, args) = parser.parse_args()

    ser = serial.Serial(options.port, 9600, timeout=10, xonxoff=True)

    server_url = 'http://%s/sensor/%s/readings'%(options.server, options.sensor_id)

    enclosure_sensor = options.enclosure

    readings = []
    report_interval = int(options.rate)
    last_report = time.time()

    while True:
        try:
            d = read_data(ser);
            #print d
            readings.append(d);
            if time.time() - last_report > report_interval:
                last_report = time.time()
                m = calc_medians(readings)
                print '\t'.join('%s: %.1f'%x for x in m.iteritems())
                print
                sys.stdout.flush()
                ret = urllib2.urlopen(server_url, urllib.urlencode(m));
                readings = []
        except Exception,e:
            print e
            traceback.print_exc()
        time.sleep(.25)
