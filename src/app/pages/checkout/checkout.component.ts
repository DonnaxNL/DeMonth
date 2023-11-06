import { Component, OnInit, HostListener, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { Order } from 'src/app/models/order';
import { AngularFireAuth } from '@angular/fire/auth';
import { User } from 'firebase';
import { Observable, Subscription } from 'rxjs';
import { UserData } from 'src/app/models/userdata';
import { FirestoreService } from 'src/app/services/firebase-service';
import { MyErrorStateMatcher } from 'src/app/shared/errormatcher';
import { UserAddress } from 'src/app/models/address';
import { FirebaseOrder } from 'src/app/models/firebase.order';
import { AngularFireFunctions } from '@angular/fire/functions';
import { CookieService } from 'ngx-cookie-service';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { AngularFirestore } from '@angular/fire/firestore';
import { DatePipe } from '@angular/common';
import { OrderService } from 'src/app/services/firebase/order-service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Boxes } from 'src/app/constants/boxes';
import { UserService } from 'src/app/services/firebase/user-service';
import { AppComponent } from 'src/app/app.component';
import { SummaryDialog } from './summary-dialog/summary.component';
import { CouponService } from 'src/app/services/coupon.service';
import { PromotionService } from 'src/app/services/promotion.service';
import { FormGroup } from '@angular/forms';
import { Helper } from 'src/app/shared/helper';
import { ReferralService } from 'src/app/services/referral.service';
import { IdealIssuers } from 'src/app/constants/ideal-issuers';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  subscriptions: Subscription[] = [];
  currentUser: User;
  currentUserData: UserData;
  user$: Observable<User | null>;
  userData$: Observable<UserData | null>;
  coupons$: Observable<any | null>;
  promotions$: Observable<any | null>;
  coupons = [];
  freezeCoupon = false
  issuers
  order: Order;
  firebaseOrder: FirebaseOrder;
  firebaseOrderDeliveries;
  minDate = new Date(1950);
  maxDate = new Date();
  matcher = new MyErrorStateMatcher();
  orderId: string;
  orderRef: string;
  shippingMultiplier = 1;
  couponCode = "";
  couponSuccess;
  couponError;
  coupon;
  sessionId = "";
  paymentDescription;
  promotion;
  referralClaimBox;
  referralDiscountItem;
  referral;
  returnItem;

  // Select
  deliveryAddressSelection = 'currentAddress';
  deliveryOptions: string[][] = [['currentAddress', 'Deliver to billing address'], ['differentAddress', 'Deliver to a different address']];
  paymentOptionSelection = 'ideal';
  idealOptionSelection;
  paymentOptions: string[][] = [['ideal', 'iDEAL'], ['bancontact', 'Bancontact'], ['cards', 'Credit Card'], ['paypal', 'PayPal']];
  paymentOptionOrder = [0, 1, 2];

  // Layout triggers
  showOverview = false;
  dataLoaded = false;
  expanded = false;
  loginNoAddress = false;
  editMode = false;
  editAddMode = false;
  saveForLaterChecked = false;
  addressDefaultChecked = false;
  mainFormOK = false;
  addFormOK = true;
  bankSelected = false;
  showError = false;
  finishingOrder = false;
  isMobile = false;
  freeBoxClaimed = false;

  // Form Control - new user
  formGroup: FormGroup;
  address = new UserAddress("Test", "Name", "Randomstreet", "1", "1111AA", "Amsterdam", "nl");

  // Form Control - additional address
  addFormGroup: FormGroup;
  additionalAddress = new UserAddress("", "", "", "", "", "", "nl");

  giftAddress = new UserAddress("", "", "", "", "", "", "nl");
  giftFriendEmail = '';

  constructor(
    private title: PageDetailService,
    private router: Router,
    private helper: Helper,
    public dialog: MatDialog,
    private snackBar: MatSnackBar,
    public afs: AngularFirestore,
    public auth: AngularFireAuth,
    public fun: AngularFireFunctions,
    public fbService: FirestoreService,
    public userService: UserService,
    public orderService: OrderService,
    public couponService: CouponService,
    public boxes: Boxes,
    public idealIssuers: IdealIssuers,
    private app: AppComponent,
    private cookieService: CookieService,
    private analytics: AnalyticsService,
    public translate: TranslateService,
    public referralService: ReferralService,
    public promotionService: PromotionService,
    public datepipe: DatePipe) {
    this.onResize()
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    const screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 768
  }

  async ngOnInit() {
    this.title.setDetails("checkout")
    this.getIdealIssuers()
    this.setSelectTranslations()
    this.app.setProgress(100)
    const country = this.cookieService.get('country');
    if (country && country == 'BE') {
      this.address.country = 'be'
      this.paymentOptionSelection = 'bancontact'
      this.paymentOptionOrder = [1, 0, 2]
    } else if (country && country == 'UK' || country && country == 'GB') {
      this.address.country = 'uk'
      this.paymentOptionSelection = 'cards'
      this.paymentOptionOrder = [2, 0, 1]
    }
    this.user$ = this.auth.user;
    this.currentUserData = new UserData(null, "Test", "Name", this.address, "fakeemail@fake.com", new Date());
    this.loginNoAddress = false;
    this.editMode = true;
    this.dataLoaded = true;
    this.order = history.state != null ? history.state.order : null
    this.referralClaimBox = history.state != null ? history.state.referralBox : null
    this.freeBoxClaimed = this.referralClaimBox ? true : false
    //console.log('claimed:', this.freeBoxClaimed, this.referralClaimBox)
    if (!this.order) {
      var cookieItem = this.cookieService.get('temp-order')
      if (cookieItem) {
        var order = JSON.parse(this.cookieService.get('temp-order'))
        this.order = await this.helper.getSummary(order)
        // var boxName = this.boxes.getBoxById(order.boxId).url
        // this.router.navigate(['/order-box/' + boxName + '/delivery']);
        if (this.order.orderId && this.order.orderRef) {
          this.orderId = this.order.orderId
          this.orderRef = this.order.orderRef
        }
      } else {
        this.router.navigate(['/']);
      }
    } else {
      this.returnItem = history.state.returnItem
      if (isDevMode()) {
        console.log(this.returnItem)
      }
      if (!this.returnItem && this.order.boxId != 'box_13') {
        this.checkReferralPromo()
      } else if (this.returnItem) {
        this.promotion = this.returnItem
        this.order.checkoutSummary.promo = {
          checkoutDescription: this.promotion.checkoutDescription,
          checkoutPrice: Math.round(this.order.checkoutSummary.checkoutPrice - this.promotion.price),
          discount: this.promotion.discount,
          id: this.promotion.id,
          price: this.promotion.price
        }
      } else if (this.order.boxId == 'box_13' && this.deliveryOptions.length == 2) {
        var text = await this.translate.get('checkout.checkout_delivery_gift').toPromise();
        if (this.deliveryOptions.length == 2) {
          this.deliveryOptions.push(['giftAddress', text])
        }
      }
      this.shippingMultiplier = this.order.paymentPlan
      //console.log('coupon:', history.state.coupon)
      this.couponCode = history.state.coupon
      if (this.couponCode && this.couponCode != '') {
        this.checkCoupon(true)
      }
      if (this.order.orderId && this.order.orderRef) {
        this.orderId = this.order.orderId
        this.orderRef = this.order.orderRef
      }
    }
  }

  async setSelectTranslations() {
    this.deliveryOptions[0][1] = await this.translate.get('checkout.checkout_delivery_billing').toPromise();
    this.deliveryOptions[1][1] = await this.translate.get('checkout.checkout_delivery_different').toPromise();

    // Listen for real-time language change
    this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
      this.deliveryOptions[0][1] = await this.translate.get('checkout.checkout_delivery_billing').toPromise();
      this.deliveryOptions[1][1] = await this.translate.get('checkout.checkout_delivery_different').toPromise();
      if (this.deliveryOptions[2]) {
        this.deliveryOptions[2][1] = await this.translate.get('checkout.checkout_delivery_gift').toPromise();
      }
    });
  }

  getIdealIssuers() {
    this.issuers = this.idealIssuers.all
    this.issuers.push(this.idealIssuers.default)
  }

  redirect(event) {
    this.currentUser = event
    this.currentUserData = new UserData(this.currentUser.uid, "", "", this.address, this.currentUser.email, new Date());
    this.currentUserData.language = this.cookieService.get('language') != null ? this.cookieService.get('language') : 'nl'
  }

  getUserData(uid: string) {
    this.userData$ = this.userService.getUserInfoRefByUID(uid).valueChanges();
    this.subscriptions.push(this.userData$.subscribe(async (data: UserData) => {
      this.currentUserData = data;
      //console.log(this.currentUserData, this.referralClaimBox, this.referralItem)
      this.fillFirebaseOrder()
      if (!this.returnItem && !this.freeBoxClaimed) {
        if (this.order.paymentPlan != 0) {
          //this.planReturnTask()
        }
      }
      if (this.currentUserData == null) {
        this.currentUserData = new UserData(this.currentUser.uid, "", "", this.address, this.currentUser.email, new Date());
        this.currentUserData.language = this.cookieService.get('language') != null ? this.cookieService.get('language') : 'nl'
        this.loginNoAddress = true;
        this.editMode = false;
        this.dataLoaded = true;
      } else {
        this.currentUserData.language = this.cookieService.get('language') != null ? this.cookieService.get('language') : 'nl'
        if (this.currentUserData.birthDate != null) {
          this.currentUserData.birthDate = data.birthDate.toDate()
        }
        if (this.order != null) {
          if (!this.freeBoxClaimed) {
            this.calculateShipping()
          }
          if (isDevMode()) {
            console.log(this.order)
          }
        }
        if (!this.returnItem && this.order.boxId != 'box_13') {
          this.checkReferralPromo()
        } else if (this.order.boxId == 'box_13' && this.deliveryOptions.length == 2) {
          var text = await this.translate.get('checkout.checkout_delivery_gift').toPromise();
          if (this.deliveryOptions.length == 2) {
            this.deliveryOptions.push(['giftAddress', text])
          }
        }
        this.loginNoAddress = false;
        this.editMode = true;
        this.dataLoaded = true;
      }
    }));
  }

  setFormGroup(formGroup, type: string) {
    if (type == 'standard') {
      this.formGroup = formGroup
    } else if (type == 'additional' || type == 'gift') {
      this.addFormGroup = formGroup
      //console.log(formGroup.value)
      if (type == 'gift') {
        this.giftFriendEmail = formGroup.value.email
      }
    }
  }

  async saveData() {
    window.scrollTo(0, 0)
    if (this.formGroup != null) {
      //console.log(this.formGroup.value)
      if (!this.formGroup.valid) {
        this.helper.validateAllFormFields(this.formGroup);
      } else if (this.formGroup.valid && this.currentUserData) {
        const userAddress = this.formGroup.value
        this.currentUserData.firstName = userAddress.firstName
        this.currentUserData.lastName = userAddress.lastName
        if (userAddress.lastNamePrefix != undefined) {
          this.currentUserData.lastNamePrefix = userAddress.lastNamePrefix
        }
        if (userAddress.mobileNo) {
          this.currentUserData.mobileNo = userAddress.mobileNo
        }
        if (userAddress.birthDate) {
          this.currentUserData.birthDate = userAddress.birthDate
        }
        this.currentUserData.address = this.helper.userAddressToMap(userAddress, false);
        if (isDevMode()) {
          console.log(this.currentUserData);
        }
        //this.userService.updateUserMainData(this.currentUser, this.currentUserData);
        this.loginNoAddress = false;
        this.editMode = true;
        this.mainFormOK = true;
      }
    } else {
      this.mainFormOK = false;
    }
  }

  async saveAdditionalAddress() {
    if (this.addFormGroup != null) {
      if (!this.addFormGroup.valid) {
        this.helper.validateAllFormFields(this.addFormGroup);
        this.addFormOK = false;
      } else if (this.addFormGroup.valid && this.currentUserData) {
        if (this.deliveryAddressSelection == 'differentAddress') {
          const userAddress = this.helper.userAddressToMap(this.addFormGroup.value, true);
          this.currentUserData.additionalAddresses = userAddress;
          console.log(this.currentUserData);
          if (this.saveForLaterChecked) {
            // Firebase update
            this.userService.updateUserMainData(this.currentUser, this.currentUserData);
          }
        } else if (this.deliveryAddressSelection == 'giftAddress') {
          this.additionalAddress = this.helper.userAddressToMap(this.addFormGroup.value, false) as UserAddress;
        }
        this.addFormOK = true;
      }
    } else {
      this.addFormOK = false;
    }
  }

  onShippingChanged() {
    if (!this.freeBoxClaimed) {
      this.calculateShipping(this.deliveryAddressSelection == 'differentAddress')
    }
  }

  async calculateShipping(isAdditional?) {
    this.shippingMultiplier = this.order.paymentPlan != 0 ? this.order.paymentPlan : 1

    // Calculate special shipping price outside NL
    var country
    if (isAdditional && this.deliveryAddressSelection == 'differentAddress') {
      if (this.currentUserData.additionalAddresses && !this.editAddMode) {
        country = this.currentUserData.additionalAddresses[0].country
      } else {
        country = this.additionalAddress.country
      }
    } else {
      country = this.currentUserData.address.country
    }

    if (country != 'Nederland' && country != 'nl') {
      if (this.order.boxId == 'box_01' && this.order.checkoutSummary.shippingPrice < 800) {
        this.order.checkoutSummary.shippingPrice = this.order.checkoutSummary.shippingPrice + 800
        this.order.checkoutSummary.checkoutPrice = this.order.checkoutSummary.subTotal + (this.order.checkoutSummary.shippingPrice * this.shippingMultiplier)
      } else if (this.order.boxId != 'box_01' && this.order.checkoutSummary.shippingPrice == 0) {
        this.order.checkoutSummary.shippingPrice = this.order.checkoutSummary.shippingPrice + 649
        this.order.checkoutSummary.checkoutPrice = this.order.checkoutSummary.subTotal + (this.order.checkoutSummary.shippingPrice * this.shippingMultiplier)
      }
    } else {
      if (this.order.boxId == 'box_01' && this.order.checkoutSummary.shippingPrice >= 800) {
        this.order.checkoutSummary.shippingPrice = this.order.checkoutSummary.shippingPrice - 800
        this.order.checkoutSummary.checkoutPrice = this.order.checkoutSummary.subTotal + (this.order.checkoutSummary.shippingPrice * this.shippingMultiplier)
      } else if (this.order.boxId != 'box_01' && this.order.checkoutSummary.shippingPrice != 0) {
        this.order.checkoutSummary.shippingPrice = this.order.checkoutSummary.shippingPrice - 649
        this.order.checkoutSummary.checkoutPrice = this.order.checkoutSummary.subTotal + (this.order.checkoutSummary.shippingPrice * this.shippingMultiplier)
      }
    }
    if (this.referral) {
      this.order.checkoutSummary.taxPrice = Math.round(this.referral.checkoutPrice - (this.referral.checkoutPrice * (100 / 121)));
    } else {
      this.order.checkoutSummary.taxPrice = Math.round(this.order.checkoutSummary.checkoutPrice - (this.order.checkoutSummary.checkoutPrice * (100 / 121)));
    }
    if (!this.returnItem && this.order.boxId != 'box_13') {
      this.checkReferralPromo()
    } else if (this.returnItem) {
      this.promotion = this.returnItem
      this.order.checkoutSummary.promo = {
        checkoutDescription: this.promotion.checkoutDescription,
        checkoutPrice: Math.round(this.order.checkoutSummary.checkoutPrice - this.promotion.price),
        discount: this.promotion.discount,
        id: this.promotion.id,
        price: this.promotion.price
      }
    } else if (this.order.boxId == 'box_13' && this.deliveryOptions.length == 2) {
      var text = await this.translate.get('checkout.checkout_delivery_gift').toPromise();
      if (this.deliveryOptions.length == 2) {
        this.deliveryOptions.push(['giftAddress', text])
      }
    }
  }

  editData() {
    window.scrollTo(0, 0)
    this.loginNoAddress = true;
  }

  editAddData() {
    this.editAddMode = true;
    this.saveForLaterChecked = true;
    this.additionalAddress = this.currentUserData.additionalAddresses[0]
  }

  cancelEdit() {
    window.scrollTo(0, 0)
    this.loginNoAddress = false;
  }

  updateFormGroup(type: string, userAddress: UserAddress) {
    if (type == 'additional') {
      this.additionalAddress = userAddress
    }
    this.onShippingChanged()
  }

  deliveryDatesMap() {
    var deliveryDays = [];
    var daysApart = this.order.deliveryDaysApart;
    var loopAmount = 0;
    if (this.order.paymentPlan == 3) {
      loopAmount = 4
    } else if (this.order.paymentPlan == 12) {
      loopAmount = 13
    }

    for (let i = 0; i < loopAmount; i++) {
      var deliveryDate = new Date(this.order.startDeliveryDate);
      var daysToAdd = daysApart * i;
      deliveryDate.setDate(deliveryDate.getDate() + daysToAdd);
      //console.log(loopAmount, this.order.startDeliveryDate, daysToAdd, daysApart, deliveryDate)
      deliveryDays.push(deliveryDate);
    }

    return deliveryDays;
  }

  fillFirebaseOrder() {
    if (this.orderId == null) {
      this.orderId = this.fbService.generateId(false)
    }
    if (this.orderRef == null) {
      this.orderRef = this.fbService.generateId(true)
    }

    const nextDeliveryDate = new Date(this.order.startDeliveryDate)
    nextDeliveryDate.setDate(nextDeliveryDate.getDate() + this.order.deliveryDaysApart)


    if (isDevMode()) {
      console.log('coupon:', this.coupon)
    }
    if (this.coupon && this.couponError == null) {
      this.order.checkoutSummary.coupon = {
        id: this.coupon.id,
        name: this.coupon.name,
        discount: this.coupon.discount,
        checkoutPrice: this.coupon.checkoutPrice
      }
    }

    var address
    var gift = null
    if (this.deliveryAddressSelection == 'differentAddress') {
      address = this.currentUserData != null ? this.currentUserData.additionalAddresses[0] : null
    } else if (this.deliveryAddressSelection == 'giftAddress') {
      address = this.additionalAddress != null ? this.additionalAddress : null
      var lastNamePrefix = ""
      if (this.additionalAddress.lastNamePrefix) {
        lastNamePrefix = this.additionalAddress.lastNamePrefix + " "
      }
      gift = {
        friendName: this.additionalAddress.firstName + " " + lastNamePrefix + this.additionalAddress.lastName,
        friendEmail: this.giftFriendEmail != '' ? this.giftFriendEmail : null
      }
    } else{
      address = this.currentUserData != null ? this.currentUserData.address : null
    }

    this.firebaseOrder = new FirebaseOrder(
      this.orderId,
      this.orderRef,
      this.order.boxId,
      this.order.boxName,
      this.order.products,
      this.order.productQuantity,
      this.order.startDeliveryDate,
      this.order.deliveryDaysApart,
      this.order.checkoutSummary,
      address,
      parseInt(this.order.paymentPlan),
      {
        isPaid: this.freeBoxClaimed,
        paymentMethod: !this.freeBoxClaimed ? this.paymentOptionSelection : null,
      },
      {
        subscriptionId: null,
        subscriptionStatus: this.freeBoxClaimed ? 'active' : 'pending',
      },
      this.currentUser.uid,
      new Date(),
      this.order.paymentPlan == 1 ? nextDeliveryDate : null,
      this.order.paymentPlan > 1 ? this.deliveryDatesMap() : null,
      gift
    );
    //console.log(this.firebaseOrder);

    // Create deliveries
    this.firebaseOrderDeliveries = [];
    if (this.firebaseOrder.paymentPlan == 1 || this.firebaseOrder.paymentPlan == 0) {
      let loopAmount = this.order.paymentPlan != 0 ? 2 : 1
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

  async finishOrder() {
    this.finishingOrder = true
    this.app.setLoading(this.finishingOrder)
    // if (!this.currentUser || !this.currentUserData) {
    //   this.snackBar.open(await this.translate.get('common.toast_authenticate').toPromise(), "OK", {
    //     duration: 5000,
    //   });
    //   this.finishingOrder = false;
    //   return;
    // }

    // if (!this.editMode) {
    //   console.log("Main Forms checked and saved");
    //   this.saveData();
    // }

    // if (this.deliveryAddressSelection == 'differentAddress') {
    //   this.saveAdditionalAddress();
    // } else if (this.deliveryAddressSelection == 'giftAddress') {
    //   console.log(this.addFormGroup)
    //   this.saveAdditionalAddress();
    // }

    if (!this.mainFormOK && !this.addFormOK) {
      this.snackBar.open(await this.translate.get('common.toast_fill_in_all_fields').toPromise(), "OK", {
        duration: 5000,
      });
      this.finishingOrder = false;
      this.app.setLoading(this.finishingOrder)
      return;
    }

    if (!this.freeBoxClaimed && this.paymentOptionSelection == 'ideal' && !this.idealOptionSelection) {
      this.snackBar.open(await this.translate.get('common.toast_select_bank').toPromise(), "OK", {
        duration: 5000,
      });
      this.finishingOrder = false;
      this.app.setLoading(this.finishingOrder)
      return;
    }

    this.freezeCoupon = true
    //this.fillFirebaseOrder()
    if (isDevMode()) {
      console.log(this.firebaseOrder)
    }
    //this.saveOrder(false)
    // if (!this.freeBoxClaimed) {
    //   this.handlePayment()
    // } else {
    //   this.handleReferral()
    // }
    this.finishingOrder = false
    this.app.setLoading(false)
    this.router.navigate(['/order-finished'], { queryParams: { orderRef: "DEMOREF" } });
  }

  goBack() {
    var cookieItem = this.cookieService.get('temp-order')
    var boxName = ''
    if (cookieItem && !this.returnItem) {
      var order = JSON.parse(this.cookieService.get('temp-order'))
      boxName = this.boxes.getBoxById(order.boxId).url
      this.router.navigate(['/order-box/' + boxName + '/delivery']);
    } else if (cookieItem && this.returnItem) {
      var order = JSON.parse(this.cookieService.get('temp-order'))
      boxName = this.boxes.getBoxById(order.boxId).url
      this.router.navigate(['/order-box/' + boxName + '/delivery'], { state: { return: this.returnItem } });
    } else if (this.freeBoxClaimed) {
      boxName = this.boxes.getBoxById(this.order.boxId).url
      this.router.navigate(['/order-box/' + boxName], { state: { referralBox: this.referralClaimBox } });
    } else {
      this.router.navigate(['/order-box']);
    }
  }

  planReturnTask() {
    let firstName = ''
    if (this.currentUserData && this.currentUserData.firstName) {
      firstName = this.currentUserData.firstName
    }
    var taskData = {
      orderId: this.orderId,
      firstName: firstName,
      email: this.currentUser.email,
      language: this.cookieService.get('language') != null ? this.cookieService.get('language') : 'nl',
      orderCreated: this.datepipe.transform(this.firebaseOrder.orderCreated, 'yyyy-MM-dd HH:mm')
    }

    //console.log(taskData)
    const planReturnEmailCall = this.fun.httpsCallable('planReturnEmailCall');
    planReturnEmailCall(taskData).subscribe();
  }

  async checkCoupon(noCheck?) {
    console.log(this.couponCode, noCheck)
    if (this.couponCode && this.couponCode != '') {
      const triggerMap = await this.couponService.checkCoupon(this.couponCode, this.currentUser, this.freezeCoupon, noCheck)
      if (triggerMap) {
        this.couponError = triggerMap.couponError
        this.couponSuccess = triggerMap.couponSuccess
        this.coupon = triggerMap.coupon
        if (this.coupon) {
          this.coupon = this.couponService.calculateCouponDiscount(this.order, this.coupon)
          this.order.checkoutSummary.taxPrice = Math.round(this.coupon.checkoutPrice - (this.coupon.checkoutPrice * (100 / 121)));
        }
      }
    }
  }

  async checkPromotion() {
    this.promotion = await this.promotionService.checkPromotion(null)
    //console.log(this.promotion)
    if (this.promotion) {
      if (this.order && this.promotion.discount != null && this.promotion.checkoutDescription != null) {
        this.order = this.promotionService.getPromotion(this.order, this.promotion)
      }
      //console.log(this.promotion, this.promotionMultiplier)
    }
  }

  async checkReferralPromo() {
    if (this.cookieService.get('referral')) {
      this.referralDiscountItem = JSON.parse(this.cookieService.get('referral'))
    }
    if (this.referralDiscountItem) {
      //console.log(this.currentUserData)
      if (this.currentUserData && this.currentUserData.referral && this.referralDiscountItem.code == this.currentUserData.referral.referralCode) {
        //console.log('Cannot use own referral')
        this.snackBar.open(await this.translate.get('common.toast_error_own_referral').toPromise(), "OK", {
          duration: 5000,
        });
        this.referral = null
        this.cookieService.delete('referral');
      } else {
        this.referral = this.referralService.getReferral(this.order, this.referralDiscountItem)
        this.order.checkoutSummary.referral = this.referral
        this.order.checkoutSummary.taxPrice = Math.round(this.referral.checkoutPrice - (this.referral.checkoutPrice * (100 / 121)));
        //console.log(this.referral, this.order.checkoutSummary.taxPrice)
      }
    } else if (!this.freeBoxClaimed) {
      await this.checkPromotion()
      if (this.coupon) {
        this.coupon = this.couponService.calculateCouponDiscount(this.order, this.coupon)
        this.order.checkoutSummary.taxPrice = Math.round(this.coupon.checkoutPrice - (this.coupon.checkoutPrice * (100 / 121)));
      } else {
        this.couponCode = this.cookieService.get('coupon')
        if (this.couponCode) {
          this.checkCoupon()
        }
      }
    }
  }

  showSummary() {
    this.dialog.open(SummaryDialog, {
      width: '500px',
      data: {
        order: this.order,
        freeBoxClaimed: this.freeBoxClaimed
      }
    });
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }
}