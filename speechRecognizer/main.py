#!/usr/bin/env python3

import flask
import json

from constants import RecognizeResultType
from recognize import recognizeAudioFile

app = flask.Flask(__name__)
app.config["DEBUG"] = True


@app.route('/recognize/<filename>', methods=['GET'])
def serveRecognizeAudioFile(filename):

    response = recognizeAudioFile(filename)
    print(filename + ':')
    print(response.__dict__)
    return flask.jsonify(response.__dict__)


if __name__ == '__main__':
    app.run(port=8080, debug=False)
