import { Component, OnInit, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { Observable } from 'rxjs';
import { FirestoreService } from 'src/app/services/firebase-service';
import { AngularFireAuth } from '@angular/fire/auth';
import { User } from 'firebase';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { OrderService } from 'src/app/services/firebase/order-service';
import { Boxes } from 'src/app/constants/boxes';

@Component({
  selector: 'app-ordercomplete',
  templateUrl: './ordercomplete.component.html',
  styleUrls: ['./ordercomplete.component.scss']
})
export class OrderFinishedComponent implements OnInit {
  user$: Observable<User | null>;
  orders$: Observable<any | null>;
  currentUser: User;
  order
  orderRef
  paymentMethod
  pointsEarned = 0
  headerTitle = ''
  dataLoaded = false;
  isMobile = false;
  incentiveUsed = false;
  referralClaimed = false;
  completed

  constructor(
    private router: Router,
    private dataRoute: ActivatedRoute,
    public auth: AngularFireAuth,
    public orderService: OrderService,
    private boxes: Boxes,
    private title: PageDetailService,
    private analytics: AnalyticsService,
    private translate: TranslateService) { 
      this.onResize();
    }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    var screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 1200
  }

  ngOnInit() {
    this.orderRef = this.dataRoute.snapshot.queryParamMap.get('orderRef');
    if (this.orderRef == null) {
      this.router.navigate(['/']);
    }

    this.translate.get('order_finished.header_title').subscribe((res: string) => {
      this.headerTitle = res
    });

    // this.user$ = this.auth.user;
    // this.user$.subscribe((user: User) => {
    //   this.currentUser = user;
    //   const uid = this.currentUser != null ? this.currentUser.uid : null

      setTimeout(() => {

        // this.orders$ = this.orderService.getOrderByRef(uid, this.orderRef).valueChanges();
        // this.orders$.subscribe((data: any) => {
        //   console.log(data)
        //   if (data.length > 0) {
        //     this.order = data[0]
        //     if (this.order.paymentDetails.isPaid) {
        //       if (this.order.boxId == 'box_01') {
        //         this.pointsEarned = 5
        //       } else if (this.order.boxId == 'box_02') {
        //         this.pointsEarned = 7.5
        //       } else if (this.order.boxId == 'box_03' || this.order.boxId == 'box_13') {
        //         this.pointsEarned = 10
        //       }
        //       this.referralClaimed = this.order.paymentPlan == 0 && !this.boxes.isBoxOneOff(this.order.boxId)
        //       this.incentiveUsed = this.order.checkoutSummary.coupon != null || this.order.checkoutSummary.referral != null
        //       this.onComplete()
        //     } else {
        //       this.onFailed()
        //     }
        //   } else {
        //     this.onFailed()
        //   }
        // })
        this.onComplete()
      }, 3000);
    // });
  }

  onComplete() {
    this.dataLoaded = true;
    this.completed = true;
    this.analytics.trackPage('Order Complete', this.currentUser)
    this.title.setDetails("order_complete");
    this.translate.get('order_complete.title').subscribe((res: string) => {
      this.headerTitle = res
    });
    // Listen for real-time language change
    this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
      this.headerTitle = await this.translate.get('order_complete.title').toPromise();
    });
  }

  onFailed() {
    this.dataLoaded = true;
    this.analytics.trackPage('Order Failed', this.currentUser)
    this.title.setDetails("order_failed");
    this.translate.get('order_failed.title').subscribe((res: string) => {
      this.headerTitle = res
    });
    // Listen for real-time language change
    this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
      this.headerTitle = await this.translate.get('order_failed.title').toPromise();
    });
  }

  openOrder() {
    if (this.order.paymentPlan == 0) {
      this.router.navigate(['/account/orders/' + this.orderRef + '/details']);
    } else {
      this.router.navigate(['/account/subscriptions/' + this.orderRef + '/details']);
    }
  }

  openWhatsApp() {
    var message = "Ik heb zojuist een box gekocht bij DeMonth!"
    var baseUrl = "https://demonth.nl/order-box"
    if (this.isMobile) {
      window.open("whatsapp://send?text=" + message + " " + baseUrl, "_blank");
    } else {
      window.open("https://web.whatsapp.com/send?text=" + message + " " + baseUrl, "_blank");
    }
  }
}
