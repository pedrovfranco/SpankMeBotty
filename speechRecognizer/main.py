#!/usr/bin/env python3

import flask
import json
import os

from constants import RecognizeResultType
from recognize import recognizeAudioFile

app = flask.Flask(__name__)

@app.route('/ping', methods=['GET'])
def ping():

    print('alive!')
    return ("pong")


@app.route('/recognize/<filename>', methods=['GET'])
def serveRecognizeAudioFile(filename):

    print('get request')

    response = recognizeAudioFile(filename)
    print(filename + ':')
    print(response.__dict__)
    return flask.jsonify(response.__dict__)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
