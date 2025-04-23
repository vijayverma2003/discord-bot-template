import {
  AutocompleteInteraction,
  Client,
  Collection,
  CommandInteraction,
  GatewayIntentBits,
  Message,
  SlashCommandBuilder,
} from "discord.js";
import { config } from "dotenv";
import path from "path";
import fs from "fs";

config();

export interface DiscordClient extends Client {
  commands: Collection<
    string,
    { name: string; execute: (message: Message) => void }
  >;
  slashCommands: Collection<
    string,
    {
      data: SlashCommandBuilder;
      execute: (interaction: CommandInteraction) => void;
      autocomplete?: (interaction: AutocompleteInteraction) => void;
    }
  >;
}

export const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessages,
  ],
}) as DiscordClient;

const commands = new Collection<
  string,
  { name: string; execute: (message: Message) => void }
>();

const slashCommands = new Collection<
  string,
  {
    data: SlashCommandBuilder;
    execute: (interaction: CommandInteraction) => void;
  }
>();

client.commands = commands;
client.slashCommands = slashCommands;

const eventsFolderPath = path.join(__dirname, "events");
const eventFiles = fs.readdirSync(eventsFolderPath);

for (let eventFile of eventFiles) {
  if (!(eventFile.endsWith(".js") || eventFile.endsWith(".ts"))) continue;

  const eventFilePath = path.join(eventsFolderPath, eventFile);
  const event = require(eventFilePath);

  if (!("name" in event) || !("execute" in event)) continue;

  if (event.once)
    client.once(event.name, (...args) => event.execute(client, ...args));
  else client.on(event.name, (...args) => event.execute(client, ...args));
}

const commandsFolderPath = path.join(__dirname, "commands");
const commandsFolders = fs.readdirSync(commandsFolderPath);

for (let commandsFolder of commandsFolders) {
  const commandFilesPath = path.join(commandsFolderPath, commandsFolder);
  const commandFiles = fs.readdirSync(commandFilesPath);

  for (let commandFile of commandFiles) {
    const commandFilePath = path.join(commandFilesPath, commandFile);
    const command = require(commandFilePath);

    if ("name" in command && "execute" in command) {
      client.commands.set(command.name, command);
    } else
      console.log(
        `Could not find the [name] and [execute] properties in ${commandFile}`
      );
  }
}

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
      client.slashCommands.set(command.data.name, command);
    } else
      console.log(
        `[INDEX] Could not find the [data] and [execute] properties in ${commandFile}`
      );
  }
}

client.login(process.env.DISCORD_TOKEN);
