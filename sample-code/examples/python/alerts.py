from socketIO_client import SocketIO

"""
Please note that you will need to install the socketIO-client python module.

This app will block on the wait() method until messages are recieved.  It's
advised to read the documentation for socketIO-client and listen for alerts
in a seperate thread.

This should not be considered production quality.
"""


class Alerts(object):
    def __init__(self):
        self.socket = SocketIO('localhost', 4723)
        self.connect_events()
        self.socket.wait()

    def connect_events(self):
        self.socket.on('connect', self.on_connect)
        self.socket.on('disconnect', self.on_disconnect)
        self.socket.on('alert', self.on_alert)
        self.socket.on('error', self.on_error)

    def on_connect(self):
        print "[connected]"

    def on_alert(self, *args):
        message = args[0]['message']
        print 'on_alert', str(message)

    def on_disconnect(self):
        print "[disconnected]"

    def on_error(self, name, message):
        print('Error: %s: %s' % (name, message))


if __name__ == "__main__":
    alerts = Alerts()
