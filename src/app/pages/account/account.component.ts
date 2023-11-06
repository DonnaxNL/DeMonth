import { Component, OnInit, HostListener } from '@angular/core';
import { Subscription, Observable } from 'rxjs';
import { Location } from '@angular/common';
import { firestore, User } from 'firebase';
import { UserData } from 'src/app/models/userdata';
import { UserAddress } from 'src/app/models/address';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { Router, ActivatedRoute } from '@angular/router';
import 'firebase/auth';
import { AngularFireAuth } from '@angular/fire/auth';
import { OrderService } from 'src/app/services/firebase/order-service';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { TranslateService } from '@ngx-translate/core';
import { CheckCustomer } from 'src/app/check-customer.test';
import { CookieService } from 'ngx-cookie-service';
import { FirebaseOrder } from 'src/app/models/firebase.order';
import { AppComponent } from 'src/app/app.component';
import { UserService } from 'src/app/services/firebase/user-service';
import { Boxes } from 'src/app/constants/boxes';

@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  user$: Observable<User | null>;
  userData$: Observable<UserData | null>;
  orders$: Observable<any | null>;
  currentUser: User;
  currentUserData: UserData;
  allOrders: Array<FirebaseOrder>;
  orders: Array<FirebaseOrder> = [];
  oldOrders: Array<FirebaseOrder> = [];
  oneOffOrders: Array<FirebaseOrder> = [];
  currentActiveOrder

  userPoints = 0;
  userLifePoints = 0;
  latestOrder = null
  today = new Date();
  isMobile = false;
  dataLoaded = false;
  additionalDataEntered = true

  menuSelected = ''
  selectedOrderRef: String
  selectedOrderItem

  testMode = false

  constructor(
    private title: PageDetailService,
    private location: Location,
    private router: Router,
    private route: ActivatedRoute,
    private dataRoute: ActivatedRoute,
    private boxes: Boxes,
    public auth: AngularFireAuth,
    public userService: UserService,
    public orderService: OrderService,
    private app: AppComponent,
    private analytics: AnalyticsService,
    public translate: TranslateService,
    private cookieService: CookieService,
    private checkCustomer: CheckCustomer) {
    this.onResize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    const screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 990
  }

  ngOnInit(): void {
    this.title.setDetails("account")
    this.user$ = this.auth.user;
    this.app.addToSubscriptions(this.user$.subscribe((user: User) => {
      this.testMode = !this.checkCustomer.isRealCustomer(user)
      this.currentUser = user;
      if (this.currentUser != null) {
        this.getUserData(user.uid);
      }
    }));
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.app.setLoading(!this.dataLoaded)
      this.route
        .data
        .subscribe((v) => {
          this.selectedOrderRef = this.dataRoute.snapshot.paramMap.get('ref')
          this.menuSelected = v.menuItem;
          this.analytics.trackPage(v.menuItem == 'overview' ? 'Account' : v.menuItem.substr(0, 1).toUpperCase() + v.menuItem.substr(1), this.currentUser)
        });
    }, 100);
  }

  getUserData(uid: string) {
    this.userData$ = this.userService.getUserInfoRefByUID(uid).valueChanges();
    this.app.addToSubscriptions(this.userData$.subscribe((data: UserData) => {
      this.currentUserData = data;
      if (this.currentUserData == null) {
        var address = new UserAddress("", "", "", "", "", "", "nl");
        var name
        if (this.currentUser.displayName != null) {
          name = this.currentUser.displayName.split(" ", 2)
          address.firstName = name[0]
          address.lastName = name[1]
        }
        this.currentUserData = new UserData(this.currentUser.uid, "", "", address, this.currentUser.email, new Date());
        this.currentUserData.language = this.cookieService.get('language')
        this.userPoints = this.currentUserData.points != null ? this.currentUserData.points.current : 0
        this.userLifePoints = this.currentUserData.points != null ? this.currentUserData.points.lifetime : 0
        this.additionalDataEntered = false;
        this.dataLoaded = true;
        this.app.setLoading(!this.dataLoaded)
      } else {
        this.currentUserData.language = this.cookieService.get('language')
        if (this.currentUserData.birthDate != null) {
          this.currentUserData.birthDate = data.birthDate.toDate()
        }
        this.orderService.getFullOrders(this.currentUser.uid).subscribe(async deliveries => {
          this.allOrders = []
          for (let i = 0; i < deliveries.length; i++) {
            this.fillOrderList(deliveries[i], i, deliveries.length)
          }
        });
        this.userPoints = this.currentUserData.points ? this.currentUserData.points.current : 0
        this.userLifePoints = this.currentUserData.points ? this.currentUserData.points.lifetime : 0
        this.additionalDataEntered = true;
      }
    }));
  }

  async fillOrderList(orderItem, index, size) {
    const order: FirebaseOrder = (orderItem.order as FirebaseOrder)
    this.app.addToSubscriptions(await orderItem.deliveries.valueChanges().subscribe((data: any) => {
      var orderItemForList = order
      orderItemForList.deliveries = data
      orderItemForList.historyRef = orderItem.history
      const itemIndex = this.allOrders.indexOf(orderItemForList)
      if (itemIndex == -1) {
        this.allOrders.push(orderItemForList)
      } else {
        this.allOrders[itemIndex] = orderItemForList
      }
      // Fill allOrders when every delivery is picked up
      if (index == (size - 1)) {
        var newArr = []
        this.allOrders.forEach((item, index) => {
          if (newArr.findIndex(i => i.orderId == item.orderId) === -1) {
            newArr.push(item)
          }
        });
        this.allOrders = newArr
        this.allOrders.sort((a, b) => (a.orderCreated < b.orderCreated) ? 1 : ((b.orderCreated < a.orderCreated) ? -1 : 0));
        this.prepareOrderDetails()
      }
    }))
  }

  prepareOrderDetails() {
    // On refresh, empty lists
    this.orders = [];
    this.oneOffOrders = [];
    this.oldOrders = [];
    for (let i = 0; i < this.allOrders.length; i++) {
      // Separate current and old orders
      if (this.allOrders[i].subscriptionDetails != null &&
        this.allOrders[i].subscriptionDetails.subscriptionStatus != null &&
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'active' ||
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'pending' ||
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'paused' ||
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'test' ||
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'canceled' &&
        this.allOrders[i].subscriptionDetails.lastDeliveryDate &&
        this.allOrders[i].subscriptionDetails.lastDeliveryDate.toDate() > new Date()) {
        this.allOrders[i].startDeliveryDate = new firestore.Timestamp(this.allOrders[i].startDeliveryDate.seconds, this.allOrders[i].startDeliveryDate.nanoseconds)
        if (this.allOrders[i].paymentPlan == 0) {
          this.oneOffOrders.push(this.allOrders[i])
        } else if (this.allOrders[i].paymentPlan == 0 && this.allOrders[i].startDeliveryDate.toDate() < new Date()) {
          this.oldOrders.push(this.allOrders[i])
        } else {
          let listCount = this.orders.length - 1
          this.orders.push(this.allOrders[i])

          // Set currentOrder
          if (this.allOrders[i].paymentPlan != 0 && this.currentActiveOrder == null && this.allOrders[i].subscriptionDetails.subscriptionStatus == 'active') {
            this.currentActiveOrder = this.allOrders[i]
          }

          // // Set paymentMethod
          // if (this.allOrders[i].paymentDetails.paymentMethod != null) {
          //   if (this.allOrders[i].paymentDetails.paymentMethod == 'ideal') {
          //     this.orders[listCount].paymentDetails.paymentMethod = 'iDEAL'
          //   } else if (this.allOrders[i].paymentDetails.paymentMethod == 'bancontact') {
          //     this.orders[listCount].paymentDetails.paymentMethod = 'Bancontact'
          //   } else if (this.allOrders[i].paymentDetails.paymentMethod == 'creditcard') {
          //     this.orders[listCount].paymentDetails.paymentMethod = 'Credit Card'
          //   } else if (this.allOrders[i].paymentDetails.paymentMethod == 'afterpay') {
          //     this.translate.get('checkout.checkout_payment_afterpay').subscribe((res: string) => {
          //       this.orders[listCount].paymentDetails.paymentMethod = res
          //     });
          //   }
          // }
        }
      } else if (this.allOrders[i].subscriptionDetails != null &&
        this.allOrders[i].subscriptionDetails.subscriptionStatus != null &&
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'canceled' ||
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'paused+' ||
        this.allOrders[i].subscriptionDetails.subscriptionStatus == 'active' && this.allOrders[i].startDeliveryDate.toDate() < new Date()) {
        if (this.allOrders[i].paymentPlan == 0) {
          this.oneOffOrders.push(this.allOrders[i])
        } else if (this.allOrders[i].paymentPlan == 0 && this.allOrders[i].startDeliveryDate.toDate() < new Date()) {
          this.oldOrders.push(this.allOrders[i])
        } else {
          let listCount = this.oldOrders.length - 1
          this.oldOrders.push(this.allOrders[i])

          // Set coupon
          if (this.allOrders[i].checkoutSummary.coupon) {
            this.oldOrders[listCount].checkoutSummary.coupon.price = this.allOrders[i].checkoutSummary.checkoutPrice - this.allOrders[i].checkoutSummary.coupon.checkoutPrice
          }

          // // Set paymentMethod
          // if (this.allOrders[i].paymentDetails.paymentMethod != null) {
          //   if (this.allOrders[i].paymentDetails.paymentMethod == 'ideal') {
          //     this.oldOrders[listCount].paymentDetails.paymentMethod = 'iDEAL'
          //   } else if (this.allOrders[i].paymentDetails.paymentMethod == 'bancontact') {
          //     this.oldOrders[listCount].paymentDetails.paymentMethod = 'Bancontact'
          //   } else if (this.allOrders[i].paymentDetails.paymentMethod == 'creditcard') {
          //     this.oldOrders[listCount].paymentDetails.paymentMethod = 'Credit Card'
          //   } else if (this.allOrders[i].paymentDetails.paymentMethod == 'afterpay') {
          //     this.translate.get('checkout.checkout_payment_afterpay').subscribe((res: string) => {
          //       this.oldOrders[listCount].paymentDetails.paymentMethod = res
          //     });
          //   }
          // }
        }
      }
    }

    if (this.orders.length > 0) {
      this.latestOrder = this.orders[0]
    }
    
    this.dataLoaded = true;
    this.app.setLoading(!this.dataLoaded)

    //console.log(this.orders, this.oneOffOrders, this.oldOrders)
  }

  changePage(page: string) {
    if (page == 'overview') {
      this.title.setDetails("account")
      this.location.go('/account')
      this.analytics.trackPage('Account', this.currentUser)
      this.menuSelected = page
    } else {
      if (this.orders.length == 1 && page == 'subscriptions') {
        this.viewOrder(this.orders[0])
        this.analytics.trackPage('SubscriptionDetails', this.currentUser)
      } else {
        this.title.setDetails("account_" + page)
        var url = page == 'referral' ? 'invite' : page
        this.location.go('/account/' + url)
        this.analytics.trackPage(url.substr(0, 1).toUpperCase() + url.substr(1), this.currentUser)
        this.menuSelected = page
      }
    }
  }

  isNavActive(menuItem) {
    //console.log(menuItem, this.selectedOrderItem)
    if (menuItem == 'subscriptions') {
      return this.menuSelected == 'subscriptions' || this.menuSelected == 'subscriptionDetails' || this.menuSelected == 'subscriptionEdit' || this.menuSelected == 'subscriptionCancel'
    } else if (menuItem == 'orders') {
      return this.menuSelected == 'orders' || this.menuSelected == 'orderDetails' || this.menuSelected == 'orderCancel'
    } else {
      return this.menuSelected == menuItem
    }
  }

  updateData(type: String, data: any) {
    if (type == 'edit') {
      const showPreference = data.showPreference ? '/edit-preference' : '/edit-products'
      this.location.go('/account/subscriptions/' + data.orderRef + showPreference)
      this.selectedOrderItem = data
      this.menuSelected = 'subscriptionEdit'
    } else if (type == 'cancel') {
      this.location.go('/account/subscriptions/' + data.orderReference + '/cancel-subscription')
      this.selectedOrderItem = data
      this.menuSelected = 'subscriptionCancel'
    } else if (type == 'details') {
      this.selectedOrderRef = data.orderRef
      this.location.go('/account/subscriptions/' + data.orderRef + '/details')
      this.menuSelected = 'subscriptionDetails'
    } else if (type == 'subscriptions') {
      this.location.go('/account/subscriptions')
      this.menuSelected = 'subscriptions'
    } else if (type == 'points') {
      this.location.go('/account/points')
      this.menuSelected = 'points'
    }
    window.scrollTo(0, 0)
  }

  viewOrder(order: FirebaseOrder, isOneOff?: boolean) {
    order.historyRef = null
    this.selectedOrderRef = order.orderReference
    if (isOneOff) {
      this.location.go('/account/orders/' + order.orderReference + '/details')
      this.analytics.trackPage('OrderDetails', this.currentUser)
      this.menuSelected = 'orderDetails'
    } else {
      this.location.go('/account/subscriptions/' + order.orderReference + '/details')
      this.analytics.trackPage('SubscriptionDetails', this.currentUser)
      this.menuSelected = 'subscriptionDetails'
    }
    this.selectedOrderItem = order
    window.scrollTo(0, 0)
  }

  signOut() {
    this.app.signOut()
  }
}