let client = 'ajaja';

module.exports = {
	name: 'ping',
	description: 'Ping!',
	execute(message, args, client) {
        console.log(client);
	},
};