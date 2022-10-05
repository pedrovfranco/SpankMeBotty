const { SlashCommandBuilder } = require('discord.js');

const common = require('../common/common');
const music = require('../common/music');

// module.exports = {
//     name: 'queue',
//     description: 'Displays the music queue',
//     args: false,
//     alias: ['q'],
//     execute,
// };

const reactions = {
    TOP: '⏫',
    UP: '🔼',
    PLAYING: '⏺',
    DOWN: '🔽',
    BOTTOM: '⏬'
}

const maxTitleLength = 41;
const maxQueueSize = 10;

const handleReaction = async (reaction, state) => {
    const reactionUserIds = (await reaction.users.fetch()).map(u => u.id);
    const isSelf = !reactionUserIds.some(id => id !== state.botId);
    if (isSelf) {
      return;
    }

    for (let i = 0; i < reactionUserIds.length; i++) {
      const userId = reactionUserIds[i];
      if (userId !== state.botId) {
        await reaction.users.remove(userId);
      }
    }

    switch(reaction.emoji.name) {
        case reactions.DOWN:
            state.from = (state.from + maxQueueSize) >= state.guild.queue.length ?
                state.guild.queue.length - maxQueueSize < 0 ?
                    0
                    :
                    state.guild.queue.length - maxQueueSize
                :
                state.from + maxQueueSize;
            break;
        case reactions.UP:
            state.from = (state.from - maxQueueSize) < 0 ? 0 : state.from - maxQueueSize;
            break;
        case reactions.PLAYING:
            state.from = state.guild.playing < 0 ? 0 : state.guild.playing
            break;
        case reactions.TOP:
            state.from = 0;
            break;
        case reactions.BOTTOM:
            state.from = state.guild.queue.length - maxQueueSize < 0 ?
                0
                :
                state.guild.queue.length - maxQueueSize;
            break;
        default:
            console.error('Unknown reaction');
            return;
    }

    const reply = formatReply(state.guild, state.from);
    state.interaction.editReply(reply)
}

const formatVid = (vid, guild, i) => {
    let result = ''

    const playing = (i === guild.playing);

    if (playing) {
        result += '- ';
    }
    else {
        result += '  ';
    }

    result += '[' + (i+1) + '] ';

    let title = vid.title;
    if (title.length > maxTitleLength) {
        title = title.substr(0, maxTitleLength - 3);
        title += '...';
    }

    result += title;

    let time = '(';

    if (playing && guild?.audioPlayer?.currentResource?.playbackDuration != null) {
        time += common.formatSeconds(Math.round(parseInt(guild.audioPlayer.currentResource.playbackDuration) / 1000)) + '/';
    }

    time += common.formatSeconds(Math.round(parseInt(vid.lengthSeconds))) + ')';

    result += ' ' + time;

    return result;
}

const formatReply = (guild, from) => {
    const lastIndex = from + maxQueueSize;

    const q = guild.queue.slice(from, lastIndex);

    let result = "```diff\n";

    for(let i = 0; i < q.length; i++) {
        const vid = q[i];
        result += formatVid(vid, guild, i+from)
        result += '\n';
    }

    if(lastIndex < guild.queue.length - 1) {
        if(lastIndex != guild.queue.length - 2) result += '  ...\n';

        let i = guild.queue.length - 1;

        const vid = guild.queue[i];
        result += formatVid(vid, guild, i)
    }

    result += "```";

    return result
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('Displays the music queue')
    ,

    async execute(interaction) {
        const createCollector = (message, state) => {
            const filter = (reaction, _) => Object.values(reactions).includes(reaction.emoji.name);

            const collector = message.createReactionCollector({filter, dispose: true});
            collector.on('collect', r => handleReaction(r, state));
        }

        let guild = music.getGuild(interaction);

        if (guild.queue.length === 0) {
            interaction.reply('The queue is empty');
            return;
        }

        let state = {
            botId: interaction.applicationId,
            guild,
            interaction,
            from: guild.playing < 0 ? 0 : guild.playing
        }

        const result = formatReply(guild, state.from)

        interaction.reply({content: result, fetchReply: true})
            .then(async (message) => {
              createCollector(message, state);
              message.react(reactions.TOP);
              message.react(reactions.UP);
              message.react(reactions.PLAYING);
              message.react(reactions.DOWN);
              message.react(reactions.BOTTOM);
            })
            .catch(console.error);
    }
}
