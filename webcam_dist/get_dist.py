#!/usr/bin/python

import Image
import select
import v4l2capture
import time

# Open the video device.
video = v4l2capture.Video_device("/dev/video1")

# Suggest an image size to the device. The device may choose and
# return another size if it doesn't support the suggested one.
size_x, size_y = video.set_format(1280, 1024)

# Create a buffer to store image data in. This must be done before
# calling 'start' if v4l2capture is compiled with libv4l2. Otherwise
# raises IOError.
video.create_buffers(1)

# Start the device. This lights the LED if it's a camera that has one.
video.start()

time.sleep(2)

# Send the buffer to the device. Some devices require this to be done
# before calling 'start'.
video.queue_all_buffers()


# Wait for the device to fill the buffer.
select.select((video,), (), ())

# The rest is easy :-)
image_data = video.read()
video.close()
image = Image.fromstring("RGB", (size_x, size_y), image_data)
image.save("image.jpg")
print "Saved image.jpg (Size: " + str(size_x) + " x " + str(size_y) + ")"
