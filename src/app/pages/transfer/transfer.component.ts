import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { OrderService } from 'src/app/services/firebase/order-service';
import { AppComponent } from 'src/app/app.component';
import { FormGroup } from '@angular/forms';
import { Order } from 'src/app/models/order';
import { MyErrorStateMatcher } from 'src/app/shared/errormatcher';
import { UserData } from 'src/app/models/userdata';
import { UserService } from 'src/app/services/firebase/user-service';
import { DeliveryDaysDialog } from './pick-days/pick-days.component';
import { MatDialog } from '@angular/material/dialog';
import { isDevMode } from '@angular/core';
import { FirestoreService } from 'src/app/services/firebase-service';
import { FirebaseOrder } from 'src/app/models/firebase.order';
import { Helper } from 'src/app/shared/helper';
import { Boxes } from 'src/app/constants/boxes';
import { UserAddress } from 'src/app/models/address';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-transfer',
  templateUrl: './transfer.component.html',
  styleUrls: ['./transfer.component.scss']
})
export class TransferComponent implements OnInit {
  userData$: Observable<UserData | null>;
  orderId: string
  transferToPlan: number
  transferToSub: boolean
  fromGift: boolean
  showSubLayout = false
  showPlanLayout = false
  prepareForPayment = false
  order$: Observable<any | null>
  firebaseOrder: FirebaseOrder
  firebaseOrderDeliveries
  currentOrder
  currentUserData: UserData
  selectedMandate
  selectedAddress = 1
  shippingAddress = new UserAddress("", "", "", "", "", "", "nl");
  paymentDescription

  formGroup: FormGroup;
  matcher = new MyErrorStateMatcher();
  minDate = new Date();
  noDays = Array();
  noWeeks = Array();
  numberOfDays = 28;
  numberOfWeeks = null;
  extraShown = false;
  customDays = false;

  interval
  progress = 0

  panelOpenState = true;

  constructor(
    private app: AppComponent,
    private router: Router,
    private dataRoute: ActivatedRoute,
    public box: Boxes,
    public fbService: FirestoreService,
    public orderService: OrderService,
    public userService: UserService,
    public fun: AngularFireFunctions,
    public helper: Helper,
    public dialog: MatDialog,
    public datepipe: DatePipe,
    private translate: TranslateService) { }

  ngOnInit() {
    this.panelOpenState = true;
    this.minDate.setDate(new Date().getDate() + 5);
    this.orderId = this.dataRoute.snapshot.paramMap.get('id')
    this.transferToPlan = Number.parseInt(this.dataRoute.snapshot.queryParamMap.get('utp'))
    this.transferToSub = this.dataRoute.snapshot.queryParamMap.get('uts') == 'true'
    if (this.orderId.includes('?')) {
      var fullString = this.orderId.split('?')
      fullString.forEach(part => {
        if (part.includes('uts')) {
          this.transferToSub = true
        } else if (part.includes('utp')) {
          this.transferToPlan = Number.parseInt(part.split('=')[1])
        }
      });
      this.orderId = fullString[0]
    }
    if (isDevMode()) {
      console.log('check:', this.orderId, this.transferToPlan, this.transferToSub)
    }

    if (this.orderId == null && this.transferToPlan == null && !this.transferToSub) {
      //this.router.navigate(['/'])
    } else if (this.transferToPlan == null && !this.transferToSub) {
      //this.router.navigate(['/'])
    }

    this.app.setLoading(true)
    if (this.orderId != null && this.orderId.length > 0) {
      this.order$ = this.orderService.getOrderByID('FkTF6GCnq0am2miavM4uvQcq6T62', this.orderId).valueChanges();
      this.order$.subscribe((data: any) => {
        this.currentOrder = data
        this.getOrderDetails()
      })
    } else {
      this.app.setLoading(false)
      //this.router.navigate(['/'])
    }
  }

