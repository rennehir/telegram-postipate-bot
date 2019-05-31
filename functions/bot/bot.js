const URL = require('url').URL;

const Telegraf = require('telegraf');
const rp = require('request-promise');
const cheerio = require('cheerio');
const breakdance = require('breakdance');

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.hears('hi', ctx => ctx.reply('Hi there!'));

bot.hears(/www.ksml.fi/, async ctx => {
  const { message } = ctx;

  const url = new URL(message.text);

  try {
    const options = {
      uri: url
    };
    const htmlString = await rp(options);
    const $ = cheerio.load(htmlString);

    const parse = parseKSML;
    const { content, caption, image, title } = parse($);

    await ctx.replyWithMarkdown(`*${title}*`);
    await ctx.replyWithPhoto(image, { caption });

    for (let i = 0; i < content.length; i++) {
      sleep(500);
      await ctx.replyWithMarkdown(content[i]);
    }
  } catch (error) {
    ctx.reply(error.toString());
  }
});

const parseKSML = $ => {
  const content = splitContent(
    breakdance($('.article-to-paywall > div').html())
  );
  const title = $('meta[property="og:title"]').attr('content');
  const image = $('meta[property="og:image"]').attr('content');
  const caption = $('.story-picture > figcaption').text();

  return {
    caption,
    content,
    image,
    title
  };
};

const splitContent = content => content.match(/.{1,4096}/g);

const sleep = milliseconds => {
  const start = new Date().getTime();
  for (let i = 0; i < 1e7; i++) {
    if (new Date().getTime() - start > milliseconds) {
      break;
    }
  }
};

exports.handler = async (event, context) => {
  try {
    const tmp = JSON.parse(event.body);
    bot.handleUpdate(tmp);
    return { statusCode: 200, body: '' };
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
