import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { DatePipe } from '@angular/common';
import { Moment } from 'moment';
import { OrderService } from 'src/app/services/firebase/order-service';
import { UserService } from 'src/app/services/firebase/user-service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MyErrorStateMatcher } from 'src/app/shared/errormatcher';
import { Helper } from 'src/app/shared/helper';
import { Router } from '@angular/router';
import { FirestoreService } from 'src/app/services/firebase-service';
import { TranslateService } from '@ngx-translate/core';

export interface NewStartDateDialogData {
    order: any,
    isOneOff: boolean
}

@Component({
    selector: 'new-startdate-dialog',
    templateUrl: 'new-startdate-dialog.html',
})
export class NewStartDateDialog implements OnInit {
    minDate = new Date()
    datePicker
    currentDeliveryDate
    newDeliveryDate
    selectDeliveryPlaceholder = '';
    savingState = false
    loadingDone = false
    newNextDeliveryDate
    deliveryDates
    replaceList
    isStartDate = false
    disableSubmit = true

    constructor(
        public dialogRef: MatDialogRef<NewStartDateDialog>,
        @Inject(MAT_DIALOG_DATA) public dialogData: NewStartDateDialogData,
        private _formBuilder: FormBuilder,
        private helper: Helper,
        private router: Router,
        public datepipe: DatePipe,
        public fbService: FirestoreService,
        public userService: UserService,
        public orderService: OrderService,
        public fun: AngularFireFunctions,
        public translate: TranslateService) {
        dialogRef.disableClose = true;
    }

    nonDeliveryFilter = (d: Moment): boolean => {
        const day = d.day()
        // Prevent Sunday and Monday from being selected.
        return day !== 0 && day !== 1;
    }

    datePickerEvent(event: MatDatepickerInputEvent<Date>) {
        if (event.value < this.minDate) {
            console.log('In the past: ' + event.value);
            this.datePicker = this.minDate
            this.newDeliveryDate = this.minDate;
        } else {
            this.newDeliveryDate = new Date(event.value)
        }
        this.checkChanges()
    }

    async ngOnInit(): Promise<void> {
        this.minDate.setDate(new Date().getDate() + 7);
        this.minDate.setHours(0, 0, 0, 0);
        if (this.dialogData.isOneOff) {
            this.selectDeliveryPlaceholder = await this.translate.get('order_box.delivery_delivery_date_error').toPromise();
        } else {
            this.selectDeliveryPlaceholder = await this.translate.get('order_box.delivery_delivery_date_placeholder').toPromise();
        }
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    checkChanges() {
        if (this.newDeliveryDate < this.minDate) {
            this.disableSubmit = true
        } else {
            this.disableSubmit = false
        }
    }

    newStartDate() {
        this.dialogData.order.startDeliveryDate = this.newDeliveryDate
        // if (this.dialogData.order.paymentPlan == 1) {
        //     const nextDeliveryDate = new Date(this.newDeliveryDate)
        //     nextDeliveryDate.setDate(nextDeliveryDate.getDate() + this.dialogData.order.deliveryDaysApart)
        //     this.dialogData.order.nextDeliveryDate = nextDeliveryDate
        // } else {
            
        // }
        const couponId = this.dialogData.order.checkoutSummary.coupon ? this.dialogData.order.checkoutSummary.coupon.id : null
        this.router.navigate(['/checkout'],
            { state: { order: this.fbService.firebaseOrderToOrder(this.dialogData.order), coupon: couponId } })
        this.dialogRef.close();
    }
}