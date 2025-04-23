import {
  CommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with pong!"),
  async execute(interaction: CommandInteraction) {
    try {
      await interaction.reply({
        content: "Pong!",
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.log("[ERROR] [SLASH COMMAND] [PING] -", error);
    }
  },
};
