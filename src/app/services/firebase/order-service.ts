import { Injectable, isDevMode } from '@angular/core';
import { map } from "rxjs/operators";
import { AngularFirestore, AngularFirestoreDocument, AngularFirestoreCollection } from '@angular/fire/firestore';
import { CheckCustomer } from 'src/app/check-customer.test';
import { FirebaseOrder } from 'src/app/models/firebase.order';

@Injectable({
    providedIn: 'root'
})
export class OrderService {
    collection = 'orders'
    collectionTest = 'test-orders'

    constructor(
        public afs: AngularFirestore,
        private checkCustomer: CheckCustomer) { }

    // Get Order by ID
    public getOrderByID(uid: string, orderId: string): AngularFirestoreDocument<FirebaseOrder> {
        if (uid == null || this.checkCustomer.isRealCustomerById(uid)) {
            return this.afs.doc(`${this.collection}/${orderId}`);
        } else {
            return this.afs.doc(`${this.collectionTest}/${orderId}`);
        }
    }

    public getOrderByRef(userId: string, orderRef: string): AngularFirestoreCollection {
        if (userId == null || this.checkCustomer.isRealCustomerById(userId)) {
            return this.afs.collection(`${this.collection}`, ref => ref.where('orderReference', '==', orderRef));
        } else {
            return this.afs.collection(`${this.collectionTest}`, ref => ref.where('orderReference', '==', orderRef));
        }
    }

    public getAllOrdersByUserID(userId: string): AngularFirestoreCollection {
        if (this.checkCustomer.isRealCustomerById(userId)) {
            return this.afs.collection(`${this.collection}`, ref => ref.where('userId', '==', userId));
        } else {
            return this.afs.collection(`${this.collectionTest}`, ref => ref.where('userId', '==', userId));
        }
    }

    public getDeliveriesByOrderID(uid: string, orderId: string): AngularFirestoreCollection {
        if (uid == null || this.checkCustomer.isRealCustomerById(uid)) {
            return this.afs.collection(`${this.collection}/${orderId}/deliveries`);
        } else {
            return this.afs.collection(`${this.collectionTest}/${orderId}/deliveries`);
        }
    }

    public getHistoryByOrderID(uid: string, orderId: string): AngularFirestoreCollection {
        if (uid == null || this.checkCustomer.isRealCustomerById(uid)) {
            return this.afs.collection(`${this.collection}/${orderId}/history`);
        } else {
            return this.afs.collection(`${this.collectionTest}/${orderId}/history`);
        }
    }


    public getFullOrders(userId: string) {
        return this.getAllOrdersByUserID(userId).snapshotChanges().pipe(map(actions => {
            return actions.map((doc: any) => {
                const data = doc.payload.doc.data()
                //const orderId = data.orderId
                const orderId = doc.payload.doc.id;
                return {
                    order: data,
                    deliveries: this.getDeliveriesByOrderID(userId, orderId),
                    history: this.getHistoryByOrderID(userId, orderId)
                }
            })
        }))
    }

    public async saveOrder(order: FirebaseOrder, deliveries) {
        var orderItem: FirebaseOrder = {
            orderId: order.orderId,
            orderReference: order.orderReference,
            boxId: order.boxId,
            boxName: order.boxName,
            products: order.products,
            productQuantity: order.productQuantity,
            startDeliveryDate: order.startDeliveryDate,
            deliveryDaysApart: order.deliveryDaysApart,
            checkoutSummary: order.checkoutSummary,
            paymentPlan: order.paymentPlan,
            paymentDetails: order.paymentDetails,
            subscriptionDetails: order.subscriptionDetails,
            shippingAddress: order.shippingAddress,
            userId: order.userId,
            orderCreated: order.orderCreated,
        }
        if (order.nextDeliveryDate != undefined || order.nextDeliveryDate != null) {
            orderItem.nextDeliveryDate = order.nextDeliveryDate
        }
        if (order.deliveryDates != undefined || order.deliveryDates != null) {
            orderItem.deliveryDates = order.deliveryDates
        }
        if (order.giftDetails != undefined || order.giftDetails != null) {
            orderItem.giftDetails = order.giftDetails
        }
        if (this.checkCustomer.isRealCustomerById(order.userId)) {
            await this.afs.collection(`${this.collection}`).doc(order.orderId).set(orderItem);
            if (deliveries != undefined || deliveries != null) {
                this.saveDeliveries(order.userId, order.orderId, deliveries)
            }
        } else {
            await this.afs.collection(`${this.collectionTest}`).doc(order.orderId).set(orderItem);
            if (deliveries != undefined || deliveries != null) {
                this.saveDeliveries(order.userId, order.orderId, deliveries)
            }
        }
    }

    public saveDeliveries(userId, orderId, deliveries) {
        var deliveryRef = this.getDeliveriesByOrderID(userId, orderId)
        for (let i = 0; i < deliveries.length; i++) {
            var deliveryItem = {
                id: deliveries[i].docId,
                deliveryDate: deliveries[i].deliveryDate,
                paymentDetails: deliveries[i].paymentDetails,
                packing: deliveries[i].packing,
                delivery: deliveries[i].delivery,
            }
            deliveryRef.doc(deliveries[i].docId).set(deliveryItem)
        }
    }

    public deleteDeliveries(userId, orderId, deliveries) {
        var deliveryRef = this.getDeliveriesByOrderID(userId, orderId)
        for (let i = 0; i < deliveries.length; i++) {
            deliveryRef.doc(deliveries[i]).delete()
        }
    }

