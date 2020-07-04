const fs = require('fs');
const path = require('path');
const download = require('image-downloader')
const imageType = require('image-type');
const common = require('../common');

const Emote = require('../database/models/emote');

module.exports = {
	name: 'emoteconfig',
    description: 'Manage emotes',
    args: true,
    minargs: 1,
    usage: '<register/remove> <emote_name> <emote_link>',
	execute,
};

async function execute(message, args) {



	if (args[0] === 'register') {
        handleRegister(message, args);
        
        if (args.length === 1) {
            message.channel.send(`Usage: \`${common.prefix}${module.exports.name} ${module.exports.usage}\``);
            return;
        }
    }
    else if (args[0] === 'remove') {
        handleRemove(message, args);

        if (args.length === 1) {
            message.channel.send(`Usage: \`${common.prefix}${module.exports.name} ${module.exports.usage}\``);
            return;
        }
    }
    else if (args[0] === 'list') {
        handleList(message, args);
    }

}

function handleRegister(message, args) {

    if (args.length === 1) {
        message.channel.send("Please specify a link");
        return;
    }

    let link = args[2];
    let filename;
    let emoteName;
    let hasExtension;

    filename = link.substr(link.lastIndexOf('/')+1);
    hasExtension = (filename.lastIndexOf('.') !== -1);

    if (args.length === 2) {

        // Create emoteName from filename without extension
        if (hasExtension) {
            emoteName = filename.substr(0, filename.lastIndexOf('.'));
        }
        else {
            emoteName = filename;
        }

    }
    else if (args.length === 3) {
        emoteName = args[1];
    }
           
    download.image({
        url: link,
        dest: path.join(__dirname, '..', 'emotes', emoteName) + '.tmp'
    })
    .then(({ filename }) => {

        let filepath = filename;
        const prunedFilepath = filepath.substr(0, filepath.lastIndexOf('.'));

        fs.readFile(filepath, (err, data) => {

            if (err) {
                console.log(err);
            }

            const imageInfo = imageType(data);

            fs.renameSync(filepath, prunedFilepath + '.' + imageInfo.ext);
            filepath = prunedFilepath + '.' + imageInfo.ext;

            const newEmote = new Emote({
                name: emoteName,
                filepath: filepath,
                creator: message.author.tag,
            });

            newEmote.save()
            .then(mapping => {
                console.log('Saved ' + emoteName);
                message.channel.send('Saved ' + emoteName);
            })
            .catch(err => {
                console.log(err);
                let errorMsg = 'Failed to save ' + emoteName;

                if (err.code === 11000) {
                    errorMsg += ', name already exists';
                }

                message.channel.send(errorMsg);
            });
        
            console.log("The file was saved!");
        });
    })
    .catch((err) => {
        console.error(err);
    });

}


function handleRemove(message, args) {

    Emote.findOneAndDelete({ name: args[1] }).orFail()
    .then(result => {

        fs.unlink(result.filepath, (err) => {
            message.channel.send('Removed emote ' + result.name);
        })
    })
    .catch(err => {
        console.log(err);
        message.channel.send('Emote does not exist!');
    })
}

function handleList(message, args) {
  
    Emote.find()
    .then(mappings => {

        let list = 'Emotes:\n\`';

        for (let i = 0; i < mappings.length; i++) {
            const entry = mappings[i];

            list += entry.name;

            if (i < mappings.length-1) {
                list += '\n';
            }

        }

        list += '\`'

        message.channel.send(list);

    })
    .catch(err => {
      res.status(404).send(err);
    })
  

}