import { FirebaseOrder } from 'src/app/models/firebase.order';
import { Component, Inject } from '@angular/core';
import { BoxType } from 'src/app/models/box';
import { AngularFireFunctions } from '@angular/fire/functions';
import { DatePipe } from '@angular/common';
import { OrderService } from 'src/app/services/firebase/order-service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UserService } from 'src/app/services/firebase/user-service';
import { Helper } from 'src/app/shared/helper';
import { FirestoreService } from 'src/app/services/firebase-service';
import { Boxes } from 'src/app/constants/boxes';

export interface ConfirmDialogData {
    currentOrder: any
    userPoints: number
    lifetimePoints: number
    pointsClaimed: number
    pointsRemaining: number
    boxId: string
    discount: number,
    discountPrice: number
}

@Component({
    selector: 'confirm-dialog',
    templateUrl: 'confirm-dialog.html',
})
export class ConfirmDialog {
    savingState = false
    loadingDone = false
    box
    boxChangePrice = 0
    replaceList
    deliveryDates
    newStartPaymentDate
    nextDeliveryDate = new Date()
    boxDeliveryDate = null
    isStartDate = false

    constructor(
        public dialogRef: MatDialogRef<ConfirmDialog>,
        @Inject(MAT_DIALOG_DATA) public dialogData: ConfirmDialogData,
        public boxes: Boxes,
        public fun: AngularFireFunctions,
        public fbService: FirestoreService,
        public userService: UserService,
        public orderService: OrderService,
        public helper: Helper,
        public datepipe: DatePipe) {
        dialogRef.disableClose = true;
        if (this.dialogData.boxId == this.boxes.box3.id) {
            this.box = this.boxes.box3
        } else if (this.dialogData.boxId == this.boxes.box2.id) {
            this.box = this.boxes.box2
        }
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    onFinishedClose() {
        this.dialogRef.close({ data: this.dialogData });
    }

    claimConfirmed() {
        // Fill general data
        var pointsData = {
            currentOrder: this.dialogData.currentOrder,
            userPoints: this.dialogData.userPoints,
            lifetimePoints: this.dialogData.lifetimePoints,
            pointsClaimed: this.dialogData.pointsClaimed,
            pointsRemaining: this.dialogData.pointsRemaining,
            box: this.box.name,
            discount: this.dialogData.discount
        }
        console.log(pointsData)

        // Pause current subscription data
        var orderData = this.pauseSubscription(pointsData)

        // Create points box order
        var pointsBox = this.createPointsOrder(pointsData)
        orderData.history.changes.boxClaimed = {
            boxId: pointsBox.boxId,
            boxName: pointsBox.boxName,
            orderId: pointsBox.orderId,
            orderRef: pointsBox.orderReference,
            startDeliveryDate: pointsBox.startDeliveryDate,
            orderCreated: pointsBox.orderCreated,
            claimedAt: new Date()
        }

        console.log(orderData, pointsData, pointsBox)
        this.savingState = true
        this.saveChanges(orderData, pointsData, pointsBox)
    }

    async saveChanges(orderData, pointsData, pointsBox) {
        // Save points
        await this.userService.updatePoints(pointsData.currentOrder.userId, pointsData.pointsRemaining, pointsData.lifetimePoints)

        // Pause Mollie subscription
        if (orderData.subscriptionId != null) {
            if (orderData.changeStartDate) {
                const updateSubscription = this.fun.httpsCallable('updateSubscriptionCall');
                await updateSubscription(orderData).subscribe();
            } else {
                const updateSubscription = this.fun.httpsCallable('pauseSubscriptionCall');
                await updateSubscription(orderData).subscribe();
            }
        }

        // Create order delivery
        var delivery = []
        delivery.push(this.helper.toDeliveryItem(new Date(orderData.newDelivery.replaceList[0])))

        // Save box order
        await this.orderService.saveOrder(pointsBox, delivery);

        // Make discounted payment
        if (pointsData.discount < 1) {
            var productData = {
                uid: pointsBox.userId,
                amount: '' + pointsBox.checkoutSummary.points.checkoutPrice / 100,
                orderRef: pointsBox.orderReference,
                orderId: pointsBox.orderId,
                description: pointsBox.orderReference + ' | Rest Payment of DMP redemption',
                subscriptionId: pointsBox.subscriptionId,
                performDate: this.datepipe.transform(pointsBox.startDeliveryDate, 'yyyy-MM-dd')
            }

            console.log(productData)
            const planPaymentTaskCall = this.fun.httpsCallable('planPaymentTask');
            planPaymentTaskCall(productData).subscribe();
        }

        // Update order dates
        await this.orderService.updateOrderDates(orderData.uid, orderData.orderId, orderData.nextDeliveryDate, orderData.deliveryDates, orderData.newDelivery, orderData.history)

        // Send message to Slack
        var data = {
            uid: pointsBox.userId,
            order: {
                orderId: pointsBox.orderId,
                orderRef: pointsBox.orderReference,
                boxName: pointsBox.boxName,
                deliveryDate: this.datepipe.transform(pointsBox.startDeliveryDate, 'dd-MM-yyyy'),
                paidPrice: pointsBox.checkoutSummary.points.checkoutPrice
            },
            discount: Number((pointsData.discount * 100).toFixed(2)),
            pointsUsed: pointsData.pointsClaimed
        }
        console.log(data)
        const updateSlack = this.fun.httpsCallable('pointsBoxClaimedSlack');
        updateSlack(data).subscribe();

        this.loadingDone = true
    }

    pauseSubscription(claimedBox) {
        this.deliveryDates = []
        this.replaceList = []
        const deliveries = this.dialogData.currentOrder.deliveries
        const cycle = this.dialogData.currentOrder.deliveryDaysApart
        // if (this.dialogData.isTooLate) {
        //     days = days + cycle
        // }
        if (this.dialogData.currentOrder.paymentPlan == 1) {
            for (let i = 0; i < deliveries.length; i++) {
                if (deliveries[i].deliveryDate.toDate() > new Date()) {
                    this.boxDeliveryDate = new Date(deliveries[i].deliveryDate.toDate())
                    const nextDeliveryDate = new Date(deliveries[i].deliveryDate.toDate())
                    if (i != 0) {
                        const idToReplace = this.datepipe.transform(this.boxDeliveryDate, 'yyyy-MM-dd')
                        this.replaceList.push(idToReplace)
                        nextDeliveryDate.setDate(nextDeliveryDate.getDate() + cycle)
                        this.deliveryDates.push(this.helper.toDeliveryItem(nextDeliveryDate))
                    }
                    if (!this.newStartPaymentDate) {
                        this.nextDeliveryDate = nextDeliveryDate
                        this.newStartPaymentDate = nextDeliveryDate
                    }
                    if (i == 1) {
                        this.isStartDate = true
                        this.nextDeliveryDate = nextDeliveryDate
                        this.newStartPaymentDate = nextDeliveryDate
                    }
                }
            }
            if (!this.newStartPaymentDate) {
                console.log('No nextDelivery found')
                this.nextDeliveryDate = new Date(deliveries[deliveries.length - 1].deliveryDate.toDate())
                this.nextDeliveryDate.setDate(this.nextDeliveryDate.getDate() + cycle * 2)
                console.log('date', this.nextDeliveryDate)
                this.deliveryDates.push(this.helper.toDeliveryItem(this.nextDeliveryDate))
                this.newStartPaymentDate = this.nextDeliveryDate
            }
        } else {
            this.deliveryDates = this.deliveryDatesMap(1)
            console.log(this.deliveryDates)
            const pointsBoxDate = new Date(this.deliveryDates[0].deliveryDate)
            pointsBoxDate.setDate(pointsBoxDate.getDate() - cycle)
            this.boxDeliveryDate = pointsBoxDate
            this.nextDeliveryDate = new Date(this.deliveryDates[0].deliveryDate)
            this.newStartPaymentDate = new Date(this.deliveryDates[this.deliveryDates.length - 1].deliveryDate)
        }

        // Add history data
        var historyItem = {
            docId: this.datepipe.transform(new Date(), 'yyyy-MM-dd_HH:mm') + '_points',
            changeType: 'Points box claimed',
            changes: {
                pointsClaimed: claimedBox.pointsClaimed,
                lifetimePoints: claimedBox.lifetimePoints,
                pointsRemaining: claimedBox.pointsRemaining,
                boxClaimed: null
            },
            dateChanged: new Date()
        }

        var data 
        data = {
            uid: this.dialogData.currentOrder.userId,
            boxName: this.dialogData.currentOrder.boxName,
            orderId: this.dialogData.currentOrder.orderId,
            orderRef: this.dialogData.currentOrder.orderReference,
            newStartDate: this.newStartPaymentDate,
            pauseType: '1 month',
            nextDeliveryDate: this.nextDeliveryDate,
            deliveryDates: this.deliveryDates.length > 1 ? this.deliveryDates : null,
            subscriptionId: this.dialogData.currentOrder.subscriptionDetails.subscriptionId,
            changeStartDate: this.isStartDate,
            newDelivery: {
                replaceList: this.getItemsToRemove(),
                items: this.deliveryDates.filter(x => !this.replaceList.includes(x.docId))
            },
            history: historyItem
        }

        if (this.isStartDate) {
            data.nextPaymentDate = this.datepipe.transform(this.newStartPaymentDate, 'yyyy-MM-dd')
        } else {
            //data.nextPaymentDate = this.datepipe.transform(paymentDate, 'yyyy-MM-dd')
        }
        console.log(this.isStartDate, data)

        return data
    }

    createPointsOrder(pointsData) {
        var checkoutSummary = {
            checkoutPrice: this.box.price,
            shippingPrice: 0,
            subTotal: this.box.price,
            taxPrice: 0,
            points: {
                checkoutPrice: 0,
                discount: Number((this.dialogData.discount * 100).toFixed(2)),
                discountPrice: Math.round(this.dialogData.discountPrice),
                pointsUsed: this.dialogData.pointsClaimed
            }
        }

        if (pointsData.discount < 1) {
            checkoutSummary.points.checkoutPrice = Math.round(this.box.price * (1 - pointsData.discount))
            //checkoutSummary.subTotal = Math.round(this.box.price * (1 - pointsData.discount))
            checkoutSummary.taxPrice = Math.round(checkoutSummary.points.checkoutPrice - (checkoutSummary.points.checkoutPrice * (100 / 121)));
        }

        return new FirebaseOrder(
            this.fbService.generateId(false),
            this.fbService.generateId(true),
            this.dialogData.boxId,
            this.dialogData.boxId == "box_03" ? 'Complete' : 'Plus',
            this.dialogData.currentOrder.products,
            this.dialogData.currentOrder.productQuantity,
            this.boxDeliveryDate,
            this.dialogData.currentOrder.deliveryDaysApart,
            checkoutSummary,
            this.dialogData.currentOrder.shippingAddress,
            0,
            {
                isPaid: true
            },
            {
                subscriptionId: null,
                subscriptionStatus: 'active',
            },
            this.dialogData.currentOrder.userId,
            new Date()
        );
    }

    deliveryDatesMap(months) {
        console.log(this.dialogData)
        this.replaceList = []
        var deliveryDays = [];
        const cycleDays = this.dialogData.currentOrder.deliveryDaysApart
        var loopAmount = this.dialogData.currentOrder.deliveries.length;
        var startDate
        for (let i = 0; i < loopAmount; i++) {
            var deliveryDate = null
            if (!(this.dialogData.currentOrder.deliveries[i].deliveryDate instanceof Date)) {
                deliveryDate = this.dialogData.currentOrder.deliveries[i].deliveryDate.toDate()
            } else {
                deliveryDate = new Date(this.dialogData.currentOrder.deliveries[i].deliveryDate)
            }
            if (deliveryDate > new Date()) {
                if (!startDate) {
                    //this.oldDeliveryDate = new Date(deliveryDate)
                    startDate = new Date(deliveryDate)
                } else {
                    deliveryDate = new Date(startDate.setDate(startDate.getDate() + cycleDays))
                }
                if (i != 0) {
                    const idToReplace = this.datepipe.transform(deliveryDate, 'yyyy-MM-dd')
                    this.replaceList.push(idToReplace)
                    deliveryDate.setDate(deliveryDate.getDate() + months * cycleDays)
                    deliveryDays.push(this.helper.toDeliveryItem(deliveryDate));
                }
                if (i == 0 || i == 1) {
                    this.isStartDate = true
                }
            } 
            //console.log(loopAmount, this.orders[index].deliveryDates[0], daysToAdd, daysApart, deliveryDate)
        }
        if (this.dialogData.currentOrder.paymentPlan == 1 && loopAmount < (this.dialogData.currentOrder.paymentPlan + 1)) {
            console.log(deliveryDays)
            const thirteenthMonth = new Date(deliveryDays[deliveryDays.length - 1].deliveryDate)
            thirteenthMonth.setDate(thirteenthMonth.getDate() + cycleDays)
            deliveryDays.push(this.helper.toDeliveryItem(thirteenthMonth));
        }

        return deliveryDays;
    }

    getItemsToRemove() {
        const onlyIdList = []
        this.deliveryDates.forEach(delivery => {
            onlyIdList.push(delivery.docId)
        });
        // if (this.dialogData.isTooLate) {
        //     var list = this.replaceList.filter(x => !onlyIdList.includes(x))
        //     list.shift()
        //     return list
        // } else {
        return this.replaceList.filter(x => !onlyIdList.includes(x))
        //}
    }
}