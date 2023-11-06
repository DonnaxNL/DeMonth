import { db, mollieClientNewTest } from "../config";
import { assert, dateToString, getMollieEnvironment, stringToDate } from "../helpers";
import { getDatabaseOrderTest, getDeliveriesFromOrderTest } from "./orders.test";
import { getOrCreateCustomerTest, getUser } from "./customers.test";
import { errorReport } from "../slack";
import { createTaskTest } from "./tasks.test";
import { orderConfirmEmail } from "../email";
import { deleteSurveyTasksFromEmail } from "../tasks";

/* Mollie payment */
// Create subscription
export const createSubscriptionTest = async (data: any) => {
  const orderId = assert(data, 'orderId')
  const order = await getDatabaseOrderTest(orderId)
  const deliveries = await getDeliveriesFromOrderTest(orderId)
  let customerMollieId
  if (data.customerMollieId === null) {
    const firebaseUser = await getUser(assert(data, 'uid'));
    customerMollieId = firebaseUser.mollieTestCustomerId
  } else {
    customerMollieId = assert(data, 'customerMollieId')
  }

  // SubscriptionData
  const amount = '' + order.checkoutSummary.checkoutPrice / 100
  let interval
  let paymentPlan = order.paymentPlan
  let firstPaymentDate
  if (paymentPlan === 1 || paymentPlan === '1') {
    paymentPlan = 'Monthly Plan'
    interval = order.deliveryDaysApart + ' days'
  } else if (paymentPlan === 3 || paymentPlan === '3') {
    paymentPlan = '3 Month Plan'
    interval = (order.deliveryDaysApart * 3) + ' days'
  } else if (paymentPlan === 12 || paymentPlan === '12') {
    paymentPlan = '12 Month Plan'
    interval = (order.deliveryDaysApart * 12) + ' days'
  }
  const description = order.orderReference + " | " + order.boxName + ' subscription, ' + paymentPlan + ' (every ' + order.deliveryDaysApart + ' days)'

  firstPaymentDate = deliveries[deliveries.length - 1].deliveryDate.toDate()

  if (data.startDate) {
    firstPaymentDate = data.startDate
  }

  const intervalNumber = order.deliveryDaysApart * parseInt(paymentPlan)
  if (intervalNumber > 365) {
    const performDate = firstPaymentDate
    console.log('performDate:' + performDate)
    const taskData = {
      amount: amount,
      description: description,
      mandateId: assert(data, 'mandateId'),
      orderId: order.orderId,
      orderRef: order.orderReference,
      uid: order.userId
    }
    await createTaskTest('createNewPayment', performDate, taskData)

    // Save subscriptionId
    const docData = {
      subscriptionDetails: {
        subscriptionId: 'special',
        subscriptionStatus: 'active'
      }
    }

    await db.doc(`test-orders/${orderId}`).set(docData, { merge: true });
  } else {
    // Normal procedure
    let firstPaymentDateString
    if (typeof firstPaymentDate === "string" || firstPaymentDate instanceof String) {
      firstPaymentDateString = firstPaymentDate
    } else {
      firstPaymentDateString = dateToString(firstPaymentDate, 'mollie')
    }
    console.log(firstPaymentDate, firstPaymentDateString)

    const mollieData = {
      customerId: customerMollieId,
      amount: {
        currency: 'EUR',
        value: amount,
      },
      startDate: firstPaymentDateString,
      interval: interval,
      description: description,
      mandateId: assert(data, 'mandateId'),
      webhookUrl: 'https://us-central1-demonth-55207.cloudfunctions.net/recurringPaymentWebhookTest',
      metadata: data.metadata
    }

    return (await getMollieEnvironment(order.userId)).customers_subscriptions.create(mollieData)
      .then(async subscription => {
        console.log(subscription)
        
        if (assert(order, 'startDeliveryDate').toDate() > new Date() && !data.startDate && data.paymentId) {
          const firebaseUser = await getUser(assert(data.metadata, 'FirebaseUID'));
          // Send email
          const mailData = {
            recipient: firebaseUser.email,
            language: firebaseUser.language !== null ? firebaseUser.language : 'nl',
            order: {
              orderId: orderId,
              orderRef: order.orderReference,
              orderDate: dateToString(assert(order, 'orderCreated'), 'time'),
              boxName: order.boxName,
              paymentPlan: order.paymentPlan,
              deliveryDate: dateToString(assert(order, 'startDeliveryDate'), 'date'),
              days: order.deliveryDaysApart,
              amount: order.productQuantity,
            }
          }
          await orderConfirmEmail(mailData)

          // New order slack message
          //await newOrderTest(order, assert(data, 'paymentId'), assert(data, 'paymentMethod'))
        }

        // Save subscriptionId
        const docData = {
          subscriptionDetails: {
            subscriptionId: subscription.id,
            subscriptionStatus: subscription.status
          }
        }

        await db.doc(`test-orders/${orderId}`).set(docData, { merge: true });
        return subscription
      }).catch(async error => {
        // Handle the error
        await errorReport('createSubscriptionTest', error, JSON.stringify(data))
        console.log(error)
      });
  }
}

