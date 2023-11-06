import * as functions from 'firebase-functions';
import { API_KEY, TEMPLATE_CONTACT, API_KEY_ALL } from './config';
import { assert, realCustomer, stringToDate } from './helpers';
// Sendgrid Config
import * as sgMail from '@sendgrid/mail';
import * as sgClient from '@sendgrid/client';

// Regular
import { slackDeliveryList, slackNoCommand } from './slack';
import { oneOffPaymentComplete, paymentComplete, recurringPaymentComplete, retryPaymentComplete } from './webhooks';
import { getAllPaymentsFromCustomers } from './payments';
import { cancelSubscription, updateSubscriptionInterval, updateSubscriptionAmount, updateSubscriptionBox, pauseSubscription, planCancelSubscription, updateSubscriptionStartDate, updateSubscriptionPaymentDate } from './subscriptions';
// Test
import { oneOffPaymentCompleteTest, paymentCompleteTest, recurringPaymentCompleteTest } from './test/webhooks.test';
import { getAllPaymentsFromCustomersTest } from './test/payments.test';
import { cancelSubscriptionTest, updateSubscriptionAmountTest, pauseSubscriptionTest, updateSubscriptionBoxTest, planCancelSubscriptionTest, updateSubscriptionStartDateTest, updateSubscriptionIntervalTest, updateSubscriptionPaymentDateTest } from './test/subscriptions.test';
import { createReminderTask, createTask } from './tasks';
sgMail.setApiKey(API_KEY);
sgClient.setApiKey(API_KEY_ALL);

// --------------- Mollie Payments/Subscriptions ---------------

// List of all payments from customer
export const getPaymentsFromCustomer = functions.https.onCall(async (data: any) => {
  if (realCustomer(assert(data, 'uid'))) {
    return await getAllPaymentsFromCustomers(data)
  } else {
    return await getAllPaymentsFromCustomersTest(data)
  }
})

// Update subscription interval
export const updateSubscriptionCall = functions.https.onCall(async (data: any) => {
  if (realCustomer(assert(data, 'uid'))) {
    if (data.changeStartDate) {
      return await updateSubscriptionStartDate(data)
    } else {
      if (data.onlyDays) {
        return await updateSubscriptionInterval(data)
      } else {
        await updateSubscriptionPaymentDate(data)
      }
    }
  } else {
    if (data.changeStartDate) {
      return await updateSubscriptionStartDateTest(data)
    } else {
      if (data.onlyDays) {
        return await updateSubscriptionIntervalTest(data)
      } else {
        await updateSubscriptionPaymentDateTest(data)
      }
    }
  }
})

// Update subscription amount
export const updateSubscriptionAmountCall = functions.https.onCall(async (data: any) => {
  if (realCustomer(assert(data, 'uid'))) {
    return await updateSubscriptionAmount(data)
  } else {
    return await updateSubscriptionAmountTest(data)
  }
})

// Update subscription box
export const updateSubscriptionBoxCall = functions.https.onCall(async (data: any) => {
  if (realCustomer(assert(data, 'uid'))) {
    await updateSubscriptionBox(data)
  } else {
    await updateSubscriptionBoxTest(data)
  }
})

// Pause Subscription
export const pauseSubscriptionCall = functions.https.onCall(async (data: any) => {
  if (realCustomer(assert(data, 'uid'))) {
    return await pauseSubscription(data)
  } else {
    return await pauseSubscriptionTest(data)
  }
})

// Cancel Subscription
export const cancelSubscriptionCall = functions.https.onCall(async (data: any) => {
  if (realCustomer(assert(data, 'uid'))) {
    return await cancelSubscription(data)
  } else {
    return await cancelSubscriptionTest(data)
  }
})

//Plan cancel Subscription
export const planCancelSubscriptionCall = functions.https.onCall(async (data: any) => {
  if (realCustomer(assert(data, 'uid'))) {
    await planCancelSubscription(data)
  } else {
    await planCancelSubscriptionTest(data)
  }
})

// Plan Return Email Call
export const planReturnEmailCall = functions.https.onCall(async (data: any) => {
  const taskData = {
    orderId: data.orderId,
    firstName: data.firstName,
    recipient: data.email,
    language: data.language !== '' ? data.language : 'nl'
  }
  const performDate = new Date(stringToDate(assert(data, 'orderCreated'), true))
  performDate.setTime(performDate.getTime() + (1 * 60 * 60 * 1000))
  await createReminderTask('returnEmail', performDate, taskData)
})

