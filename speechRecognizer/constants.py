import collections
import os
path = os.path
import json

class RecognizeResultType:
	def __init__(self, success=False, message='', filename=''):
		self.success = success
		self.message = message
		self.filename = filename

recognizer_keywords = []
recognizer_keywords_json = os.environ['RECOGNIZER_KEYWORDS']
recognizer_keywords_obj = json.loads(recognizer_keywords_json)


for i in range(0, len(recognizer_keywords_obj), 2):
	keyword = recognizer_keywords_obj[i]
	strictness = recognizer_keywords_obj[i+1]

	recognizer_keywords.append((keyword, float(strictness)))