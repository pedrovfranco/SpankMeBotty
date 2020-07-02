import speech_recognition as sr
import os
path = os.path

from constants import RecognizeResultType, recognizer_keywords

tmp_folder = "tmp_audio_files"
adaptation_folder = "adaptation"
flag_clean_temp_files = True

acoustic_parameters_directory = path.join(path.dirname(path.realpath(__file__)), adaptation_folder, 'en-us')
language_model_file = path.join(path.dirname(path.realpath(__file__)), adaptation_folder, 'en-us.lm.bin')
phoneme_dictionary_file = path.join(path.dirname(path.realpath(__file__)), adaptation_folder, 'cmudict-en-us.dict')

print('recognizer_keywords:')
print(recognizer_keywords)

def recognizeAudioFile(filename):
	AUDIO_FILE = path.join(path.dirname(path.realpath(__file__)), tmp_folder + '/' + filename)

	# use the audio file as the audio source
	r = sr.Recognizer()
	with sr.AudioFile(AUDIO_FILE) as source:
		audio = r.record(source)  # read the entire audio file

	result = RecognizeResultType();
	result.filename = filename

	# recognize speech using Sphinx
	try:
		result.success = True
		result.message = r.recognize_sphinx(audio, keyword_entries=recognizer_keywords)
	except sr.UnknownValueError:
		result.success = False
		result.message = "Sphinx could not understand audio"
	except sr.RequestError as e:
		result.success = False
		result.message = "Sphinx error; {0}".format(e)

	if flag_clean_temp_files:
		os.remove(AUDIO_FILE)

	return result