import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

import { rollDice } from '../common/common';


export let data = new SlashCommandBuilder()
    .setName('roll')
    .setDescription('Rolls a pseudo dice. If no args then rolls between 1 and 100')
    .addIntegerOption(option => option
        .setName('min_value')
        .setDescription('The minimum value of the dice (defaults to 1)')
    )
    .addIntegerOption(option => option
        .setName('max_value')
        .setDescription('The maximum value of the dice (defaults to 100)')
    )


export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
    
    let min = interaction.options.getInteger('min_value');
    let max = interaction.options.getInteger('max_value');

    if (min == null)
        min = 1;

    if (max == null)
        max = 100;

    let value = rollDice(min, max);

    if (value == null) {
        interaction.reply('The maximum should be greater than the minimum value!');
        return;
    }

    let msg = 'I rolled ' + value;
    interaction.reply(msg);
}