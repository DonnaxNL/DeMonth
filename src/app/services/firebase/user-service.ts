import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { UserInfo } from 'firebase';
import { UserData } from 'src/app/models/userdata';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    collection = 'userdata'

    constructor(public afs: AngularFirestore) { }

    // UserData
    public getUserInfoRefByUID(uid: string): AngularFirestoreDocument<UserData> {
        return this.afs.doc(`${this.collection}/${uid}`);
    }

    public updateUserMainData(user: UserInfo, info: UserData): Promise<any> {
        const userDataRef: AngularFirestoreDocument<UserData> = this.getUserInfoRefByUID(user.uid);
        const item: UserData = {
            uid: user.uid,
            firstName: info.firstName,
            lastName: info.lastName,
            address: info.address,
            email: user.email,
            createdAt: info.createdAt != null ? info.createdAt : new Date()
        };
        if (info.lastNamePrefix != undefined) {
            item.lastNamePrefix = info.lastNamePrefix
        }
        if (info.mobileNo != undefined) {
            item.mobileNo = info.mobileNo
        }
        if (info.birthDate != undefined) {
            if (info.birthDate instanceof Date) {
                item.birthDate = info.birthDate
            } else {
                item.birthDate = info.birthDate.toDate()
            }
        }
        if (info.additionalAddresses != undefined) {
            item.additionalAddresses = info.additionalAddresses
        }
        if (info.language != undefined) {
            item.language = info.language
        }
        return userDataRef.set(item, { merge: true });
    }

    public updateCycle(uid, cycleDays, cycleDate) {
        const userDataRef: AngularFirestoreDocument<any> = this.getUserInfoRefByUID(uid);
        var item = {
            cycleDetails: {
                cycleDays: cycleDays,
                cycleDate: cycleDate
            }
        }
        return userDataRef.set(item, { merge: true });
    }

    public updatePoints(uid, current, lifetime) {
        const userDataRef: AngularFirestoreDocument<any> = this.getUserInfoRefByUID(uid);
        var item = {
            points: {
                current: current,
                lifetime: lifetime
            }
        }
        return userDataRef.set(item, { merge: true });
    }

    public setReferralCode(uid, referralCode) {
        const userDataRef: AngularFirestoreDocument<any> = this.getUserInfoRefByUID(uid);
        var item = {
            referral: {
                referralCode: referralCode,
                usedBy: []
            }
        }
        return userDataRef.set(item, { merge: true });
    }

    public updateReferralUsed(uid, usedBy) {
        const userDataRef: AngularFirestoreDocument<any> = this.getUserInfoRefByUID(uid);
        var item = {
            referral: {
                usedBy: usedBy
            }
        }
        return userDataRef.set(item, { merge: true });
    }
}