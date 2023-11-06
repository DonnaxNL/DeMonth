import { mollieClient, db, mollieClientNEW } from "./config";
import { assert, dateToString, getMollieEnvironment, stringToDate } from "./helpers";
import { getDatabaseOrder, getDeliveriesFromOrder } from "./orders";
import { getOrCreateCustomer, getUser, updateUser } from "./customers";
import { errorReport } from "./slack";
import { createTask, deleteSurveyTasksFromEmail } from "./tasks";
import { addContact, orderConfirmEmail } from "./email";

/* Mollie payment */
// Create subscription
export const createSubscription = async (data: any) => {
  const orderId = assert(data, 'orderId')
  const order = await getDatabaseOrder(orderId)
  const deliveries = await getDeliveriesFromOrder(orderId)
  let customerMollieId
  if (data.customerMollieId === null) {
    const firebaseUser = await getUser(assert(data, 'uid'));
    customerMollieId = firebaseUser.mollieCustomerIdOld
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
    await createTask('createNewPayment', performDate, taskData)

    // Save subscriptionId
    const docData = {
      subscriptionDetails: {
        subscriptionId: 'special',
        subscriptionStatus: 'active'
      }
    }

    await db.doc(`orders/${orderId}`).set(docData, { merge: true });
  } else {
    // Normal procedure
    let firstPaymentDateString
    if (typeof firstPaymentDate === "string" || firstPaymentDate instanceof String) {
      firstPaymentDateString = firstPaymentDate
    } else {
      firstPaymentDateString = dateToString(firstPaymentDate, 'mollie')
    }
    console.log(firstPaymentDate, firstPaymentDateString)

    return await (await getMollieEnvironment(order.userId)).customers_subscriptions.create({
      customerId: customerMollieId,
      amount: {
        currency: 'EUR',
        value: amount,
      },
      startDate: firstPaymentDateString,
      interval: interval,
      description: description,
      mandateId: assert(data, 'mandateId'),
      webhookUrl: 'https://us-central1-demonth-55207.cloudfunctions.net/recurringPaymentWebhook',
      metadata: data.metadata
    }).then(async subscription => {
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
        //await newOrder(order, assert(data, 'paymentId'), assert(data, 'paymentMethod'))
      }

      // Save subscriptionId
      const docData = {
        subscriptionDetails: {
          subscriptionId: subscription.id,
          subscriptionStatus: subscription.status
        }
      }

      await db.doc(`orders/${orderId}`).set(docData, { merge: true });
      return subscription
    }).catch(async error => {
      // Handle the error
      await errorReport('createSubscription', error, JSON.stringify(data))
      console.log(error)
    });
  }
}

// Get subscription from id
export const getSubscription = async (data: any) => {
  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.get(
    assert(data, 'subscriptionId'),
    { customerId: assert(data, 'customerMollieId') }
  ).then(subscriptions => {
    console.log(subscriptions)
    return subscriptions
  }).catch(async error => {
    // Handle the error
    await errorReport('createSubscription', error)
    console.log(error)
  });
}

// Get all subscriptions from user
export const getAllSubscriptions = async (data: any) => {
  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.all({
    customerId: assert(data, 'customerMollieId')
  }).then(subscriptions => {
    console.log(subscriptions)
    return subscriptions
  }).catch(async error => {
    // Handle the error
    await errorReport('createSubscription', error)
    console.log(error)
  });
}

// Update subscription interval
export const updateSubscriptionInterval = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))
  const order = await getDatabaseOrder(assert(data, 'orderId'))
  const oldDeliveryDaysApart = assert(data, 'deliveryDaysApartBefore')
  const newDeliveryDaysApart = assert(data, 'deliveryDaysApartAfter')
  const newStartDate = assert(data, 'nextDeliveryDate')
  const orderReference = assert(data, 'orderRef')
  const boxName = assert(data, 'boxName')
  const startSubscriptionDate = order.startDeliveryDate.toDate()
  startSubscriptionDate.setDate(startSubscriptionDate.getDate() + (oldDeliveryDaysApart - 1))
  let interval
  let startPaymentDate
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
  const splitDate = newStartDate.split("-")
  startPaymentDate = new Date(splitDate[2], (splitDate[1] - 1), splitDate[0])
  const description = orderReference + " | " + boxName + ' subscription, ' + paymentPlan + ' (every ' + newDeliveryDaysApart + ' days)'

  let updateData
  updateData = {
    customerId: customerItem.id,
    interval: interval,
    description: description
  }

  if (startPaymentDate > new Date()) {
    updateData.startDate = dateToString(startPaymentDate, 'mollie')
  }

  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.update(
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

// Update subscription startDate
export const updateSubscriptionStartDate = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))

  const updateData = {
    customerId: customerItem.id,
    startDate: assert(data, 'nextPaymentDate')
  }

  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.update(
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
export const updateSubscriptionPaymentDate = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))
  const order = await getDatabaseOrder(assert(data, 'orderId'))

  await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
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
      console.error('failed:' + mandates[0].status)
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

    await createSubscription(subscriptionData)
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionStartDate', error, JSON.stringify(data))
    console.log(error)
  });
}

// Update subscription Amount
export const updateSubscriptionAmount = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))
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

  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.update(
    assert(data, 'subscriptionId'),
    updateData
  ).then(async subscription => {
    console.log(subscription)
    return subscription
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionAmount', error, JSON.stringify(data))
    console.error(error)
  });
}

