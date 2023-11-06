import { Component, OnInit, Input, isDevMode } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { OrderService } from 'src/app/services/firebase/order-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { AccountComponent } from '../account.component';

@Component({
  selector: 'cancel-subscription',
  templateUrl: './cancel-subscription.component.html',
  styleUrls: ['./cancel-subscription.component.scss']
})
export class CancelSubscriptionComponent implements OnInit {
  thresholdDate = new Date()
  confirmScreen = false
  finishRequest = false
  cancelAlternativeText = ''
  cancelOtherText = ''
  cancelOptionSelection = ''
  cancelOptions = [
    ['monetary', 'I don\'t have the money right now.'],
    ['expensive', 'I think it\'s too expensive.'],
    ['offerings', 'I\'m disappointed by the offerings.'],
    ['quality_products', 'I\'m disappointed by the quality.'],
    ['quality_composition', 'I\'m disappointed by the composition of the box.'],
    ['alternative', 'I found something better.'],
    ['other', 'Other, please specify:'],
    ['failed', 'Incorrect / failed order'],
  ]
  @Input() orderItem;
  @Input() userPoints;
  orderData;
  lastDateCheck;
  statusFailed = false;
  remainingOrders = 0;

  constructor(
    private title: PageDetailService,
    private router: Router,
    private dataRoute: ActivatedRoute,
    public datepipe: DatePipe,
    private snackBar: MatSnackBar,
    public fun: AngularFireFunctions,
    public orderService: OrderService,
    private translate: TranslateService,
    private analytics: AnalyticsService,
    public account: AccountComponent) { }

  ngOnInit() {
    this.analytics.trackPage('Subscription - Cancel subscription')
    this.title.setDetails("subscription_cancel")
    this.thresholdDate.setDate(this.thresholdDate.getDate() + 5)
    this.setSelectTranslations()

    if (this.orderItem != null) {
      this.orderData = {
        uid: this.orderItem.userId,
        orderId: this.orderItem.orderId,
        orderRef: this.orderItem.orderReference,
        boxName: this.orderItem.boxName,
        subscriptionId: this.orderItem.subscriptionDetails.subscriptionId,
      }
      if (this.orderData.subscriptionId) {
        this.cancelOptions.splice(7)
      }
      if (this.orderItem.nextDeliveryDate != null) {
        this.calculateLastDeliveryDate()
      }
    } else {
      var orderRef = this.dataRoute.snapshot.paramMap.get('ref')
      if (isDevMode()) {
        console.log(orderRef);
      }
      if (orderRef == null || orderRef == 'undefined') {
        this.router.navigate(['/account/subscriptions'])
      } else {
        this.router.navigate(['/account/subscriptions/' + orderRef + '/details'])
      }
    }
  }

