import { db } from '../config';
import { getUser, getUserFromReferralCode, updateUser } from './customers.test';
import { assert, dateToString, checkDate, getMollieEnvironment, getMollieEnvironmentByPayment, stringToDate } from '../helpers';
import { createSubscriptionTest } from './subscriptions.test';
import { getDatabaseOrderTest, getDatabaseOrderFromSubscriptionIdTest, getDeliveriesFromOrderTest } from './orders.test';
import { createSurveyTaskTest, createTaskTest } from './tasks.test';
import { errorReport } from '../slack';
import { orderConfirmEmail, orderFailedEmail } from '../email';
import { assignPoints } from '../points';
import { deleteReminderTask } from '../tasks';
import { MandateDetailsCreditCard, MandateDetailsDirectDebit } from '@mollie/api-client/dist/types/src/data/customers/mandates/data';

// --------------- Mollie Webhook actions ---------------
export const paymentCompleteTest = async (req: any, res: any) => {
  try {
    const body = req.body
    const payment = await getMollieEnvironmentByPayment(assert(body, 'id'), false)
    //console.log(payment)
    const metadata = payment && payment.metadata
    if (metadata) {
      if (payment.status === 'paid' && payment.amountRefunded.value === '0.00') {
        const firebaseUser = await getUser(assert(metadata, 'FirebaseUID'));
        let customerMollieId
        if (firebaseUser.mollieTestCustomerIdOld) {
          customerMollieId = firebaseUser.mollieTestCustomerIdOld
        } else {
          customerMollieId = firebaseUser.mollieTestCustomerId
        }
        const orderId = assert(metadata, 'OrderId')
        const orderRef = assert(metadata, 'OrderRef')
        const order = await getDatabaseOrderTest(orderId)
        const deliveryItemId = dateToString(assert(order, 'startDeliveryDate'), 'mollie')
        let docData
        // Set payment details
        docData = {
          paymentDetails: {
            directLink: 'https://www.mollie.com/dashboard/org_11302067/payments/' + payment.id,
            isPaid: true,
            paymentId: payment.id,
            paymentMethod: payment.method,
          }
        }
        if (order.subscriptionDetails.subscriptionStatus !== 'canceled') {
          if (order.paymentPlan === 1) {
            // Monthly plan

            // Update current delivery with paymentDetails
            await db.doc(`test-orders/${orderId}/deliveries/${deliveryItemId}`).set(docData, { merge: true });
          } else {
            // 3-12 month plan
            const deliveries = await getDeliveriesFromOrderTest(order.orderId)
            const deliveryItemIds = []
            deliveries.forEach(delivery => {
              deliveryItemIds.push(delivery.id)
            });
            deliveryItemIds.forEach(async ids => {
              await db.doc(`test-orders/${orderId}/deliveries/${ids}`).set(docData, { merge: true });
            });
          }

          //console.log(docData)

          await db.doc(`test-orders/${orderId}`).set(docData, { merge: true }); //TODO: Delete later

          // Set coupon on used
          if (order.checkoutSummary.coupon !== undefined) {
            const coupon = await db.collection(`coupons`).doc(order.checkoutSummary.coupon.id).get().then((doc: any) => doc.data()).catch(err => console.error(err));
            let data
            if (coupon.used !== undefined) {
              data = {
                used: true,
                usedByUid: firebaseUser.uid
              }
            } else if (coupon.usedBy !== undefined) {
              const usedByList = coupon.usedBy
              usedByList.push(firebaseUser.uid)
              data = {
                usedBy: usedByList
              }
            }

            await db.doc(`coupons/${coupon.id}`).set(data, { merge: true });
          }

          // Set referral on used
          if (order.checkoutSummary.referral !== undefined) {
            const referralCode = order.checkoutSummary.referral.code
            console.log(referralCode)
            const referrer = await getUserFromReferralCode(referralCode)
            if (referrer) {
              let usedBy = referrer.usedBy
              if (!usedBy || usedBy.length === 0) {
                usedBy = []
              }
              usedBy.push({
                id: usedBy.length,
                boxId: order.boxId,
                claimed: false,
                name: order.shippingAddress.firstName,
                uid: order.userId,
                usedAt: order.orderCreated
              })
              const data = {
                referral: {
                  usedBy: usedBy
                }
              }

              await db.doc(`userdata/${referrer.uid}`).set(data, { merge: true });
            } else {
              await errorReport('paymentWebhookTest', 'Referral not found', referralCode)
            }
          }

          // Plan satisfaction email
          const surveyTaskData = {
            recipient: firebaseUser.email,
            nextEmailInDays: order.deliveryDaysApart
          }
          const performDate = new Date(assert(order, 'startDeliveryDate').toDate())
          performDate.setDate(performDate.getDate() + 1)
          await createSurveyTaskTest('emailSurveyOne', performDate, surveyTaskData)

          if (order.checkoutSummary.coupon === undefined &&
            order.checkoutSummary.referral === undefined) {
            // Add points to customer
            await assignPoints(order)
          }

          // Remove Return Email Task
          await deleteReminderTask(order.orderId)

          if (customerMollieId) {
            // Check mandate
            const mandates = await (await getMollieEnvironment(assert(metadata, 'FirebaseUID'))).customers_mandates.page({ customerId: customerMollieId });
            for (const mandate of mandates) {
              if (mandate.status === 'pending' || mandate.status === 'valid') {
                const subscriptionData = {
                  customerMollieId: customerMollieId,
                  orderId: orderId,
                  orderRef: orderRef,
                  paymentId: payment.id,
                  paymentMethod: payment.method,
                  mandateId: mandate.id,
                  description: payment.description,
                  metadata: metadata
                }
                await createSubscriptionTest(subscriptionData)
                let mandateSaveData = []
                if (firebaseUser.mandates) {
                  mandateSaveData = firebaseUser.mandates
                }
                if (mandate.method === 'creditcard') {
                  mandateSaveData.push({
                    id: mandate.id,
                    method: mandate.method,
                    cardHolder: (mandate.details as MandateDetailsCreditCard).cardHolder,
                    cardNumber: (mandate.details as MandateDetailsCreditCard).cardNumber,
                    cardLabel: (mandate.details as MandateDetailsCreditCard).cardLabel,
                    cardExpireDate: stringToDate((mandate.details as any).cardExpiryDate)
                  })
                } else if (mandate.method === 'directdebit') {
                  mandateSaveData.push({
                    id: mandate.id,
                    method: mandate.method,
                    consumerName: (mandate.details as MandateDetailsDirectDebit).consumerName,
                    consumerAccount: (mandate.details as MandateDetailsDirectDebit).consumerAccount,
                    consumerBic: (mandate.details as MandateDetailsDirectDebit).consumerBic,
                    signatureDate: stringToDate(mandate.signatureDate)
                  })
                }
                if (mandateSaveData.length > 0) {
                  await updateUser(order.userId, {
                    mandates: mandateSaveData
                  })
                }
                break;
              } else {
                console.log('failed:' + mandate.status)
              }
            }
          } else {
            await errorReport('paymentCompleteTest', 'customerMollieId is null', body)
          }
        }
      } else if (payment.status !== 'paid' && payment.status !== 'expired') {
        await errorReport('paymentWebhookTest', 'Payment is not paid', JSON.stringify(payment))
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.log('Error:' + err)
    await errorReport('paymentWebhookTest', err, JSON.stringify(req.body))
    res.status(400).render('Error:' + err);
  }
}

export const recurringPaymentCompleteTest = async (req: any, res: any) => {
  try {
    const body = req.body
    const payment = await getMollieEnvironmentByPayment(assert(body, 'id'), false)
    //console.log(payment)
    if (payment.status === 'paid' && payment.subscriptionId !== undefined) {
      const order = await getDatabaseOrderFromSubscriptionIdTest(payment.subscriptionId)
      const firebaseUser = await getUser(assert(order, 'userId'));
      const details = (payment as any).details
      const updateCurrentPaymentData = {
        paymentDetails: {
          directLink: 'https://www.mollie.com/dashboard/org_11302067/payments/' + payment.id,
          isPaid: true,
          paymentId: payment.id,
          paymentMethod: payment.method,
        }
      }

      // Check if something went wrong with the payment
      if (order !== null && details.bankReasonCode !== undefined) {
        let data
        //console.log(details)
        // Check if payment is retried already
        if (!order.paymentDetails.retry || order.paymentDetails.retry < 1) {
          let deliveryDate = null
          if (order.paymentPlan === 1) {
            deliveryDate = order.nextDeliveryDate
          } else {
            deliveryDate = order.deliveryDates[order.deliveryDates.length - 1].toDate()
          }
          const deliveryItemId = dateToString(deliveryDate, 'mollie')
          if (details.bankReasonCode === 'AM04') {
            // Insufficient funds
            const paymentDetails = order.paymentDetails
            paymentDetails.retry = 1
            const docData = {
              paymentDetails: paymentDetails
            }
            await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
            const delayPaymentDays = 21 // Retry in 3 weeks
            const performDate = new Date((payment as any).paidAt)
            performDate.setDate(performDate.getDate() + delayPaymentDays)
            console.log('performDate:' + performDate)
            data = {
              amount: payment.amount.value,
              customerId: payment.customerId,
              description: '[Retry] ' + payment.description,
              deliveryItemId: deliveryItemId,
              mandateId: payment.mandateId,
              orderId: order.orderId,
              orderRef: order.orderReference,
              uid: order.userId
            }
            await createTaskTest('createNewPayment', performDate, data)

            // Send email
            const lastFourDigits = details.consumerAccount.slice(details.consumerAccount.length - 4);
            const mailData = {
              recipient: firebaseUser.email,
              language: firebaseUser.language !== null ? firebaseUser.language : 'nl',
              accountDigits: lastFourDigits
            }
            await orderFailedEmail(mailData, 'insufficientFunds')
          } else if (details.bankReasonCode === 'MD06' || details.bankReasonCode === 'MD02') {
            // Chargedback
            const paymentDetails = order.paymentDetails
            paymentDetails.retry = 1
            const docData = {
              paymentDetails: paymentDetails
            }
            await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
            const delayPaymentDays = 1 // Retry next day
            const performDate = new Date((payment as any).paidAt)
            performDate.setDate(performDate.getDate() + delayPaymentDays)
            console.log('performDate:' + performDate)
            data = {
              amount: payment.amount.value,
              customerId: payment.customerId,
              description: '[Retry] ' + payment.description,
              deliveryItemId: deliveryItemId,
              mandateId: payment.mandateId,
              orderId: order.orderId,
              orderRef: order.orderReference,
              uid: order.userId
            }
            await createTaskTest('createNewPayment', performDate, data)

            // Send email
            const lastFourDigits = details.consumerAccount.slice(details.consumerAccount.length - 4);
            const mailData = {
              recipient: firebaseUser.email,
              language: firebaseUser.language !== null ? firebaseUser.language : 'nl',
              accountDigits: lastFourDigits
            }
            await orderFailedEmail(mailData, 'failedRecurring')
          } else {
            console.log('Error: Payment chargeback - ' + details.bankReasonCode)
            await errorReport('recurringPaymentWebhookTest', 'Error: Payment chargeback - ' + details.bankReasonCode, JSON.stringify(req.body))
          }
        } else {
          await errorReport('recurringPaymentWebhookTest', 'Not paid twice, take further procedure', JSON.stringify(req.body))
        }
        // Check if it is a normal payment and not a refund.
      } else if (order !== null && payment.amountRefunded !== undefined && payment.amountRefunded.value === '0.00') {
        // Regular procedure 
        const deliveries = await getDeliveriesFromOrderTest(order.orderId)
        const cycleDays = parseInt(assert(order, 'deliveryDaysApart'))
        //console.log(deliveries)
        let docData
        if (order.paymentPlan === 1) {
          // Monthly

          // Update current delivery with paymentDetails
          let addNew = true
          let currentDelivery
          currentDelivery = deliveries[deliveries.length - 1].deliveryDate.toDate()
          const dateLimitCreditCard = new Date()
          dateLimitCreditCard.setDate(dateLimitCreditCard.getDate() + 2)
          if (order.paymentDetails.paymentMethod !== 'creditcard' && currentDelivery > new Date() ||
            order.paymentDetails.paymentMethod === 'creditcard' && currentDelivery > dateLimitCreditCard) {
            addNew = false
            currentDelivery = deliveries[deliveries.length - 2].deliveryDate.toDate()
          }
          // Incase changed after delivery, but before webhook called
          const thresholdDate = new Date()
          thresholdDate.setDate(thresholdDate.getDate() + 28)
          if (currentDelivery > thresholdDate) {
            addNew = false
            currentDelivery = deliveries[deliveries.length - 2].deliveryDate.toDate()
          }
          const currentDeliveryItemId = dateToString(currentDelivery, 'mollie')
          //console.log(currentDelivery)
          await db.doc(`test-orders/${order.orderId}/deliveries/${currentDeliveryItemId}`).set(updateCurrentPaymentData, { merge: true });

          // Create and add new delivery
          if (addNew) {
            const deliveryToAdd = new Date(checkDate(deliveries[deliveries.length - 1].deliveryDate.toDate()))
            deliveryToAdd.setDate(deliveryToAdd.getDate() + cycleDays)
            const deliveryItemId = dateToString(deliveryToAdd, 'mollie')
            const deliveryData = createDeliveryItem(order, deliveryToAdd)
            await db.doc(`test-orders/${order.orderId}/deliveries/${deliveryItemId}`).set(deliveryData, { merge: true })

            // Update nextDeliveryDate for oldStyle
            docData = {
              nextDeliveryDate: deliveryToAdd
            }
          }

          // Check if order was paused, return to active
          const subscriptionDetailsItem = order.subscriptionDetails
          if (subscriptionDetailsItem.subscriptionStatus === 'paused') {
            subscriptionDetailsItem.subscriptionStatus = 'active'
            if (!docData) {
              docData = {
                subscriptionDetails: subscriptionDetailsItem
              }
            } else {
              docData.subscriptionDetails = subscriptionDetailsItem
            }
          }

          // Check if order had retry
          const paymentDetailsItem = order.paymentDetails
          if (paymentDetailsItem.retry) {
            paymentDetailsItem.retry = null
            if (!docData) {
              docData = {
                paymentDetails: paymentDetailsItem
              }
            } else {
              docData.paymentDetails = paymentDetailsItem
            }
          }

          if (docData) {
            await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
          }
        } else {
          // 3/12 months
          const lastDeliveryId = deliveries[deliveries.length - 1].id

          // Update current deliveries with paymentDetails
          await db.doc(`test-orders/${order.orderId}/deliveries/${lastDeliveryId}`).set(updateCurrentPaymentData, { merge: true });

          // Add new deliveries
          const oldDeliveryDates = []
          for (let i = 1; i <= order.paymentPlan; i++) {
            const deliveryDate = new Date(deliveries[deliveries.length - 1].deliveryDate.toDate())
            deliveryDate.setDate(deliveryDate.getDate() + (i * cycleDays))
            const deliveryItemId = dateToString(deliveryDate, 'mollie')
            const newDocData = createDeliveryItem(order, deliveryDate, i !== 3 ? updateCurrentPaymentData : null)
            //console.log(newDocData)
            await db.doc(`test-orders/${order.orderId}/deliveries/${deliveryItemId}`).set(newDocData, { merge: true })
            oldDeliveryDates.push(deliveryDate)
          }

          // Update nextDeliveryDate for oldStyle
          docData = {
            deliveryDates: oldDeliveryDates
          }

          // Check if order was paused, return to active
          const subscriptionDetailsItem = order.subscriptionDetails
          if (subscriptionDetailsItem.subscriptionStatus === 'paused') {
            subscriptionDetailsItem.subscriptionStatus = 'active'
            docData.subscriptionDetails = subscriptionDetailsItem
          }

          await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
        }
      } else if (order === null) {
        await errorReport('recurringPaymentWebhookTest', 'Order is null.', payment.subscriptionId)
        res.sendStatus(500).render('Error: order is null. Check subscriptionId - ' + payment.subscriptionId);
      }

      res.sendStatus(200);
    } else if (payment.status === 'failed' && payment.subscriptionId !== undefined) {
      // Failed status given with creditcard
      const order = await getDatabaseOrderFromSubscriptionIdTest(payment.subscriptionId)
      const details = (payment as any).details
      // Check if something went wrong with the payment
      if (order !== null && details.failureReason !== undefined) {
        let data
        console.log(details)
        // Check if payment is retried already
        if (!order.paymentDetails.retry || order.paymentDetails.retry < 1) {
          if (details.failureReason === 'insufficient_funds') {
            // Insufficient funds
            const paymentDetails = order.paymentDetails
            paymentDetails.retry = 1
            const docData = {
              paymentDetails: paymentDetails
            }
            await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
            const delayPaymentDays = 21 // Retry in 3 weeks
            const performDate = new Date((payment as any).failedAt)
            performDate.setDate(performDate.getDate() + delayPaymentDays)
            console.log('performDate:' + performDate)
            data = {
              amount: payment.amount.value,
              customerId: payment.customerId,
              description: '[Retry] ' + payment.description,
              mandateId: payment.mandateId,
              orderId: order.orderId,
              orderRef: order.orderReference,
              uid: order.userId
            }
            await createTaskTest('createNewPayment', performDate, data)
          } else if (details.failureReason === 'card_expired') {
            // TODO
            console.log('Error: Payment chargeback (card expired) - ' + details.failureReason)
            await errorReport('recurringPaymentWebhookTest', 'Error: Payment chargeback (card expired) - ' + details.failureReason, JSON.stringify(req.body))
          } else {
            console.log('Error: Payment chargeback - ' + details.failureReason)
            await errorReport('recurringPaymentWebhookTest', 'Error: Payment chargeback - ' + details.failureReason, JSON.stringify(req.body))
          }
        } else {
          await errorReport('recurringPaymentWebhookTest', 'Not paid twice, take further procedure', JSON.stringify(req.body))
        }
      }
      // deepcode ignore XSS/test: <please specify a reason of ignoring this>
      res.status(200).send(payment);
    } else {
      // deepcode ignore XSS/test: <please specify a reason of ignoring this>
      res.status(200).send(payment);
    }
  } catch (err) {
    console.log('Error:' + err)
    await errorReport('recurringPaymentWebhookTest', err, JSON.stringify(req.body))
    res.status(400).render('Error:' + err);
  }
}

export const retryPaymentCompleteTest = async (req: any, res: any) => {
  try {
    const body = req.body
    const payment = await getMollieEnvironmentByPayment(assert(body, 'id'), false)
    //console.log(payment)
    if (payment.status === 'paid' && payment.subscriptionId !== undefined) {
      const order = await getDatabaseOrderFromSubscriptionIdTest(payment.subscriptionId)
      const details = (payment as any).details
      const metadata = (payment as any).metadata
      const updateCurrentPaymentData = {
        paymentDetails: {
          directLink: 'https://www.mollie.com/dashboard/org_11302067/payments/' + payment.id,
          isPaid: true,
          paymentId: payment.id,
          paymentMethod: payment.method,
        }
      }

      // Check if something went wrong with the payment
      if (order !== null && details.bankReasonCode !== undefined) {
        // Check if payment is retried already
        if (!order.paymentDetails.retry) {
          const paymentDetails = order.paymentDetails
          paymentDetails.retry = 2
          const docData = {
            paymentDetails: paymentDetails
          }
          await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
          await errorReport('retryPaymentWebhookTest', 'Not paid twice, take further procedure', JSON.stringify(req.body))
        } else {
          await errorReport('retryPaymentWebhookTest', 'Error: Payment chargeback - ' + details.bankReasonCode, JSON.stringify(req.body))
        }
        // Check if it is a normal payment and not a refund.
      } else if (order !== null && payment.amountRefunded !== undefined && payment.amountRefunded.value === '0.00') {
        let docData
        // Remove retry
        const paymentDetailsItem = order.paymentDetails
        if (paymentDetailsItem.retry) {
          paymentDetailsItem.retry = null
          if (!docData) {
            docData = {
              paymentDetails: paymentDetailsItem
            }
          } else {
            docData.paymentDetails = paymentDetailsItem
          }
        }

        if (docData) {
          await db.doc(`test-orders/${order.orderId}`).set(docData, { merge: true });
        }

        const currentDeliveryItemId = metadata.deliveryItemId
        await db.doc(`test-orders/${order.orderId}/deliveries/${currentDeliveryItemId}`).set(updateCurrentPaymentData, { merge: true });
      } else if (order === null) {
        await errorReport('retryPaymentWebhookTest', 'Order is null.', payment.subscriptionId)
        res.sendStatus(500).render('Error: order is null. Check subscriptionId - ' + payment.subscriptionId);
      }
      res.sendStatus(200);
    } else if (payment.status === 'failed' && payment.subscriptionId !== undefined) {
      await errorReport('retryPaymentWebhookTest', 'Not paid twice, take further procedure', JSON.stringify(req.body))
      // deepcode ignore XSS/test: <please specify a reason of ignoring this>
      res.status(200).send(payment);
    } else {
      // deepcode ignore XSS/test: <please specify a reason of ignoring this>
      res.status(200).send(payment);
    }
  } catch (err) {
    console.log('Error:' + err)
    await errorReport('retryPaymentWebhookTest', err, JSON.stringify(req.body))
    res.status(400).render('Error:' + err);
  }
}

export const oneOffPaymentCompleteTest = async (req: any, res: any) => {
  try {
    const body = req.body
    const payment = await getMollieEnvironmentByPayment(assert(body, 'id'), false)
    const metadata = payment.metadata
    if (metadata) {
      if (payment.status === 'paid' && payment.amountRefunded.value === '0.00') {
        const firebaseUser = await getUser(assert(metadata, 'FirebaseUID'))
        const orderId = assert(metadata, 'OrderId')
        const order = await getDatabaseOrderTest(orderId)
        const deliveryItemId = dateToString(assert(order, 'startDeliveryDate'), 'mollie')
        let docData
        // Set payment details
        docData = {
          paymentDetails: {
            directLink: 'https://www.mollie.com/dashboard/org_11302067/payments/' + payment.id,
            isPaid: true,
            paymentId: payment.id,
            paymentMethod: payment.method,
          }
        }
        if (order.subscriptionDetails.subscriptionStatus !== 'canceled') {
          // Update current delivery with paymentDetails
          await db.doc(`test-orders/${orderId}/deliveries/${deliveryItemId}`).set(docData, { merge: true });
        }

        docData.subscriptionDetails = {
          subscriptionStatus: 'active'
        }

        console.log(docData)

        await db.doc(`test-orders/${orderId}`).set(docData, { merge: true }); //TODO: Delete later

        if (order.checkoutSummary.coupon === undefined &&
          order.checkoutSummary.referral === undefined) {
          // Add points to customer
          await assignPoints(order)
        }

        // New order slack message
        // const orderData = {
        //   orderId: orderId,
        //   orderRef: order.orderReference,
        //   orderDate: dateToString(assert(order, 'orderCreated'), 'time'),
        //   boxName: order.boxName,
        //   deliveryDate: dateToString(assert(order, 'startDeliveryDate'), 'date'),
        //   amount: order.productQuantity
        // }
        //await newOrderTrialTest(orderData, payment.id, assert(metadata, 'IsGift'))

        // Send email
        const mailData = {
          recipient: firebaseUser.email,
          language: firebaseUser.language !== null ? firebaseUser.language : 'nl',
          order: {
            orderId: orderId,
            orderRef: order.orderReference,
            orderDate: dateToString(assert(order, 'orderCreated'), 'time'),
            boxName: order.boxName,
            deliveryDate: dateToString(assert(order, 'startDeliveryDate'), 'date'),
            amount: order.productQuantity,
            isTrial: true,
            friendName: order.giftDetails !== null ? order.giftDetails.friendName : ''
          }
        }
        await orderConfirmEmail(mailData)
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Error:' + err)
    await errorReport('oneOffPaymentWebhookTest', err, JSON.stringify(req.body))
    res.status(400).render('Error:' + err);
  }
}

export const createDeliveryItem = (order, date: Date, paymentDetailItem?) => {
  // Create new delivery
  const itemId = dateToString(date, 'mollie')
  let item
  item = {
    id: itemId,
    deliveryDate: date,
    packing: {
      isPacked: false,
      packedBy: ''
    },
    delivery: {
      isDelivered: false,
      deliveryInitiatedBy: ''
    }
  }
  if (paymentDetailItem) {
    item.paymentDetails = paymentDetailItem.paymentDetails
  } else {
    item.paymentDetails = {
      isPaid: false,
      paymentMethod: '',
    }
  }

  // Set care products
  const otherPick = []
  if (order.boxId !== 'box_01' && !order.products.removeBuds) {
    otherPick.push('cotton-buds')
  }
  if (order.boxId === 'box_02' || order.boxId === 'box_03') {
    otherPick.push('wet-wipes')
    if (order.boxId === 'box_03') {
      otherPick.push('glow-serum')
    }
  }
  if (order.products.tampons) {
    otherPick.push('sponge-tampon')
  }
  item.products = {
    other: otherPick
  }

  return item
}