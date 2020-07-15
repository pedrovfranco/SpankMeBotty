
const Emote = require('./database/models/emote');
const fs = require('fs');
const path = require('path');

exports.prefix = ',';
exports.audioFileFormat = 'flac';
exports.recognitionServiceEndpoint = process.env.NODE_ENV==='production' ? 'https://spank-me-botty.herokuapp.com' : 'http://localhost:' + (5000);
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

		let filepath = path.join('emotes', result.filename);
		
		if (!fs.existsSync(filepath))
			fs.writeFileSync(filepath, result.data, {encoding: 'binary'});

		let cleanTag = message.author.tag.substr(0, message.author.tag.indexOf('#'));

		message.channel.send(cleanTag, {
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

exports.alertAndLog = (message, text) => {
	message.channel.send(text);
	console.log(text);
}