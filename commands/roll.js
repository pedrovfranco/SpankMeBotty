const common = require('../common/common');

module.exports = {
    name: 'roll',
    description: 'Rolls a pseudo dice. If no args then rolls between 1 and 100',
    usage: '<max_bound>\n<min_bound> <max_bound>',
    execute,
};


async function execute(message, args) {
    
    let min, max;
    if (args.length === 0) {
        min = 1;
        max = 100;
    }

    else if (args.length === 1) {
        min = 1;
        max = parseInt(args[0]);
    }

    else {
        min = parseInt(args[0]);
        max = parseInt(args[1]);
    }

    if (max < min) {
        common.printUsage(message, module.exports);
        return;
    }

    let msg = 'I rolled ';

    let rnd = Math.random() * (max-min) + min;
    rnd = Math.round(rnd);

    msg += rnd;

    message.channel.send(msg);
}