import { GuildMember, BaseInteraction } from 'discord.js';

import Permission from '../database/models/permission';

export enum PermissionType {
    tts = 'tts',
    soundboard = 'soundboard'
}

export type HasPermissionReturnType = {userHasPermission: boolean, roles: string[]}


export async function hasPermission(interaction : BaseInteraction, type: PermissionType): Promise<HasPermissionReturnType> {
    return new Promise<HasPermissionReturnType>(async (resolve, reject) => {
        if (interaction.guild == undefined || interaction.member == undefined || !(interaction.member instanceof GuildMember)) {
            reject();
            return;
        }
    
        let mappings = await Permission.find({guildId: interaction.guild.id, type: type})
        let roles = mappings.map(x => x.roleName);
        let hasRole = interaction.member.roles.cache.some(role => roles.includes(role.name));
    
        console.log('permissions = ' + JSON.stringify(roles));
    
        let hasPermission = (roles.length === 0 || hasRole);
        resolve({userHasPermission: hasPermission, roles: roles});
    });
}