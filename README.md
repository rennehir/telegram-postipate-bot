# posti-pate-telegram-bot

[Chat with Posti-Pate](https://t.me/postipate_bot)

## How to dev

### Install dependencies

```bash
yarn install
```

### Start live dev server

```bash
yarn dev
```

This starts a public live session of Netlify Dev. [More info](https://github.com/netlify/cli/blob/master/docs/netlify-dev.md).

### Set bot webhook

`https://api.telegram.org/bot{your-bot-api-token}/setWebhook?url={netlify-live-url}/.netlify/functions/bot`

Go to above url in your browser and replace the token and the url. This tells the bot to call your dev instance instead of the live one.

## How to publish

`git push` to this repo starts the build process on Netlify. After that you need to set the webhook again to point to the production url.