// Get subscription from id
export const getSubscriptionTest = async (data: any) => {
  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.get(
    assert(data, 'subscriptionId'),
    { customerId: assert(data, 'customerMollieId') }
  ).then(subscriptions => {
    console.log(subscriptions)
    return subscriptions
  }).catch(async error => {
    // Handle the error
    //await errorReport('getSubscriptionTest', error)
    //console.log(error)
    return null
  });
}

// Get all subscriptions from user
export const getAllSubscriptionsTest = async (data: any) => {
  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.all({
    customerId: assert(data, 'customerMollieId')
  }).then(subscriptions => {
    console.log(subscriptions)
    return subscriptions
  }).catch(async error => {
    // Handle the error
    await errorReport('getAllSubscriptionsTest', error)
    console.log(error)
  });
}

// Update subscription Interval
export const updateSubscriptionIntervalTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const newDeliveryDaysApart = assert(data, 'deliveryDaysApartAfter')
  const orderReference = assert(data, 'orderRef')
  const boxName = assert(data, 'boxName')
  let interval
  let paymentPlan = assert(data, 'paymentPlan')
  if (paymentPlan === 1) {
    paymentPlan = 'Monthly Plan'
    interval = newDeliveryDaysApart + ' days'
  } else if (paymentPlan === 3) {
    paymentPlan = '3 Month Plan'
    interval = (newDeliveryDaysApart * 3) + ' days'
  } else if (paymentPlan === 12) {
    paymentPlan = '12 Month Plan'
    interval = (newDeliveryDaysApart * 12) + ' days'
  }
  const description = orderReference + " | " + boxName + ' subscription, ' + paymentPlan + ' (every ' + newDeliveryDaysApart + ' days)'

  let updateData
  updateData = {
    customerId: customerItem.id,
    interval: interval,
    description: description
  }

  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.update(
    assert(data, 'subscriptionId'),
    updateData
  ).then(async subscription => {
    console.log(subscription)
    return subscription
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionIntervalTest', error, JSON.stringify(updateData))
    console.error(error)
  });
}

// Update subscription startDate
export const updateSubscriptionStartDateTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))

  const updateData = {
    customerId: customerItem.id,
    startDate: assert(data, 'nextPaymentDate')
  }

  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.update(
    assert(data, 'subscriptionId'),
    updateData
  ).then(async subscription => {
    console.log(subscription)
    return subscription
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionInterval', error, JSON.stringify(updateData))
    console.error(error)
  });
}

