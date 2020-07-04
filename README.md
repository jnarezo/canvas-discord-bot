<!-- ![Atelier Banner]() -->
Atelier is a **Discord reminder bot** with **Canvas LMI integration** to help
student communities keep track of their assignments and stay on top of their
classes, together.

[Add Atelier on Discord](https://discord.com/api/oauth2/authorize?client_id=716168532357939250&permissions=199744&scope=bot)!

Official Atelier's currently supported educational institutions:
- UC San Diego (pending)

Don't see your institution in the list but want to use Atelier?
[Let us know]() and we'll try to get your institution's approval as soon as
possible!

If you don't want to wait, it's possible to set up **your own** Atelier by
**self-hosting**. If you do, you will only be able to access your own courses
and course assignments.

We hope you reach out to us, though, so we can get your institution's approval
for other students that may want to use Atelier and don't want to self-host.

## Self-Hosting
This is a short guide for anyone that wants to host their own Atelier for
a few servers and individual Canvas courses.

### Setup

#### Install Node.js
If you're on **Windows** or **macOS**, download the correct installer from
Node.js [downloads](https://nodejs.org/en/download/).

If you're on **Linux**, download Node.js through your package manager. Examples:

Debian
```
$ pkg install nodejs
```
Arch-Linux
```
$ pacman -S nodejs npm
```

#### Download Atelier
Download the source code zip or clone from our
GitHub [repository](https://github.com/jnarezo/canvas-discord-bot)
<!-- TODO?: GitHub [releases]() -->
and extract the files to a new folder or directory.

#### Link Atelier to your Canvas Account
For your bot to work, you will need to generate a **Canvas Developer Token**
under your Canvas account. This allows the bot to see your courses and
assignments.
1. Go to your institution's Canvas homepage.
2. Under **Account**, go to your **Settings**.
3. Scroll down to **Account Integrations**.
4. Make a **New Access Token**.
5. Copy your token. You can view it again by checking your token's **details**.

**WARNING**: Your token *can* grant nearly full control over your account. Keep
your token private, just like your password. For more information about
*Manual Token Generation*, go [here](https://canvas.instructure.com/doc/api/file.oauth.html#manual-token-generation).

#### Configure Atelier
Now in your Atelier source code folder, edit `config.json` with any
text editor like Notepad on Windows.

Replace the entry for `canvasDomain` with your institution's Canvas URL, and
enter the Canvas token you just generated for `canvasToken`. You may edit the
prefix you use before your bot's commands. An example with a prefix "-": `-courses`.

The next step will involve retrieving your Discord token and adding the bot
to your server.

#### Add your bot on Discord
There's a pretty good guide on creating a bot *account* on Discord, [here](https://github.com/reactiflux/discord-irc/wiki/Creating-a-discord-bot-&-getting-a-token).

After you setup your bot on Discord, grab your bot's **token** and enter it
into your `config.json`.

#### Run
To run Atelier on **Windows**, open the command prompt (cmd) or PowerShell
in your Atelier folder with the source code.

If you use **macOS** or **Linux**, open the terminal instead.

Then enter:
```cmd
npm install
```
```cmd
node index.js
```

Congratulations! 👏 Your bot should be online and you now have
**your own** Atelier for your own classes and assignments.
Daily log files will be saved in your bot's folder.

**Reminder**: Reminders and subscriptions are saved even if your bot goes
offline. When you restart your bot, it will still send any upcoming reminders.
If a reminder was supposed to be sent while your bot was offline,
it will **NOT** be sent at all.

---

**Have a suggestion or found a bug?** [Contact us]() and we'll try to get to you soon!

<!-- Feeling generous? You can buy me a coffee (or boba) through [PayPal]().
Thank you, I really appreciate it! 🙌 -->