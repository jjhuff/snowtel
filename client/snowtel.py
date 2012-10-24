#!/usr/bin/python
import urllib
import urllib2
import sys
import time

import serial

port = sys.argv[1]
server_url = sys.argv[2]

ser = serial.Serial(port, 9600, timeout=10, xonxoff=True)

def safe_float(s):
    try:
        return float(s)
    except ValueError:
        return None

def read():
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
        medians[k] = median(v)

    return medians



#################################################
if __name__ == "__main__":
    readings = []
    report_interval = 10
    last_report = time.time()

    while True:
        try:
            d = read();
            readings.append(d);
            if time.time() - last_report > report_interval:
                last_report = time.time()
                m = calc_medians(readings)
                ret = urllib2.urlopen(server_url, urllib.urlencode(m));
                print ret.read();
                sys.stdout.flush()
                readings = []
        except Exception,e:
            print e
        time.sleep(.25)
