import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class FirebaseCouponService {
    collection = 'coupons'

    constructor(public afs: AngularFirestore) { }

    checkCouponCode(code: string) {
        return this.afs.collection(`${this.collection}`, ref => ref.where('id', '==', code));
    }

    checkCoupon(code: string) {
        return this.afs.collection(`${this.collection}`).ref.where('id', '==', code).get();
    }

    usedCouponCode(id: string, uid: string) {
        const couponRef: AngularFirestoreDocument<any> = this.afs.doc(`${this.collection}/${id}`);
        const item = {
            used: true,
            usedByUid: uid
        };

        return couponRef.set(item, { merge: true });
    }

    usedByCouponCode(id: string, usedBy: any) {
        const couponRef: AngularFirestoreDocument<any> = this.afs.doc(`${this.collection}/${id}`);
        const item = {
            usedBy: usedBy
        };

        return couponRef.set(item, { merge: true });
    }
}