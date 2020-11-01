import * as Discord from 'discord.io';

export interface EditRoleOptions {
  name: string;
  color?: number;
}

interface ApiServerMember {
  user: {
    id: string;
  };
  roles: ReadonlyArray<string>;
}

function fetchServerMemberFromApi(
  bot: Discord.Client,
  serverId: string,
  memberId: string
): Promise<ApiServerMember> {
  return new Promise<ApiServerMember>((resolve, reject) => {
    let numApiInvocations = 0;
    const callServer = (offsetUserId: string | undefined): void => {
      ++numApiInvocations;
      bot.getMembers(
        {
          /**
           * We'll be hopefully moving away from discord.io which has been a huge
           * fucking thorn for way too long, especially with TypeScript.
           */
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          after: offsetUserId,
          /**
           * We'll be hopefully moving away from discord.io which has been a huge
           * fucking thorn for way too long, especially with TypeScript.
           */
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          serverID: serverId,
        },
        (err: unknown, data: ReadonlyArray<ApiServerMember>) => {
          if (err) {
            reject(err);
            return;
          }

          if (!data.length) {
            reject(
              new Error(
                `Iterated entire member list for server '${serverId}' without finding member '${memberId}' (num calls: ${numApiInvocations})`
              )
            );
          }

          const targetMember = data.find(
            (member) => member.user.id === memberId
          );
          if (targetMember) {
            resolve(targetMember);
            return;
          }

          callServer(data[data.length - 1].user.id);
        }
      );
    };

    callServer(undefined);
  });
}

export async function getMemberRolesInServer(
  bot: Discord.Client,
  serverId: string,
  memberId: string
): Promise<ReadonlyArray<string>> {
  const server = bot.servers[serverId];
  if (!server) {
    throw new Error("Called getMemberRolesInServer for a server bot isn't in.");
  }

  const cachedMember = server.members[memberId];
  if (cachedMember) {
    return cachedMember.roles;
  }

  const apiMember = await fetchServerMemberFromApi(bot, serverId, memberId);
  return apiMember.roles;
}
