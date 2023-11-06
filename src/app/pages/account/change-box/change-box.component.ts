import { FirebaseOrder } from 'src/app/models/firebase.order';
import { Component, Inject } from '@angular/core';
import { BoxType } from 'src/app/models/box';
import { AngularFireFunctions } from '@angular/fire/functions';
import { FirestoreService } from 'src/app/services/firebase-service';
import { DatePipe } from '@angular/common';
import { OrderService } from 'src/app/services/firebase/order-service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Boxes } from 'src/app/constants/boxes';
import { Helper } from 'src/app/shared/helper';

export interface ChangeBoxDialogData {
    index: number
    order: FirebaseOrder
}

@Component({
    selector: 'change-box-dialog',
    templateUrl: 'change-box-dialog.html',
})
export class ChangeBoxDialog {
    savingState = false
    loadingDone = false
    disableSubmit = true
    boxSelected
    planSelected
    boxType
    checkoutSummary
    nextDeliveryDate
    deliveryDates
    replaceList
    paymentPlan
    newStartDate = '2020-01-01'

    constructor(
        public dialogRef: MatDialogRef<ChangeBoxDialog>,
        @Inject(MAT_DIALOG_DATA) public data: ChangeBoxDialogData,
        private helper: Helper,
        public boxes: Boxes,
        public datepipe: DatePipe,
        public orderService: OrderService,
        public fun: AngularFireFunctions,
        public datePipe: DatePipe) {
        dialogRef.disableClose = true;
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    deliveryDatesMap(oldPlan) {
        this.replaceList = []
        var deliveryDays = []
        var daysApart = this.data.order.deliveryDaysApart;
        var loopAmount = 0
        if (this.planSelected == 3) {
            loopAmount = 3
        } else if (this.planSelected == 12) {
            loopAmount = 12
        }
        var startDate
        var deliveryDate

        if (oldPlan == 1) {
            // Add 3/12 more
            for (let i = 0; i < this.data.order.deliveries.length; i++) {
                if (!(this.data.order.deliveries[i].deliveryDate instanceof Date)) {
                    deliveryDate = new Date(this.data.order.deliveries[i].deliveryDate.toDate())
                } else {
                    deliveryDate = new Date(this.data.order.deliveries[i].deliveryDate)
                }
                if (deliveryDate > new Date()) {
                    startDate = new Date(deliveryDate)
                    break;
                }
            }
            for (let i = 0; i < loopAmount; i++) {
                deliveryDate = new Date(startDate.setDate(startDate.getDate() + daysApart))
                deliveryDays.push(this.helper.toDeliveryItem(deliveryDate));
            }
            console.log(deliveryDays)
        } else if (oldPlan == 3 || oldPlan == 12) {
            //remove 3/12 - Not active
            for (let i = 0; i < this.data.order.deliveries.length; i++) {
                if (!(this.data.order.deliveries[i].deliveryDate instanceof Date)) {
                    deliveryDate = new Date(this.data.order.deliveries[i].deliveryDate.toDate())
                } else {
                    deliveryDate = new Date(this.data.order.deliveries[i].deliveryDate)
                }
                if (deliveryDate > new Date() && deliveryDays.length != (this.planSelected + 1)) {
                    deliveryDays.push(this.helper.toDeliveryItem(deliveryDate));
                } else if (deliveryDate > new Date()) {
                    const idToReplace = this.datepipe.transform(deliveryDate, 'yyyy-MM-dd')
                    this.replaceList.push(idToReplace)
                }
            }
        }
        console.log(deliveryDays, this.replaceList)
        return deliveryDays;
    }

    onChange() {
        console.log(this.data)
        this.nextDeliveryDate = null
        this.newStartDate = null
        var deliveryDate
        this.replaceList = []
        this.boxType = this.boxes.getBoxById(this.boxSelected)

        if (this.boxType != null) {
            if (this.data.order.checkoutSummary.coupon) {
                this.checkoutSummary = {
                    subTotal: 0,
                    shippingPrice: 0,
                    taxPrice: 0,
                    checkoutPrice: 0,
                    coupon: this.data.order.checkoutSummary.coupon
                }
            } else {
                this.checkoutSummary = {
                    subTotal: 0,
                    shippingPrice: 0,
                    taxPrice: 0,
                    checkoutPrice: 0
                }
            }

            if (this.boxSelected == 'box_01') {
                this.checkoutSummary.subTotal = this.boxType.price
                var baseShipping = this.boxType.shipping // Base
                if (this.data.order.products.pads == null) {
                    this.checkoutSummary.shippingPrice = baseShipping
                } else {
                    var maxiRegSelected = false
                    var maxiSuperSelected = false
                    for (let i = 0; i < this.data.order.products.pads.length; i++) {
                        if (this.data.order.products.pads[i].name == 'Maxi Regular') {
                            maxiRegSelected = true
                        }
                        if (this.data.order.products.pads[i].name == 'Maxi Super') {
                            maxiSuperSelected = true
                        }
                    }
                    if (maxiSuperSelected) {
                        this.checkoutSummary.shippingPrice = 245
                    } else if (maxiRegSelected) {
                        this.checkoutSummary.shippingPrice = 235
                    } else {
                        this.checkoutSummary.shippingPrice = 229
                    }
                }
            } else {
                if (this.data.order.paymentPlan == 1) {
                    this.checkoutSummary.subTotal = this.boxType.price
                    this.checkoutSummary.checkoutPrice = this.boxType.price
                } else if (this.data.order.paymentPlan == 3) {
                    this.checkoutSummary.subTotal = this.boxType.bundle3m
                    this.checkoutSummary.checkoutPrice = this.boxType.bundle3m
                } else if (this.data.order.paymentPlan == 12) {
                    this.checkoutSummary.subTotal = this.boxType.bundle12m
                    this.checkoutSummary.checkoutPrice = this.boxType.bundle12m
                }
            }
            if (this.planSelected == 1) {
                this.paymentPlan = 'Monthly Plan'
                this.checkoutSummary.subTotal = this.boxType.price
                this.checkoutSummary.checkoutPrice = this.checkoutSummary.shippingPrice + this.boxType.price
                // Set nextDeliveryDate
                if (this.data.order.paymentPlan == 3 || this.data.order.paymentPlan == 12) {
                    for (let j = 0; j < this.data.order.deliveries.length; j++) {
                        if (!(this.data.order.deliveries[j].deliveryDate instanceof Date)) {
                            deliveryDate = new Date(this.data.order.deliveries[j].deliveryDate.toDate())
                        } else {
                            deliveryDate = new Date(this.data.order.deliveries[j].deliveryDate)
                        }
                        if (deliveryDate > new Date() && this.nextDeliveryDate == null) {
                            this.nextDeliveryDate = deliveryDate
                            this.newStartDate = this.datePipe.transform(this.nextDeliveryDate, 'yyyy-MM-dd')
                        } else if (deliveryDate > new Date()) {
                            const idToReplace = this.datepipe.transform(deliveryDate, 'yyyy-MM-dd')
                            this.replaceList.push(idToReplace)
                        }
                    }
                } else {
                    if (this.data.order.startDeliveryDate.toDate() > new Date()) {
                        this.nextDeliveryDate = this.data.order.startDeliveryDate.toDate()
                    } else {
                        for (let j = 0; j < this.data.order.deliveries.length; j++) {
                            if (!(this.data.order.deliveries[j].deliveryDate instanceof Date)) {
                                deliveryDate = new Date(this.data.order.deliveries[j].deliveryDate.toDate())
                            } else {
                                deliveryDate = new Date(this.data.order.deliveries[j].deliveryDate)
                            }
                            if (deliveryDate > new Date()) {
                                this.nextDeliveryDate = deliveryDate
                                this.newStartDate = this.datePipe.transform(this.nextDeliveryDate, 'yyyy-MM-dd')
                            }
                        }
                    }
                }
                console.log(this.nextDeliveryDate, this.replaceList)
                this.deliveryDates = null
            } else if (this.planSelected == 3) {
                this.paymentPlan = '3 Month Plan'
                this.checkoutSummary.subTotal = this.boxType.bundle3m
                this.checkoutSummary.checkoutPrice = (this.checkoutSummary.shippingPrice * 3) + this.boxType.bundle3m
                // Set deliveryDates
                this.deliveryDates = this.deliveryDatesMap(this.data.order.paymentPlan)
                this.newStartDate = this.datePipe.transform(this.deliveryDates[0].deliveryDate, 'yyyy-MM-dd')
                this.nextDeliveryDate = null
            } else if (this.planSelected == 12) {
                this.paymentPlan = '12 Month Plan'
                this.checkoutSummary.subTotal = this.boxType.bundle12m
                this.checkoutSummary.checkoutPrice = (this.checkoutSummary.shippingPrice * 12) + this.boxType.bundle12m
                // Set deliveryDates
                this.deliveryDates = this.deliveryDatesMap(this.data.order.paymentPlan)
                this.newStartDate = this.datePipe.transform(this.deliveryDates[0].deliveryDate, 'yyyy-MM-dd')
                this.nextDeliveryDate = null
            }
            if (this.data.order.shippingAddress.country != 'nl' &&
                this.data.order.shippingAddress.country != 'Nederland') {
                this.checkoutSummary.shippingPrice = this.data.order.checkoutSummary.shippingPrice
            }

            if (this.data.order.products.extraProducts) {
                this.checkoutSummary.checkoutPrice = this.checkoutSummary.checkoutPrice + (this.data.order.products.extraProducts.extraPrice * this.data.order.paymentPlan)
            }
            this.checkoutSummary.taxPrice = Math.round(this.checkoutSummary.checkoutPrice - (this.checkoutSummary.checkoutPrice * (100 / 121)));
            console.log(this.checkoutSummary)
        }
        if (!this.boxSelected || !this.planSelected || this.data.order.checkoutSummary.checkoutPrice == this.checkoutSummary.checkoutPrice) {
            this.disableSubmit = true
        } else {
            this.disableSubmit = false
        }
    }

    changeBox() {
        console.log(this.checkoutSummary)
        const description = this.data.order.orderReference + " | " + this.boxType.name + ' subscription, ' + this.paymentPlan + ' (every ' + this.data.order.deliveryDaysApart + ' days)'

        var data
        data = {
            uid: this.data.order.userId,
            orderId: this.data.order.orderId,
            orderRef: this.data.order.orderReference,
            paymentPlanBefore: this.data.order.paymentPlan,
            paymentPlanAfter: parseInt(this.planSelected),
            boxBefore: this.data.order.boxName,
            boxAfter: this.boxType.name,
            checkoutSummaryBefore: this.data.order.checkoutSummary,
            checkoutSummaryAfter: this.checkoutSummary,
            checkoutPrice: this.checkoutSummary.checkoutPrice,
            subscriptionId: this.data.order.subscriptionDetails.subscriptionId,
            description: description,
            newStartDate: this.newStartDate,
        }

        // Add history data
        const orderHistoryItem = {
            boxId: this.data.order.boxId,
            boxName: this.data.order.boxName,
            checkoutSummary: this.data.order.checkoutSummary,
            deliveryDaysApart: this.data.order.deliveryDaysApart,
            orderCreated: this.data.order.orderCreated,
            orderId: this.data.order.orderId,
            orderReference: this.data.order.orderReference,
            paymentPlan: this.data.order.paymentPlan,
            productQuantity: this.data.order.productQuantity,
            products: this.data.order.products,
            shippingAddress: this.data.order.shippingAddress,
            subscriptionDetails: this.data.order.subscriptionDetails,
            userId: this.data.order.userId
        }
        var historyItem = {
            docId: this.datepipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_box',
            changeType: 'Box changed.',
            changes: {
                before: {
                    paymentPlan: data.paymentPlanBefore,
                    box: data.boxBefore,
                    checkoutSummary: data.checkoutSummaryBefore
                },
                after: {
                    paymentPlan: data.paymentPlanAfter,
                    box: data.boxAfter,
                    checkoutSummary: data.checkoutSummaryAfter
                }
            },
            dateChanged: new Date(),
            order: orderHistoryItem
        }
        data.orderHistory = historyItem

        data.newDelivery = {
            replaceList: this.replaceList,
            items: this.deliveryDates
        }

        console.log(data)
        this.savingState = true
        this.saveChanges(data)
    }

    async saveChanges(data) {
        // Save
        await this.orderService.updateOrderBox(data.uid, data.orderId,
            this.boxType.id, data.boxAfter,
            data.checkoutSummaryAfter, data.paymentPlanAfter, data.orderHistory, data.newDelivery,
            data.paymentPlanAfter == 1 ? this.nextDeliveryDate : null,
            data.paymentPlanAfter != 1 ? this.deliveryDates : null)

        if (data.subscriptionId != null) {
            var updateSubscription
            if (data.paymentPlanBefore != data.paymentPlanAfter) {
                updateSubscription = this.fun.httpsCallable('updateSubscriptionBoxCall');
                console.log('updateSubscriptionBoxCall')
            } else {
                updateSubscription = this.fun.httpsCallable('updateSubscriptionAmountCall');
                console.log('updateSubscriptionAmountCall')
            }
            updateSubscription(data).subscribe();
        }

        const updateSlack = this.fun.httpsCallable('orderBoxChangedSlack');
        updateSlack(data).subscribe();

        this.loadingDone = true
    }
}