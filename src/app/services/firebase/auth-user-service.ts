import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreDocument } from '@angular/fire/firestore';
import { AngularFireAuth } from '@angular/fire/auth';
import { UserInfo } from 'firebase';

@Injectable({
    providedIn: 'root'
})
export class AuthUserService {
    collection = 'users'

    constructor(public afs: AngularFirestore) { }

    public getUserDocRefByUID(uid: string): AngularFirestoreDocument<UserInfo> {
        return this.afs.doc(`${this.collection}/${uid}`);
    }

    public setUserData(user: UserInfo): Promise<any> {
        // Sets user$ data to firestore on login
        const data: UserInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
            providerId: user.providerId
        };
        return this.afs.collection(`${this.collection}`).doc(user.uid).set(data);
    }

    public deleteUserData(uid: string): Promise<any> {
        const userRef: AngularFirestoreDocument<UserInfo> = this.getUserDocRefByUID(uid);
        return userRef.delete();
    }

    public updateUserData(user: UserInfo): Promise<any> {
        // Sets user$ data to firestore on login
        const userRef: AngularFirestoreDocument<UserInfo> = this.getUserDocRefByUID(user.uid);
        const data: UserInfo = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            phoneNumber: user.phoneNumber,
            providerId: user.providerId
        };
        return userRef.set(data, { merge: true });
    }
}