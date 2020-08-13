const common = require('../common');

const InygonAnnounceList = require('../database/models/inygonAnnounceList');

module.exports = {
    name: 'inygonannouncer',
    description: 'Manages the inygon announcer',
    args: true,
    minargs: 1,
    usage: 'register\nunregister',
    execute,
};

async function execute(message, args) {

    if (args.length !== 1) {
        common.printUsage(message, module.exports);
    }

    else if (args[0] === 'register') {
        handleRegister(message, args);
    }

    else if (args[0] === 'unregister') {
        handleUnregister(message, args);
    }
}

async function handleRegister(message, args) {

    let author = message.author;

    InygonAnnounceList.findOne({ name: author }).orFail()
    .then(result => {

        common.alertAndLog(message, 'You are already registered');
    })
    .catch(err => {

        const newRegistry = new InygonAnnounceList({
            name: author
        });

        newRegistry.save()
        .then(mapping => {

            common.alertAndLog(message, 'Registered successfully');

        })
        .catch(err => {
            console.log(err);
            common.alertAndLog(message, 'Failed to register');
        })
    })

}

async function handleUnregister(message, args) {
    let author = message.author;

    InygonAnnounceList.findOneAndDelete({ name: author }).orFail()
    .then(result => {
        common.alertAndLog(message, 'Unregistered successfully');
    })
    .catch(err => {
        common.alertAndLog(message, 'You are not registered');
    })
}
