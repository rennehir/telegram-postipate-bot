const URL = require('url').URL;

const Telegraf = require('telegraf');
const rp = require('request-promise');
const cheerio = require('cheerio');

const bot = new Telegraf(process.env.BOT_TOKEN);

// Handler for /start command
bot.start(ctx => {
  ctx.replyWithMarkdown(
  'Terve! Minä olen Posti-Pate! Toimitan sinulle artikkelit enkä laikkoile _(välillä menen rikki, mutta sitä ei voi edes liitto estää)_!\n\n'+
'Vastaan kun lähetät minulle artikkelin.')
});

// Handler for /help command
bot.help(ctx => {
  ctx.replyWithMarkdown(
    'Toimin kun lähetät minulle linkin osoitteesta:\r\nwww.ksml.fi\n'+
    'Jos käytät /luetuimmat, kopioi linkki ja lähetä se minulle.'
  );
})

// Handler for listing top news from www.ksml.fi
bot.hears(/\/luetuimmat/, async ctx => {
  
  try {
    // API for "luetuimmat" :D
    const options = {
      uri: 'https://api.cxense.com/public/widget/data?json={"context":{"referrer":"","autoRefresh":false,"url":"https://www.ksml.fi/"},"widgetId":"f69aae81d6a4644692216c9510354428b16524f3"}'
    };
    const htmlString = await rp(options);
    const $ = cheerio.load(htmlString);
    
    const topNews = findTopNews($);
    let responseTxt = "*Luetuimmat:*";
    /*
      Add unlockedURL to list. It takes way too long, and somehow breaks the inline link?
      let newURL = await getPwUrl(article.url);
      responseTxt += `\n*${index+1}.* [${article.title}](${newURL})\n`;
      */
    for(let [index, article] of topNews.entries()) {
      responseTxt += `\n*${index+1}.* [${article.title}](${decodeURIComponent(article.url)})\n`;
    }

    ctx.replyWithMarkdown(responseTxt, {disable_web_page_preview: true});
  } catch (error) {
    const { name, statusCode, message } = error;
    console.error({ name, statusCode, message});
    ctx.replyWithMarkdown(`*${name}:* ${statusCode}`);
  }
})

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
    const decodedURI = decodeURIComponent(unlockedUrl);

    ctx.deleteMessage(message.message_id);
    ctx.replyWithMarkdown(`Linkkinne olkaa hyvät:\r\n(${decodedURI})`);
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

const findTopNews = $ => {
  try {
    let parsedResults = [];
    const articles = JSON.parse($.text()).items;
    
    articles.forEach(article => {
      let metadata = {
        url: article.url,
        title: article.title,
      }
      parsedResults.push(metadata);
    });
    
    return parsedResults;
  } catch (error) {
    return 'En löytänyt uutisia, möks :('
  }
}

// This needs optimization, takes way too long :(
const getPwUrl = async url => {
  try {
    const options = {
      uri: url
    };
    const htmlString = await rp(options);
    const $ = cheerio.load(htmlString);

    const unlockedUrl = findUnlockedUrl($);
    return unlockedUrl;
    //return decodeURIComponent(unlockedUrl);
    

  } catch (error) {
    return 'Kompastuin :('
  }
}

exports.handler = (event, context, cb) => {
  try {
    const tmp = JSON.parse(event.body);
    bot.handleUpdate(tmp);
    cb(null, { statusCode: 200, body: 'OK' });
  } catch (err) {
    return { statusCode: 500, body: err.toString() };
  }
};
