import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { FirebaseOrder } from '../models/firebase.order';
import { Order } from '../models/order';

export const collections = {
  newsletter: 'newsletter',
  coupons: 'coupons',
  blog: 'blog'
};

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(public afs: AngularFirestore) { }

  // Newsletter signup
  saveEmail(email: string) {
    var emailItem = {
      email: email
    }
    this.afs.collection(`${collections.newsletter}`).doc(this.afs.createId()).set(emailItem);
  }

  // Generate id
  generateId(isShort) {
    if (isShort) {
      return this.afs.createId().slice(0, 8)
    } else {
      return this.afs.createId()
    }
  }

  getBlogPost(id: string) {
    return this.afs.doc(`${collections.blog}/${id}`);
  }

  firebaseOrderToOrder(fbOrder: FirebaseOrder) {
    var order = new Order(
      fbOrder.boxId,
      fbOrder.boxName,
      fbOrder.checkoutSummary,
      fbOrder.products,
      fbOrder.productQuantity,
      fbOrder.startDeliveryDate.seconds ? fbOrder.startDeliveryDate.toDate() : fbOrder.startDeliveryDate,
      fbOrder.deliveryDaysApart,
      fbOrder.paymentPlan,
      fbOrder.orderId,
      fbOrder.orderReference
    );
    return order;
  }
}