  async setSelectTranslations() {
    this.cancelOptions[0][1] = await this.translate.get('cancel_subscription.reason_monetary_title').toPromise();
    this.cancelOptions[1][1] = await this.translate.get('cancel_subscription.reason_expensive_title').toPromise();
    this.cancelOptions[2][1] = await this.translate.get('cancel_subscription.reason_offerings_title').toPromise();
    this.cancelOptions[3][1] = await this.translate.get('cancel_subscription.reason_quality_products_title').toPromise();
    this.cancelOptions[4][1] = await this.translate.get('cancel_subscription.reason_quality_composition_title').toPromise();
    this.cancelOptions[5][1] = await this.translate.get('cancel_subscription.reason_alternative_title').toPromise();
    this.cancelOptions[6][1] = await this.translate.get('cancel_subscription.reason_other_title').toPromise();
    if (this.orderData && !this.orderData.subscriptionId) {
      this.cancelOptions[7][1] = await this.translate.get('cancel_subscription.reason_failed_title').toPromise();
    }

    // Listen for real-time language change
    this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
      this.cancelOptions[0][1] = await this.translate.get('cancel_subscription.reason_monetary_title').toPromise();
      this.cancelOptions[1][1] = await this.translate.get('cancel_subscription.reason_expensive_title').toPromise();
      this.cancelOptions[2][1] = await this.translate.get('cancel_subscription.reason_offerings_title').toPromise();
      this.cancelOptions[3][1] = await this.translate.get('cancel_subscription.reason_quality_products_title').toPromise();
      this.cancelOptions[4][1] = await this.translate.get('cancel_subscription.reason_quality_composition_title').toPromise();
      this.cancelOptions[5][1] = await this.translate.get('cancel_subscription.reason_alternative_title').toPromise();
      this.cancelOptions[6][1] = await this.translate.get('cancel_subscription.reason_other_title').toPromise();
      if (!this.orderData.subscriptionId) {
        this.cancelOptions[7][1] = await this.translate.get('cancel_subscription.reason_failed_title').toPromise();
      }
    });
  }

  calculateLastDeliveryDate() {
    if (isDevMode()) {
      console.log(this.orderItem)
    }
    var lastDate;
    this.remainingOrders = 0;
    if (this.orderItem.paymentPlan == 1) {
      // Get lastDeliveryDate
      if (!(this.orderItem.nextDeliveryDate instanceof Date)) {
        this.orderItem.nextDeliveryDate = new Date(this.orderItem.nextDeliveryDate.seconds * 1000)
      }
      if (this.orderItem.nextDeliveryDate > new Date()) {
        if (!lastDate) {
          lastDate = this.orderItem.nextDeliveryDate
        }
      }
    } else {
      for (let i = 0; i < this.orderItem.deliveryDates.length - 1; i++) {
        if (!(this.orderItem.deliveryDates[i] instanceof Date)) {
          this.orderItem.deliveryDates[i] = new Date(this.orderItem.deliveryDates[i].seconds * 1000)
        }
        if (this.orderItem.deliveryDates[i] > new Date()) {
          lastDate = this.orderItem.deliveryDates[i]
          this.remainingOrders = this.remainingOrders + 1
        }
      }
    }
    if (isDevMode()) {
      console.log('lastDate:', lastDate, this.remainingOrders)
    }
    this.orderData.lastDeliveryDate = lastDate
    this.lastDateCheck = lastDate
  }

  async confirmCancellation() {
    this.finishRequest = true
    if (this.cancelOptionSelection == 'other' && this.cancelOtherText == '' ||
      this.cancelOptionSelection == 'other' && this.cancelOtherText.length < 6) {
      this.snackBar.open(await this.translate.get('cancel_subscription.toast_invalid_reason').toPromise(), "OK", {
        duration: 5000,
      });
      this.finishRequest = false
      return
    }

    if (this.cancelOptionSelection == 'alternative' && this.cancelAlternativeText == '' ||
      this.cancelOptionSelection == 'alternative' && this.cancelAlternativeText.length < 6) {
      this.snackBar.open(await this.translate.get('cancel_subscription.toast_invalid_answer').toPromise(), "OK", {
        duration: 5000,
      });
      this.finishRequest = false
      return
    }

    if (this.cancelOptionSelection == 'alternative') {
      this.orderData.cancelReason = 'I found something better: ' + this.cancelAlternativeText
    } else if (this.cancelOptionSelection == 'other') {
      this.orderData.cancelReason = 'Other: ' + this.cancelOtherText
    } else if (this.cancelOptionSelection == 'failed') {
      this.statusFailed = true
      this.orderData.cancelReason = 'Failed order'
    } else {
      for (let i = 0; i < this.cancelOptions.length; i++) {
        if (this.cancelOptions[i][0] == this.cancelOptionSelection) {
          this.orderData.cancelReason = this.cancelOptions[i][1]
        }
      }
    }

    this.orderData.lastDeliveryDateString = this.datepipe.transform(this.orderData.lastDeliveryDate, 'yyyy-MM-dd')

    if (this.orderData.subscriptionId == null) {
      if (this.statusFailed) {
        this.orderService.changeOrderStatus(this.orderData.uid, this.orderData.orderId, 'failed')
      } else {
        this.orderService.changeOrderStatus(this.orderData.uid, this.orderData.orderId, 'canceled')
      }
      this.finishCancelation()
    } else {
      if (this.lastDateCheck < this.thresholdDate) {
        this.orderData.cancelDate = new Date()
        this.orderData.cancelDateString = this.datepipe.transform(this.orderData.cancelDate, 'yyyy-MM-dd')
        const cancelSubscription = this.fun.httpsCallable('planCancelSubscriptionCall');
        cancelSubscription(this.orderData).subscribe((result) => {
          if (this.statusFailed) {
            this.orderService.changeOrderStatus(this.orderData.uid, this.orderData.orderId, 'failed')
          } else {
            this.orderService.cancellationPlanned(this.orderData.uid, this.orderData.orderId, this.orderData.lastDeliveryDate)
          }
          this.finishCancelation()
        });
      } else if (this.remainingOrders > 0) {
        this.orderData.cancelDate = new Date()
        this.orderData.cancelDateString = this.datepipe.transform(this.orderData.cancelDate, 'yyyy-MM-dd')
        this.orderData.remainingOrders = this.remainingOrders
        if (isDevMode()) {
          console.log(this.orderData)
        }
        const cancelSubscription = this.fun.httpsCallable('cancelSubscriptionCall');
        cancelSubscription(this.orderData).subscribe((result) => {
          if (this.statusFailed) {
            this.orderService.changeOrderStatus(this.orderData.uid, this.orderData.orderId, 'failed')
          }
          this.finishCancelation()
        });
      } else {
        const cancelSubscription = this.fun.httpsCallable('cancelSubscriptionCall');
        cancelSubscription(this.orderData).subscribe((result) => {
          if (this.statusFailed) {
            this.orderService.changeOrderStatus(this.orderData.uid, this.orderData.orderId, 'failed')
          }
          this.finishCancelation()
        });
      }
    }
  }

  async finishCancelation() {
    this.finishRequest = false
    if (isDevMode()) {
      console.log(this.orderData)
    }
    const cancelSlack = this.fun.httpsCallable('orderCancelledSlack');
    cancelSlack(this.orderData).subscribe();
    this.snackBar.open(await this.translate.get('cancel_subscription.toast_message').toPromise(), "OK", {
      duration: 5000,
    });
    this.account.updateData('details', this.orderData)
  }

  returnToOrder() {
    this.account.updateData('details', this.orderData)
  }

  goToPoints() {
    this.account.updateData('points', this.orderData)
  }
}