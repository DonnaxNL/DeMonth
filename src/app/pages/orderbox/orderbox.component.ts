import { Component, OnInit, Inject, HostListener, isDevMode } from '@angular/core';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { MyErrorStateMatcher } from 'src/app/shared/errormatcher';
import { Order } from 'src/app/models/order';
import { CookieOrder } from 'src/app/models/cookie.order';
import { BoxType } from 'src/app/models/box';
import { Moment } from 'moment';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { Observable } from 'rxjs';
import { firestore, User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { CheckCustomer } from 'src/app/check-customer.test';
import { MatBottomSheet, MatBottomSheetRef, MAT_BOTTOM_SHEET_DATA } from '@angular/material/bottom-sheet';
import { Boxes } from 'src/app/constants/boxes';
import { CustomAnimations } from 'src/app/shared/animations';
import { AppComponent } from 'src/app/app.component';
import { Helper } from 'src/app/shared/helper';
import { Products } from 'src/app/constants/products';
import { Location } from '@angular/common';
import { OrderService } from 'src/app/services/firebase/order-service';
import { FirestoreService } from 'src/app/services/firebase-service';
import { AbTestsService } from 'angular-ab-tests';
import { PromotionService } from 'src/app/services/promotion.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-orderbox',
  templateUrl: './orderbox.component.html',
  styleUrls: ['./orderbox.component.scss'],
  animations: CustomAnimations
})
export class OrderboxComponent implements OnInit {
  user$: Observable<User | null>;
  order$: Observable<any | null>;
  promotion;
  promotionDiscount = 0;
  promotionMultiplier = 0;
  user: User;
  referralClaimBox;
  freeBoxClaimed = false;
  trialBox = false;
  upgradeBox;
  isCustomer = true;
  isMobile = false;
  sectionSelected = '';
  sectionSelectedIndex = 0;
  openDialog = false;

  sub: any;
  formGroup: FormGroup;
  matcher = new MyErrorStateMatcher();
  boxType = this.boxes.box1;
  order = new Order("", "", null, null, 0, null, 0, 0);
  minDate = new Date();
  noDays = Array();
  noWeeks = Array();
  numberOfDays = 28;
  numberOfWeeks = null;
  extraShown = false;
  customDays = false;
  selectDeliveryPlaceholder = '';

  recovered = false;
  recoveredProducts = {
    removeBuds: false,
    tampons: null,
    pads: null,
  };
  maxAmountProducts;
  returnItem;
  returnOrderId;

  constructor(
    private title: PageDetailService,
    private translate: TranslateService,
    private router: Router,
    private dataRoute: ActivatedRoute,
    private location: Location,
    private _formBuilder: FormBuilder,
    private abTestsService: AbTestsService,
    private helper: Helper,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private cookieService: CookieService,
    private analytics: AnalyticsService,
    private auth: AngularFireAuth,
    private boxes: Boxes,
    private product: Products,
    private app: AppComponent,
    private fbService: FirestoreService,
    private orderService: OrderService,
    private promotionService: PromotionService,
    private checkCustomer: CheckCustomer,
    private bottomSheet: MatBottomSheet) {
    this.onResize()
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    const screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 1000
  }

  nonDeliveryFilter = (d: Moment): boolean => {
    const day = d.day()
    // Prevent Sunday and Monday from being selected.
    return day !== 0 && day !== 1;
  }

