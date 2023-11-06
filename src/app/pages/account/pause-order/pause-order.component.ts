import { FirebaseOrder } from 'src/app/models/firebase.order';
import { Component, Inject } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { OrderService } from 'src/app/services/firebase/order-service';
import { DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Helper } from 'src/app/shared/helper';

export interface PauseSubscriptionDialogData {
    order: FirebaseOrder
    isTooLate: boolean
}

@Component({
    selector: 'pause-order-dialog',
    templateUrl: 'pause-order-dialog.html',
})
export class PauseSubscriptionDialog {
    type = 1
    months = []
    oldDeliveryDate
    newStartPaymentDate
    nextDeliveryDate = new Date()
    deliveryDates = null
    savingState = false
    loadingDone = false
    replaceList

    constructor(
        public dialogRef: MatDialogRef<PauseSubscriptionDialog>,
        @Inject(MAT_DIALOG_DATA) public dialogData: PauseSubscriptionDialogData,
        private helper: Helper,
        public datepipe: DatePipe,
        public fun: AngularFireFunctions,
        public orderService: OrderService) {
        dialogRef.disableClose = true;
        for (let i = 1; i <= 12; i++) {
            this.months.push(i)
        }
        this.onSelectChanged()
    }

    onCloseClick(): void {
        this.dialogRef.close();
    }

    onSelectChanged() {
        let deliveries = this.dialogData.order.deliveries
        if (!deliveries) {
            deliveries = []
            for (let index = 0; index < this.dialogData.order.deliveryDates.length; index++) {
                const date = this.dialogData.order.deliveryDates[index];
                deliveries.push(this.helper.toDeliveryItem(date))
            }
        }
        const cycle = this.dialogData.order.deliveryDaysApart
        var days = this.type * cycle
        if (this.dialogData.isTooLate) {
            days = days + cycle
        }
        if (this.dialogData.order.paymentPlan == 1) {
            this.nextDeliveryDate = null
            for (let i = 0; i < deliveries.length; i++) {
                if (deliveries[i].deliveryDate > new Date()) {
                    this.oldDeliveryDate = new Date(deliveries[i].deliveryDate)
                    this.nextDeliveryDate = new Date(deliveries[i].deliveryDate)
                    this.nextDeliveryDate.setDate(this.nextDeliveryDate.getDate() + days)
                    break;
                }
                if (!this.nextDeliveryDate) {
                    console.log('No nextDelivery found')
                    this.nextDeliveryDate = new Date(deliveries[deliveries.length - 1].deliveryDate)
                    this.nextDeliveryDate.setDate(this.nextDeliveryDate.getDate() + days + cycle)
                    this.oldDeliveryDate = new Date(deliveries[deliveries.length - 1].deliveryDate)
                    this.oldDeliveryDate.setDate(this.oldDeliveryDate.getDate() + cycle)
                }
            }
        } else {
            this.deliveryDates = this.deliveryDatesMap(true, this.type)
            console.log(this.deliveryDates)
            this.nextDeliveryDate = new Date(this.deliveryDates[0].deliveryDate)
            this.nextDeliveryDate.setDate(this.nextDeliveryDate.getDate())
        }
    }

    pauseSubscription() {
        this.deliveryDates = [];
        this.replaceList = [];
        const deliveries = this.dialogData.order.deliveries
        const cycle = this.dialogData.order.deliveryDaysApart
        var days = this.type * cycle
        if (this.dialogData.isTooLate) {
            days = days + cycle
        }
        if (this.dialogData.order.paymentPlan == 1) {
            for (let i = 0; i < deliveries.length; i++) {
                if (deliveries[i].deliveryDate > new Date()) {
                    const nextDeliveryDate = new Date(deliveries[i].deliveryDate)
                    const idToReplace = this.datepipe.transform(deliveries[i].deliveryDate, 'yyyy-MM-dd')
                    this.replaceList.push(idToReplace)
                    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + days)
                    this.deliveryDates.push(this.helper.toDeliveryItem(nextDeliveryDate))
                    if (!this.newStartPaymentDate) {
                        this.nextDeliveryDate = nextDeliveryDate
                        this.newStartPaymentDate = nextDeliveryDate
                    }
                }
            }
            if (!this.newStartPaymentDate) {
                console.log('No nextDelivery found')
                this.nextDeliveryDate = new Date(deliveries[deliveries.length - 1].deliveryDate)
                this.nextDeliveryDate.setDate(this.nextDeliveryDate.getDate() + days * 2)
                this.deliveryDates.push(this.helper.toDeliveryItem(this.nextDeliveryDate))
                this.newStartPaymentDate = this.nextDeliveryDate
            }
        } else {
            this.deliveryDates = this.deliveryDatesMap(true, this.type)
            this.nextDeliveryDate = new Date(this.deliveryDates[0].deliveryDate)
            this.newStartPaymentDate = new Date(this.deliveryDates[this.deliveryDates.length - 1].deliveryDate)
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
            docId: this.datepipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_paused',
            changeType: 'Subscription paused.',
            changes: {
                before: {
                    nextDelivery: this.oldDeliveryDate
                },
                after: {
                    pauseType: this.type,
                    nextDelivery: this.type == 1 ? this.newStartPaymentDate : this.nextDeliveryDate
                }
            },
            dateChanged: new Date(),
            order: orderHistoryItem
        }

