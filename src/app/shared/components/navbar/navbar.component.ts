import { Component, OnInit, HostListener, Input } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Router } from '@angular/router';
import { LangChangeEvent } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { CheckCustomer } from 'src/app/check-customer.test';
import { AppComponent } from 'src/app/app.component';
import { Order } from 'src/app/models/order';
import { Helper } from '../../helper';
import { TranslateViewService } from 'src/app/services/translate.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  user$: Observable<any | null>;
  user;
  displayNameInitials: string;
  collapse = true;
  showOpenOrder = false;
  tempOrder;
  isMobile = false;
  testMode = false;
  language = 'nl'
  timedOutCloser;
  promotionItem;
  referralItem;

  order = new Order("", "", null, null, 0, null, 0, 0);

  @Input() set promotion(value) {
    if (value != undefined) {
      this.promotionItem = value;
      this.checkTempOrder();
    }
  }

  @Input() set referral(value) {
    if (value != undefined) {
      this.referralItem = value;
      this.checkTempOrder();
    }
  }

  constructor(
    private router: Router,
    private auth: AngularFireAuth,
    private app: AppComponent,
    private checkCustomer: CheckCustomer,
    private cookieService: CookieService,
    private helper: Helper,
    public translate: TranslateViewService) {
    this.onResize();
  }

  ngOnInit() {
    this.testMode = false
    this.user$ = this.auth.user;
    this.app.addToSubscriptions(this.user$.subscribe((user: any) => {
      this.user = user
      if (user != null) {
        this.displayNameInitials = user ? this.getDisplayNameInitials(user.displayName) : null;
        this.testMode = !this.checkCustomer.isRealCustomer(user)
      }
    }));
    this.checkTempOrder()
    if (this.cookieService.get('language')) {
      this.language = this.cookieService.get('language')
    } else {
      this.translate.setLanguage(this.language);
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    var screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 480
  }

  toggleNav() {
    this.app.toggleSidenav()
  }

  mouseEnter(trigger) {
    if (this.timedOutCloser) {
      clearTimeout(this.timedOutCloser);
    }
    trigger.openMenu();
  }

  mouseLeave(trigger) {
    this.timedOutCloser = setTimeout(() => {
      trigger.closeMenu();
    }, 100);
  }

  onLanguageChange(value) {
    this.language = value
    this.translate.setLanguage(value)
  }

  async checkTempOrder() {
    var cookieItem = this.cookieService.get('temp-order')
    if (cookieItem) {
      this.tempOrder = JSON.parse(cookieItem);
      console.log(this.tempOrder, this.promotionItem, this.referralItem)
      if (this.tempOrder) {
        if (this.promotionItem && !this.referralItem && this.tempOrder.boxId != 'box_13') {
          this.order = await this.helper.getSummary(this.tempOrder)
          this.promotionItem.price = Math.round(this.order.checkoutSummary.checkoutPrice * (this.promotionItem.discount / 100))
          this.order.checkoutSummary.promo = {
            checkoutDescription: {
              en: this.promotionItem.checkoutDescription.en,
              nl: this.promotionItem.checkoutDescription.nl
            },
            checkoutPrice: Math.round(this.order.checkoutSummary.checkoutPrice - this.promotionItem.price),
            discount: this.promotionItem.discount,
            id: this.promotionItem.id,
            price: this.promotionItem.price
          }
        } else if (this.referralItem) {
          this.order = await this.helper.getSummary(this.tempOrder, this.referralItem)
        } else {
          this.order = await this.helper.getSummary(this.tempOrder)
        }
        console.log(this.order)
        this.showOpenOrder = true;
      }
    }
  }

  openOrder() {
    if (this.order) {
      this.router.navigate(['/checkout'], {
        state: {
          order: this.order
        }
      });
    }
  }

  closeAlert() {
    // Empty order cookie
    this.cookieService.delete('temp-order');
    this.showOpenOrder = false;
  }

  getDisplayNameInitials(displayName: string): string {
    if (!displayName) {
      return null;
    }
    const initialsRegExp: RegExpMatchArray = displayName.match(/\b\w/g) || [];
    const initials = ((initialsRegExp.shift() || '') + (initialsRegExp.pop() || '')).toUpperCase();
    return initials;
  }

  async signOut() {
    try {
      await this.auth.signOut();
      // Sign-out successful.
      this.router.navigate(['/']);
    } catch (e) {
      // An error happened.
      console.error('An error happened while signing out!', e);
    }
  }
}
