import { db } from "./config";
import { errorReport } from "./slack";

export const getDatabaseOrder = async (orderId: string) => {
    const orderRef = db.collection('orders').doc(orderId)
    return orderRef.get().then(async order => {
        if (!order.exists) {
            console.log('Error getting documents', 'no order with orderId: ' + orderId);
            //await errorReport('getDatabaseOrder', 'no order with orderId: ' + orderId);
            return null
        } else {
            const item = order.data();
            return item
        }
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('getOrderById', err)
        return null
    })
}

export const getDatabaseOrderFromSubscriptionId = async (subscriptionId: string) => {
    const orderRef = db.collection('orders').where('subscriptionDetails.subscriptionId', '==', subscriptionId)
    return await orderRef.get().then(async (snapshot: any) => {
        let item
        if (snapshot.empty) {
            console.log('Error getting documents', 'no order with subscriptionId: ' + subscriptionId);
            await errorReport('getOrderFromSubscriptionId', 'no order with subscriptionId: ' + subscriptionId)
            return null;
        }

        snapshot.forEach(async (doc: any) => {
            item = doc.data();
        })
        return item
        // Empty
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('getOrderFromSubscriptionId', err)
        return null
    })
}

export const getDatabaseOrderFromOrderRef = async (orderReference: string) => {
    const orderRef = db.collection('orders').where('orderReference', '==', orderReference)
    return await orderRef.get().then(async (snapshot: any) => {
        let item
        if (snapshot.empty) {
            console.log('Error getting documents', 'no order with orderRef: ' + orderReference);
            await errorReport('getOrderFromOrderRef', 'no order with orderRef: ' + orderReference)
            return null;
        }

        snapshot.forEach(async (doc: any) => {
            item = doc.data();
        })
        return item
        // Empty
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('getOrderFromSubscriptionId', err)
        return null
    })
}

export const getDeliveriesFromOrder = async (orderId: string) => {
    const orderRef = await db.collection('orders').doc(orderId).collection('deliveries').listDocuments();
    const deliveries = []
    for (const delivery of orderRef) {
        deliveries.push((await delivery.get()).data())
    }
    return deliveries
}