import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder
} from "discord.js";
import prisma from "../../prisma/client";
import colors from "../utils/colors";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the leaderboard for the current raffle."),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const raffle = await prisma.raffle.findFirst({
        where: {
          endsAt: { gt: new Date() },
        },
        orderBy: {
          endsAt: "asc",
        },
      });

      if (!raffle) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()

              .setColor(colors.danger)
              .setDescription(
                "There is no active raffle currently :sweat_smile:"
              ),
          ],
        });
      }

      // Group and count tickets per user
      const topUsers = await prisma.entry.groupBy({
        by: ["userId"],
        where: {
          raffleId: raffle.id,
        },
        _count: {
          userId: true,
        },
        orderBy: {
          _count: {
            userId: "desc",
          },
        },
        take: 10,
      });

      const leaderboard = topUsers
        .map(
          (user, index) =>
            `${index + 1}. <@${user.userId}> ~ ${user._count.userId} tickets`
        )
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor(colors.primary)
        .setTitle(`${raffle.name} Tickets Leaderboard`)
        .setDescription(leaderboard || "No entries yet.");

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[LEADERBOARD COMMAND]", err);
    }
  },
};
