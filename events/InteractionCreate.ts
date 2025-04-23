import {
  AnySelectMenuInteraction,
  AutocompleteInteraction,
  ButtonInteraction,
  CommandInteraction,
  Events,
  Interaction,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";
import { DiscordClient } from "..";
import buttonInteractions from "./buttons";
import modalSubmitInteractions from "./modal-submit";
import selectMenuInteractions from "./select-menu";

module.exports = {
  name: Events.InteractionCreate,
  async execute(client: DiscordClient, interaction: Interaction) {
    try {
      if (!interaction.guildId || interaction.user.bot) return;

      if (interaction.isAutocomplete())
        executeAutoComplete(client, interaction);

      if (interaction.isChatInputCommand())
        executeSlashCommand(client, interaction);

      if (interaction.isModalSubmit())
        executeModalSubmitInteraction(client, interaction);

      if (interaction.isButton()) executeButtonInteraction(client, interaction);
      if (interaction.isStringSelectMenu() || interaction.isUserSelectMenu())
        executeSelectMenuInteraction(client, interaction);
    } catch (error) {
      console.log("EVENT [InteractionCreate]", error);
    }
  },
};

async function executeSlashCommand(
  client: DiscordClient,
  interaction: CommandInteraction
) {
  const commandName = interaction.commandName;

  const command = client.slashCommands.get(commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

async function executeAutoComplete(
  client: DiscordClient,
  interaction: AutocompleteInteraction
) {
  const commandName = interaction.commandName;

  const command = client.slashCommands.get(commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    command.autocomplete?.(interaction);
  } catch (error) {
    console.log("[ERROR] [AUTO COMPLETE INTERACTION]", error);
  }
}

async function executeButtonInteraction(
  client: DiscordClient,
  interaction: ButtonInteraction
) {
  try {
    const startsWithKeys = Object.keys(buttonInteractions.startsWith);

    for (let key of startsWithKeys) {
      if (interaction.customId.startsWith(key)) {
        await buttonInteractions.startsWith[key].execute(interaction);
        return;
      }
    }
  } catch (error) {
    console.log("[ERROR] [BUTTON INTERACTION]", error);
  }
}

async function executeModalSubmitInteraction(
  client: DiscordClient,
  interaction: ModalSubmitInteraction
) {
  try {
    const startsWithKeys = Object.keys(modalSubmitInteractions.startsWith);

    for (let key of startsWithKeys) {
      if (interaction.customId.startsWith(key)) {
        await modalSubmitInteractions.startsWith[key].execute(interaction);
        return;
      }
    }
  } catch (error) {
    console.log("[ERROR] [MODAL SUBMIT INTERACTION]", error);
  }
}

async function executeSelectMenuInteraction(
  client: DiscordClient,
  interaction: AnySelectMenuInteraction
) {
  try {
    const startsWithKeys = Object.keys(selectMenuInteractions.startsWith);

    for (let key of startsWithKeys) {
      if (interaction.customId.startsWith(key)) {
        await selectMenuInteractions.startsWith[key].execute(interaction);
        return;
      }
    }
  } catch (error) {
    console.log("[ERROR] [SELECT MENU INTERACTION]", error);
  }
}