    public saveHistory(userId, orderId, historyItem) {
        if (isDevMode()) {
            console.log('historyItem', historyItem)
        }
        var item 
        item = {
            id: historyItem.docId,
            dateChanged: historyItem.dateChanged,
            changeType: historyItem.changeType,
            changes: historyItem.changes,
        }
        if (historyItem.order) {
            item.order = historyItem.order
        }
        var deliveryRef = this.getHistoryByOrderID(userId, orderId)
        deliveryRef.doc(item.id).set(item)
    }

    // Update address for order
    public updateOrderAddress(uid, orderId: string, address, history): Promise<any> {
        const orderRef: AngularFirestoreDocument<any> = this.getOrderByID(uid, orderId)
        var item = {
            shippingAddress: address,
        }
        if (isDevMode()) {
            console.log(orderRef, item)
        }
        if (history) {
            this.saveHistory(uid, orderId, history)
            return orderRef.set(item, { merge: true });
        } else {
            return orderRef.set(item, { merge: true });
        }
    }

    // Update deliveryDates for order
    public updateOrderDates(uid, orderId: string, nextDeliveryDate, deliveryDates, newDelivery, history): Promise<any> {
        const orderRef: AngularFirestoreDocument<any> = this.getOrderByID(uid, orderId)
        var item = {
            deliveryDates: deliveryDates ? deliveryDates : null,
            nextDeliveryDate: nextDeliveryDate ? nextDeliveryDate : null
        }
        if (isDevMode()) {
            console.log(orderRef, item)
        }
        this.replaceDelivery(uid, orderId, newDelivery)
        if (history) {
            this.saveHistory(uid, orderId, history)
            return orderRef.set(item, { merge: true });
        } else {
            return orderRef.set(item, { merge: true });
        }
    }

    // Update deliveryDaysApart for order
    public updateOrderDays(uid: string, orderId: string, days: number, nextDate: any, isStartDate: any, history: any, nextDates?: any, newDelivery?: any): Promise<any> {
        const orderRef: AngularFirestoreDocument<any> = this.getOrderByID(uid, orderId)
        var itemNew
        if (nextDates) {
            itemNew = {
                deliveryDates: nextDates,
                deliveryDaysApart: days
            };
        } else {
            if (isStartDate) {
                const newNextDate = new Date(nextDate)
                newNextDate.setDate(newNextDate.getDate() + days)
                itemNew = {
                    deliveryDaysApart: days,
                    startDeliveryDate: nextDate,
                    nextDeliveryDate: newNextDate
                }
            } else {
                itemNew = {
                    deliveryDaysApart: days,
                    nextDeliveryDate: nextDate
                }
            }
        }

        this.saveHistory(uid, orderId, history)
        if (newDelivery) {
            this.replaceDelivery(uid, orderId, newDelivery)
            return orderRef.set(itemNew, { merge: true });
        } else {
            return orderRef.set(itemNew, { merge: true });
        }
    }

    // Update subcription box
    public updateOrderBox(uid, orderId, boxId, boxName, checkoutSummary, paymentPlan, orderHistory, newDelivery, nextDeliveryDate?, deliveryDates?): Promise<any> {
        const orderRef: AngularFirestoreDocument<any> = this.getOrderByID(uid, orderId)
        var item
        item = {
            boxId: boxId,
            boxName: boxName,
            checkoutSummary: checkoutSummary
        };
        if (paymentPlan) {
            item.paymentPlan = paymentPlan
        }

        if (nextDeliveryDate) {
            item.deliveryDates = null
            item.nextDeliveryDate = nextDeliveryDate
        } else if (deliveryDates) {
            item.nextDeliveryDate = null
            item.deliveryDates = deliveryDates
        }

        if (isDevMode()) {
            console.log('fs item:', item)
        }

        this.saveHistory(uid, orderId, orderHistory)
        if (newDelivery) {
            this.replaceDelivery(uid, orderId, newDelivery)
            return orderRef.set(item, { merge: true });
        } else {
            return orderRef.set(item, { merge: true });
        }
    }

    // Update products for order
    public updateOrderProducts(uid: string, orderId: string, products: any,  history?: any, checkoutSummary?: any, quantity?: number): Promise<any> {
        const orderRef: AngularFirestoreDocument<any> = this.getOrderByID(uid, orderId)
        var item 
        item = {
            products: products
        };

        if (checkoutSummary) {
            item.checkoutSummary = checkoutSummary
        }
        if (quantity) {
            item.productQuantity = quantity
        }
        if (history) {
            this.saveHistory(uid, orderId, history)
            return orderRef.set(item, { merge: true });
        } else {
            return orderRef.set(item, { merge: true });
        }
    }

    public replaceDelivery(uid: string, orderId: string, deliveries) {
        if (deliveries.replaceList != null && deliveries.replaceList.length != 0) {
            this.deleteDeliveries(uid, orderId, deliveries.replaceList)
        }
        if (deliveries.items != null && deliveries.items.length != 0) {
            this.saveDeliveries(uid, orderId, deliveries.items)
        }
    }

    // Change order status
    public changeOrderStatus(uid: string, orderId: string, status: string): Promise<any> {
        const orderRef: AngularFirestoreDocument<any> = this.getOrderByID(uid, orderId)
        const item = {
            subscriptionDetails: {
                subscriptionStatus: status
            }
        };

        return orderRef.set(item, { merge: true });
    }

     // Set cancelationPlanned status
     public cancellationPlanned(uid: string, orderId: string, lastDeliveryDate: Date): Promise<any> {
        const orderRef: AngularFirestoreDocument<any> = this.getOrderByID(uid, orderId)
        const item = {
            subscriptionDetails: {
                subscriptionStatus: 'active',
                lastDeliveryDate: lastDeliveryDate
            }
        };

        return orderRef.set(item, { merge: true });
    }

    // Free box claimed
    public referralPause(uid: string) {
        this.getAllOrdersByUserID(uid).snapshotChanges().subscribe()
    }
}