import { Component, Input, OnInit } from "@angular/core";
import { AbstractControl, FormControl, FormGroup, Validators } from "@angular/forms";
import { MatSnackBar } from "@angular/material/snack-bar";
import { TranslateService } from "@ngx-translate/core";
import * as firebase from "firebase";
import { User } from "firebase";

@Component({
    selector: 'password-form',
    templateUrl: './password.form.component.html',
    styleUrls: ['./password.form.component.scss']
})
export class PasswordFormComponent implements OnInit {
    @Input() currentUser: User;

    currentPassword = '';
    newPassword = '';
    hidePassword = true;

    // Form Control
    formPasswordGroup: FormGroup;
    currentPasswordFormControl: AbstractControl;
    newPasswordFormControl: AbstractControl;

    constructor(
        private snackBar: MatSnackBar,
        private translate: TranslateService
    ) { }

    ngOnInit(): void {
        this.formValidation()
    }

    formValidation() {
        this.formPasswordGroup = new FormGroup({});
        this.formPasswordGroup.registerControl('currentPassword',
            this.currentPasswordFormControl = new FormControl('',
                [Validators.minLength(8)])
        );
        this.formPasswordGroup.registerControl('newPassword',
            this.newPasswordFormControl = new FormControl('',
                [Validators.minLength(8)])
        );
    }

    async isFormGroupValid() {
        //console.log(this.formPasswordGroup)
        if (this.formPasswordGroup && this.formPasswordGroup.valid) {
            this.hidePassword = false
            if (this.formPasswordGroup.valid && this.currentPassword !== '' && this.newPassword !== '') {
                const credentials = firebase.auth.EmailAuthProvider.credential(
                    this.currentUser.email,
                    this.currentPassword
                );

                // Prompt the user to re-provide their sign-in credentials
                this.currentUser.reauthenticateWithCredential(credentials).then(() => {
                    // User re-authenticated.
                    //console.log('Re-Authenticated')
                    this.currentUser.updatePassword(this.newPassword).then(async () => {
                        // Update successful.
                        //console.log('Password changed')
                        this.currentPassword = ''
                        this.newPassword = ''
                        this.hidePassword = true
                        this.snackBar.open(await this.translate.get('common.toast_password_change_successful').toPromise(), await this.translate.get('common.close_button').toPromise(), {
                            duration: 5000,
                        });
                    }).catch(async (error) => {
                        // An error happened.
                        //console.log('Password change failed:' + error)
                        this.snackBar.open(await this.translate.get('common.toast_password_change_failed').toPromise(), await this.translate.get('common.close_button').toPromise(), {
                            duration: 5000,
                        });
                    });
                }).catch(async (error) => {
                    // An error happened.
                    //console.log('Re-Authentication failed:' + error)
                    this.snackBar.open(await this.translate.get('common.toast_password_change_invalid').toPromise(), await this.translate.get('common.close_button').toPromise(), {
                        duration: 5000,
                    });
                });
            } else if (this.formPasswordGroup) {
                this.snackBar.open(await this.translate.get('common.toast_password_change_incomplete').toPromise(), await this.translate.get('common.close_button').toPromise(), {
                    duration: 5000,
                });
            } else {
                console.log('formGroup null')
                this.snackBar.open(await this.translate.get('common.toast_password_change_failed').toPromise(), await this.translate.get('common.close_button').toPromise(), {
                    duration: 5000,
                });
            }
        }
    }
}