// Update subscription box
export const updateSubscriptionBox = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))
  const order = await getDatabaseOrder(assert(data, 'orderId'))

  await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
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
      console.error('failed:' + mandates[0].status)
      for (let index = 1; index < mandates.length; index++) {
        const mandate = mandates[index];
        if (mandate.status === 'pending' || mandate.status === 'valid') {
          mandateId = mandate.id
          break;
        }
      }
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

    await createSubscription(subscriptionData)
  }).catch(async error => {
    // Handle the error
    await errorReport('updateSubscriptionBox', error, JSON.stringify(data))
    console.error(error)
  });
}

// Pause subscription
export const pauseSubscription = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))
  const order = await getDatabaseOrder(assert(data, 'orderId'))

  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
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
    const subscriptionData = {
      customerMollieId: customerItem.id,
      orderId: order.orderId,
      orderRef: order.orderReference,
      uid: order.userId,
      mandateId: mandateId,
      startDate: order.startDate,
      metadata: subscription.metadata
    }

    const newSubscription = await createSubscription(subscriptionData)

    // Save subscription status
    const docData = {
      subscriptionDetails: {
        subscriptionStatus: 'paused'
      }
    }

    await db.doc(`orders/${order.orderId}`).set(docData, { merge: true });
    return newSubscription
  }).catch(async error => {
    // Handle the error
    await errorReport('pauseSubscription', error, JSON.stringify(data))
    // Save subscription status
    const docData = {
      subscriptionDetails: {
        subscriptionStatus: 'canceled'
      }
    }

    await db.doc(`orders/${order.orderId}`).set(docData, { merge: true });
    console.log(error)
  });
}

// Cancel subscription
export const cancelSubscription = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))
  const firebaseUser = await getUser(assert(data, 'uid'));
  const orderId = assert(data, 'orderId')

  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_subscriptions.delete(
    assert(data, 'subscriptionId'),
    { customerId: customerItem.id }
  ).then(async subscription => {
    console.log(subscription)

    // Add contact to mailing list
    const contactData = {
      list_ids: ['bf2038bd-2b55-4f44-ac8e-76dd41ee43d0'],
      contacts: [{
        first_name: firebaseUser.firstName,
        last_name: firebaseUser.lastName,
        email: firebaseUser.email,
        country: firebaseUser.address.country,
        custom_fields: {
          e1_T: firebaseUser.language ? firebaseUser.language : 'nl',
        }
      }]
    }
    await addContact(contactData)

    // Delete from emailTasks
    await deleteSurveyTasksFromEmail(firebaseUser.email)

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

    await db.doc(`orders/${orderId}`).set(docData, { merge: true });
    return subscription
  }).catch(async error => {
    // Handle the error
    await errorReport('cancelSubscription', error, JSON.stringify(data))
    console.log(error)
    return null
  });
}

// Plan cancel subscription
export const planCancelSubscription = async (data: any) => {
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
  await createTask(functionCall, performDate, taskData)
}

// Only change subscription status
export const cancelSubscriptionStatus = async (data: any) => {
  const orderId = assert(data, 'orderId')

  // Save subscription status
  const docData = {
    subscriptionDetails: {
      subscriptionStatus: 'canceled'
    }
  }

  await db.doc(`orders/${orderId}`).set(docData, { merge: true });
}

// Upgrade subscription to multiplan


// Convert subscription
export const convertSubscription = async (data: any) => {
  const user = await getUser(assert(data, 'uid'));
  const mandates = await mollieClientNEW.customers_mandates.page({ customerId: user.mollieCustomerId });
  if (mandates !== null && mandates.length > 0) {
    return await mollieClient.customers_subscriptions.delete(
      assert(data, 'subscriptionId'),
      { customerId: user.mollieCustomerIdOld }
    ).then(async subscription => {
      //console.log(JSON.stringify(subscription))
      //console.log('customerIdOld:' + user.mollieCustomerIdOld + ' | customerId' + user.mollieCustomerId)
      // Check mandate
      let mandateId = ''
      if (mandates.length > 0 && mandates[0].status === 'pending' ||
        mandates.length > 0 && mandates[0].status === 'valid') {
        mandateId = mandates[0].id

        return await mollieClientNEW.customers_subscriptions.create({
          customerId: user.mollieCustomerId,
          amount: {
            currency: 'EUR',
            value: subscription.amount.value,
          },
          startDate: assert(data, 'startDate'),
          interval: subscription.interval,
          description: subscription.description,
          mandateId: mandateId,
          webhookUrl: 'https://us-central1-demonth-55207.cloudfunctions.net/recurringPaymentWebhook',
          metadata: subscription.metadata
        }).then(async subscriptionNew => {
          console.log(subscriptionNew)
          // Save subscriptionId
          const docData = {
            subscriptionDetails: {
              subscriptionId: subscriptionNew.id
            }
          }

          await db.doc(`orders/` + assert(data, 'orderId')).set(docData, { merge: true });
          await updateUser(assert(data, 'uid'), {
            mollieCustomerIdOld: null
          })
          return subscription
        }).catch(async error => {
          // Handle the error
          await errorReport('convertSubscription', error, JSON.stringify(data))
          console.log(error)
        });
      } else {
        console.log('failed: missing mandate ' + user.mollieCustomerId)
        await errorReport('convertSubscription', 'Missing mandate: ', user.mollieCustomerId)
      }
    }).catch(async error => {
      // Handle the error
      await errorReport('convertSubscription', error, JSON.stringify(data))
      console.log(error)
    });
  } else {
    //await errorReport('convertSubscription', 'Missing mandate: ', user.mollieCustomerId)
    return 'failed: missing mandate ' + user.mollieCustomerId
  }
}