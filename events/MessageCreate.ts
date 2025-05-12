import { Events, Message } from "discord.js";
import { DiscordClient } from "..";
import handleRaffleLinkMessage from "./messages/raffle";

module.exports = {
  name: Events.MessageCreate,
  async execute(client: DiscordClient, message: Message) {
    if (message.author.bot || !message.guildId || !message.guild) return;

    handleRaffleLinkMessage(message);

    try {
      const prefix = ".";

      if (!message.content.trim().startsWith(prefix)) return;

      const content = message.content.toLowerCase().trim().slice(prefix.length);
      const args = content.split(/ +/);
      const commandName = args.shift();

      if (!commandName) return;

      const command = client.commands.get(commandName);
      if (command) command.execute(message);
    } catch (error) {
      console.log("EVENT [MessageCreate]", error);
    }
  },
};
