const URL = require('url').URL;

const Telegraf = require('telegraf');
const rp = require('request-promise');
const cheerio = require('cheerio');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.hears('hi', ctx =>
  ctx.replyWithMarkdown(
    'Terve! Minä olen Posti-Pate! Toimitan sinulle artikkelit enkä lakkoile _(välillä menen rikki, mutta sitä ei voi edes liitto estää)_!'
  )
);

bot.hears(/www.ksml.fi/, async ctx => {
  const { message } = ctx;

  const url = new URL(message.text);

  try {
    const options = {
      uri: url
    };
    const htmlString = await rp(options);
    const $ = cheerio.load(htmlString);

    const unlockedUrl = findUnlockedUrl($);

    ctx.deleteMessage(message.message_id);
    ctx.replyWithMarkdown(`Linkkinne olkaa hyvät:\n${unlockedUrl}`);
  } catch (error) {
    const { name, statusCode } = error;
    console.error({ name, statusCode });
    ctx.replyWithMarkdown(`*${name}:* ${statusCode}`);
  }
});

const findUnlockedUrl = $ => {
  try {
    const comments = $('*')
      .contents()
      .filter(function() {
        return this.nodeType === 8;
      });

    let url;

    comments.each(function() {
      if (this.data.includes('pwbi')) {
        url = this.data;
        return;
      }
    });
    return url ? url : 'URL not found :(';
  } catch (error) {
    return 'En löytänyt toimivaa urlia, harmitus :(';
  }
};

exports.handler = (event, context, cb) => {
  try {
    const tmp = JSON.parse(event.body);
    bot.handleUpdate(tmp);
    cb(null, { statusCode: 200, body: 'OK' });
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
