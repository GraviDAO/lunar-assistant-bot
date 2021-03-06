import { ContextMenuCommandBuilder } from "@discordjs/builders";
import { Message, MessageContextMenuInteraction } from "discord.js";
import { LunarAssistant } from "..";
import db from "../services/admin";
import { GuildPolls, Poll } from "../shared/firestoreTypes";
import { castPollVoteButtons } from "../utils/buttons";
import { primaryEmbed } from "../utils/embeds";

export default {
    data: new ContextMenuCommandBuilder()
      .setName("Open Poll")
      .setDefaultPermission(false)
      .setType(3),
    execute: async (
      lunarAssistant: LunarAssistant,
      interaction: MessageContextMenuInteraction
    ) => {
      const message = interaction.targetMessage;
      
      if (message.author.id !== lunarAssistant.client.user?.id) {
          await interaction.reply({ embeds: [ primaryEmbed(undefined, "Invalid poll message.") ], ephemeral: true })
          return;
      }

      const guildPollsDoc = await db
        .collection("guildPolls")
        .doc(interaction.guildId!)
        .get()
      
      const guildPolls: GuildPolls = guildPollsDoc.exists
      ? (guildPollsDoc.data() as GuildPolls)
      : { polls: [] };

      const poll = guildPolls.polls.find((p: Poll) => p.messageId === message.id );
      
      if (!poll) {
          await interaction.reply({ embeds: [ primaryEmbed(undefined, "Invalid poll message.") ], ephemeral: true })
          return;
      }

      if (poll.active) {
        await interaction.reply({ embeds: [ primaryEmbed(undefined, "This poll is already open.") ], ephemeral: true })
        return;
      }

      poll.results = null;
      poll.active = true;
      if (message instanceof Message) {
        await message.edit({ components: [ castPollVoteButtons() ] });
        if (message.thread && message.thread.archived) {
          try {
            await message.thread.setArchived(false, "Poll Open");
          } catch (error) {
            console.log(`Could not archive thread: ${message.thread.name}`)
          }
        }
      }

      await db
        .collection("guildPolls")
        .doc(interaction.guildId!)
        .set(guildPolls);
      
      await interaction.reply({ embeds: [ primaryEmbed(undefined, "Opened the poll to votes.") ], ephemeral: true })
    }
}