// Update subscription paymentDate
export const updateSubscriptionPaymentDateTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const order = await getDatabaseOrderTest(assert(data, 'orderId'));

  (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
    assert(data, 'subscriptionId'),
    { customerId: customerItem.id }
  ).then(async subscription => {
    console.log(subscription);
    // Check mandate
    const mandates = await (await getMollieEnvironment(assert(data, 'uid'))).customers_mandates.page({ customerId: customerItem.id });
    let mandateId = ''
    if (mandates[0].status === 'pending' || mandates[0].status === 'valid') {
      mandateId = mandates[0].id
    } else {
      console.log('failed:' + mandates[0].status)
      for (let index = 1; index < mandates.length; index++) {
        const mandate = mandates[index];
        if (mandate.status === 'pending' || mandate.status === 'valid') {
          mandateId = mandate.id
          break;
        }
      }
    }

    //Plan new subscription
    const newStartDate = assert(data, 'nextPaymentDate')
    console.log('performDate:' + newStartDate)
    const subscriptionData = {
      customerMollieId: customerItem.id,
      orderId: order.orderId,
      orderRef: order.orderReference,
      uid: order.userId,
      mandateId: mandateId,
      startDate: newStartDate,
      metadata: subscription.metadata
    }

    await createSubscriptionTest(subscriptionData)
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionStartDateTest', error, JSON.stringify(data))
    console.log(error)
  });
}

// Update subscription Amount
export const updateSubscriptionAmountTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const amount = '' + assert(data, 'checkoutPrice') / 100

  let updateData
  updateData = {
    customerId: customerItem.id,
    amount: {
      currency: 'EUR',
      value: amount,
    }
  }

  if (data.description) {
    updateData.description = data.description
  }

  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.update(
    assert(data, 'subscriptionId'),
    updateData
  ).then(async subscription => {
    console.log(subscription)
    return subscription
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionAmountTest', error, JSON.stringify(updateData))
    console.log(error)
  });
}

// Update subscription box
export const updateSubscriptionBoxTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const order = await getDatabaseOrderTest(assert(data, 'orderId'));

  (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
    assert(data, 'subscriptionId'),
    { customerId: customerItem.id }
  ).then(async subscription => {
    console.log(subscription)
    // Check mandate
    const mandates = await (await getMollieEnvironment(assert(data, 'uid'))).customers_mandates.page({ customerId: customerItem.id });
    let mandateId = ''
    if (mandates[0].status === 'pending' || mandates[0].status === 'valid') {
      mandateId = mandates[0].id
    } else {
      console.log('failed:' + mandates[0].status)
    }

    //Plan new subscription
    const performDate = assert(data, 'newStartDate')
    console.log('performDate:' + performDate)
    const subscriptionData = {
      customerMollieId: customerItem.id,
      orderId: order.orderId,
      orderRef: order.orderReference,
      uid: order.userId,
      mandateId: mandateId,
      startDate: performDate,
      metadata: subscription.metadata
    }

    await createSubscriptionTest(subscriptionData)
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionBoxTest', error, JSON.stringify(data))
    console.log(error)
  });
}

// Pause subscription
export const pauseSubscriptionTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const order = await getDatabaseOrderTest(assert(data, 'orderId'))

  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
    assert(data, 'subscriptionId'),
    { customerId: customerItem.id }
  ).then(async subscription => {
    console.log(subscription)
    // Check mandate
    const mandates = await (await getMollieEnvironment(assert(data, 'uid'))).customers_mandates.page({ customerId: customerItem.id });
    let mandateId = ''
    if (mandates[0].status === 'pending' || mandates[0].status === 'valid') {
      mandateId = mandates[0].id
    } else {
      console.log('failed:' + mandates[0].status)
    }

    //Plan new subscription
    const nextPaymentDate = order.startDate
    console.log('performDate:' + nextPaymentDate)
    const subscriptionData = {
      customerMollieId: customerItem.id,
      orderId: order.orderId,
      orderRef: order.orderReference,
      uid: order.userId,
      mandateId: mandateId,
      startDate: nextPaymentDate,
      metadata: subscription.metadata
    }

    const newSubscription = await createSubscriptionTest(subscriptionData)

    // Save subscription status
    const docData = {
      subscriptionDetails: {
        subscriptionStatus: 'paused'
      }
    }

    await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
    return newSubscription
  }).catch(async error => {
    // Handle the error
    await errorReport('pauseSubscriptionTest', error, JSON.stringify(data))
    // Save subscription status
    const docData = {
      subscriptionDetails: {
        subscriptionStatus: 'canceled'
      }
    }

    await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
    console.log(error)
  });
}

