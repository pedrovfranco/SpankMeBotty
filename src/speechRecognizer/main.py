#!/usr/bin/env python3

import flask
import json
import os

from constants import RecognizeResultType
from recognize import recognizeAudioFile

app = flask.Flask(__name__)

@app.route('/ping', methods=['GET'])
def ping():

    return ("pong")


@app.route('/recognize/<filename>', methods=['GET'])
def serveRecognizeAudioFile(filename):

    response = recognizeAudioFile(filename)
    print(response.__dict__, flush=True)
    return flask.jsonify(response.__dict__)

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
