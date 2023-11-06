import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class FirebasePromotionService {
    collection = 'promotions'

    constructor(public afs: AngularFirestore) { }

    public getCurrentPromotion() {
        return this.afs.collection(`${this.collection}`).ref.where('endDate', '>', new Date());
    }

    public getCurrentPromotionOld() {
        return this.afs.collection(`${this.collection}`, ref => ref.where('endDate', '>', new Date()));
    }
}