// Cancel subscription
export const cancelSubscriptionTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const firebaseUser = await getUser(assert(data, 'uid'));
  const orderId = assert(data, 'orderId')

  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
    assert(data, 'subscriptionId'),
    { customerId: customerItem.id }
  ).then(async subscription => {
    console.log(subscription)
    // Save subscription status
    let docData
    if (data.remainingOrders) {
      docData = {
        subscriptionDetails: {
          cancelDate: data.cancelDate ? stringToDate(assert(data, 'cancelDateString')) : new Date(),
          cancelReason: assert(data, 'cancelReason'),
          subscriptionStatus: 'canceled',
          lastDeliveryDate: stringToDate(assert(data, 'lastDeliveryDateString'))
        }
      }
    } else {
      docData = {
        subscriptionDetails: {
          cancelDate: data.cancelDate ? stringToDate(assert(data, 'cancelDateString')) : new Date(),
          cancelReason: assert(data, 'cancelReason'),
          subscriptionStatus: 'canceled'
        }
      }
    }

    // Delete from emailTasks
    await deleteSurveyTasksFromEmail(firebaseUser.email)

    await db.doc(`test-orders/${orderId}`).set(docData, { merge: true });
    return subscription
  }).catch(async error => {
    // Handle the error
    await errorReport('cancelSubscriptionTest', error, JSON.stringify(data))
    console.log(error)
  });
}

// Plan cancel subscription
export const planCancelSubscriptionTest = async (data: any) => {
  const performDate = stringToDate(assert(data, 'lastDeliveryDateString'))
  const taskData = {
    orderId: assert(data, 'orderId'),
    orderRef: assert(data, 'orderRef'),
    uid: assert(data, 'uid'),
    boxName: assert(data, 'boxName'),
    subscriptionId: assert(data, 'subscriptionId'),
    cancelReason: assert(data, 'cancelReason'),
    cancelDate: stringToDate(assert(data, 'cancelDateString')),
    cancelDateString: assert(data, 'cancelDateString')
  }
  const functionCall = data.remainingOrders ? 'cancelSubscriptionStatus' : 'cancelSubscription'
  await createTaskTest(functionCall, performDate, taskData)
}

// Only change subscription status
export const cancelSubscriptionStatusTest = async (data: any) => {
  const orderId = assert(data, 'orderId')
  
  // Save subscription status
  const docData = {
    subscriptionDetails: {
      subscriptionStatus: 'canceled'
    }
  }

  await db.doc(`test-orders/${orderId}`).set(docData, { merge: true });
}

// Convert subscription
export const convertSubscriptionTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const order = await getDatabaseOrderTest(assert(data, 'orderId'))

  return (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
    assert(data, 'subscriptionId'),
    { customerId: customerItem.id }
  ).then(async subscription => {
    //console.log(JSON.stringify(subscription))
    const user = await getUser(assert(data, 'uid'));
    console.log('customerId:' + user.mollieCustomerId)
    // Check mandate
    const mandates = await mollieClientNewTest.customers_mandates.page({ customerId: user.mollieCustomerId });
    let mandateId = ''
    if (mandates[0].status === 'pending' || mandates[0].status === 'valid') {
      mandateId = mandates[0].id
    } else {
      console.log('failed:' + mandates[0].status)
    }

    return await mollieClientNewTest.customers_subscriptions.create({
      customerId: user.mollieCustomerId,
      amount: {
        currency: 'EUR',
        value: subscription.amount.value,
      },
      startDate: subscription.startDate,
      interval: subscription.interval,
      description: subscription.description,
      mandateId: mandateId,
      webhookUrl: 'https://us-central1-demonth-55207.cloudfunctions.net/recurringPaymentWebhookTest',
      metadata: subscription.metadata
    }).then(async subscriptionNew => {
      console.log(subscriptionNew)
      // Save subscriptionId
      const docData = {
        subscriptionDetails: {
          subscriptionId: subscriptionNew.id
        }
      }

      await db.doc(`orders/${order.orderId}`).set(docData, { merge: true });
      return subscription
    }).catch(async error => {
      // Handle the error
      await errorReport('convertSubscription', error, JSON.stringify(data))
      console.log(error)
    });
  }).catch(async error => {
    // Handle the error
    await errorReport('convertSubscription', error, JSON.stringify(data))
    console.log(error)
  });
}