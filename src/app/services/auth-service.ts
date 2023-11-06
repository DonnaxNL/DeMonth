import { EventEmitter, forwardRef, Inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { firebase } from '@firebase/app';
import '@firebase/auth';
import { User, UserInfo } from 'firebase/app';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import UserCredential = firebase.auth.UserCredential;
import { MatSnackBar, MAT_SNACK_BAR_DEFAULT_OPTIONS, MatSnackBarConfig } from '@angular/material/snack-bar';
import { AuthUserService } from './firebase/auth-user-service';
import { TranslateService } from '@ngx-translate/core';

export const facebookAuthProvider = new firebase.auth.FacebookAuthProvider();
export const googleAuthProvider = new firebase.auth.GoogleAuthProvider();
export const twitterAuthProvider = new firebase.auth.TwitterAuthProvider();

export enum AuthProvider {
    EmailAndPassword = 'firebase',
    Google = 'google',
    Facebook = 'facebook',
    Twitter = 'twitter',
}

export type getErrorMessageType = (error: any) => string;
export type messageOnAuthErrorType = string | getErrorMessageType;

@Injectable({
    providedIn: 'root'
})
export class AuthProcessService {
    onSuccessEmitter: EventEmitter<any> = new EventEmitter<any>();
    onErrorEmitter: EventEmitter<any> = new EventEmitter<any>();

    // Useful to know aubout auth state even between reloads.
    // Replace emailConfirmationSent and emailToConfirm.
    user$: Observable<User>;
    user: User;

    messageOnAuthSuccess: string;
    messageOnAuthError: messageOnAuthErrorType;

    // Legacy field that is setted to true after sign up. Value is lost in case of reload. The idea here is to know if we just sent a verification email.
    emailConfirmationSent: boolean;
    // Lefacy filed that contain the mail to confirm. Same lifecyle than emailConfirmationSent.
    emailToConfirm: string;

    constructor(
        public afa: AngularFireAuth,
        private _snackBar: MatSnackBar,
        private _fireStoreService: AuthUserService,
        private translate: TranslateService,
        @Inject(MAT_SNACK_BAR_DEFAULT_OPTIONS) private _matSnackBarConfig: MatSnackBarConfig
    ) { }

    listenToUserEvents() {
        this.user$ = this.afa.user.pipe(
            tap(user => {
                this.user = user;
            })
        );
    }

    /**
     * Reset the password of the ngx-auth-firebaseui-user via email
     *
     * @param email - the email to reset
     * @returns
     */
    public resetPassword(email: string) {
        return this.afa.sendPasswordResetEmail(email)
            .then(() => console.log('Password reset email sent'))
            .catch((error) => this.notifyError(error));
    }

    /**
     * General sign in mechanism to authenticate the users with a firebase project
     * using a traditional way, via username and password or by using an authentication provider
     * like google, facebook, twitter and github
     *
     * @param provider - the provider to authenticate with (google, facebook, twitter, github)
     * @param credentials
     * @returns
     */
    public async signInWith(provider: AuthProvider, credentials?) {
        try {
            let signInResult: UserCredential | any;

            switch (provider) {
                case AuthProvider.EmailAndPassword:
                    signInResult = await this.afa.signInWithEmailAndPassword(credentials.email, credentials.password) as UserCredential;
                    break;

                case AuthProvider.Google:
                    signInResult = await this.afa.signInWithPopup(googleAuthProvider) as UserCredential;
                    break;

                case AuthProvider.Facebook:
                    signInResult = await this.afa.signInWithPopup(facebookAuthProvider) as UserCredential;
                    break;

                case AuthProvider.Twitter:
                    signInResult = await this.afa.signInWithPopup(twitterAuthProvider) as UserCredential;
                    break;

                default:
                    throw new Error(`${AuthProvider[provider]} is not available as auth provider`);
            }
            await this.handleSuccess(signInResult, null);
        } catch (err) {
            this.handleError(err);
        }
    }

    /**
     * Sign up new users via email and password.
     * After that the ngx-auth-firebaseui-user should verify and confirm an email sent via the firebase
     *
     * @param displayName - the displayName if the new ngx-auth-firebaseui-user
     * @param credentials
     * @returns
     */
    public async signUp(displayName: string, credentials) {
        try {
            var userCredential: UserCredential;
            await this.afa.createUserWithEmailAndPassword(credentials.email, credentials.password)
            .then(userData => {
                userData.user.updateProfile({
                  displayName: displayName,
                  photoURL: ''
                })
                userCredential = userData
            })
            .catch(err => console.error(err))
            var user = userCredential.user;
            console.log(displayName, credentials, user);

            //await this._fireStoreService.setUserData(this.parseUserInfo(user, displayName))

            // if (this.config.enableEmailVerification) {
            //     await user.sendEmailVerification();
            // }

            // Legacy fields
            //this.emailConfirmationSent = true;
            //this.emailToConfirm = credentials.email;

            await this.handleSuccess(userCredential, displayName);
        } catch (err) {
            this.handleError(err);
        }
    }

    async sendNewVerificationEmail() {
        if (!this.user) {
            return Promise.reject(new Error('No signed in user'));
        }
        return this.user.sendEmailVerification();
    }

    async signOut() {
        try {
            await this.afa.signOut();
        } catch (error) {
            this.notifyError(error);
        }
    }

    public parseUserInfo(user: User, displayName): UserInfo {
        return {
            uid: user.uid,
            displayName: displayName == null ? user.displayName : displayName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
            providerId: user.providerData.length > 0 ? user.providerData[0].providerId : null
        };
    }

    async handleSuccess(userCredential: UserCredential, displayName) {
        this.onSuccessEmitter.next(userCredential.user);
        try {
            await this._fireStoreService.updateUserData(this.parseUserInfo(userCredential.user, displayName));
        } catch (e) {
            console.error(`Error occurred while updating user data with firestore: ${e}`);
        }
        // if (this.config.toastMessageOnAuthSuccess) {
        //     const fallbackMessage = `Hello ${userCredential.user.displayName ? userCredential.user.displayName : ''}!`;
        //     this.showToast(this.messageOnAuthSuccess || fallbackMessage);
        // }
    }

    handleError(error: any) {
        this.notifyError(error);
        //console.error(error);
    }

    // Refresh user info. Can be useful for instance to get latest status regarding email verification.
    reloadUserInfo() {
        return this.user.reload();
    }

    // Search for an error message.
    // Consumers of this library are given the possibility to provide a function in case they want to instrument message based on error properties.
    async getMessageOnAuthError(error: any) {
        let message: string;
        const fallbackMessage = 'Sorry, something went wrong. Please retry later.';
        if (error.code == "auth/user-not-found") {
            message = await this.translate.get('login.error_user_not_found').toPromise();
        } else if (error.code == "auth/wrong-password") {
            message = await this.translate.get('login.error_wrong_password').toPromise();
        } else if (error.code == "auth/email-already-in-use") {
            message = await this.translate.get('login.error_email_in_use').toPromise();
        } else if (error.code == "auth/account-exists-with-different-credential") {
            message = await this.translate.get('login.error_email_in_use_different_credential').toPromise();
        } else {
            message = fallbackMessage
        }
        return message;
    }

    // Show a toast using current snackbar config. If message is empty, no toast is displayed allowing to opt-out when needed.
    // Default MatSnackBarConfig has no duration, meaning it stays visible forever.
    // If that's the case, an action button is added to allow the end-user to dismiss the toast.
    showToast(message: string) {
        if (message) {
            this._snackBar.open(message, this._matSnackBarConfig.duration ? null : 'OK');
        }
    }

    async showErrorToast(error: any) {
        //if (this.config.toastMessageOnAuthError) {
            this.showToast(await this.getMessageOnAuthError(error));
        //}
    }

    notifyError(error: any) {
        this.onErrorEmitter.emit(error);
        this.showErrorToast(error);
    }

}