        var data = {
            uid: this.dialogData.order.userId,
            boxName: this.dialogData.order.boxName,
            orderId: this.dialogData.order.orderId,
            orderRef: this.dialogData.order.orderReference,
            newStartDate: this.newStartPaymentDate,
            pauseType: this.type + ' months',
            nextDeliveryDate: this.dialogData.order.paymentPlan == 1 ? this.newStartPaymentDate : null,
            deliveryDates: this.dialogData.order.paymentPlan != 1 ? this.deliveryDatesMap(false, this.type) : null,
            subscriptionId: this.dialogData.order.subscriptionDetails.subscriptionId,
            newDelivery: {
                replaceList: this.getItemsToRemove(),
                items: this.deliveryDates.filter(x => !this.replaceList.includes(x.docId))
            },
            history: historyItem
        }
        console.log(data)
        this.savingState = true
        this.saveChanges(data)
    }

    async saveChanges(data) {
        // Save
        await this.orderService.updateOrderDates(data.uid, data.orderId, data.nextDeliveryDate, data.deliveryDates, data.newDelivery, data.history)

        if (data.subscriptionId != null) {
            var updateSubscription = this.fun.httpsCallable('pauseSubscriptionCall');
            await updateSubscription(data).subscribe()
        }

        if (this.dialogData.isTooLate) {
            let paymentPlan
            if (this.dialogData.order.paymentPlan == 1) {
              paymentPlan = 'Monthly Plan'
            } else if (this.dialogData.order.paymentPlan == 3) {
              paymentPlan = '3 Month Plan'
            } else if (this.dialogData.order.paymentPlan == 12) {
              paymentPlan = '12 Month Plan'
            }
            const description = this.dialogData.order.orderReference + " | " + this.dialogData.order.boxName + ' subscription, ' + paymentPlan + ' (every ' + this.dialogData.order.deliveryDaysApart + ' days)'
            var productData = {
                uid: data.uid,
                amount: '' + this.dialogData.order.checkoutSummary.checkoutPrice / 100,
                orderRef: this.dialogData.order.orderReference,
                orderId: this.dialogData.order.orderId,
                description: description,
                subscriptionId: this.dialogData.order.subscriptionDetails.subscriptionId,
                performDate: this.datepipe.transform(this.dialogData.isTooLate, 'yyyy-MM-dd')
            }

            console.log(productData)
            const planPaymentTaskCall = this.fun.httpsCallable('planPaymentTask');
            planPaymentTaskCall(productData).subscribe();
        }

        const updateSlack = this.fun.httpsCallable('orderPausedSlack');
        updateSlack(data).subscribe();
        this.loadingDone = true
    }

    deliveryDatesMap(newMode, months) {
        console.log(this.dialogData)
        this.replaceList = [];
        var deliveryDays = [];
        const cycleDays = this.dialogData.order.deliveryDaysApart
        var loopAmount = this.dialogData.order.deliveries.length;
        var startDate
        for (let i = 0; i < loopAmount; i++) {
            var deliveryDate = null
            if (!(this.dialogData.order.deliveries[i].deliveryDate instanceof Date)) {
                deliveryDate = new Date(this.dialogData.order.deliveries[i].deliveryDate)
            } else {
                deliveryDate = this.dialogData.order.deliveries[i].deliveryDate
            }
            if (deliveryDate > new Date()) {
                const idToReplace = this.datepipe.transform(deliveryDate, 'yyyy-MM-dd')
                this.replaceList.push(idToReplace)
                if (!startDate) {
                    this.oldDeliveryDate = new Date(deliveryDate)
                    deliveryDate.setDate(deliveryDate.getDate() + months * cycleDays)
                    startDate = new Date(deliveryDate)
                } else {
                    deliveryDate = new Date(startDate.setDate(startDate.getDate() + cycleDays))
                }
                deliveryDays.push(newMode ? this.helper.toDeliveryItem(deliveryDate) : deliveryDate);
            } else if (!newMode) {
                deliveryDays.push(deliveryDate);
            }
            //console.log(loopAmount, this.orders[index].deliveryDates[0], daysToAdd, daysApart, deliveryDate)
        }
        if (this.dialogData.order.paymentPlan == 1 && loopAmount < (this.dialogData.order.paymentPlan + 1)) {
            console.log(deliveryDays)
            const thirteenthMonth = new Date(deliveryDays[deliveryDays.length - 1].deliveryDate)
            thirteenthMonth.setDate(thirteenthMonth.getDate() + cycleDays)
            deliveryDays.push(newMode ? this.helper.toDeliveryItem(thirteenthMonth) : thirteenthMonth);
        }

        return deliveryDays;
    }

    getItemsToRemove() {
        const onlyIdList = [];
        this.deliveryDates.forEach(delivery => {
            onlyIdList.push(delivery.docId)
        });
        if (this.dialogData.isTooLate) {
            var list = this.replaceList.filter(x => !onlyIdList.includes(x))
            list.shift()
            return list
        } else {
            return this.replaceList.filter(x => !onlyIdList.includes(x))
        }
    }
}