  async ngOnInit() {
    this.title.setDetails("order_box");
    this.selectDeliveryPlaceholder = await this.translate.get('order_box.delivery_delivery_date_placeholder').toPromise();
    this.user$ = this.auth.user;
    this.user$.subscribe((user: User) => {
      this.user = user
      this.analytics.trackPage('Order Box', user)
      this.isCustomer = this.checkCustomer.isRealCustomer(user)
      this.returnFlow()
    });
    for (let i = 14; i < 71; i++) {
      this.noDays.push(i);
    }
    for (let i = 2; i < 11; i++) {
      this.noWeeks.push(i);
    }
    this.minDate.setDate(new Date().getDate() + 5);
    this.formGroup = this._formBuilder.group({
      selectedDate: new FormControl('', [Validators.required]),
      selectedDays: new FormControl('', [Validators.min(14), Validators.max(365)]),
      selectedWeeks: new FormControl('', [Validators.min(2), Validators.max(10)])
    });
    if (this.cookieService.get('referral')) {
      console.log(this.cookieService.get('referral'), this.app.getReferral())
      //this.referralDiscountItem = this.app.getReferral()
    } else if (this.app.getReferral()) {
      console.log(this.cookieService.get('referral'), this.app.getReferral())
      this.cookieService.set('referral', JSON.stringify(this.app.getReferral()), 1)
      //this.referralDiscountItem = this.app.getReferral()
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.sub = this.route
        .data
        .subscribe(async (navItem) => {
          if (navItem) {
            switch (navItem.box) {
              case "Basic":
                if (navItem.recover && this.cookieService.get('temp-order')) {
                  this.recoverOrder(true)
                } else {
                  this.setSelectedBox(this.boxes.box1)
                }
                break;
              case "Plus":
                if (navItem.recover && this.cookieService.get('temp-order')) {
                  this.recoverOrder(true)
                } else {
                  this.setSelectedBox(this.boxes.box2)
                }
                break;
              case "Complete":
                if (navItem.recover && this.cookieService.get('temp-order')) {
                  this.recoverOrder(true)
                } else {
                  this.setSelectedBox(this.boxes.box3)
                }
                break;
              case "Trial":
                this.trialBox = true
                this.selectDeliveryPlaceholder = await this.translate.get('order_box.delivery_delivery_date_error').toPromise();
                if (navItem.recover && this.cookieService.get('temp-order')) {
                  this.recoverOrder(true)
                } else {
                  this.setSelectedBox(this.boxes.box13)
                }
                break;
              case "Continue":
                if (!this.cookieService.get('temp-order')) {
                  this.sectionSelected = 'pick-box'
                  this.sectionSelectedIndex = 0
                } else {
                  this.recoverOrder(true)
                }
                break;
              case "Return":
                this.returnOrderId = this.dataRoute.snapshot.queryParamMap.get('orderId')
                console.log('orderId:', this.returnOrderId)
                break;
              default:
                this.sectionSelected = 'pick-box'
                this.sectionSelectedIndex = 0
                break;
            }
          } else {
            this.sectionSelected = 'pick-box'
            this.sectionSelectedIndex = 0
          }
        });
    }, 100);
  }

  returnFlow() {
    console.log(this.order, this.returnItem)
    if (this.returnOrderId) {
      this.analytics.trackPage('Order Box - Retarget email', null)
      this.order$ = this.orderService.getOrderByID(this.user != null ? this.user.uid : null, this.returnOrderId).valueChanges();
      this.order$.subscribe((data: any) => {
        if (data) {
          this.returnItem = this.promotionService.getReturnPromo(data)
          console.log('order:', data, this.returnItem)
          this.recoverOrder(false, data)
        } else {
          this.router.navigate(['/']);
        }
      })
    }
  }

  setSelectedBox(box: BoxType) {
    this.referralClaimBox = history.state.referralBox
    this.upgradeBox = history.state.upgradeBox
    if (this.referralClaimBox) {
      this.freeBoxClaimed = true
      this.setReferralBoxDetails()
    } else if (this.upgradeBox) {
      console.log('box', this.upgradeBox)
      this.setUpgradeBoxDetails()
    }
    this.boxType = box
    this.order.boxId = this.boxType.id
    this.order.boxName = this.boxType.name
    this.order.orderId = this.fbService.generateId(false)
    this.order.orderRef = this.fbService.generateId(true)
    //console.log(this.order)
    this.goToPage(true, 0)
  }

  setReferralBoxDetails() {
    if (this.referralClaimBox.currentSubscription.products) {
      this.recoveredProducts = this.referralClaimBox.currentSubscription.products
      this.recovered = true
      this.order.products = this.referralClaimBox.currentSubscription.products
      this.order.productQuantity = this.referralClaimBox.currentSubscription.productsQuantity
    }
    // Convert to Timestamp if not
    if (this.referralClaimBox.currentSubscription.deliveryDate != null &&
      !(this.referralClaimBox.currentSubscription.deliveryDate instanceof firestore.Timestamp)) {
      this.order.startDeliveryDate = new firestore.Timestamp(this.referralClaimBox.currentSubscription.deliveryDate.seconds, this.referralClaimBox.currentSubscription.deliveryDate.nanoseconds).toDate()
      console.log('converted', this.order.startDeliveryDate)
    }
  }

  setUpgradeBoxDetails() {
    if (this.upgradeBox.products) {
      this.recoveredProducts = this.upgradeBox.products
      this.recovered = true
      this.order.products = this.upgradeBox.products
      this.order.productQuantity = this.upgradeBox.productQuantity
    }
  }

  onSelectChanged(type: string, event) {
    //console.log(type, event, cycle)
    if (type == 'weeks') {
      if (event != undefined) {
        var cycle = event * 7
        this.order.deliveryDaysApart = cycle
        this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365)])
        this.numberOfDays = null
      }
    } else if (type == 'days') {
      if (event != undefined) {
        this.order.deliveryDaysApart = event
        this.numberOfWeeks = null
        this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365), Validators.required])
      } else if (!this.numberOfDays && !this.numberOfWeeks) {
        this.order.deliveryDaysApart = 0
      }
    }
  }

  toggleCustomDays() {
    if (this.numberOfDays) {
      this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365), Validators.required])
    }
    this.customDays = true
  }

  updateProducts(products, amount?, extraAmount?) {
    //console.log('update on order-box', products, amount)
    if (amount != null && extraAmount != null) {
      this.order.productQuantity = amount + extraAmount
    }
    this.order.products = products
    this.recoveredProducts = products
    this.recovered = true
  }

  goToPage(forward: boolean, currentPageIndex: number, skip?: boolean) {
    let pages = []
    var pageIndex = forward ? currentPageIndex + 1 : currentPageIndex - 1
    let abVersion = ''

    if (this.order.boxId == 'box_01') {
      pages = ['pick-box', 'personalise', 'delivery', 'checkout']
    } else {
      abVersion = this.abTestsService.getVersion('orderOrder')
      if (abVersion == 'productsFirst') {
        pages = ['pick-box', 'personalise', 'preferences', 'delivery', 'checkout']
      } else if (abVersion == 'preferencesFirst') {
        pages = ['pick-box', 'preferences', 'personalise', 'delivery', 'checkout']
      }
    }

    if (pages[currentPageIndex] == 'personalise') {
      if (this.order.productQuantity < 10 && !skip && forward) {
        this.openDialog = true
        const dialogRef = this.dialog.open(OrderBoxDialog, {
          width: '600px',
          data: {
            amountSelected: this.order.productQuantity,
            maxAmount: this.order.boxId == 'box_01' ? this.product.maxAmountBasic : this.product.tamponsMaxAmount
          }
        });

        dialogRef.afterClosed().subscribe(result => {
          this.openDialog = false
          if (result != null) {
            this.goToPage(true, this.sectionSelectedIndex, true)
          }
        })
        return;
      }
    }

    switch (pages[pageIndex]) {
      case 'pick-box':
        this.analytics.trackPage('Order Box - Box picking [' + abVersion + ']', this.user)
        this.router.navigateByUrl('/order-box')
        break;
      case 'personalise':
        this.sectionSelected = pages[pageIndex];
        this.sectionSelectedIndex = pageIndex;
        this.analytics.trackPage('Order Box - ' + this.boxType.name + ' - Product picking', this.user)
        if (!forward) {
          this.location.go('/order-box/' + this.boxType.url)
        }
        break;
      case 'preferences':
        //console.log(this.order)
        if (!this.order.products) {
          this.order.products = {
            preferences: {
              chocolate: ['no_pref'],
              healthbar: ['none'],
              granola: ['none'],
              skinType: 'no_pref'
            }
          }
        } else if (!this.order.products.preferences) {
          this.order.products.preferences = {
            chocolate: ['no_pref'],
            healthbar: ['none'],
            granola: ['none'],
            skinType: 'no_pref'
          }
        }

        this.recoveredProducts = this.order.products
        this.recovered = true
        //console.log(this.order)

        this.sectionSelected = pages[pageIndex];
        this.sectionSelectedIndex = pageIndex;
        this.analytics.trackPage('Order Box - ' + this.boxType.name + ' - Preferences picking', this.user)

        if (!forward) {
          this.location.go('/order-box/' + this.boxType.url)
        }
        break;
      case 'delivery':
        this.location.go('/order-box/' + this.boxType.url + '/delivery')
        this.analytics.trackPage('Order Box - ' + this.boxType.name + ' - Delivery details', this.user)
        this.sectionSelected = pages[pageIndex];
        this.sectionSelectedIndex = pageIndex
        break;
      case 'checkout': {
        if (this.formGroup.valid) {
          var paymentPlan = 1
          if (this.freeBoxClaimed || this.trialBox) {
            paymentPlan = 0
          }
          this.order.paymentPlan = paymentPlan
          this.getSummary()
        } else {
          this.helper.validateAllFormFields(this.formGroup)
        }
        break;
      }
      default:
        break;
    }
    window.scrollTo(0, 0)

    console.log(this.trialBox)
  }

  openBottomSheet(): void {
    console.log(this.order)
    this.bottomSheet.open(BottomSheetOverview, {
      panelClass: 'bottom-sheet-radius',
      data: {
        order: this.order,
        cycleWeeks: this.numberOfWeeks,
        freeBoxClaimed: this.freeBoxClaimed
      }
    });
  }

  async recoverOrder(cookieRecover: boolean, order?) {
    if (!this.returnItem) {
      this.returnItem = history.state.return
      console.log('Return: ', this.returnItem)
    }
    var order
    if (cookieRecover) {
      order = JSON.parse(this.cookieService.get('temp-order'))
    } else {
      order = {
        orderId: order.orderId,
        orderRef: order.orderReference,
        boxId: order.boxId,
        deliveryDate: order.startDeliveryDate.toDate(),
        deliveryDaysApart: order.deliveryDaysApart,
        paymentPlan: order.paymentPlan,
        productQuantity: order.productQuantity,
        products: order.products
      }
    }
    this.order = await this.helper.getSummary(order)
    // this.order.startDeliveryDate = order.deliveryDate
    // this.order.deliveryDaysApart = order.deliveryDaysApart
    // this.order.paymentPlan = order.paymentPlan
    // this.order.productQuantity = order.productQuantity
    // this.order.products = order.products
    this.recoveredProducts = this.order.products
    // this.order.orderId = order.orderId
    // this.order.orderRef = order.orderRef
    this.recovered = true
    this.boxType = this.boxes.getBoxById(order.boxId)
    var page = this.dataRoute.snapshot.paramMap.get('page')
    //console.log(this.order, order, this.boxType, page)
    if (page == 'delivery') {
      this.location.go('/order-box/' + this.boxType.url + '/' + page)
      this.sectionSelected = page
      this.sectionSelectedIndex = 3
    } else if (page == 'payment-plan') {
      this.location.go('/order-box/' + this.boxType.url + '/' + page)
      this.sectionSelected = page
      this.sectionSelectedIndex = 4
    } else {
      this.getSummary()
    }
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  datePickerEvent(type: string, event: MatDatepickerInputEvent<Date>) {
    if (event.value < this.minDate) {
      console.log('In the past: ' + event.value);
      this.order.startDeliveryDate = this.minDate;
    }
  }

  getSummary() {
    //this.analytics.trackPage('Order Box - ' + this.boxType.name + ' - Summary', this.user)
    //this.location.go('/order-box/' + this.boxType.name.toLowerCase() + '/summary')

    var checkoutSummary
    checkoutSummary = {
      subTotal: 0,
      shippingPrice: 0,
      taxPrice: 0,
      checkoutPrice: 0
    }
    if (this.boxType.id == 'box_01') {
      checkoutSummary.subTotal = this.boxType.price
      var baseShipping = this.product.tamponsShippingPrice // Base
      if (this.order.products.pads == null) {
        checkoutSummary.shippingPrice = baseShipping
      } else {
        var maxiRegSelected = false
        var maxiSuperSelected = false
        for (let i = 0; i < this.order.products.pads.length; i++) {
          if (this.order.products.pads[i].id == 'PMR') {
            maxiRegSelected = true
          }
          if (this.order.products.pads[i].id == 'PMS') {
            maxiSuperSelected = true
          }
        }
        if (maxiSuperSelected) {
          checkoutSummary.shippingPrice = this.product.padsMaxiSuperShippingPrice
        } else if (maxiRegSelected) {
          checkoutSummary.shippingPrice = this.product.padsMaxiRegularShippingPrice
        } else {
          checkoutSummary.shippingPrice = this.product.combiShippingPrice
        }
      }
      if (this.order.paymentPlan == 1) {
        checkoutSummary.subTotal = this.boxType.price
        checkoutSummary.checkoutPrice = checkoutSummary.shippingPrice + this.boxType.price
      } else if (this.order.paymentPlan == 3) {
        checkoutSummary.subTotal = this.boxType.bundle3m
        checkoutSummary.checkoutPrice = (checkoutSummary.shippingPrice * 3) + this.boxType.bundle3m
      } else if (this.order.paymentPlan == 12) {
        checkoutSummary.subTotal = this.boxType.bundle12m
        checkoutSummary.checkoutPrice = (checkoutSummary.shippingPrice * 12) + this.boxType.bundle12m
      }
    } else {
      if (this.order.paymentPlan == 1) {
        checkoutSummary.subTotal = this.boxType.price
        checkoutSummary.checkoutPrice = this.boxType.price
      } else if (this.order.paymentPlan == 3) {
        checkoutSummary.subTotal = this.boxType.bundle3m
        checkoutSummary.checkoutPrice = this.boxType.bundle3m
      } else if (this.order.paymentPlan == 12) {
        checkoutSummary.subTotal = this.boxType.bundle12m
        checkoutSummary.checkoutPrice = this.boxType.bundle12m
      } else if (this.order.paymentPlan == 0) {
        checkoutSummary.subTotal = this.boxType.price
        if (this.order.boxId == 'box_13') {
          checkoutSummary.checkoutPrice = this.boxType.price
        }
        if (this.referralClaimBox) {
          checkoutSummary.referral = {
            name: this.referralClaimBox.name,
            uid: this.referralClaimBox.uid
          }
        }
      }
    }
    if (this.order.products.extraProducts) {
      checkoutSummary.checkoutPrice = checkoutSummary.checkoutPrice + (this.order.products.extraProducts.extraPrice * this.order.paymentPlan)
    }
    checkoutSummary.taxPrice = Math.round(checkoutSummary.checkoutPrice - (checkoutSummary.checkoutPrice * (100 / 121)));

    this.order.boxId = this.boxType.id;
    this.order.boxName = this.boxType.name;
    this.order.checkoutSummary = checkoutSummary;
    //this.order.productQuantity = this.amountProductsSelected;
    var correctDate = new Date(this.order.startDeliveryDate)
    correctDate.setHours(correctDate.getHours() + 2)
    this.order.startDeliveryDate = correctDate

    // if (this.referralDiscountItem) {
    //   this.referral = this.referralService.getReferral(this.order, this.referralDiscountItem)
    // }

    //console.log(this.order)
    if (!this.freeBoxClaimed) {
      var cookieOrder = new CookieOrder(
        this.order.boxId,
        this.order.startDeliveryDate,
        this.order.deliveryDaysApart,
        this.order.paymentPlan,
        this.order.productQuantity,
        this.order.products,
        this.order.orderId,
        this.order.orderRef
      )
      this.cookieService.set('temp-order', JSON.stringify(cookieOrder), 30);
      //console.log('cookie', cookieOrder)
    }
    //this.sectionSelected = 'review'
    //this.sectionSelectedIndex = 5
    this.checkout()
  }

  checkout() {
    if (isDevMode()) {
      console.log(this.order, this.returnItem, this.referralClaimBox)
    }
    this.router.navigate(['/checkout'], {
      state: {
        order: this.order,
        returnItem: this.returnItem,
        referralBox: this.referralClaimBox
      }
    });
  }
}

export interface DialogData {
  amountSelected: number;
  maxAmount: number;
}

@Component({
  selector: 'orderbox-dialog',
  templateUrl: 'orderbox-dialog.html',
})
export class OrderBoxDialog {

  constructor(
    public dialogRef: MatDialogRef<OrderBoxDialog>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'bottom-sheet-overview',
  templateUrl: 'bottom-sheet-overview.html',
})
export class BottomSheetOverview {
  constructor(
    @Inject(MAT_BOTTOM_SHEET_DATA) public data: any,
    private _bottomSheetRef: MatBottomSheetRef<BottomSheetOverview>
  ) { }
}