// Payment Complete - Webhook
export const paymentWebhook = functions.https.onRequest(
  async (req, res) => {
    try {
      await paymentComplete(req, res)
    } catch (err) {
      console.log('Error: ' + err)
      res.status(400).render('Error:' + err)
    }
  }
)

// Recurring Payment Complete - Webhook
export const recurringPaymentWebhook = functions.https.onRequest(
  async (req, res) => {
    try {
      await recurringPaymentComplete(req, res)
    } catch (err) {
      console.log('Error: ' + err)
      res.status(400).render('Error:' + err)
    }
  }
)

// Retry Payment Complete - Webhook
export const retryPaymentWebhook = functions.https.onRequest(
  async (req, res) => {
    try {
      await retryPaymentComplete(req, res)
    } catch (err) {
      console.log('Error: ' + err)
      res.status(400).render('Error:' + err)
    }
  }
)

// One Off Payment Complete - Webhook
export const oneOffPaymentWebhook = functions.https.onRequest(
  async (req, res) => {
    try {
      await oneOffPaymentComplete(req, res)
    } catch (err) {
      console.log('Error: ' + err)
      res.status(400).render('Error:' + err)
    }
  }
)

// Payment Complete Test - Webhook
export const paymentWebhookTest = functions.https.onRequest(
  async (req, res) => {
    try {
      await paymentCompleteTest(req, res)
    } catch (err) {
      console.log('Error: ' + err)
      res.status(400).render('Error:' + err)
    }
  }
)

// Recurring Payment Complete - Webhook
export const recurringPaymentWebhookTest = functions.https.onRequest(
  async (req, res) => {
    try {
      await recurringPaymentCompleteTest(req, res)
    } catch (err) {
      console.log('Error: ' + err)
      res.status(400).render('Error:' + err)
    }
  }
)

// One Off Payment Complete - Webhook
export const oneOffPaymentWebhookTest = functions.https.onRequest(
  async (req, res) => {
    try {
      await oneOffPaymentCompleteTest(req, res)
    } catch (err) {
      console.log('Error: ' + err)
      res.status(400).render('Error:' + err)
    }
  }
)

// --------------- Tasks ---------------

// Plan task
export const planPaymentTask = functions.https.onCall(async (data: any) => {
  const performDate = stringToDate(assert(data, 'performDate'))

  const taskData = {
    amount: data.amount,
    description: data.description,
    orderId: data.orderId,
    orderRef: data.orderRef,
    subscriptionId: data.subscriptionId,
    uid: data.uid
  }
  await createTask('createNewPayment', performDate, taskData)
})

// --------------- Sendgrid Email ---------------

// Sends email to user after signup
// export const welcomeEmail = functions.auth.user().onCreate(user => {

//   const msg = {
//     to: user.email,
//     from: 'DeMonth <info@demonth.nl>',
//     templateId: TEMPLATE_ID,
//     dynamic_template_data: {
//       subject: 'Welcome to DeMonth!',
//       name: user.displayName,
//     },
//   };

//   return sgMail.send(msg);

// });

// Sends email via HTTP. Can be called from frontend code. 
export const contactEmail = functions.https.onCall(async (data) => {

  // Customer
  const msg = {
    to: 'donavanlb@hotmail.com',
    from: 'DeMonth Contact Form <info@demonth.nl>',
    templateId: TEMPLATE_CONTACT,
    dynamic_template_data: {
      message: data
    },
  };

  await sgMail.send(msg);

  // Handle errors here

  // Response must be JSON serializable
  return { success: true };

});

// --------------- Slack ---------------

// Catch Slack action
export const slackBot = functions.https.onRequest(
  async (req, res) => {
    try {
      const payload = req.body.event;

      if (payload.type === "app_mention") {
        console.log('got mention');
        if ((payload.text as string).includes("delivery list")) {
          console.log('text recognised')
          await slackDeliveryList(payload.user);
        } else {
          console.log('text not recognised')
          await slackNoCommand();
        }
      }

      res.sendStatus(200);
    } catch (err) {
      res.status(400).render('Error:' + err);
    }
  });