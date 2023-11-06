import { Component, OnInit, Input, isDevMode } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireFunctions } from '@angular/fire/functions';
import { FirestoreService } from 'src/app/services/firebase-service';
import { OrderService } from 'src/app/services/firebase/order-service';
import { MatDialog } from '@angular/material/dialog';
import { firestore, User } from 'firebase';
import { FirebaseOrder } from 'src/app/models/firebase.order';
import { Observable, Subscription } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { UserData } from 'src/app/models/userdata';
import { UserAddress } from 'src/app/models/address';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { CancelWarningDialog } from '../cancel-warning/cancel-warning.component';
import { DeliveryDaysDialog } from '../change-days/change-days.component';
import { ChangeBoxDialog } from '../change-box/change-box.component';
import { PauseSubscriptionDialog } from '../pause-order/pause-order.component';
import { CheckCustomer } from 'src/app/check-customer.test';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { AccountComponent } from '../account.component';
import { DatePipe } from '@angular/common';
import { Helper } from 'src/app/shared/helper';
import { CookieService } from 'ngx-cookie-service';
import { NewStartDateDialog } from '../new-startdate/new-startdate.component';
import { UserService } from 'src/app/services/firebase/user-service';
import { Boxes } from 'src/app/constants/boxes';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'account-subscription',
  templateUrl: './account-subscription.component.html',
  styleUrls: ['./account-subscription.component.scss']
})
export class AccountSubscriptionComponent implements OnInit {
  subscriptions: Subscription[] = [];
  user$: Observable<User | null>;
  @Input() currentUser: User;
  userData$: Observable<UserData | null>;
  currentUserData: UserData;
  order$: Observable<any | null>
  @Input() orderRef = ''
  order: FirebaseOrder;
  @Input() set orderDetail(order: FirebaseOrder) {
    this.order = order
  }
  upcomingDeliveries = []
  dataSourceProducts
  dataSourceExtraProducts
  allPayments
  allPaymentsOfOrder = []
  dataSourcePayments
  displayedColumns = ['brand', 'type', 'name', 'amount'];
  displayedColumnsExtraProducts = ['brand', 'type', 'name', 'price', 'amount'];
  displayedColumnsPayments = ['description', 'date', 'status', 'amount'];
  displayedColumnsDeliveries = ['deliveryNo', 'date', 'isPacked', 'isDelivered', 'isPaid'];
  billShipAddressSame

  // Layout triggers
  isActive = true
  disableBeforeStart = false
  disableCycle = false
  disableCancelation = false
  dataLoaded = false
  paymentsLoaded = false
  showPayments = false
  today = new Date()
  testMode = false
  language = 'nl'

  statusOpen
  statusCanceled
  statusPending
  statusExpired
  statusFailed
  statusPaid
  statusRefunded
  statusRefundedPartial
  statusAM04
  statusMD01
  statusMD06
  statusMS02
  paymentDescription
  paymentDescriptionBox
  paymentDescriptionBoxFirst

  constructor(
    private app: AppComponent,
    private titleService: PageDetailService,
    private analytics: AnalyticsService,
    private router: Router,
    private dataRoute: ActivatedRoute,
    private helper: Helper,
    private cookieService: CookieService,
    private boxes: Boxes,
    public auth: AngularFireAuth,
    public fun: AngularFireFunctions,
    public fbService: FirestoreService,
    public userService: UserService,
    public orderService: OrderService,
    public translate: TranslateService,
    public account: AccountComponent,
    public datepipe: DatePipe,
    public dialog: MatDialog,
    private checkCustomer: CheckCustomer) { }

