import {
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import prisma from "../../prisma/client";
import colors from "../utils/colors";

// === Add Entry Channel ===
async function handleAdd(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);
  const serverId = interaction.guild!.id;

  try {
    await prisma.entryChannel.create({
      data: {
        serverId,
        channelId: channel.id,
      },
    });
    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Added Entry Channel`)
          .setColor(colors.success)
          .setDescription(
            `${channel} has been added as a valid entry channel.`
          ),
      ],
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription(`${channel} is already set as an entry channel.`),
        ],
      });
    } else {
      console.error("[ENTRY_CHANNEL:ADD]", err);
    }
  }
}

// === Remove Entry Channel ===
async function handleRemove(interaction: ChatInputCommandInteraction) {
  const channel = interaction.options.getChannel("channel", true);

  try {
    const deleted = await prisma.entryChannel.deleteMany({
      where: { channelId: channel.id },
    });

    if (deleted.count === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(colors.danger)
            .setDescription(`${channel} was not marked as an entry channel.`),
        ],
      });
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(`Entry Channel Removed`)
          .setColor(colors.success)
          .setDescription(`${channel} has been removed from entry channels.`),
      ],
    });
  } catch (err) {
    console.error("[ENTRY_CHANNEL:REMOVE]", err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("entry-channel")
    .setDescription("Manage raffle entry channels")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add a channel to accept raffle entries")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("The text channel to allow entries")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove a channel from accepting raffle entries")
        .addChannelOption((opt) =>
          opt
            .setName("channel")
            .setDescription("The channel to remove")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });
    const sub = interaction.options.getSubcommand();

    if (sub === "add") return handleAdd(interaction);
    if (sub === "remove") return handleRemove(interaction);
  },
};
