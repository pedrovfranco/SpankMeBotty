import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import https from 'https';

import { addGuild } from '../common/music';

export let data = new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Shows the lyrics of the currently playing song, if they exist.')

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
      
    const guildId = interaction.guild?.id;

    if (guildId == undefined) {
		return;
	}

    if (process.env.MUSIXMATCH_API_KEY == undefined) {
        console.error('MUSIXMATCH_API_KEY not set, failing.');
        return;
    }

    let baseUrl = 'https://api.musixmatch.com/ws/1.1/';
    let matcherGet = 'matcher.track.get';
    let lyricsGet = 'track.lyrics.get';

    if (process.env.MUSIXMATCH_API_KEY == null) {
        await interaction.reply({ content: 'Something went wrong!', ephemeral: true });
        return;
    }
    let guildData = addGuild(guildId);

    if (guildData.queue.length == 0) {
        await interaction.reply({ content: 'There must be something on the queue!', ephemeral: true });
        return;
    }

    let myURL = new URL(baseUrl + matcherGet);
    myURL.searchParams.set('apikey', process.env.MUSIXMATCH_API_KEY);
    myURL.searchParams.set('q_track', guildData.queue[0].title.replace(/\(.*\)/g, '').trim());
    
    https.get(myURL.toString(), async (res) => { // Search track name to get track ID
        if (res.statusCode == 200) {

            let body = '';

            res.on('data', function(chunk){
                body += chunk;
            });
        
            res.on('end', async () => {
  
                if (process.env.MUSIXMATCH_API_KEY == undefined) {
                    console.error('MUSIXMATCH_API_KEY not set, failing.');
                    return;
                }
            
                let response = JSON.parse(body).message;

                if (response.header.status_code != 200) {
                    await interaction.reply({ content: 'Failed to find lyrics!', ephemeral: true });
                    return;        
                }

                let trackId = response.body.track.track_id;

                myURL = new URL(baseUrl + lyricsGet);
                myURL.searchParams.set('apikey', process.env.MUSIXMATCH_API_KEY);
                myURL.searchParams.set('track_id', trackId);
        
                https.get(myURL.toString(), async (res) => { // Search lyrics using track ID
                    if (res.statusCode == 200) {
        
                        let body = '';
        
                        res.on('data', function(chunk){
                            body += chunk;
                        });
                    
                        res.on('end', async () => {
                            let response = JSON.parse(body).message;
        
                            if (response.header.status_code != 200) {
                                await interaction.reply({ content: 'Failed to find lyrics!', ephemeral: true });
                                return;        
                            }
        
                            let lyricsText = response.body.lyrics.lyrics_body.replaceAll(/\*\*\*\*\*\*\* This Lyrics.*\n.*/g, '').trim();
        
                            await interaction.reply({ content: '```\n' + lyricsText + '\n```' });
                            return;
                        });
                    }
                    else {
                        await interaction.reply({ content: 'Failed to find lyrics!', ephemeral: true });
                        return;    
                    }
                });
        
            });
        }
        else {
            await interaction.reply({ content: 'Failed to find lyrics!', ephemeral: true });
            return;    
        }
    });
}
