import { Component, OnInit, HostListener, ViewChild, ElementRef, isDevMode } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';
import * as AOS from 'aos';
import { CheckCustomer } from './check-customer.test';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { MatSidenav } from "@angular/material/sidenav";
import { PromotionService } from "./services/promotion.service";
import { CouponService } from "./services/coupon.service";
import { CustomAnimations } from "./shared/animations";
import { TranslateViewService } from "./services/translate.service";
import { LangChangeEvent } from "@ngx-translate/core";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  animations: [CustomAnimations],
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  subscriptions: Subscription[] = [];
  user$: Observable<User | null>;
  user: User;
  promotion
  showPromotion = false
  shortPromoText = true
  promoEyeCatcher = ""
  promoDescription = ""
  coupon
  isMobile = false
  isLoading = false
  isCustomer = false
  progress = 0
  pathName = '/'
  screenHeight
  screenWidth
  country
  referral

  hideAddButton = true;
  startAnimation = false;
  showAddText = true;
  deferredPrompt;

  get bodyStyle(): any {
    var padding
    var minHeight
    if (this.isMobile) {
      padding = '72px'
      minHeight = 'calc(100vh - 375px)'
    } else {
      padding = '100px'
      minHeight = 'calc(100vh - 280px)'
    }
    if (this.showPromotion) {
      if (this.isMobile) {
        if (this.shortPromoText) {
          padding = '112px'
        } else {
          padding = '132px'
        }
      } else {
        padding = '140px'
      }
    }
    return {
      'padding-top': padding,
      'min-height': minHeight
    };
  }

  @ViewChild('sidenav', { static: true }) sideNav: MatSidenav;
  @ViewChild('contact', { static: true }) contactButton: ElementRef;

  constructor(
    private router: Router,
    private http: HttpClient,
    private auth: AngularFireAuth,
    private cookieService: CookieService,
    private checkCustomer: CheckCustomer,
    public translate: TranslateViewService,
    public couponService: CouponService,
    public promotionService: PromotionService) {
    this.onResize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    this.screenHeight = window.innerHeight;
    this.screenWidth = window.innerWidth;
    this.isMobile = this.screenWidth <= 480
  }

  @HostListener('window:beforeinstallprompt', ['$event'])
  onbeforeinstallprompt(e) {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    this.deferredPrompt = e;
    this.startTransition()
  }

  ngOnInit() {
    AOS.init();
    this.user$ = this.auth.user;
    this.subscriptions.push(this.user$.subscribe((user: User) => {
      this.user = user
      this.isCustomer = this.checkCustomer.isRealCustomer(user)
      if (!this.cookieService.get('referral')) {
        this.checkPromotion()
      } else {
        this.showPromotion = false
      }
      this.startTransition()
    }));
    this.translate.initLanguage()
    this.setCountry()
    this.router.events.subscribe(evt => {
      this.pathName = location.pathname
      if (!(evt instanceof NavigationEnd)) {
        return;
      }
      window.scrollTo(0, 0)
      if (evt.url != undefined) {
        const currentRoute = evt.url
        if (currentRoute == '/' && this.promoEyeCatcher != "") {
          this.showPromotion = true
        } else {
          this.showPromotion = false
        }
      }
    });
  }

  getUser() {
    return this.user;
  }

  toggleSidenav() {
    this.sideNav.toggle()
  }

  showContactForm() {
    this.contactButton.nativeElement.click();
  }

  setCountry() {
    this.country = this.cookieService.get('country');
    if (!this.country) {
      this.http.get("https://api.ipify.org/?format=json").subscribe((res: any) => {
        const ip = res.ip
        return this.http.get("https://ipapi.co/" + ip + "/json").subscribe((res: any) => {
          this.setUserLocation(res.country)
          if (res.country != 'NL' && res.country != 'BE') {
            this.translate.setLanguage('en');
          }
        });
      });
    } else {
      if (this.country != 'NL' && this.country != 'BE') {
        this.translate.setLanguage('en');
      }
    }
  }

  setUserLocation(countryCode) {
    this.cookieService.set('country', countryCode, 730);
  }

  setLoading(isLoading: boolean) {
    this.isLoading = isLoading
  }

  setProgress(progress: number) {
    setTimeout(() => {
      this.progress = progress
    }, 0)
  }

  getIsCustomer() {
    return this.isCustomer
  }

  setReferral(referralItem) {
    this.referral = referralItem
  }

  getReferral() {
    return this.referral
  }

  showContactButton() {
    if (this.screenWidth < 1000 && this.pathName.includes('order-box') ||
      this.screenWidth < 1000 && this.pathName.includes('checkout')) {
      return false
    } else {
      return true
    }
  }

  showProgress() {
    if (this.progress > 0) {
      if (this.pathName.includes('order-box') || this.pathName.includes('checkout')) {
        return true
      } else {
        return false
      }
    } else {
      if (this.pathName == '/order-box') {
        return true
      } else {
        return false
      }
    }
  }

  async checkPromotion() {
    const detailsMap = await this.promotionService.getPromotionBarDetails(this.promoEyeCatcher, this.coupon, this.user)
    if (detailsMap.promoEyeCatcher) {
      this.promotion = detailsMap.promotion
      if (this.promoEyeCatcher && this.coupon) {
        this.promoEyeCatcher = detailsMap.promoEyeCatcher + " | " + this.promoEyeCatcher
      } else {
        this.promoEyeCatcher = detailsMap.promoEyeCatcher
      }
      this.promoDescription = detailsMap.promoDescription
      if (this.promoEyeCatcher.length >= 45) {
        this.shortPromoText = false
      } else {
        this.shortPromoText = true
      }
      if (this.pathName == '/' || this.pathName.includes('coupon')) {
        this.showPromotion = true
      } else {
        this.showPromotion = false
      }
      // Listen for real-time language change
      this.translate.onLanguageChange().subscribe((event: LangChangeEvent) => {
        this.promoEyeCatcher = detailsMap.promotion.eyeCatcher[event.lang]
        this.promoDescription = detailsMap.promotion.description[event.lang]
        if (this.promoEyeCatcher.length >= 45) {
          this.shortPromoText = false
        } else {
          this.shortPromoText = true
        }
      });
    } else {
      this.showPromotion = false
    }
  }

  async setPromoBarWithCoupon(couponCode: string) {
    if (isDevMode()) {
      console.log(couponCode)
    }
    this.coupon = await this.couponService.checkCouponCode(couponCode)
    if (this.coupon) {
      // Check if it's multiple or single use
      if (!this.coupon.used) {
        // Check on limit
        if (!this.coupon.limit || this.coupon.limit > this.coupon.usedBy.length) {
          const text = this.coupon.eyeCatcher != null ? this.coupon.eyeCatcher[this.translate.getLanguage()] : this.coupon.name
          if (this.promoEyeCatcher) {
            this.promoEyeCatcher = this.promoEyeCatcher + " | " + text
          } else {
            this.promoEyeCatcher = text
          }
          if (this.pathName == '/' || this.pathName.includes('coupon')) {
            this.showPromotion = true
          } else {
            this.showPromotion = false
          }
        } else {
          console.log('coupon limit')
        }
      }
    }
  }

  startTransition() {
    // Show Add to Home Button
    if (this.isMobile && this.user && this.deferredPrompt) {
      this.hideAddButton = false
      setTimeout(() => {
        this.startAnimation = true
        setTimeout(() => {
          this.showAddText = false
          this.startAnimation = false
        }, 400)
      }, 5000)
    } else {
      this.hideAddButton = true
    }
  }

  addToHomeScreen() {
    // hide our user interface that shows our A2HS button
    this.hideAddButton = true;
    if (this.deferredPrompt) {
      // Show the prompt
      this.deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      this.deferredPrompt.userChoice
        .then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the A2HS prompt');
          } else {
            console.log('User dismissed the A2HS prompt');
          }
          this.deferredPrompt = null;
        })
        .catch(err => console.error(err));
    } else {
      this.hideAddButton = false;
    }
  }

  async signOut() {
    try {
      await this.auth.signOut();
      await this.clearSubscriptions();
      this.router.navigate(['/']);
    } catch (e) {
      // An error happened.
      console.error('An error happened while signing out!', e);
    }
  }

  addToSubscriptions(item) {
    this.subscriptions.push(item)
  }

  clearSubscriptions() {
    console.log('subscriptions', this.subscriptions)
    for (let index = 0; index < this.subscriptions.length; index++) {
      const element = this.subscriptions[index];
      console.log(element)
      element.unsubscribe()
    }
    //this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }
}