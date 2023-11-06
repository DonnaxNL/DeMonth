import { FirebaseOrder } from 'src/app/models/firebase.order';
import { Component, Inject, isDevMode } from '@angular/core';
import { BoxType } from 'src/app/models/box';
import { AngularFireFunctions } from '@angular/fire/functions';
import { DatePipe } from '@angular/common';
import { OrderService } from 'src/app/services/firebase/order-service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Boxes } from 'src/app/constants/boxes';

export interface CancelWarningDialogData {
    index: number
    order: FirebaseOrder
}

@Component({
    selector: 'cancel-warning-dialog',
    templateUrl: 'cancel-warning-dialog.html',
})
export class CancelWarningDialog {
    savingState = false
    loadingDone = false
    boxSelected
    planSelected
    boxType
    checkoutSummary
    deliveryDates
    paymentPlan
    newStartDate = '2020-01-01'
    boxChangePrice = 0

    constructor(
        public dialogRef: MatDialogRef<CancelWarningDialog>,
        @Inject(MAT_DIALOG_DATA) public data: CancelWarningDialogData,
        public boxes: Boxes,
        public orderService: OrderService,
        public fun: AngularFireFunctions,
        public datePipe: DatePipe) {
        dialogRef.disableClose = true;
        if (this.data.order.boxId == 'box_02') {
            this.calculateNewPrice(this.boxes.box1)
        } else if (this.data.order.boxId == 'box_03') {
            this.calculateNewPrice(this.boxes.box2)
        }
    }

