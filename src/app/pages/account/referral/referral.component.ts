import { Component, OnInit, HostListener, Input, Inject } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AccountComponent } from '../account.component';
import { Subscription, Observable } from 'rxjs';
import { User } from 'firebase';
import { UserData } from 'src/app/models/userdata';
import { DomSanitizer } from '@angular/platform-browser';
import { AngularFireAuth } from '@angular/fire/auth';
import { FirestoreService } from 'src/app/services/firebase-service';
import { UserService } from 'src/app/services/firebase/user-service';
import { OrderService } from 'src/app/services/firebase/order-service';
import { DatePipe } from '@angular/common';
import { Helper } from 'src/app/shared/helper';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'referral',
  templateUrl: './referral.component.html',
  styleUrls: ['./referral.component.scss']
})
export class AccountReferralComponent implements OnInit {
  lastOrder: any;
  @Input() set currentOrder(order: any) {
    if (order != undefined) {
      this.lastOrder = order
    }
  }

  subscriptions: Subscription[] = [];
  user$: Observable<User | null>;
  userData$: Observable<UserData | null>;
  currentUser: User;
  currentUserData: UserData
  referral
  referralLink = ''
  referralMessage = 'Meld je ook aan en krijg 25 procent korting bij DeMonth!'
  baseLink = 'https://demonth.nl/'
  safeFacebookUrl
  facebookUrl = ''
  facebookUrlP1 = 'https://www.facebook.com/plugins/share_button.php?href='
  facebookUrlP2 = '&layout=button&size=large&width=77&height=28&appId'
  safeTwitterUrl
  twitterUrl = ''
  twitterUrlP1 = 'https://platform.twitter.com/widgets/tweet_button.html?size=l&url='
  twitterUrlP2 = '&text=' + this.referralMessage + '&hashtags=DeMonth'

  dataSourceReferrals
  displayedColumnsReferrals = ['friend', 'box', 'date', 'claim'];

  replaceList
  deliveryDates
  newStartPaymentDate
  nextDeliveryDate = new Date()
  boxDeliveryDate = new Date()

  isMobile = false
  dataLoaded = false

  constructor(
    private app: AppComponent,
    private router: Router,
    private sanitizer: DomSanitizer,
    public auth: AngularFireAuth,
    public fbService: FirestoreService,
    public userService: UserService,
    public orderService: OrderService,
    public account: AccountComponent,
    public dialog: MatDialog,
    public helper: Helper,
    public datepipe: DatePipe
    ) { 
    this.onResize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    var screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 1200
  }
  
  ngOnInit(): void {
    this.user$ = this.auth.user;
    this.app.addToSubscriptions(this.user$.subscribe((user: User) => {
      this.currentUser = user;
      if (this.currentUser != null) {
        this.getUserData(user.uid);
      }
    }));
  }

  getUserData(uid: string) {
    this.userData$ = this.userService.getUserInfoRefByUID(uid).valueChanges();
    this.app.addToSubscriptions(this.userData$.subscribe((data: UserData) => {
      this.currentUserData = data;
      if (this.currentUserData != null) {
        this.fillReferralTable()
        this.createReferralLinks()
      }
    }));
  }

