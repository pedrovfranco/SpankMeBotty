import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';


export let data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription('Replies with Pong!')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
	// Send an initial reply, then read back the timestamp Discord stamped on it.
	const response = await interaction.reply({ content: 'Pinging...', withResponse: true });

	// Round-trip: command issued -> reply registered by Discord. Both timestamps come
	// from Discord's clock (snowflakes), so there's no skew with the bot's local clock.
	// Note this also includes the bot's own processing time, not just network latency.
	const sentTimestamp = response.resource?.message?.createdTimestamp ?? Date.now();
	const roundTripMs = sentTimestamp - interaction.createdTimestamp;

	// Gateway heartbeat: the pure bot <-> Discord network latency of the gateway
	// connection. It's -1 until the first heartbeat ack has been received.
	const heartbeatMs = Math.round(interaction.client.ws.ping);
	const heartbeatText = heartbeatMs < 0 ? 'n/a' : `${heartbeatMs}ms`;

	await interaction.editReply(`Pong!\nGateway heartbeat: ${heartbeatText}\nRound-trip: ${roundTripMs}ms`);
}
