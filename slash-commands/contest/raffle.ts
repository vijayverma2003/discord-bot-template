import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
  userMention,
} from "discord.js";
import prisma from "../../prisma/client";
import ms, { StringValue } from "ms";
import colors from "../utils/colors";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("raffle")
    .setDescription("Manage raffles")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a raffle")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Name").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("linkpattern")
            .setDescription("Regex pattern")
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("duration")
            .setDescription("e.g. 3d, 1w")
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub.setName("list").setDescription("List all raffles")
    )
    .addSubcommand((sub) =>
      sub
        .setName("update")
        .setDescription("Update a raffle")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Name").setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName("linkpattern")
            .setDescription("New regex pattern")
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName("duration")
            .setDescription("New duration")
            .setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete a raffle")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Name").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View details of a raffle")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Raffle name")
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("ban")
        .setDescription(
          "Ban a user from the ongoing raffle and delete their tickets"
        )
        .addUserOption((opt) =>
          opt.setName("user").setDescription("User to ban").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("unban")
        .setDescription("Unban a user from the ongoing raffle")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("User to unban").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("pick-winners")
        .setDescription("Select random winners from the current raffle")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Raffle name")
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName("count")
            .setDescription("Number of winners to select")
            .setRequired(true)
        )
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === "create") return handleCreate(interaction);
    if (sub === "list") return handleList(interaction);
    if (sub === "view") return handleView(interaction);
    if (sub === "update") return handleUpdate(interaction);
    if (sub === "delete") return handleDelete(interaction);
    if (sub === "ban") handleBan(interaction);
    if (sub === "unban") handleUnban(interaction);
    if (sub === "pick-winners") handleSelectWinners(interaction);
  },

  async autocomplete(interaction: AutocompleteInteraction) {
    const focused = interaction.options.getFocused().toLowerCase();

    const raffles = await prisma.raffle.findMany({ take: 25 });
    const matches = raffles
      .filter((r) => r.name.toLowerCase().includes(focused))
      .map((r) => ({ name: r.name, value: r.id }));

    await interaction.respond(matches);
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction) {
  try {
    const name = interaction.options.getString("name", true);
    const linkPattern = interaction.options.getString("linkpattern", true);
    const durationInput = interaction.options.getString("duration", true);

    const durationMs = ms(durationInput as StringValue);
    if (!durationMs || durationMs < ms("1d")) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription(`Duration must be at-least \`1 day\`.`),
        ],
      });
    }

    // Check if an active raffle already exists
    const activeRaffle = await prisma.raffle.findFirst({
      where: {
        endsAt: { gte: new Date() },
      },
    });

    if (activeRaffle) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("A raffle is already running!")
            .setColor(colors.danger)
            .setDescription(
              `**${
                activeRaffle.name
              }** Raffle is already running.\n-# It ends <t:${Math.floor(
                activeRaffle.endsAt.getTime() / 1000
              )}:R>.`
            ),
        ],
      });
    }

    const endsAt = new Date(Date.now() + durationMs);

    await prisma.raffle.create({
      data: { name, linkPattern, endsAt },
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Raffle Created`)
          .setColor(colors.success)
          .setDescription(
            `**${name}** raffle created.\n-# Ends at <t:${Math.floor(
              endsAt.getTime() / 1000
            )}:F>.`
          ),
      ],
    });
  } catch (err) {
    console.error("[RAFFLE:CREATE]", err);
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  try {
    const raffles = await prisma.raffle.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        endsAt: { gt: new Date() },
      },
    });

    if (!raffles.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.primary)
            .setDescription(`No raffles found`),
        ],
      });
    }

    const list = raffles
      .map(
        (r, i) =>
          `${i + 1}. **${r.name}** (ends <t:${Math.floor(
            r.endsAt.getTime() / 1000
          )}:R>)`
      )
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`Active Raffles`)
      .setColor(colors.primary)
      .setDescription(list || "No active raffles found");

    return interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error("[RAFFLE:LIST]", err);
  }
}

// === Delete Raffle ===
async function handleDelete(interaction: ChatInputCommandInteraction) {
  try {
    const name = interaction.options.getString("name", true);

    await prisma.$transaction(async (tx) => {
      await tx.raffle.deleteMany({ where: { name } });
      await tx.entry.deleteMany({ where: { raffleId: name } });
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Raffle Deleted`)
          .setColor(colors.success)
          .setDescription(`Raffle **${name}** has been deleted`),
      ],
    });
  } catch (err) {
    console.error("[RAFFLE:DELETE]", err);
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(colors.danger)
          .setDescription(`Failed to delete the raffle`),
      ],
    });
  }
}