  createReferralLinks () {
    if (this.currentUserData.referral) {
      this.referral = this.baseLink + this.currentUserData.referral.referralCode
    } else {
      var uid = this.currentUserData.uid
      var code = this.currentUserData.firstName.toLowerCase() +  "-" + uid.substring(uid.length - 5)
      this.userService.setReferralCode(uid, code)
      this.referral = this.baseLink + code
      this.currentUserData.referral = {
        referralCode: code,
        usedBy: []
      }
    }
    this.referralLink = this.referral + "?utm_source=referral"
    var referralFacebookLink = this.referral + "?utm_source=facebook"
    this.facebookUrl = this.facebookUrlP1 + referralFacebookLink + this.facebookUrlP2
    //console.log(this.facebookUrl)
    this.safeFacebookUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.facebookUrl);
    var referralTwitterLink = this.referral 
    //+ "?utm_source=twitter"
    this.twitterUrl = this.twitterUrlP1 + referralTwitterLink + this.twitterUrlP2
    //console.log(this.twitterUrl, this.safeTwitterUrl)
    this.safeTwitterUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.twitterUrl);
    this.dataLoaded = true
  }

  fillReferralTable() {
    if (this.currentUserData.referral) {
      var referrals = this.currentUserData.referral.usedBy
      //console.log(referrals)
      this.dataSourceReferrals = referrals
    } 
  }

  claimFreeBox(referral: any, index: number) {
    referral.id = index
    referral.currentSubscription = {}
    var name = ''
    if (referral.boxId == 'box_01') {
      name = 'basic'
    } else if (referral.boxId == 'box_02') {
      name = 'plus'
    } else if (referral.boxId == 'box_03') {
      name = 'complete'
    }
    if (this.lastOrder) {
      referral.currentSubscription.orderId = this.lastOrder.orderId
      referral.currentSubscription.pauseData = this.pauseSubscription()
      const dialogRef = this.dialog.open(ReferralDialog, {
        width: '450px',
        data: {
          order: this.lastOrder
        }
      });
      console.log(referral, this.lastOrder)
      
      dialogRef.afterClosed().subscribe(result => {
        console.log('The dialog was closed', result)
        if (result == true) {
          referral.currentSubscription.deliveryDate = this.lastOrder.nextDeliveryDate
          referral.currentSubscription.productsQuantity = this.lastOrder.productQuantity
          referral.currentSubscription.products = this.lastOrder.products
          console.log(referral)
          this.router.navigate(['/order-box/' + name], { state: { referralBox: referral } });
        } else if (result == false) {
          this.router.navigate(['/order-box/' + name], { state: { referralBox: referral } });
        } 
      });
    } else {
      this.router.navigate(['/order-box/' + name], { state: { referralBox: referral } });
    }
  }

  openWhatsApp() {
    if (this.isMobile) {
      window.open("whatsapp://send?text=" + this.referralMessage + " " + this.referral + "?utm_source=whatsapp", "_blank");
    } else {
      window.open("https://web.whatsapp.com/send?text=" + this.referralMessage + " " + this.referral + "?utm_source=whatsapp", "_blank");
    }
  }

  pauseSubscription() {
    this.deliveryDates = [];
    this.replaceList = [];
    const deliveries = this.lastOrder.deliveries
    const cycle = this.lastOrder.deliveryDaysApart
    // if (this.dialogData.isTooLate) {
    //     days = days + cycle
    // }
    console.log(this.lastOrder, deliveries, cycle)
    if (this.lastOrder.paymentPlan == 1) {
        for (let i = 0; i < deliveries.length; i++) {
            if (deliveries[i].deliveryDate.toDate() > new Date()) {
                this.boxDeliveryDate = new Date(deliveries[i].deliveryDate.toDate())
                const nextDeliveryDate = new Date(deliveries[i].deliveryDate.toDate())
                const idToReplace = this.datepipe.transform(deliveries[i].deliveryDate.toDate(), 'yyyy-MM-dd')
                this.replaceList.push(idToReplace)
                nextDeliveryDate.setDate(nextDeliveryDate.getDate() + cycle)
                this.deliveryDates.push(this.helper.toDeliveryItem(nextDeliveryDate))
                if (!this.newStartPaymentDate) {
                    this.nextDeliveryDate = nextDeliveryDate
                    this.newStartPaymentDate = nextDeliveryDate
                }
            }
        }
        if (!this.newStartPaymentDate) {
            console.log('No nextDelivery found')
            if (deliveries.length > 0) {
              this.nextDeliveryDate = new Date(deliveries[deliveries.length - 1].deliveryDate.toDate())
            } else {
              this.nextDeliveryDate = this.lastOrder.nextDeliveryDate.toDate()
            }
            this.nextDeliveryDate.setDate(this.nextDeliveryDate.getDate() + cycle * 2)
            console.log('date', this.nextDeliveryDate)
            this.deliveryDates.push(this.helper.toDeliveryItem(this.nextDeliveryDate))
            this.newStartPaymentDate = this.nextDeliveryDate
        }
    } else {
        this.deliveryDates = this.deliveryDatesMap(1)
        this.nextDeliveryDate = new Date(this.deliveryDates[0].deliveryDate.toDate())
        this.newStartPaymentDate = new Date(this.deliveryDates[this.deliveryDates.length - 1].deliveryDate.toDate())
    }

    var data = {
        uid: this.lastOrder.userId,
        boxName: this.lastOrder.boxName,
        orderId: this.lastOrder.orderId,
        orderRef: this.lastOrder.orderReference,
        newStartDate: this.newStartPaymentDate,
        pauseType: '1 month',
        nextDeliveryDate: this.nextDeliveryDate,
        deliveryDates: this.deliveryDates.length > 1 ? this.deliveryDates : null,
        subscriptionId: this.lastOrder.subscriptionDetails.subscriptionId,
        newDelivery: {
            replaceList: this.getItemsToRemove(),
            items: this.deliveryDates.filter(x => !this.replaceList.includes(x.docId))
        },
        history: null
    }
    return data
  }

  deliveryDatesMap(months) {
      this.replaceList = [];
      var deliveryDays = [];
      const cycleDays = this.lastOrder.deliveryDaysApart
      var loopAmount = this.lastOrder.deliveries.length;
      var startDate
      for (let i = 0; i < loopAmount; i++) {
          var deliveryDate = null
          if (!(this.lastOrder.deliveries[i].deliveryDate instanceof Date)) {
              deliveryDate = new Date(this.lastOrder.deliveries[i].deliveryDate)
          } else {
              deliveryDate = this.lastOrder.deliveries[i].deliveryDate
          }
          if (deliveryDate > new Date()) {
              const idToReplace = this.datepipe.transform(deliveryDate, 'yyyy-MM-dd')
              this.replaceList.push(idToReplace)
              if (!startDate) {
                  //this.oldDeliveryDate = new Date(deliveryDate)
                  deliveryDate.setDate(deliveryDate.getDate() + months * cycleDays)
                  startDate = new Date(deliveryDate)
              } else {
                  deliveryDate = new Date(startDate.setDate(startDate.getDate() + cycleDays))
              }
              deliveryDays.push(this.helper.toDeliveryItem(deliveryDate));
          }
          //console.log(loopAmount, this.orders[index].deliveryDates[0], daysToAdd, daysApart, deliveryDate)
      }
      if (this.lastOrder.paymentPlan == 1 && loopAmount < (this.lastOrder.paymentPlan + 1)) {
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

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }
}

export interface DialogData {
  order: any;
}

@Component({
  selector: 'referral-dialog',
  templateUrl: 'referral-dialog.html',
})
export class ReferralDialog {

  constructor(
    public dialogRef: MatDialogRef<ReferralDialog>,
    @Inject(MAT_DIALOG_DATA) public dialogData: DialogData) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}