import { assert, getMollieEnvironment } from "./helpers";
import { getOrCreateCustomer } from "./customers";
import { errorReport } from "./slack";

export const createPayment = async (data: any, type: string) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))
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
    paymentData.webhookUrl = 'https://us-central1-demonth-55207.cloudfunctions.net/paymentWebhook'

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
      paymentData.webhookUrl = 'https://us-central1-demonth-55207.cloudfunctions.net/retryPaymentWebhook'
      paymentData.metadata = {
        deliveryItemId: data.deliveryItemId
      }
    }
    if (data.isTransfer) {
      paymentData.webhookUrl = 'https://us-central1-demonth-55207.cloudfunctions.net/paymentWebhook'
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
    paymentData.webhookUrl = 'https://us-central1-demonth-55207.cloudfunctions.net/oneOffPaymentWebhook'

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
      console.error(error)
      await errorReport('createPayment', error, JSON.stringify(paymentData))
      return ''
    });
}

export const getAllPaymentsFromCustomers = async (data: any) => {
  const customerItem = await getOrCreateCustomer(assert(data, 'uid'))

  return await (await getMollieEnvironment(assert(data, 'uid'))).customers_payments.list({ customerId: customerItem.id })
    .then(payments => {
      return payments
    })
    .catch(async error => {
      // Handle the error
      await errorReport('getAllPaymentsFromCustomers', error)
      console.log(error)
      return ''
    });
}