    calculateNewPrice(box: BoxType) {
        var shipping = 0
        this.boxChangePrice = box.price
        // if (box.id == 'box_01') {
        //     if (this.data.order.products.pads == null) {
        //         shipping = 199
        //     } else {
        //         var maxiRegSelected = false
        //         var maxiSuperSelected = false
        //         for (let i = 0; i < this.data.order.products.pads.length; i++) {
        //             if (this.data.order.products.pads[i].id == 'PMR') {
        //                 maxiRegSelected = true
        //             }
        //             if (this.data.order.products.pads[i].id == 'PMS') {
        //                 maxiSuperSelected = true
        //             }
        //         }
        //         if (maxiSuperSelected) {
        //             shipping = 245
        //         } else if (maxiRegSelected) {
        //             shipping = 235
        //         } else {
        //             shipping = 229
        //         }
        //     }
        //     this.boxChangePrice = this.boxChangePrice + shipping
        // }
        if (this.data.order.products.extraProducts) {
            this.boxChangePrice = this.boxChangePrice + (this.data.order.products.extraProducts.extraPrice * this.data.order.paymentPlan)
        }
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    openLinkOption(type) {
        this.dialogRef.close({ data: this.data, type: type });
    }

    changeBox(boxId: String) {
        if (isDevMode()) {
            console.log(this.data)
        }
        this.newStartDate = null
        if (boxId == 'box_01') {
            this.boxType = this.boxes.box1
        } else if (boxId == 'box_02') {
            this.boxType = this.boxes.box2
        }
        this.paymentPlan = this.data.order.paymentPlan
        if (this.boxType != null) {
            this.checkoutSummary = {
                subTotal: 0,
                shippingPrice: 0,
                taxPrice: 0,
                checkoutPrice: 0
            }
            if (this.data.order.checkoutSummary.coupon) {
                this.checkoutSummary.coupon = this.data.order.checkoutSummary.coupon
            }
            if (this.data.order.checkoutSummary.promo) {
                this.checkoutSummary.promo = this.data.order.checkoutSummary.promo
            }

            this.checkoutSummary.subTotal = this.boxType.price
            //Shipping
            if (boxId == 'box_01') {
                var baseShipping = this.boxType.shipping // Base
                if (this.data.order.products.pads == null) {
                    this.checkoutSummary.shippingPrice = baseShipping
                } else {
                    var maxiRegSelected = false
                    var maxiSuperSelected = false
                    for (let i = 0; i < this.data.order.products.pads.length; i++) {
                        if (this.data.order.products.pads[i].id == 'PMR') {
                            maxiRegSelected = true
                        }
                        if (this.data.order.products.pads[i].id == 'PMS') {
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
            }
            switch (this.data.order.paymentPlan) {
                case 1:
                    this.checkoutSummary.subTotal = this.boxType.price
                    this.checkoutSummary.checkoutPrice = this.checkoutSummary.shippingPrice + this.boxType.price
                    break;
                case 3:
                    this.checkoutSummary.subTotal = this.boxType.bundle3m
                    this.checkoutSummary.checkoutPrice = (this.checkoutSummary.shippingPrice * 3) + this.boxType.bundle3m
                    break;
                case 12:
                    this.checkoutSummary.subTotal = this.boxType.bundle12m
                    this.checkoutSummary.checkoutPrice = (this.checkoutSummary.shippingPrice * 3) + this.boxType.bundle12m
                    break;
                default:
                    break;
            }

            if (this.data.order.shippingAddress.country != 'nl' &&
                this.data.order.shippingAddress.country != 'Nederland') {
                this.checkoutSummary.shippingPrice = this.data.order.checkoutSummary.shippingPrice
            }

            if (this.data.order.products.extraProducts) {
                this.checkoutSummary.checkoutPrice = this.checkoutSummary.checkoutPrice + (this.data.order.products.extraProducts.extraPrice * this.data.order.paymentPlan)
            }
            this.checkoutSummary.taxPrice = Math.round(this.checkoutSummary.checkoutPrice - (this.checkoutSummary.checkoutPrice * (100 / 121)));

            if (this.data.order.nextDeliveryDate) {
                this.newStartDate = this.datePipe.transform(this.data.order.deliveries[this.data.order.deliveries.length-1].deliveryDate.toDate(), 'yyyy-MM-dd')
            } else {
                this.newStartDate = this.datePipe.transform(this.data.order.deliveryDates[0].toDate(), 'yyyy-MM-dd')
            }
            this.createSaveItem()
        }
    }

    createSaveItem() {
        if (isDevMode()) {
            console.log(this.checkoutSummary)
        }
        const description = this.data.order.orderReference + " | " + this.boxType.name + ' subscription, ' + this.paymentPlan + ' (every ' + this.data.order.deliveryDaysApart + ' days)'

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
            docId: this.datePipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_' + this.boxType.name,
            changeType: 'Subscription changed to ' + this.boxType.name + ' (via cancel popup).',
            changes: {
                before: {
                    boxName: this.data.order.boxName
                },
                after: {
                    boxName: this.boxType.name
                }
            },
            dateChanged: new Date(),
            order: orderHistoryItem
        }

        var data = {
            uid: this.data.order.userId,
            orderId: this.data.order.orderId,
            orderRef: this.data.order.orderReference,
            boxBefore: this.data.order.boxName,
            boxAfter: this.boxType.name,
            checkoutSummaryBefore: this.data.order.checkoutSummary,
            checkoutSummaryAfter: this.checkoutSummary,
            checkoutPrice: this.checkoutSummary.checkoutPrice,
            subscriptionId: this.data.order.subscriptionDetails.subscriptionId,
            description: description,
            newStartDate: this.newStartDate,
            orderHistory: historyItem
        }
        if (isDevMode()) {
            console.log(data)
        }
        this.savingState = true
        this.saveChanges(data)
    }

    async saveChanges(data) {
        // Save
        await this.orderService.updateOrderBox(data.uid, data.orderId,
            this.boxType.id, data.boxAfter,
            data.checkoutSummaryAfter, data.paymentPlanAfter, data.orderHistory,
            null)

        if (data.subscriptionId != null) {
            var updateSubscription
            updateSubscription = this.fun.httpsCallable('updateSubscriptionAmountCall');
            if (isDevMode()) {
                console.log('updateSubscriptionAmountCall')
            }
            updateSubscription(data).subscribe();
        }

        const updateSlack = this.fun.httpsCallable('orderBoxChangedSlack');
        updateSlack(data).subscribe();

        this.loadingDone = true
    }
}