import { Component, OnInit, HostListener, isDevMode } from '@angular/core';
import { Location } from '@angular/common';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { ActivatedRoute } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  isMobile = false
  referral
  referralCheck = false
  referralSource
  referralPerson
  coupon

  slides = [
    { img: "/assets/images/viva-logo.png", link: "https://www.viva.nl/winnen/win-5x-carebox-van-demonth/" },
    { img: "/assets/images/flair-logo.png", link: "https://www.flaironline.nl/acties/winnen-carebox-demonth/" },
    { img: "/assets/images/nh-logo.png", link: "https://www.nhnieuws.nl/nieuws/272250/vier-vrienden-bedenken-abonnement-voor-tampons-en-maandverband" },
    { img: "/assets/images/jinek-logo.png" }
  ];
  slideConfig = {
    autoplay: true,
    autoplaySpeed: 1500,
    arrows: false,
    centerMode: true,
    slidesToShow: 3,
    slidesToScroll: 1,
    variableWidth: true,
    // responsive: [
    //   {
    //     breakpoint: 1024,
    //     settings: {
    //       slidesToShow: 3,
    //       slidesToScroll: 1,
    //     }
    //   },
    //   {
    //     breakpoint: 600,
    //     settings: {
    //       slidesToShow: 2,
    //       slidesToScroll: 1
    //     }
    //   },
    //   {
    //     breakpoint: 480,
    //     settings: {
    //       slidesToShow: 1,
    //       slidesToScroll: 1
    //     }
    //   }
    // ]
  };

  constructor(
    private dataRoute: ActivatedRoute,
    private location: Location,
    private title: PageDetailService,
    private analytics: AnalyticsService,
    private cookieService: CookieService,
    private app: AppComponent) { 
      this.onResize()
    }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    var screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 480
    this.slideConfig.slidesToShow = this.isMobile ? 1 : 4
  }

  ngOnInit() {
    this.title.setDetails("home")
    this.analytics.trackPage('Homepage')

    this.referral = this.dataRoute.snapshot.paramMap.get('referral')
    this.coupon = this.dataRoute.snapshot.paramMap.get('coupon')
    this.referralSource = this.dataRoute.snapshot.queryParamMap.get('utm_source')

    if (this.referral) {
      var referralIdentifier = this.referral.split('-')[1]
      if (referralIdentifier) {
        this.referralCheck = referralIdentifier.length == 5 ? true : false
      } else {
        this.referralCheck = false
      }
      if (this.referralCheck) {
        var referralCookie = {
          code: this.referral,
          source: this.referralSource
        }
        this.app.setReferral(referralCookie)
        this.cookieService.set('referral', JSON.stringify(referralCookie), 1)
        this.location.go('/')
        this.referralPerson = this.referral.split('-')[0]
      } else {
        this.location.go('/')
      }
    } else {
      this.cookieService.delete('referral');
    }
    if (isDevMode()) {
      console.log(this.referral);
    }
    if (this.coupon) {
      this.cookieService.set('coupon', this.coupon, 1)
      this.app.setPromoBarWithCoupon(this.coupon)
      this.location.go('/')
      if (isDevMode()) {
        console.log(this.coupon);
      }
    } else {
      this.cookieService.delete('coupon');
    }
  }

  openLink(slide: any) {
    if (slide.link) {
      window.open(slide.link, '_blank');
    }
  }

  afterChange(e) {
    console.log('afterChange');
  }
}