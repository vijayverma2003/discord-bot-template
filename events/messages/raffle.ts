import { EmbedBuilder, Message } from "discord.js";
import prisma from "../../prisma/client";
import colors from "../../slash-commands/utils/colors";

export default async function handleRaffleLinkMessage(message: Message) {
  try {
    if (message.author.bot || !message.guild) return;

    // Check if the channel is a valid raffle entry channel
    const validChannel = await prisma.entryChannel.findFirst({
      where: {
        channelId: message.channel.id,
      },
    });

    if (!validChannel) return;

    // Get active raffle
    const raffle = await prisma.raffle.findFirst({
      where: {
        endsAt: { gt: new Date() },
      },
      orderBy: {
        endsAt: "asc",
      },
    });

    if (!raffle) return;

    const banned = await prisma.raffleBan.findFirst({
      where: {
        raffleId: raffle.id,
        userId: message.author.id,
      },
    });

    if (banned) return;

    // Parse links from message
    const urlRegex = /https?:\/\/[\w.-]+(?:\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)*/gi;
    const links = message.content.match(urlRegex);

    if (!links || links.length === 0) return;

    const regex = new RegExp(raffle.linkPattern);
    const uniqueLinks = [...new Set(links)];

    for (const link of uniqueLinks) {
      if (!regex.test(link)) continue;

      try {
        await prisma.entry.create({
          data: {
            userId: message.author.id,
            username: message.author.username,
            serverId: message.guild.id,
            raffleId: raffle.id,
            link,
          },
        });

        await message.react("<a:check:1368533709988298933>");
      } catch (err: any) {
        if (err.code === "P2002") {
          const reply = await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(colors.danger)
                .setDescription(`Duplicate entry ignored`),
            ],
          });

          setTimeout(async () => await reply.delete(), 5000);
        } else {
          console.error("[RAFFLE LINK HANDLER]", err);
        }
      }
    }
  } catch (error) {
    console.log("ERROR [MESSAGE CREATE] [HANDLE RAFFLE LINK MESSAGE]\n", error);
  }
}
