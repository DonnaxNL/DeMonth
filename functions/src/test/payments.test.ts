import { assert, getMollieEnvironment } from "../helpers";
import { getOrCreateCustomerTest } from "./customers.test";
import { errorReport } from "../slack";

export const createPaymentTest = async (data: any, type: string) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))
  const orderRef = assert(data, 'orderRef')
  const amount = assert(data, 'amount')
  let paymentData
  paymentData = {
    amount: {
      value: amount,
      currency: 'EUR'
    },
    customerId: customerItem.id,
    description: assert(data, 'description'),
    sequenceType: type
  }

  if (type === 'first') {
    paymentData.metadata = {
      FirebaseUID: assert(data, 'uid'),
      OrderId: assert(data, 'orderId'),
      OrderRef: orderRef
    }
    paymentData.redirectUrl = 'https://demonth.nl/order-finished?orderRef=' + orderRef
    paymentData.webhookUrl = 'https://us-central1-demonth-55207.cloudfunctions.net/paymentWebhookTest'

    const paymentMethod = assert(data, 'paymentMethod')
    if (paymentMethod === 'ideal') {
      paymentData.method = 'ideal'
      if (assert(data, 'issuer') !== 'ideal') {
        paymentData.issuer = assert(data, 'issuer')
      }
    } else {
      // Multiple methods
      paymentData.method = paymentMethod
    }
  } else if (type === 'recurring') {
    if (data.deliveryItemId) {
      //paymentData.webhookUrl = 'https://us-central1-demonth-55207.cloudfunctions.net/retryPaymentWebhook'
      paymentData.metadata = {
        deliveryItemId: data.deliveryItemId
      }
    }
    if (data.mandateId) {
      paymentData.mandateId = assert(data, 'mandateId')
    } else {
      const mandates = await (await getMollieEnvironment(assert(data, 'uid'))).customers_mandates.page({ customerId: customerItem.id });
      for (const mandate of mandates) {
        if (mandate.status === 'pending' || mandate.status === 'valid') {
          paymentData.mandateId = mandate.id
          break;
        } else {
          console.log('failed:' + mandate.status)
        }
      }
    }
  } else if (type === 'oneoff') {
    paymentData.metadata = {
      FirebaseUID: assert(data, 'uid'),
      OrderId: assert(data, 'orderId'),
      OrderRef: orderRef,
      IsGift: data.isGift
    }
    paymentData.redirectUrl = 'https://demonth.nl/order-finished?orderRef=' + orderRef
    paymentData.webhookUrl = 'https://us-central1-demonth-55207.cloudfunctions.net/oneOffPaymentWebhookTest'

    const paymentMethod = assert(data, 'paymentMethod')
    if (paymentMethod === 'ideal') {
      paymentData.method = 'ideal'
      if (assert(data, 'issuer') !== 'ideal') {
        paymentData.issuer = assert(data, 'issuer')
      }
    } else {
      // Multiple methods
      paymentData.method = paymentMethod
    }
  }

  return await (await getMollieEnvironment(assert(data, 'uid'))).payments.create(paymentData)
    .then(payment => {
      // Forward the customer to the payment.getCheckoutUrl()
      return payment
    })
    .catch(async error => {
      // Handle the error
      await errorReport('createPaymentTest', error, JSON.stringify(paymentData))
      console.error(error)
      return ''
    });
}

export const getAllPaymentsFromCustomersTest = async (data: any) => {
  const customerItem = await getOrCreateCustomerTest(assert(data, 'uid'))

  return (await getMollieEnvironment(assert(data, 'uid'))).customers_payments.list({ customerId: customerItem.id })
    .then(payments => {
      return payments
    })
    .catch(async error => {
      //Handle the error
      await errorReport('getAllPaymentsFromCustomersTest', error)
      console.log(error)
      return ''
    });
}