import {config} from '../config';

const {WebClient} = require('@slack/web-api');

const web = new WebClient(config.slackToken);

export const userForEmail = async (email: string) => {
  return await web.users.lookupByEmail({
    email,
  });
};

export const findDmChannelForEmail = async (email: string) => {
  const {ok: userOk, user} = await userForEmail(email);

  if (userOk) {
    const {ok: conversationOk, channel} = await web.conversations.open({users: user.id});
    if (conversationOk) {
      return channel.id;
    }
  }

  return undefined;
};

export interface PostMessageParams {
  icon_emoji?: string;
  username?: string;
  channel?: string;
  email?: string;
  text?: string;
}

export const postMessage = async (params: PostMessageParams, blocks: any) => {
  const {email} = params;

  if (email) {
    const channelId = await findDmChannelForEmail(params.email!);
    if (channelId) {
      params.channel = channelId;
    }
  }

  const messageParams = {
    icon_emoji: ':money_with_wings:',
    username: 'BillingBot',
    ...params,
    blocks,
  };

  return await web.chat.postMessage(messageParams);
};

export const userHasDndEnabled = async (email: string) => {
  const {ok: userOk, user} = await userForEmail(email);
  if (!userOk) {
    return false;
  }

  const {ok, dnd_enabled, next_dnd_start_ts, next_dnd_end_ts} = await web.dnd.info({
    user: user.id,
  });

  if (!ok) return true;

  if (dnd_enabled) {
    const now = new Date().getTime() / 1000;
    return next_dnd_start_ts < now && now < next_dnd_end_ts;
  }

  return false;
};