// === Update Raffle (only linkPattern or endDate) ===
async function handleUpdate(interaction: ChatInputCommandInteraction) {
  try {
    const name = interaction.options.getString("name", true);
    const linkPattern = interaction.options.getString("linkpattern");
    const duration = interaction.options.getString("duration");

    const updateData: any = {};
    if (linkPattern) updateData.linkPattern = linkPattern;
    if (duration) {
      const durationMs = ms(duration as StringValue);
      if (!durationMs || durationMs < ms("1d")) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(colors.danger)
              .setDescription(
                `Duration must be at-least \`1 day\` :sweat_smile:`
              ),
          ],
        });
      }
      updateData.endsAt = new Date(Date.now() + durationMs);
    }

    const updated = await prisma.raffle.updateMany({
      where: { name },
      data: updateData,
    });

    if (updated.count === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription(`Could not find raffle named **${name}**`),
        ],
      });
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Raffle Updated`)
          .setColor(colors.success)
          .setDescription(`Raffle **${name}** has been successfully updated`),
      ],
    });
  } catch (err) {
    console.error("[RAFFLE:UPDATE]", err);
  }
}

async function handleView(interaction: ChatInputCommandInteraction) {
  try {
    const name = interaction.options.getString("name", true);
    const raffle = await prisma.raffle.findUnique({ where: { id: name } });

    if (!raffle) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription(`Could not find raffle named **${name}**`),
        ],
      });
    }

    const totalEntries = await prisma.entry.count({
      where: { raffleId: raffle.id },
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${raffle.name}`)
          .setColor(colors.primary)
          .setDescription(
            `\n**Total Entries** \`${totalEntries}\`\n**Ends at** - <t:${Math.floor(
              raffle.endsAt.getTime() / 1000
            )}:R>\n**Link Pattern** - \`\`\`${raffle.linkPattern}\`\`\``
          )
          .setFooter({ text: "Created at" })
          .setTimestamp(raffle.createdAt.getTime()),
      ],
    });
  } catch (err) {
    console.error("[RAFFLE:VIEW]", err);
  }
}

export async function handleBan(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user", true);

  try {
    const raffle = await prisma.raffle.findFirst({
      where: { endsAt: { gt: new Date() } },
      orderBy: { endsAt: "asc" },
    });

    if (!raffle) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription(
              `There is no active raffle currently :sweat_smile:`
            ),
        ],
      });
    }

    await prisma.$transaction([
      prisma.entry.deleteMany({
        where: {
          raffleId: raffle.id,
          userId: targetUser.id,
        },
      }),
      prisma.raffleBan.upsert({
        where: {
          userId_raffleId: {
            userId: targetUser.id,
            raffleId: raffle.id,
          },
        },
        update: {},
        create: {
          userId: targetUser.id,
          raffleId: raffle.id,
        },
      }),
    ]);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`User Banned from Raffle`)
          .setColor(colors.success)
          .setDescription(
            `${userMention(targetUser.id)} has been banned from **${
              raffle.name
            }** and their tickets have been removed.`
          ),
      ],
    });
  } catch (err) {
    console.error("[RAFFLE:BAN]", err);
  }
}

export async function handleUnban(interaction: ChatInputCommandInteraction) {
  const targetUser = interaction.options.getUser("user", true);

  try {
    const raffle = await prisma.raffle.findFirst({
      where: { endsAt: { gt: new Date() } },
      orderBy: { endsAt: "asc" },
    });

    if (!raffle) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription("There is no active raffle running. :sweat_smile:"),
        ],
      });
    }

    await prisma.raffleBan.deleteMany({
      where: {
        userId: targetUser.id,
        raffleId: raffle.id,
      },
    });

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`User Unbanned from Raffle`)
          .setColor(colors.success)
          .setDescription(
            `${userMention(targetUser.id)} has been unbanned from **${
              raffle.name
            }**.`
          ),
      ],
    });
  } catch (err) {
    console.error("[RAFFLE:UNBAN]", err);
  }
}

export async function handleSelectWinners(
  interaction: ChatInputCommandInteraction
) {
  try {
    const count = interaction.options.getInteger("count", true);
    const name = interaction.options.getString("name", true);

    const raffle = await prisma.raffle.findUnique({ where: { id: name } });

    if (!raffle) {
      return interaction.editReply(`Raffle ~ \`${name}\` not found.`);
    }

    const winners = await selectRaffleWinners(raffle.id, count);

    if (winners.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription(
              "No valid entries to pick winners from. :sweat_smile:"
            ),
        ],
      });
    }

    const winnerList = winners
      .map((w, i) => `${i + 1} - ${userMention(w.userId)}`)
      .join("\n");

    await interaction.editReply("Done!");
    return interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setTitle(`${raffle.name} Winners`)
          .setDescription(winnerList)
          .setColor(colors.primary),
      ],
    });
  } catch (error) {
    console.log("[RAFFLE:PICKING-WINNERS]", error);
  }
}

/**
 * Select random unique winners from current raffle entries.
 * @param raffleId string - the raffle ID
 * @param count number - number of winners to pick
 * @returns array of winners (userId, username, ticketCount)
 */
export async function selectRaffleWinners(raffleId: string, count: number) {
  // Get all entries excluding banned users
  const entries = await prisma.entry.findMany({
    where: {
      raffleId,
      userId: {
        notIn: (
          await prisma.raffleBan.findMany({
            where: { raffleId },
            select: { userId: true },
          })
        ).map((ban) => ban.userId),
      },
    },
  });

  if (entries.length === 0) return [];

  // Flatten tickets: each entry becomes one ticket in the pool
  const ticketPool: { userId: string; username: string }[] = [];
  for (const entry of entries) {
    ticketPool.push({ userId: entry.userId, username: entry.username });
  }

  // Shuffle tickets
  for (let i = ticketPool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ticketPool[i], ticketPool[j]] = [ticketPool[j], ticketPool[i]];
  }

  const winners: Map<
    string,
    { userId: string; username: string; ticketCount: number }
  > = new Map();

  for (const ticket of ticketPool) {
    if (!winners.has(ticket.userId)) {
      const ticketCount = entries.filter(
        (e) => e.userId === ticket.userId
      ).length;

      winners.set(ticket.userId, {
        userId: ticket.userId,
        username: ticket.username,
        ticketCount,
      });
    }
    if (winners.size === count) break;
  }

  return Array.from(winners.values());
}
