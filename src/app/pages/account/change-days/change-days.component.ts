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

export interface ChangeDaysDialogData {
    order: any
    days: number
}

@Component({
    selector: 'change-days-dialog',
    templateUrl: 'change-days-dialog.html',
})
export class DeliveryDaysDialog implements OnInit {
    minDate = new Date()
    noDays = []
    noWeeks = []
    numberOfDays = null
    numberOfWeeks = null
    customDays = false
    datePicker
    currentDeliveryDate
    newDeliveryDate
    savingState = false
    loadingDone = false
    newNextDeliveryDate
    deliveryDates
    replaceList
    isStartDate = false
    disableSubmit = true

    formGroup: FormGroup;
    matcher = new MyErrorStateMatcher();

    constructor(
        public dialogRef: MatDialogRef<DeliveryDaysDialog>,
        @Inject(MAT_DIALOG_DATA) public dialogData: ChangeDaysDialogData,
        private _formBuilder: FormBuilder,
        private helper: Helper,
        public datepipe: DatePipe,
        public userService: UserService,
        public orderService: OrderService,
        public fun: AngularFireFunctions) {
        dialogRef.disableClose = true;
        this.numberOfDays = this.dialogData.days
        if (this.dialogData.days > 50) {
            this.customDays = true
        } else {
            for (let i = 14; i < 71; i++) {
                this.noDays.push(i);
            }
        }
        for (let i = 2; i < 11; i++) {
            this.noWeeks.push(i);
        }
    }

    nonDeliveryFilter = (d: Moment): boolean => {
        const day = d.day()
        // Prevent Sunday and Monday from being selected.
        return day !== 0 && day !== 1;
    }

    datePickerEvent(type: string, event: MatDatepickerInputEvent<Date>) {
        if (event.value < this.minDate) {
            console.log('In the past: ' + event.value);
            this.datePicker = this.minDate
            this.newDeliveryDate = this.minDate;
        } else {
            this.newDeliveryDate = new Date(event.value)
        }
        this.checkChanges()
    }

