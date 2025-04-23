import { Message } from "discord.js";

module.exports = {
  name: "ping",
  async execute(message: Message) {
    try {
      await message.reply("pong!");
    } catch (error) {
      console.log("[ERROR] [COMMAND] [ping]\n", error);
    }
  },
};
