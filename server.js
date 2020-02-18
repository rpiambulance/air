//global packages
const {createMessageAdapter} = require('@slack/interactive-messages');
const {WebClient} = require('@slack/web-api');
const {Verification} = require('./middleware/Verification');
const nodeMailin = require('node-mailin');
require('dotenv').config();
const app = require('express')();
const bodyParser = require('body-parser');

//local packages
const Notifications = require('./utilities/Notifications');
const Actions = require('./utilities/Actions');
const Email = require('./utilities/Email');

if (!process.env.SLACK_BOT_TOKEN || !process.env.SLACK_SIGNING_SECRET) {
    throw 'Environment variables not properly loaded!';
}

//globals
const TOKEN = process.env.SLACK_BOT_TOKEN;
const PORT = process.env.NODE_PORT || 80;
const SECRET = process.env.SLACK_SIGNING_SECRET;

const webclient = new WebClient(TOKEN);
const notifications = new Notifications(webclient);
const actions = new Actions(webclient);

const slackInteractions = createMessageAdapter(SECRET);

app.listen(PORT, () => {
    console.log('AIR is up');
});

app.use('/slack/actions', slackInteractions.expressMiddleware());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use((req, res, next) => {
    Verification.verification(req, res, next);
});

app.post('/tmd_slack_notification', (req, res) => {
    notifications.normal(req, res);
    res.status(200).send();

});

app.post('/tmd_slack_notification_long', (req, res) => {
    notifications.longtone(req, res);
    res.status(200).send();
});

slackInteractions.action({type:'button'}, (payload, respond) => {
    actions.onButtonAction(payload, respond);
});

nodeMailin.start({
    port: 25
});

// eslint-disable-next-line require-await
nodeMailin.on('validateSender', async (session, address, callback) => {
    Email.verifySender(address, callback);
});

nodeMailin.on('message', (connection, data) => {
    notifications.email(Email.parseEmail(data.text));
});

