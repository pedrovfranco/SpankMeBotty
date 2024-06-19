import { SlashCommandBuilder, ChatInputCommandInteraction, User } from 'discord.js';
import fs from 'fs';
import path from 'path';
import download from 'image-downloader';
import imageType from 'image-type';

import Emote from '../database/models/emote';

const maxFileSize = 8*1024*1024;

export let data = new SlashCommandBuilder()
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
    );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    let commandType = interaction.options.getSubcommand();

    if (interaction.guild?.id == undefined) {
        return;
    }

    await interaction.deferReply();

    if (commandType === 'register') {
        let emoteLink = interaction.options.getString('emote_link');
        let emoteName = interaction.options.getString('emote_name');

        if (emoteLink == undefined || emoteName == undefined) {
            interaction.editReply('Something went wrong.')
            console.error("emoteLink and emoteName must have a value, this should' happen as they are required");
            return;
        }

        handleRegister(interaction, emoteLink, emoteName);
    }
    else if (commandType === 'remove') {
        let emoteName = interaction.options.getString('emote_name');

        if (emoteName == undefined) {
            interaction.editReply('Something went wrong.')
            console.error(" emoteName must have a value, this should' happen as it is required");
            return;
        }

        handleRemove(interaction, emoteName);
    }
    else if (commandType === 'list') {
        handleList(interaction);
    }
}

async function handleRegister(interaction: ChatInputCommandInteraction, emoteLink: string, emoteName: string) {
    if (interaction.guild?.id == undefined) {
        return;
    }

    let filename: string;
    let hasExtension: boolean;

    filename = emoteLink.substring(emoteLink.lastIndexOf('/')+1);
    hasExtension = (filename.lastIndexOf('.') !== -1);

    // Create emoteName from the filename
    if (emoteName === null || emoteName === undefined) {

        // Create emoteName from filename without extension
        if (hasExtension) {
            emoteName = filename.substring(0, filename.lastIndexOf('.'));
        }
        else {
            emoteName = filename;
        }
    }

    Emote.findOne({ name: emoteName, guildId: interaction.guild.id }).orFail()
    .then(() => {
        interaction.editReply('An emote with that name already exists in this server!');
    })
    .catch(() => {

        if (interaction.guild?.id == undefined) {
            return;
        }

        let folderPath = path.join(__dirname, '..', 'emotes', interaction.guild.id);
		let filePath = path.join(folderPath, emoteName + '.tmp');

		if (!fs.existsSync(folderPath)) {
			// Creates directory recursively
			fs.mkdirSync(folderPath, { recursive: true});
		}	

        download.image({
            url: emoteLink,
            dest: filePath
        })
        .then(async ({ filename }) => {

            let filepath = filename;

            try {
                let data = fs.readFileSync(filepath);

                if (data.length > maxFileSize) {
                    interaction.editReply("The image is too big!");
                    return;
                }

                const imageInfo = imageType(data);

                if (imageInfo == undefined) {
                    interaction.editReply("That doesn't look like an image...");
                    return;
                }

                if (interaction.guild == undefined || interaction.member?.user.id == undefined || !(interaction.member?.user instanceof User)) {
                    interaction.editReply('Something went wrong.');
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
                    interaction.editReply('Saved ' + emoteName);
                    fs.unlink(filepath, (err) => {
                        if (err) {
                            console.log(err);
                            interaction.editReply('Something went wrong.')
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

                    interaction.editReply(errorMsg);
                });
                
            }
            catch (err) {
                console.log(err);
                interaction.editReply('Something went wrong.')
                return;
            }
        })
        .catch((err) => {
            console.log(err);
            interaction.editReply('Something went wrong.')
        });
    })
}

async function handleRemove(interaction: ChatInputCommandInteraction, emoteName: string) {
    
    if (interaction.guild == undefined) {
        interaction.editReply('Something went wrong.');
        return;
    }

    Emote.findOneAndDelete({ name: emoteName, guildId: interaction.guild.id}).orFail()
    .then(result => {
        interaction.editReply('Removed emote ' + result.value?.name);
    })
    .catch(err => {
        console.log(err);
        interaction.editReply('Emote does not exist!');
    })
}

export async function handleList(interaction: ChatInputCommandInteraction) {
    
    if (interaction.guild == undefined) {
        interaction.editReply('Something went wrong.');
        return;
    }

    Emote.find({guildId: interaction.guild.id})
    .select('name guildId')
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

        interaction.editReply(list);
    })
    .catch(err => {
        console.log(err);
        interaction.editReply("Something went wrong!");
    })
}