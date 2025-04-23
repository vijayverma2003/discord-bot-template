import { Interaction } from "discord.js";

export default {} as {
    startsWith: {
      [key: string]: {
        execute: (interaction: Interaction) => void;
        startsWith?: string;
        customId?: string;
      };
    };
  };
  