    ngOnInit(): void {
        this.minDate.setDate(new Date().getDate() + 7);
        this.minDate.setHours(0, 0, 0, 0)
        let deliveries = this.dialogData.order.deliveries
        if (!deliveries) {
            deliveries = []
            for (let index = 0; index < this.dialogData.order.deliveryDates.length; index++) {
                const date = this.dialogData.order.deliveryDates[index];
                deliveries.push(this.helper.toDeliveryItem(date))
            }
        }
        for (let i = 0; i < deliveries.length; i++) {
            if (deliveries[i].deliveryDate > new Date()) {
                this.currentDeliveryDate = deliveries[i].deliveryDate
                if (i == 0 && this.dialogData.order.startDeliveryDate.toDate() > new Date()) {
                    this.isStartDate = true
                }
                break;
            }
            if (this.currentDeliveryDate == null && i == (deliveries.length-1)) {
                this.currentDeliveryDate = deliveries[deliveries.length-1].deliveryDate
                this.isStartDate = true
            }
        }
        if (this.currentDeliveryDate == null) {
            this.currentDeliveryDate = this.dialogData.order.startDeliveryDate.toDate()
            this.isStartDate = true
        }
        this.newDeliveryDate = new Date(this.currentDeliveryDate)
        this.formGroup = this._formBuilder.group({
            selectedDays: new FormControl('', [Validators.min(14), Validators.max(365)]),
            selectedWeeks: new FormControl('', [Validators.min(2), Validators.max(10)])
        });
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onSelectChanged(type, value) {
        //console.log(type, value)
        var diff
        if (type == 'weeks') {
            if (value != null) {
                var cycle = value * 7
                diff = cycle - this.dialogData.days
                console.log(diff, cycle, this.dialogData.days)
                this.dialogData.days = cycle
                this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365)])
                this.numberOfDays = null
            }
        } else if (type == 'days') {
            if (value != null) {
                diff = value - this.dialogData.days
                this.dialogData.days = value
                this.numberOfWeeks = null
                this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365), Validators.required])
            }
        }
        if (value != null) {
            if (!this.datePicker) {
                //console.log(days, diff)
                const newDate = new Date(this.newDeliveryDate)
                newDate.setDate(this.newDeliveryDate.getDate() + diff)
                this.newDeliveryDate = newDate
                //console.log(this.currentDeliveryDate, this.newDeliveryDate)
            }
            this.checkChanges()
        }
    }

    checkChanges() {
        if (this.currentDeliveryDate.getDate() == this.newDeliveryDate.getDate() && this.dialogData.order.deliveryDaysApart == this.dialogData.days ||
            this.newDeliveryDate < this.minDate || !this.formGroup.valid) {
            this.disableSubmit = true
        } else {
            this.disableSubmit = false
        }
    }

    toggleCustomDays() {
        if (this.numberOfDays) {
            this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365), Validators.required])
        }
        this.customDays = true
    }

    changeDays() {
        var oldDays = this.dialogData.order.deliveryDaysApart
        var data

        // Fill general data
        data = {
            uid: this.dialogData.order.userId,
            boxName: this.dialogData.order.boxName,
            orderId: this.dialogData.order.orderId,
            orderRef: this.dialogData.order.orderReference,
            paymentPlan: this.dialogData.order.paymentPlan,
            deliveryDaysApartBefore: oldDays,
            deliveryDaysApartAfter: this.dialogData.days,
            deliveryDateBeforeString: this.datepipe.transform(this.currentDeliveryDate, 'dd-MM-yyyy'),
            subscriptionId: this.dialogData.order.subscriptionDetails.subscriptionId,
            onlyDays: this.datePicker ? false : true,
            changeStartDate: this.isStartDate
        }

        // Fill delivery data
        if (this.dialogData.order.paymentPlan == 1) {
            this.replaceList = [];
            var deliveryList = [];
            this.newNextDeliveryDate = this.newDeliveryDate
            data.nextDeliveryDate = this.newDeliveryDate
            data.nextDeliveryDateString = this.datepipe.transform(this.newDeliveryDate, 'dd-MM-yyyy')
            data.nextPaymentDate = this.datepipe.transform(this.newDeliveryDate, 'yyyy-MM-dd')

            const idToReplace = this.datepipe.transform(this.currentDeliveryDate, 'yyyy-MM-dd')
            deliveryList.push(this.helper.toDeliveryItem(this.newDeliveryDate))
            this.replaceList.push(idToReplace)
            if (this.isStartDate) {
                const idToReplace = this.datepipe.transform(this.dialogData.order.nextDeliveryDate.toDate(), 'yyyy-MM-dd')
                const newNextDeliveryDate = new Date(this.newDeliveryDate)
                newNextDeliveryDate.setDate(newNextDeliveryDate.getDate() + this.dialogData.days)
                deliveryList.push(this.helper.toDeliveryItem(newNextDeliveryDate))
                this.replaceList.push(idToReplace)
                data.nextPaymentDate = this.datepipe.transform(deliveryList[1].deliveryDate, 'yyyy-MM-dd')
            }
            if (this.dialogData.order.paymentDetails.isPaid) {
                data.newDelivery = {
                    replaceList: this.replaceList,
                    items: deliveryList
                }
            }
        } else {
            var newDelivery = true
            this.deliveryDates = this.deliveryDatesMap(newDelivery)
            console.log(this.deliveryDates)

            for (let i = 0; i < this.deliveryDates.length; i++) {
                if (newDelivery) {
                    if (this.deliveryDates[i].deliveryDate > new Date()) {
                        this.newNextDeliveryDate = this.deliveryDates[i].deliveryDate
                        break
                    }
                } else {
                    if (this.deliveryDates[i] > new Date()) {
                        this.newNextDeliveryDate = this.deliveryDates[i]
                        break
                    }
                }
            }

            data.deliveryDates = this.deliveryDatesMap(false)
            data.nextDeliveryDate = this.newNextDeliveryDate
            data.nextDeliveryDateString = this.datepipe.transform(this.newNextDeliveryDate, 'dd-MM-yyyy')
            if (!(this.deliveryDates[this.deliveryDates.length - 1].deliveryDate instanceof Date)) {
                this.deliveryDates[this.deliveryDates.length - 1].deliveryDate = new Date(this.deliveryDates[this.deliveryDates.length - 1].deliveryDate.toDate())
            }
            const paymentDate = this.deliveryDates[this.deliveryDates.length - 1].deliveryDate
            // if (this.isStartDate) {
            //     data.nextPaymentDate = this.datepipe.transform(this.deliveryDates[1].deliveryDate, 'yyyy-MM-dd')
            // } else {
            data.nextPaymentDate = this.datepipe.transform(paymentDate, 'yyyy-MM-dd')
            //}

            if (this.dialogData.order.paymentDetails.isPaid) {
                data.newDelivery = {
                    replaceList: this.replaceList,
                    items: this.deliveryDates
                }
            } else {
                data.startDeliveryDate = this.newDeliveryDate
            }
        }

        // Add history data
        const orderHistoryItem = {
            boxId: this.dialogData.order.boxId,
            boxName: this.dialogData.order.boxName,
            checkoutSummary: this.dialogData.order.checkoutSummary,
            deliveryDaysApart: this.dialogData.order.deliveryDaysApart,
            orderCreated: this.dialogData.order.orderCreated,
            orderId: this.dialogData.order.orderId,
            orderReference: this.dialogData.order.orderReference,
            paymentPlan: this.dialogData.order.paymentPlan,
            productQuantity: this.dialogData.order.productQuantity,
            products: this.dialogData.order.products,
            shippingAddress: this.dialogData.order.shippingAddress,
            subscriptionDetails: this.dialogData.order.subscriptionDetails,
            userId: this.dialogData.order.userId
        }
        var historyItem = {
            docId: this.datepipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_days',
            changeType: 'Cycle changed.',
            changes: {
                before: {
                    cycleDays: data.deliveryDaysApartBefore,
                    cycleDate: this.currentDeliveryDate
                },
                after: {
                    cycleDays: data.deliveryDaysApartAfter,
                    cycleDate: this.newDeliveryDate
                }
            },
            dateChanged: new Date(),
            order: orderHistoryItem
        }
        data.orderHistory = historyItem

        console.log(data)
        this.savingState = true
        this.saveChanges(data)
    }

    async saveChanges(data) {
        // Save
        this.userService.updateCycle(data.uid, data.deliveryDaysApartAfter, data.nextDeliveryDate)
        await this.orderService.updateOrderDays(data.uid, data.orderId, data.deliveryDaysApartAfter, data.nextDeliveryDate, this.isStartDate, data.orderHistory, data.deliveryDates, data.newDelivery)
        if (this.dialogData.order.paymentDetails.isPaid) {
            const updateSubscription = this.fun.httpsCallable('updateSubscriptionCall');
            updateSubscription(data).subscribe();
            const updateSlack = this.fun.httpsCallable('orderDaysApartChangedSlack');
            //updateSlack(data).subscribe();
        }
        this.loadingDone = true
    }

    deliveryDatesMap(newMode) {
        console.log(this.dialogData)
        this.replaceList = [];
        var deliveryDays = [];
        var daysApart = this.dialogData.days;
        var loopAmount = this.dialogData.order.deliveries.length;
        var startDate
        for (let i = 0; i < loopAmount; i++) {
            var deliveryDate = null
            if (this.dialogData.order.deliveries.length > 0) {
                if (!(this.dialogData.order.deliveries[i].deliveryDate instanceof Date)) {
                    deliveryDate = new Date(this.dialogData.order.deliveries[i].deliveryDate.toDate())
                } else {
                    deliveryDate = this.dialogData.order.deliveries[i].deliveryDate
                }
            } else {
                deliveryDate = new Date(this.currentDeliveryDate)
            }
            if (deliveryDate > new Date()) {
                console.log(deliveryDate)
                const idToReplace = this.datepipe.transform(deliveryDate, 'yyyy-MM-dd')
                this.replaceList.push(idToReplace)
                if (!startDate) {
                    if (this.datePicker) {
                        deliveryDate = new Date(this.newDeliveryDate)
                    } else {
                        deliveryDate.setDate(deliveryDate.getDate() - this.dialogData.order.deliveryDaysApart)
                        deliveryDate.setDate(deliveryDate.getDate() + daysApart)
                    }
                    startDate = new Date(deliveryDate)
                } else {
                    deliveryDate = new Date(startDate.setDate(startDate.getDate() + daysApart))
                }
                if (newMode) {
                    deliveryDays.push(this.helper.toDeliveryItem(deliveryDate, this.dialogData.order.deliveries[i] ? this.dialogData.order.deliveries[i].paymentDetails : null));
                } else {
                    deliveryDays.push(deliveryDate);
                }
            } else {
                console.log(deliveryDate, new Date())
            }
        }
        if (newMode && deliveryDays.length > 0 && loopAmount < (this.dialogData.order.paymentPlan + 1)) {
            console.log(deliveryDays)
            const thirteenthMonth = new Date(deliveryDays[deliveryDays.length - 1].deliveryDate)
            thirteenthMonth.setDate(thirteenthMonth.getDate() + daysApart)
            deliveryDays.push(this.helper.toDeliveryItem(thirteenthMonth));
        }

        return deliveryDays;
    }
}