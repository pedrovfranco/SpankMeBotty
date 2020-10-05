const fs = require('fs');
const path = require('path');
const download = require('image-downloader')
const imageType = require('image-type');
const common = require('../common/common');

const Emote = require('../database/models/emote');

const maxFileSize = 8*1024*1024;

module.exports = {
	name: 'emoteconfig',
    description: 'Manage emotes',
    args: true,
    minargs: 1,
    usage: 'register <emote_name> <emote_link>\nremove <emote_name>\nlist',
	execute,
    handleList,
};

async function execute(message, args) {

	if (args[0] === 'register') {
        handleRegister(message, args);
        
        if (args.length === 1) {
            common.printUsage(message, module.exports);
            return;
        }
    }
    else if (args[0] === 'remove') {
        handleRemove(message, args);

        if (args.length === 1) {
            common.printUsage(message, module.exports);
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

        try {
            let data = fs.readFileSync(filepath);

            if (data.length > maxFileSize) {
                message.channel.send("The image is too big!");
                return;
            }

            const imageInfo = imageType(data);

            if (!common.validObject(imageInfo)) {
                message.channel.send("That doesn't look like an image...");
                return;
            }

            console.log("The file was saved!");

            const newEmote = new Emote({
                name: emoteName,
                data: data,
                guildId: message.guild.id,
                filename: emoteName + '.' + imageInfo.ext,
                creator: message.author.tag,
            });

            newEmote.save()
            .then(mapping => {
                console.log('Saved ' + emoteName);
                message.channel.send('Saved ' + emoteName);
                fs.unlink(filepath, (err) => {
                    if (err) {
                        console.log(err);
                        return;
                    }
                });
            })
            .catch(err => {
                let errorMsg = 'Failed to save ' + emoteName;

                if (err.code === 11000) {
                    errorMsg += ', name already exists';
                }
                else {
                    errorMsg += ', unknown error';
                    console.log(err);
                }

                message.channel.send(errorMsg);
            });
            
        }
        catch (err) {
            console.log(err);
            console.log('oi');
            return;
        }
    })
    .catch((err) => {
        console.log('io');
        console.error(err);
    });

}


function handleRemove(message, args) {

    Emote.findOneAndDelete({ name: args[1] }).orFail()
    .then(result => {
        message.channel.send('Removed emote ' + result.name);
    })
    .catch(err => {
        console.log(err);
        message.channel.send('Emote does not exist!');
    })
}

function handleList(message, args) {

    Emote.find({guildId: message.guild.id})
    .then(mappings => {

        let list = 'Emotes:';

        if (mappings.length !== 0) {

            list += '\n\`'
            for (let i = 0; i < mappings.length; i++) {
                const entry = mappings[i];

                list += entry.name;

                if (i < mappings.length-1) {
                    list += '\n';
                }

            }

            list += '\`'
        }


        message.channel.send(list);

    })
    .catch(err => {

        console.log(err);
        message.channel.send("Oops, something went wrong!");

    })
}