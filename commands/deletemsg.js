const common = require('../common/common');

module.exports = {
	name: 'deletemsg',
    description: 'Deletes last X messages',
    args: true,
    minargs: 1,
    usage: '<number_of_messages>',
	execute
};

async function execute(message, args) {
	
    let numMsgs = parseInt(args[0]);

    if (numMsgs < 1) {
        message.channel.send('Number of messages must be greater than 0!');
		console.log('Number of messages must be greater than 0!');
		return;
    } 
    
    if (message.author.tag !== "pedrofixe#0183") {
        message.channel.send('You don\'t have permission to use this command!');
		console.log('You don\'t have permission to use this command!');
		return;
    }

    message.channel.bulkDelete(numMsgs+1);
    message.channel.send(`Deleted ${numMsgs} messages`);
}