  ngOnInit(): void {
    if (this.orderRef == null) {
      this.orderRef = this.dataRoute.snapshot.paramMap.get('ref')
    }

    if (this.orderRef == null || this.orderRef == 'undefined') {
      if (isDevMode()) {
        console.log('ref null', this.orderRef);
      }
      this.account.updateData('subscriptions', null)
      return;
    }
    this.titleService.setDetails("account_subscriptions")
    this.setTranslations()

    if (this.currentUser != null) {
      this.testMode = !this.checkCustomer.isRealCustomer(this.currentUser)
      this.getOrder(this.currentUser.uid)
    } else {
      this.user$ = this.auth.user;
      this.app.addToSubscriptions(this.user$.subscribe((user: User) => {
        this.analytics.trackPage('Subscription', user)
        this.testMode = !this.checkCustomer.isRealCustomer(user)
        this.currentUser = user;
        this.getOrder(this.currentUser.uid)
      }));
    }
  }

  async setTranslations() {
    this.statusOpen = await this.translate.get('payment.status_open').toPromise();
    this.statusCanceled = await this.translate.get('payment.status_canceled').toPromise();
    this.statusPending = await this.translate.get('payment.status_pending').toPromise();
    this.statusExpired = await this.translate.get('payment.status_expired').toPromise();
    this.statusFailed = await this.translate.get('payment.status_failed').toPromise();
    this.statusPaid = await this.translate.get('payment.status_paid').toPromise();
    this.statusRefunded = await this.translate.get('payment.status_refunded').toPromise();
    this.statusRefundedPartial = await this.translate.get('payment.status_refunded_partial').toPromise();
    this.statusAM04 = await this.translate.get('payment.status_am04').toPromise();
    this.statusMD01 = await this.translate.get('payment.status_md01').toPromise();
    this.statusMD06 = await this.translate.get('payment.status_md06').toPromise();
    this.statusMS02 = await this.translate.get('payment.status_ms02').toPromise();
    this.paymentDescription = await this.translate.get('payment.description').toPromise();
    this.paymentDescriptionBox = await this.translate.get('payment.description_box').toPromise();
    this.paymentDescriptionBoxFirst = await this.translate.get('payment.description_box_first').toPromise();
    this.language = this.cookieService.get('language') != null ? this.cookieService.get('language') : 'nl'
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      this.language = event.lang
    });
  }

  getUserData(uid: string) {
    this.userData$ = this.userService.getUserInfoRefByUID(uid).valueChanges();
    this.subscriptions.push(this.userData$.subscribe((data: UserData) => {
      this.currentUserData = data;
      if (this.currentUserData == null) {
        var address = new UserAddress("", "", "", "", "", "", "Nederland");
        this.currentUserData = new UserData(this.currentUser.uid, "", "", address, this.currentUser.email, new Date());
      } else {
        //this.currentUserData.language = this.cookieService.get('language')

        // Set boolean
        if (this.currentUserData.address.postalCode == this.order.shippingAddress.postalCode &&
          this.currentUserData.address.houseNo == this.order.shippingAddress.houseNo) {
          this.billShipAddressSame = true
        } else {
          this.billShipAddressSame = false
        }
      }
    }));
  }

  getOrder(uid: string) {
    this.order$ = this.orderService.getOrderByRef(uid, this.orderRef).valueChanges();
    setTimeout(() => {
      if (this.order == null) {
        this.account.updateData('subscriptions', null)
      }
    }, 5000);
    this.app.addToSubscriptions(this.order$.subscribe((data: any) => {
      if (data != null && data.length > 0 && data[0] != undefined && data[0].userId == this.currentUser.uid) {
        this.order = data[0]
        this.getOrderDetails()
        this.getUserData(uid)
        this.dataLoaded = true;
      } else {
        this.account.updateData('subscriptions', null)
      }
    }))
  }

  getOrderDetails() {
    if (!(this.order.startDeliveryDate instanceof firestore.Timestamp)) {
      this.order.startDeliveryDate = new firestore.Timestamp(this.order.startDeliveryDate.seconds, this.order.startDeliveryDate.nanoseconds)
      if (isDevMode()) {
        console.log('converted', this.order.startDeliveryDate)
      }
    }
    if (!this.order.deliveryDates && this.order.paymentPlan != 0) {
      // Convert to Timestamp if not
      if (this.order.nextDeliveryDate != null && !(this.order.nextDeliveryDate instanceof firestore.Timestamp)) {
        this.order.nextDeliveryDate = new firestore.Timestamp(this.order.nextDeliveryDate.seconds, this.order.nextDeliveryDate.nanoseconds)
        if (isDevMode()) {
          console.log('converted', this.order.nextDeliveryDate)
        }
      }

      this.order.deliveryDates = []
      this.upcomingDeliveries = []
      var firstDelivery
      if (this.order.startDeliveryDate.toDate() > new Date()) {
        firstDelivery = this.order.startDeliveryDate.toDate()
      } else {
        firstDelivery = this.order.nextDeliveryDate ? this.order.nextDeliveryDate.toDate() : null
      }
      if (firstDelivery) {
        for (let i = 0; i < 3; i++) {
          var deliveryDate = new Date(firstDelivery)
          var daysToAdd = this.order.deliveryDaysApart * i;
          deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
          this.order.deliveryDates.push(deliveryDate);
          if (deliveryDate > new Date()) {
            this.upcomingDeliveries.push(this.helper.toDeliveryItem(deliveryDate))
          }
        }
      }
    } else if (this.order.deliveryDates && this.order.paymentPlan != 0) {
      if (this.order.deliveryDates[0].seconds && !this.order.subscriptionDetails.lastDeliveryDate) {
        var convertedArray = []
        for (let i = 0; i < this.order.deliveryDates.length; i++) {
          var date = new firestore.Timestamp(this.order.deliveryDates[i].seconds, this.order.deliveryDates[i].nanoseconds)
          convertedArray.push(date)
          if (date.toDate() > new Date()) {
            this.upcomingDeliveries.push(this.helper.toDeliveryItem(date.toDate()))
          }
        }
        this.order.deliveryDates = convertedArray
      } else {
        this.upcomingDeliveries.push(this.helper.toDeliveryItem(this.order.subscriptionDetails.lastDeliveryDate.toDate()))
      }
    }

    this.isActive = this.order.subscriptionDetails.subscriptionStatus == 'paused' || this.order.subscriptionDetails.subscriptionStatus == 'active' && !this.order.subscriptionDetails.lastDeliveryDate && this.order.paymentPlan != 0
    if (this.order.startDeliveryDate.toDate() > this.today) {
      this.disableBeforeStart = true
    }

    // Disable editing BROKEN
    // if (this.order.nextDeliveryDate && this.order.paymentDetails.paymentMethod != 'creditcard') {
    //   const editThreshold = new Date()
    //   editThreshold.setDate(editThreshold.getDate() + 4)
    //   if (this.order.nextDeliveryDate.toDate() < editThreshold) {
    //     this.disableCycle = true
    //   } else {
    //     this.disableCycle = false
    //   }
    //   console.log(this.order.nextDeliveryDate.toDate(), editThreshold)
    // } else {
    //   console.log(this.order, this.order.deliveryDates)
    // }

    // Set cancel disabled
    var disableDate = this.order.startDeliveryDate.toDate()
    if (this.order.paymentDetails.isPaid && disableDate > new Date()) { // || this.order.subscriptionDetails.subscriptionStatus == 'paused'
      //console.log(this.orders[listCount].orderReference, disableDate)
      this.disableCancelation = true
    }

    // Set coupon
    if (this.order.checkoutSummary.coupon) {
      if (this.order.history) {
        this.order.checkoutSummary.coupon.price = this.order.history[0].order.checkoutSummary.checkoutPrice - this.order.checkoutSummary.coupon.checkoutPrice
      } else {
        this.order.checkoutSummary.coupon.price = this.order.checkoutSummary.checkoutPrice - this.order.checkoutSummary.coupon.checkoutPrice
      }
      if (this.order.checkoutSummary.promo) {
        this.order.checkoutSummary.coupon.price = this.order.checkoutSummary.coupon.price - this.order.checkoutSummary.promo.price
      }
    }

    // Fill product array
    this.dataSourceProducts = this.helper.getProductsFromOrder(this.order.products)

    // Fill extra product array
    if (this.order.products.extraProducts) {
      this.dataSourceExtraProducts = this.helper.getProductsFromOrder(this.order.products.extraProducts)
    }
  }

  paymentsView() {
    this.showPayments =! this.showPayments
    if (this.showPayments && !this.dataSourcePayments) {
      this.getPayments()
      this.getDeliveries()
    }
  }

  getDeliveries() {
    var deliveryRef = this.orderService.getDeliveriesByOrderID(this.order.userId, this.order.orderId)
    this.subscriptions.push(deliveryRef.valueChanges().subscribe((data: any) => {
      this.order.deliveries = data
      this.upcomingDeliveries = []
      for (let i = 0; i < this.order.deliveries.length; i++) {
        this.order.deliveries[i].boxNumber = i + 1
        this.order.deliveries[i].deliveryDate = this.order.deliveries[i].deliveryDate.toDate()
        if (this.order.deliveries[i].deliveryDate > new Date()) {
          if (this.order.subscriptionDetails.lastDeliveryDate && i < (this.order.deliveries.length - 1) ||
            !this.order.subscriptionDetails.lastDeliveryDate) {
            this.upcomingDeliveries.push(this.order.deliveries[i])
          }
        }
      }
      if (this.upcomingDeliveries.length == 0 || this.upcomingDeliveries.length == 1) {
        //this.disableCycle = true
        if (this.order.deliveries.length > 1) {
          let loop = this.order.paymentPlan != 0 ? 6 : 1
          for (let index = 1; index <= loop; index++) {
            var delivery = new Date(this.order.deliveries[this.order.deliveries.length - 1].deliveryDate)
            delivery.setDate(delivery.getDate() + (index * this.order.deliveryDaysApart))
            this.upcomingDeliveries.push(this.helper.toDeliveryItem(delivery))
          }
        } else if (this.upcomingDeliveries.length == 0 && this.order.startDeliveryDate.toDate() > new Date()) {
          this.upcomingDeliveries.push(this.helper.toDeliveryItem(this.order.startDeliveryDate.toDate()))
        }
      }
    }));
  }

  getPayments() {
    if (this.order.paymentDetails.isPaid) {
      const allPaymentsCall = this.fun.httpsCallable('getPaymentsFromCustomer');
      allPaymentsCall({ uid: this.order.userId }).subscribe((result) => {
        //console.log(result)
        this.allPayments = []
        this.allPayments = result
        this.prepareOrderPayments()
      });
    } else {
      this.paymentsLoaded = true
    }
  }

  prepareOrderPayments() {
    // Current payments
    this.dataSourcePayments = [];
    this.allPaymentsOfOrder = [];
    let lastBoxNumber = 0;
    let isLastPaidOn = '';
    for (let j = 0; j < this.allPayments.length; j++) {
      const description = this.allPayments[j].description.split(' | ')
      const orderRef = description[0].replace('[Retry] ', '')
      const isRetry = this.allPayments[j].description.includes('Retry')
      if (this.allPayments[j].metadata != null &&
        this.order.orderId == this.allPayments[j].metadata.OrderId ||
        this.order.subscriptionDetails.subscriptionId != null &&
        this.order.subscriptionDetails.subscriptionId == this.allPayments[j].subscriptionId ||
        this.order.orderReference == orderRef) {
        let status;
        if (this.allPayments[j].details != null &&
          this.allPayments[j].details.bankReasonCode) {
          if (this.allPayments[j].details.bankReasonCode == 'AM04') {
            status = this.statusAM04
          } else if (this.allPayments[j].details.bankReasonCode == 'MD01') {
            status = this.statusMD01
          } else if (this.allPayments[j].details.bankReasonCode == 'MD06') {
            status = this.statusMD06
          } else if (this.allPayments[j].details.bankReasonCode == 'MS02') {
            status = this.statusMS02
          } else {
            status = this.allPayments[j].details.bankReasonCode
          }
        } else {
          if (this.allPayments[j].status == 'paid') {
            status = this.statusPaid
            isLastPaidOn = this.allPayments[j].id
          } else if (this.allPayments[j].status == 'open') {
            status = this.statusOpen
          } else if (this.allPayments[j].status == 'canceled') {
            status = this.statusCanceled
          } else if (this.allPayments[j].status == 'pending') {
            status = this.statusPending
          } else if (this.allPayments[j].status == 'expired') {
            status = this.statusExpired
          } else if (this.allPayments[j].status == 'failed') {
            status = this.statusFailed
          }
        }
        if (this.allPayments[j].amountRefunded != null && this.allPayments[j].amountRefunded.value != '0.00') {
          if (this.allPayments[j].amount.value == this.allPayments[j].amountRefunded.value) {
            status = this.statusRefunded
          } else {
            status = this.statusRefundedPartial
          }
        }
        let box = 0
        const date = new Date(this.allPayments[j].createdAt)
        const deliveries = this.order.deliveries
        deliveries.reverse()
        for (let i = 0; i < deliveries.length; i++) {
          const item = deliveries[i];
          const dateString = this.datepipe.transform(date, 'yyyy-MM-dd')
          const creditcardDate = item.deliveryDate
          creditcardDate.setDate(creditcardDate.getDate() - 1)
          const creditcardDateString = this.datepipe.transform(creditcardDate, 'yyyy-MM-dd')
          //console.log(item.id, creditcardDateString, dateString)
          if (item.id == dateString || creditcardDateString == dateString) {
            box = item.boxNumber
            lastBoxNumber = item.boxNumber
            break;
          } else if (isRetry) {
            box = lastBoxNumber
            break;
          }
        }

        let description
        if (this.allPayments[j].sequenceType == 'first') {
          box = 1
          description = this.paymentDescriptionBoxFirst + box
        } else if (this.order.paymentPlan == 0 && !this.boxes.isBoxOneOff(this.order.boxId)) {
          description = this.allPayments[j].description.split(' | ')[1]
        } else if (this.boxes.isBoxOneOff(this.order.boxId)) {
          description = this.allPayments[j].description
        } else {
          description = isRetry ? '[Retry] ' : ''
          if (box != 0) {
            description = description + this.paymentDescriptionBox + box
          } else {
            description = description + this.paymentDescription + date.toLocaleString('en', { month: 'long' }) + ' ' + date.getFullYear()
          }
        }
        const paymentData = {
          id: this.allPayments[j].id,
          boxNumber: box,
          description: description,
          date: date,
          status: status,
          amount: parseFloat(this.allPayments[j].amount.value),
          paymentItem: this.allPayments[j]
        }
        this.allPaymentsOfOrder.push(paymentData)
      }
    }
    if (isDevMode()) {
      console.log(this.allPaymentsOfOrder)
    }
    // if (this.allPaymentsOfOrder.length > 1 && this.disableCycle &&
    //   isLastPaidOn == this.allPaymentsOfOrder[this.allPaymentsOfOrder.length - 1].id) {
    //   this.disableCycle = false
    // }
    this.dataSourcePayments = this.allPaymentsOfOrder
    this.paymentsLoaded = true
  }

  contactFromOrder() {
    location.href = 'mailto:info@demonth.nl?subject=Question regarding Order #' + this.order.orderReference
  }

  payOrder() {
    if (this.order.startDeliveryDate.toDate() > new Date()) {
      const couponId = this.order.checkoutSummary.coupon ? this.order.checkoutSummary.coupon.id : null
      this.router.navigate(['/checkout'],
        { state: { order: this.fbService.firebaseOrderToOrder(this.order), coupon: couponId } })
    } else {
      this.dialog.open(NewStartDateDialog, {
        width: '450px',
        data: {
          order: this.order,
          isOneOff: this.upcomingDeliveries.length == 0
        }
      });
    }
  }

  cancelSubscription() {
    if (this.order.subscriptionDetails.subscriptionId == null) {
      const orderItem = {
        orderId: this.order.orderId,
        orderReference: this.order.orderReference,
        boxName: this.order.boxName,
        paymentPlan: this.order.paymentPlan,
        subscriptionDetails: this.order.subscriptionDetails,
        nextDeliveryDate: this.upcomingDeliveries[0] != null ? this.upcomingDeliveries[0].deliveryDate : null,
        deliveryDates: this.order.deliveryDates,
        userId: this.order.userId
      }
      if (isDevMode()) {
        console.log(orderItem)
      }
      this.account.updateData('cancel', orderItem)
    } else {
      const dialogRef = this.dialog.open(CancelWarningDialog, {
        width: '600px',
        data: {
          order: this.order
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed', result)
        if (result != undefined) {
          switch (result.type) {
            case 'products':
              this.editProducts()
              break;
            case 'days':
              this.editCycle()
              break;
            case 'pause':
              this.pauseOrder()
              break;
            case 'cancel':
              const orderItem = {
                orderId: this.order.orderId,
                orderReference: this.order.orderReference,
                boxName: this.order.boxName,
                paymentPlan: this.order.paymentPlan,
                subscriptionDetails: this.order.subscriptionDetails,
                nextDeliveryDate: this.upcomingDeliveries[0] != null ? this.upcomingDeliveries[0].deliveryDate : null,
                deliveryDates: this.order.deliveryDates,
                userId: this.order.userId
              }
              if (isDevMode()) {
                console.log(orderItem)
              }
              this.account.updateData('cancel', orderItem)
              //this.router.navigate(['/account/subscriptions/' + orderItem.orderReference + '/cancel-subscription'], { state: { order: orderItem } });
              break;
          }
        }
      });
    }
  }

  renewSubscription() {

  }

  editPreferences() {
    var orderItem = {
      uid: this.currentUser.uid,
      orderId: this.order.orderId,
      orderRef: this.order.orderReference,
      boxTypeId: this.order.boxId,
      products: JSON.stringify(this.order.products),
      productQuantity: this.order.productQuantity,
      paymentPlan: this.order.paymentPlan,
      checkoutSummary: this.order.checkoutSummary,
      subscriptionDetails: this.order.subscriptionDetails,
      showPreferences: true
    }
    this.account.updateData('edit', orderItem)
  }

  editProducts() {
    var orderItem = {
      uid: this.currentUser.uid,
      orderId: this.order.orderId,
      orderRef: this.order.orderReference,
      boxTypeId: this.order.boxId,
      products: JSON.stringify(this.order.products),
      productQuantity: this.order.productQuantity,
      paymentPlan: this.order.paymentPlan,
      checkoutSummary: this.order.checkoutSummary,
      subscriptionDetails: this.order.subscriptionDetails,
      showPreferences: false
    }
    this.account.updateData('edit', orderItem)
  }

  editCycle() {
    if (isDevMode()) {
      console.log(this.order)
    }
    this.dialog.open(DeliveryDaysDialog, {
      width: '450px',
      data: {
        order: this.order,
        days: parseInt(this.order.deliveryDaysApart)
      }
    });
  }

  changeBox() {
    this.dialog.open(ChangeBoxDialog, {
      width: '450px',
      data: {
        order: this.order
      }
    });
  }

  pauseOrder() {
    // Check if it's too late
    var isTooLate = null
    var disablePauseDate = new Date()
    if (this.upcomingDeliveries.length > 0) {
      disablePauseDate = new Date(this.upcomingDeliveries[0].deliveryDate)
      disablePauseDate.setDate(disablePauseDate.getDate() - 5)
      if (isDevMode()) {
        console.log(disablePauseDate)
      }
      if (disablePauseDate < new Date()) {
        isTooLate = new Date(this.upcomingDeliveries[0].deliveryDate)
      }
    }
    if (isDevMode()) {
      console.log(this.order, isTooLate)
    }
    const dialogRef = this.dialog.open(PauseSubscriptionDialog, {
      width: '500px',
      data: {
        order: this.order,
        isTooLate: isTooLate
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed', result);
      if (result != undefined) {
        this.order.subscriptionDetails.subscriptionStatus = 'paused'
      }
    })
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }
}