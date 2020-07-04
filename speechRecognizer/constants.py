import collections
import os
path = os.path

class RecognizeResultType:
	def __init__(self, success=False, message='', filename=''):
		self.success = success
		self.message = message
		self.filename = filename

recognizer_keywords = os.environ['RECOGNIZER_KEYWORDS']

# result = []
# success = True
# with open(path.join(path.dirname(path.realpath(__file__)), '..', 'keywords.txt'), 'r') as infile:
# 	lines = infile.read().split('\n');

# 	for x in lines:

# 		if (x == "" or str.isspace(x)):
# 			continue
		
# 		args = x.split(',')

# 		if len(args) == 2:
# 			result.append((args[0], float(args[1])))
# 		else:
# 			print('Error reading file')
# 			print('line: ' + x)
# 			success = False

# if success:
# 	recognizer_keywords = result
