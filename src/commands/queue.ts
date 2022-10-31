import { SlashCommandBuilder, ChatInputCommandInteraction, Message, MessageReaction } from 'discord.js';

import { formatSeconds } from '../common/common';
import { addGuild, GuildMusicData, QueueItem } from '../common/music';

class QueueMessageState {
    botId: string;
    guildData: GuildMusicData;
    interaction: ChatInputCommandInteraction;
    from: number;

    constructor(botId: string, guildData: GuildMusicData, interaction: ChatInputCommandInteraction, from: number) {
        this.botId = botId;
        this.guildData = guildData;
        this.interaction = interaction;
        this.from = from;
    }
}

const reactions = {
    TOP: '⏫',
    UP: '🔼',
    PLAYING: '⏺',
    DOWN: '🔽',
    BOTTOM: '⏬'
}

const maxTitleLength = 41;
const maxQueueSize = 10;

async function handleReaction (reaction: MessageReaction, state: QueueMessageState) {
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
            state.from = (state.from + maxQueueSize) >= state.guildData.queue.length ?
                state.guildData.queue.length - maxQueueSize < 0 ?
                    0
                    :
                    state.guildData.queue.length - maxQueueSize
                :
                state.from + maxQueueSize;
            break;
        case reactions.UP:
            state.from = (state.from - maxQueueSize) < 0 ? 0 : state.from - maxQueueSize;
            break;
        case reactions.PLAYING:
            state.from = state.guildData.playing < 0 ? 0 : state.guildData.playing
            break;
        case reactions.TOP:
            state.from = 0;
            break;
        case reactions.BOTTOM:
            state.from = state.guildData.queue.length - maxQueueSize < 0 ?
                0
                :
                state.guildData.queue.length - maxQueueSize;
            break;
        default:
            console.error('Unknown reaction');
            return;
    }

    const reply = formatReply(state.guildData, state.from);
    state.interaction.editReply(reply)
}

function formatVid(vid: QueueItem, guildData: GuildMusicData, i: number): string {
    let result = ''

    const playing = (i === guildData.playing);

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

    if (playing && guildData.audioPlayerResource?.playbackDuration != null) {
        time += formatSeconds(Math.round(guildData.audioPlayerResource.playbackDuration / 1000)) + '/';
    }

    time += formatSeconds(Math.round(vid.lengthSeconds)) + ')';

    result += ' ' + time;

    return result;
}

function formatReply(guildData: GuildMusicData, from: number): string {
    const lastIndex = from + maxQueueSize;

    const q = guildData.queue.slice(from, lastIndex);

    let result = "```diff\n";

    for(let i = 0; i < q.length; i++) {
        const vid = q[i];
        result += formatVid(vid, guildData, i+from)
        result += '\n';
    }

    if(lastIndex < guildData.queue.length - 1) {
        if(lastIndex != guildData.queue.length - 2) result += '  ...\n';

        let i = guildData.queue.length - 1;

        const vid = guildData.queue[i];
        result += formatVid(vid, guildData, i)
    }

    result += "```";

    return result
}

export let data = new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Displays the music queue')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const createCollector = function (message: Message, state: QueueMessageState) {
        const filter = (reaction: MessageReaction, _: any) => (reaction.emoji.name == undefined) ? false :  Object.values(reactions).includes(reaction.emoji.name);

        const collector = message.createReactionCollector({filter, dispose: true});
        collector.on('collect', r => handleReaction(r, state));
    }

    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
        return;
    }

    let guildData = addGuild(guildId);

    if (guildData.queue.length === 0) {
        interaction.reply('The queue is empty');
        return;
    }

    let state = new QueueMessageState(interaction.applicationId, guildData, interaction, guildData.playing < 0 ? 0 : guildData.playing);

    const result = formatReply(guildData, state.from);

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
