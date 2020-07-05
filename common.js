
const Emote = require('./database/models/emote');
const fs = require('fs');
const path = require('path');

exports.prefix = ',';
exports.audioFileFormat = 'flac';
exports.recognitionServiceEndpoint = process.env.NODE_ENV==='production' ? 'https://spank-me-botty.herokuapp.com' : 'http://localhost:' + (5000);
exports.killList = ['reddevil21', 'tomasbm'];
exports.audioFileCounter = 0;


exports.validObject = (obj) => {
	return (obj !== undefined && obj !== null);
}

exports.printCommand = (message) => {
	let msg = message.content.slice(exports.prefix.length);

	console.log('Received command: ' + msg);
}


exports.sendEmote = (message, emoteName) => {
	Emote.findOne({ name: emoteName }).orFail()
	.then(result => {

		// console.log(result);

		let filepath = path.join('emotes', result.filename);
		
		if (!fs.existsSync(filepath))
			fs.writeFileSync(filepath, result.data, {encoding: 'binary'});

		message.channel.send({
			files: [{
				attachment: filepath,
			  }]
		})
		.then((res) => {
			message.delete()
			.catch(console.error);
		})
		.catch((err) => {
			console.log('Failed to send ' + emoteName);
			console.error(err);
		});
	})
	.catch(err => {
	})

}