
exports.prefix = ',';
exports.audioFileFormat = 'flac';
exports.recognitionServiceEndpoint = 'http://localhost:8080';
exports.killList = ['reddevil21', 'tomasbm'];
exports.audioFileCounter = 0;


exports.validObject = (obj) => {
	return (obj !== undefined && obj !== null);
}

exports.printCommand = (message) => {
	let msg = message.content.slice(exports.prefix.length);

	console.log('Received command: ' + msg);
}
