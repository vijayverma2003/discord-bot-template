import { APIApplicationCommand, REST, Routes } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const commands = [];

const slashCommandsFolderPath = path.join(__dirname, "slash-commands");
const slashCommandsFolders = fs.readdirSync(slashCommandsFolderPath);

for (let slashCommandsFolder of slashCommandsFolders) {
  const commandFilesPath = path.join(
    slashCommandsFolderPath,
    slashCommandsFolder
  );
  const commandFiles = fs.readdirSync(commandFilesPath);

  for (let commandFile of commandFiles) {
    const commandFilePath = path.join(commandFilesPath, commandFile);
    const command = require(commandFilePath);

    if ("data" in command && "execute" in command) {
      commands.push(command.data.toJSON());
    } else
      console.log(
        `Could not find the [data] and [execute] properties in ${commandFile}, command`
      );
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log(
      `Started refreshing ${commands.length} application (/) commands.`
    );

    console.log(commands.map((command) => command.name));

    const data = (await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID!),
      {
        body: commands,
      }
    )) as APIApplicationCommand[];

    console.log(
      `Successfully reloaded ${data.length} application (/) commands.`
    );
  } catch (error) {
    console.error(error);
  }
})();