  async getOrderDetails() {
    this.app.setLoading(false)
    console.log(this.currentOrder)
    if (this.app.getUser()) {
      this.getUserData(this.app.getUser().uid)
    }
    // Transfer path
    if (this.transferToSub) {
      if (this.currentOrder.giftFriendEmail) {
        this.fromGift = true
        this.router.navigate(['/order-box/complete'], { state: { upgradeBox: this.currentOrder } });
      } else {
        this.fromGift = false
        this.convertNewOrder()
        this.showSubLayout = true
      }
    } else if (this.transferToPlan > 1) {
      this.convertNewOrder()
      this.showPlanLayout = true
      var description = '';
      var firstPaymentAmount = ''
      if (this.transferToPlan == 3) {
        firstPaymentAmount = '' + (this.box.getBoxById(this.currentOrder.boxId).bundle3m / 100)
      } else if (this.transferToPlan == 12) {
        firstPaymentAmount = '' + (this.box.getBoxById(this.currentOrder.boxId).bundle12m / 100)
      }
      this.paymentDescription = await this.translate.get('checkout.checkout_payment_oneoff_description').toPromise();
      description = this.paymentDescription + this.firebaseOrder.orderReference
      var paymentData
      paymentData = {
        uid: this.app.getUser().uid,
        amount: firstPaymentAmount,
        orderRef: this.firebaseOrder.orderReference,
        orderId: this.firebaseOrder.orderId,
        description: description,
        isTransfer: true
      }

      // Add history data
      const orderHistoryItem = {
        boxId: this.currentOrder.boxId,
        boxName: this.currentOrder.boxName,
        checkoutSummary: this.currentOrder.checkoutSummary,
        deliveryDaysApart: this.currentOrder.deliveryDaysApart,
        orderCreated: this.currentOrder.orderCreated,
        orderId: this.currentOrder.orderId,
        orderReference: this.currentOrder.orderReference,
        paymentPlan: this.currentOrder.paymentPlan,
        productQuantity: this.currentOrder.productQuantity,
        products: this.currentOrder.products,
        shippingAddress: this.currentOrder.shippingAddress,
        subscriptionDetails: this.currentOrder.subscriptionDetails,
        userId: this.currentOrder.userId
      }
      var historyItem = {
        docId: this.datepipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_upgrade_' + this.transferToPlan,
        changeType: 'Subscription upgraded.',
        changes: {
          before: {
            plan: 'Monthly'
          },
          after: {
            plan: this.transferToPlan + ' Month Plan'
          }
        },
        dateChanged: new Date(),
        order: orderHistoryItem
      }
      paymentData.orderHistory = historyItem
      paymentData.subscriptionId = this.currentOrder.subscriptionDetails.subscriptionId

      this.prepareForPayment = true
      this.interval = setInterval(() => {
        this.progress = this.progress + 1
      },100)
      setTimeout(() => {
        if (this.prepareForPayment) {
          clearInterval(this.interval);
          this.prepareForPayment = false
          this.saveUpgrade(paymentData)
        }
      }, 10000)
    } else {
      //this.router.navigate(['/'])
    }
  }

  async convertNewOrder() {
    const nextDeliveryDate = new Date(this.currentOrder.startDeliveryDate)
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + this.currentOrder.deliveryDaysApart)

    this.firebaseOrder = new FirebaseOrder(
      this.transferToSub ? this.fbService.generateId(false) : this.currentOrder.orderId,
      this.transferToSub ? this.fbService.generateId(true) : this.currentOrder.orderReference,
      this.transferToSub ? this.box.box3.id : this.currentOrder.boxId,
      this.transferToSub ? this.box.box3.name : this.currentOrder.boxName,
      this.currentOrder.products,
      this.currentOrder.productQuantity,
      this.transferToPlan > 1 ? this.currentOrder.nextDeliveryDate.toDate() : null,
      this.currentOrder.deliveryDaysApart > 0 ? this.currentOrder.deliveryDaysApart : 0,
      this.transferToPlan > 1 ? null : this.currentOrder.checkoutSummary,
      this.currentOrder.shippingAddress,
      this.transferToPlan > 1 ? this.transferToPlan : 1,
      {
        isPaid: false,
        paymentMethod: null,
      },
      {
        subscriptionId: null,
        subscriptionStatus: 'pending',
      },
      this.app.getUser().uid,
      new Date(),
      this.transferToSub ? nextDeliveryDate : null,
      this.transferToPlan > 1 ? this.deliveryDatesMap() : null,
      nextDeliveryDate,
      null
    );
    this.firebaseOrder = await this.helper.getSummary(this.firebaseOrder)

