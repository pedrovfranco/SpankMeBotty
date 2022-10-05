const { SlashCommandBuilder } = require('@discordjs/builders');
const fs = require('fs');
const path = require('path');
const download = require('image-downloader')
const imageType = import('image-type');
const common = require('../common/common');

const Emote = require('../database/models/emote');

const maxFileSize = 8*1024*1024;

module.exports = {	
	data: new SlashCommandBuilder()
		.setName('emoteconfig')
		.setDescription('Manage emotes')
        .addSubcommand(subcommand => subcommand
            .setName('register')
            .setDescription('Registers an emote')
            .addStringOption(option => option
                .setName('emote_link')
                .setDescription('The link to the image file')
                .setRequired(true)
            ).addStringOption(option => option
                .setName('emote_name')
                .setDescription('The desired emote name')
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('remove')
            .setDescription('Removes an emote')
            .addStringOption(option => option
                .setName('emote_name')
                .setDescription('The emote name')
                .setRequired(true)
            )
        )
        .addSubcommand(subcommand => subcommand
            .setName('list')
            .setDescription('Lists all emotes for this server')
        ),

    handleRegister: handleRegister,
    handleRemove: handleRemove,
    handleList: handleList,

    async execute(interaction) {
        let commandType = interaction.options.getSubcommand();
        console.log(commandType);

        if (commandType === 'register') {
            let emoteLink = interaction.options.getString('emote_link');
            let emoteName = interaction.options.getString('emote_name');

            handleRegister(interaction, emoteLink, emoteName);
        }
        else if (commandType === 'remove') {
            let emoteName = interaction.options.getString('emote_name');

            handleRemove(interaction, emoteName);
        }
        else if (commandType === 'list') {
            handleList(interaction);
        }
    },
};

async function handleRegister(interaction, emoteLink, emoteName) {

    let filename;
    let hasExtension;

    filename = emoteLink.substr(emoteLink.lastIndexOf('/')+1);
    hasExtension = (filename.lastIndexOf('.') !== -1);

    // Create emoteName from the filename
    if (emoteName === null || emoteName === undefined) {

        // Create emoteName from filename without extension
        if (hasExtension) {
            emoteName = filename.substr(0, filename.lastIndexOf('.'));
        }
        else {
            emoteName = filename;
        }
    }

    Emote.findOne({ name: emoteName, guildId: interaction.guild.id }).orFail()
    .then(() => {
        interaction.reply('An emote with that name already exists in this server!');
    })
    .catch(() => {
        download.image({
            url: emoteLink,
            dest: path.join(__dirname, '..', 'emotes', emoteName) + '.tmp'
        })
        .then(({ filename }) => {

            let filepath = filename;

            try {
                let data = fs.readFileSync(filepath);

                if (data.length > maxFileSize) {
                    interaction.reply("The image is too big!");
                    return;
                }

                const imageInfo = imageType(data);

                if (!common.validObject(imageInfo)) {
                    interaction.reply("That doesn't look like an image...");
                    return;
                }

                console.log("The file was saved!");

                const newEmote = new Emote({
                    name: emoteName,
                    data: data,
                    guildId: interaction.guild.id,
                    filename: emoteName + '.' + imageInfo.ext,
                    creator: interaction.member.user.tag,
                });

                newEmote.save()
                .then(mapping => {
                    console.log('Saved ' + emoteName);
                    interaction.reply('Saved ' + emoteName);
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

                    interaction.reply(errorMsg);
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
            console.log(err);
        });
    })
};

async function handleRemove(interaction, emoteName) {
    
    Emote.findOneAndDelete({ name: emoteName, guildId: interaction.guild.id}).orFail()
    .then(result => {
        interaction.reply('Removed emote ' + result.name);
    })
    .catch(err => {
        console.log(err);
        interaction.reply('Emote does not exist!');
    })
};

async function handleList(interaction) {
    
    Emote.find({guildId: interaction.guild.id})
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


        interaction.reply(list);

    })
    .catch(err => {

        console.log(err);
        interaction.reply("Oops, something went wrong!");

    })
};