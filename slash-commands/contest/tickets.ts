import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import prisma from "../../prisma/client";
import colors from "../utils/colors";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tickets")
    .setDescription("Check your (or another user's) raffle tickets and rank.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Check tickets for a specific user")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const target = interaction.options.getUser("user") ?? interaction.user;

      // Find current active raffle
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
                "No active raffle is running currently :sweat_smile:"
              ),
          ],
        });
      }

      // Count target user's entries
      const ticketCount = await prisma.entry.count({
        where: {
          raffleId: raffle.id,
          userId: target.id,
        },
      });

      // Get leaderboard
      const leaderboard = await prisma.entry.groupBy({
        by: ["userId"],
        where: { raffleId: raffle.id },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
      });

      // Find rank
      const rank =
        leaderboard.findIndex((u) => u.userId === target.id) + 1 || "N/A";

      const embed = new EmbedBuilder()
        .setAuthor({
          iconURL: target.displayAvatarURL(),
          name: target.username,
        })
        .setColor(colors.success)
        .setTitle(raffle.name)
        .setDescription(
          `**Rank - \`#${rank}\`**\n**Tickets Count - \`${ticketCount}\`** tickets\n\n-# Raffle is ending <t:${Math.floor(
            raffle.endsAt.getTime() / 1000
          )}:R>`
        );

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("[TICKETS COMMAND]", err);
    }
  },
};