    // Create deliveries
    this.firebaseOrderDeliveries = [];
    if (this.firebaseOrder.paymentPlan == 1 || this.firebaseOrder.paymentPlan == 0) {
      let loopAmount = this.currentOrder.paymentPlan != 0 ? 2 : 1
      for (let i = 0; i < loopAmount; i++) {
        var deliveryDate = i == 0 ? this.firebaseOrder.startDeliveryDate : this.firebaseOrder.nextDeliveryDate
        this.firebaseOrderDeliveries.push(this.helper.toDeliveryItem(deliveryDate, this.firebaseOrder.paymentDetails))
      }
    } else if (this.firebaseOrder.paymentPlan != 1) {
      for (let i = 0; i < this.firebaseOrder.deliveryDates.length; i++) {
        var deliveryDate = this.firebaseOrder.deliveryDates[i]
        this.firebaseOrderDeliveries.push(this.helper.toDeliveryItem(deliveryDate, this.firebaseOrder.paymentDetails))
      }
    }
  }

  getUserData(uid: string) {
    this.userData$ = this.userService.getUserInfoRefByUID(uid).valueChanges();
    this.app.addToSubscriptions(this.userData$.subscribe((data: UserData) => {
      this.currentUserData = data;
      if (this.currentUserData == null) {

      } else {
        this.selectedMandate = this.currentUserData.mandates[0]
        //console.log(this.currentUserData)
      }
    }));
  }

  setCyclus() {
    if (isDevMode()) {
      console.log(this.firebaseOrder)
    }
    const dialogRef = this.dialog.open(DeliveryDaysDialog, {
      width: '450px',
      data: {
        order: this.firebaseOrder,
        days: this.firebaseOrder.deliveryDaysApart,
        weeks: this.numberOfWeeks
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed', result)
      if (result != undefined) {
        if (result.weeks != null) {
          this.numberOfWeeks = result.weeks
          this.firebaseOrder.deliveryDaysApart = result.weeks * 7
        } else {
          this.numberOfWeeks = null
          this.firebaseOrder.deliveryDaysApart = result.days
        }
      }
    });
  }

  deliveryDatesMap() {
    var deliveryDays = [];
    var daysApart = this.currentOrder.deliveryDaysApart;
    var loopAmount = 0;
    if (this.transferToPlan == 3) {
      loopAmount = 4
    } else if (this.transferToPlan == 12) {
      loopAmount = 13
    }

    for (let i = 0; i < loopAmount; i++) {
      var deliveryDate = new Date(this.currentOrder.nextDeliveryDate.toDate());
      var daysToAdd = daysApart * i;
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
      //console.log(loopAmount, this.order.startDeliveryDate, daysToAdd, daysApart, deliveryDate)
      deliveryDays.push(deliveryDate);
    }

    return deliveryDays;
  }

  setFormGroup(formGroup) {
    this.formGroup = formGroup
  }

  finish() {
    console.log(this.formGroup, this.formGroup.invalid, this.shippingAddress)
  }

  pay() {
    console.log(this.selectedMandate)
  }

  cancelUpgrade() {
    clearInterval(this.interval);
    this.prepareForPayment = false
    this.router.navigate(['/'])
  }

  async saveUpgrade(data: any) {
    console.log(data, this.firebaseOrder)

    // Delete old subscription in Mollie
    const cancelSubscription = this.fun.httpsCallable('cancelSubscriptionCall');
    //await cancelSubscription(data).subscribe();

    // Continue with regular payment procedure
  }
}