// Initialize Firebase Admin
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import createMollieClient from '@mollie/api-client';

// Initialize Cloud Firestore Database
const serviceAccount = require("../key/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://demonth-55207.firebaseio.com"
});

// Database
export const db = admin.firestore();
const settings = { timestampsInSnapshots: true };
db.settings(settings);

// Export SendGrid
export const API_KEY = functions.config().sendgrid.key;
export const API_KEY_ALL = functions.config().sendgrid.key.all;
export const TEMPLATE_WELCOME = functions.config().sendgrid.welcome;
export const TEMPLATE_ORDER_CONFIRM = functions.config().sendgrid.order.confirm;
export const TEMPLATE_ORDER_FAILED = functions.config().sendgrid.order.failed;
export const TEMPLATE_CONTACT = functions.config().sendgrid.contact;
export const TEMPLATE_SURVEY_ONE = functions.config().sendgrid.survey.one;
export const TEMPLATE_SURVEY_TWO = functions.config().sendgrid.survey.two;
export const TEMPLATE_MARKETING_INVITE = functions.config().sendgrid.marketing;
export const TEMPLATE_RETURN = functions.config().sendgrid.return; 
export const TEMPLATE_UPGRADE_PLAN = functions.config().sendgrid.upgrade; 
export const TEMPLATE_UPGRADE_TO_SUB = functions.config().sendgrid.upgrade.sub; 

// Export Mollie
export const mollieClient = createMollieClient({ apiKey: functions.config().mollie.key }); 
export const mollieClientTest = createMollieClient({ apiKey: functions.config().mollieTest.key }); 

// New
export const mollieClientNEW = createMollieClient({ apiKey: functions.config().mollieNew.key }); 
export const mollieClientNewTest = createMollieClient({ apiKey: functions.config().mollieNewTest.key }); 

//Slack
export const SLACKERROR = functions.config().slack.error;
export const SLACKACTION = functions.config().slack.action;
export const SLACKCOMMAND = functions.config().slack.command;