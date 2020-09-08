const URL = require('url').URL;

const Telegraf = require('telegraf');
const rp = require('request-promise');
const cheerio = require('cheerio');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Handler for /start command
bot.start(ctx => {
  ctx.replyWithMarkdown(
    'Terve! Minä olen Posti-Pate! Toimitan sinulle artikkelit enkä lakkoile _(välillä menen rikki, mutta sitä ei voi edes liitto estää)_!\n\n' +
      'Vastaan kun lähetät minulle artikkelin.'
  );
});

// Handler for /help command
bot.help(ctx => {
  ctx.replyWithMarkdown(
    'Toimin kun lähetät minulle linkin osoitteesta:\r\nwww.ksml.fi tai komennolla /luetuimmat'
  );
});

// Handler for listing top news from www.ksml.fi
bot.hears(/\/luetuimmat/, async ctx => {
  try {
    // API for "luetuimmat" :D
    const options = {
      uri:
        'https://api.cxense.com/public/widget/data?json={"context":{"referrer":"","autoRefresh":false,"url":"https://www.ksml.fi/"},"widgetId":"f69aae81d6a4644692216c9510354428b16524f3"}',
    };
    const htmlString = await rp(options);
    const $ = cheerio.load(htmlString);

    bot.telegram.sendChatAction(ctx.message.chat.id, 'typing');

    const topNews = findTopNews($);
    let responseTxt = '*Luetuimmat:*';

    const promises = topNews.map(article => getPremiumUrl(article));
    const premiumLinks = await Promise.all(promises);

    console.log(premiumLinks);

    premiumLinks.map(
      (link, index) =>
        (responseTxt += `\n*${index + 1}.* [${link.title}](${encodeURI(
          link.url
        )})\n`)
    );

    ctx.replyWithMarkdown(responseTxt, { disable_web_page_preview: true });
  } catch (error) {
    const { name, statusCode, message } = error;
    console.error({ name, statusCode, message });
    ctx.replyWithMarkdown(`*${name}:* ${statusCode}`);
  }
});

bot.hears(/www.ksml.fi/, async ctx => {
  const { message } = ctx;
  
  ctx.replyWithMarkdown(`*Olen särki 🐟*`);
  return;
  // The way paywall was bypassed earlier does not work anymore...

  const url = new URL(message.text);

  try {
    const options = {
      uri: url,
    };
    const htmlString = await rp(options);
    const $ = cheerio.load(htmlString);

    const unlockedUrl = findUnlockedUrl($);
    const decodedURI = decodeURIComponent(unlockedUrl).trim();

    ctx.deleteMessage(message.message_id);
    ctx.replyWithMarkdown(
      `Linkkinne olkaa hyvät:\r\n[KSML.fi – PostiPate](${encodeURI(
        decodedURI
      )})`
    );
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
      .filter(function () {
        return this.nodeType === 8;
      });

    let url;

    comments.each(function () {
      if (this.data.includes('pwbi')) {
        url = this.data;
        return;
      }
    });
    return url ? url : 'URL not found :(';
  } catch (error) {
    console.error(error);
    return 'En löytänyt toimivaa urlia, harmitus :(';
  }
};

const findTopNews = $ => {
  try {
    let parsedResults = [];
    const articles = JSON.parse($.text()).items;

    articles.forEach(article => {
      let metadata = {
        url: article.url,
        title: article.title,
      };
      parsedResults.push(metadata);
    });

    return parsedResults;
  } catch (error) {
    console.error(error);
    return 'En löytänyt uutisia, möks :(';
  }
};

const getPremiumUrl = async article => {
  try {
    const options = {
      uri: article.url,
    };
    const htmlString = await rp(options);
    const $ = cheerio.load(htmlString);

    const unlockedUrl = findUnlockedUrl($);
    return {
      title: article.title,
      url: decodeURIComponent(unlockedUrl).trim(),
    };
  } catch (error) {
    console.error(error);
    return 'Kompastuin :(';
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
