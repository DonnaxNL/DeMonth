import { db } from "../config";
import { errorReport } from "../slack";

export const getDatabaseOrderTest = async (orderId: string) => {
    const orderRef = db.collection('test-orders').doc(orderId)
    return await orderRef.get().then(order => {
        if (!order.exists) {
            return null
        } else {
            const item = order.data();
            return item
        }
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('getOrderFromIdTest', err)
        return null
    })
}

export const getDatabaseOrderFromSubscriptionIdTest = async (subscriptionId: string) => {
    const orderRef = db.collection('test-orders').where('subscriptionDetails.subscriptionId', '==', subscriptionId)
    return await orderRef.get().then((snapshot: any) => {
        let item
        if (snapshot.empty) {
            return null;
        }

        snapshot.forEach(async (doc: any) => {
            item = doc.data();
        })

        return item

        // Empty
    }).catch(async (err: any) => {
        console.log('Error getting documents', err);
        await errorReport('getOrderFromSubscriptionIdTest', err)
        return null
    })
}

export const getDeliveriesFromOrderTest = async (orderId: string) => {
    const orderRef = await db.collection('test-orders').doc(orderId).collection('deliveries').listDocuments();
    const deliveries = []
    for (const delivery of orderRef) {
        deliveries.push((await delivery.get()).data())
    }
    return deliveries
}