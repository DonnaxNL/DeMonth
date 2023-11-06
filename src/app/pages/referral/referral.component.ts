import { Component, OnInit, HostListener, Input, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subscription, Observable } from 'rxjs';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { UserData } from 'src/app/models/userdata';
import { FirestoreService } from 'src/app/services/firebase-service';
import { DomSanitizer } from '@angular/platform-browser';
import { UserService } from 'src/app/services/firebase/user-service';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { UserAddress } from 'src/app/models/address';
import { CookieService } from 'ngx-cookie-service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MyErrorStateMatcher } from 'src/app/shared/errormatcher';
import { Helper } from 'src/app/shared/helper';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { FormComponent } from 'src/app/shared/components/forms/address/form.component';

@Component({
  selector: 'app-referral',
  templateUrl: './referral.component.html',
  styleUrls: ['./referral.component.scss']
})
export class ReferralComponent implements OnInit {
  subscriptions: Subscription[] = [];
  user$: Observable<User | null>;
  userData$: Observable<UserData | null>;
  currentUser: User;
  currentUserData: UserData;
  referral
  referralLink = ''
  referralMessage = 'Meld je ook aan en krijg 30 procent korting bij DeMonth!'
  baseLink = 'https://demonth.nl/'
  safeFacebookUrl
  facebookUrl = ''
  facebookUrlP1 = 'https://www.facebook.com/plugins/share_button.php?href='
  facebookUrlP2 = '&layout=button&size=large&width=77&height=28&appId'
  safeTwitterUrl
  twitterUrl = ''
  twitterUrlP1 = 'https://platform.twitter.com/widgets/tweet_button.html?size=l&url='
  twitterUrlP2 = '&text=Meld je ook aan en krijg 30 procent korting bij DeMonth!&hashtags=DeMonth'

  isMobile = false
  dataLoaded = false

  formGroup: FormGroup;

  @ViewChild('form', { static: true }) formComponent: FormComponent;

  constructor(
    private cookieService: CookieService,
    private sanitizer: DomSanitizer,
    public auth: AngularFireAuth,
    public userService: UserService,
    public analytics: AnalyticsService,
    public dialog: MatDialog,
    public helper: Helper
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
    this.subscriptions.push(this.user$.subscribe((user: User) => {
      this.analytics.trackPage('Public DeMonthly Invite', user)
      this.currentUser = user;
      if (this.currentUser != null) {
        this.getUserData(user.uid);
      }
    }));
  }

  getUserData(uid: string) {
    this.userData$ = this.userService.getUserInfoRefByUID(uid).valueChanges();
    this.subscriptions.push(this.userData$.subscribe((data: UserData) => {
      this.currentUserData = data;
      if (this.currentUserData != null) {
        console.log(this.currentUserData)
        this.createReferralLinks()
      } if (this.currentUserData == null) {
        var address = new UserAddress("", "", "", "", "", "", "nl");
        var name
        if (this.currentUser.displayName != null) {
          name = this.currentUser.displayName.split(" ", 2)
          address.firstName = name[0]
          address.lastName = name[1]
        }
        this.currentUserData = new UserData(this.currentUser.uid, "", "", address, this.currentUser.email, new Date());
        this.currentUserData.language = this.cookieService.get('language')
        this.dataLoaded = false;
      }
    }));
  }

  createReferralLinks() {
    if (this.currentUserData.referral) {
      this.referral = this.baseLink + this.currentUserData.referral.referralCode
    } else if (this.currentUserData) {
      var uid = this.currentUserData.uid
      var code = this.currentUserData.firstName.toLowerCase() + "-" + uid.substring(uid.length - 5)
      this.userService.setReferralCode(uid, code)
      this.referral = this.baseLink + code
    } else {
      var code = this.currentUser.displayName.split(" ")[0] + "-" + uid.substring(uid.length - 5)
      this.referral = this.baseLink + code
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

  openWhatsApp() {
    if (this.isMobile) {
      window.open("whatsapp://send?text=" + this.referralMessage + " " + this.referral + "?utm_source=whatsapp", "_blank");
    } else {
      window.open("https://web.whatsapp.com/send?text=" + this.referralMessage + " " + this.referral + "?utm_source=whatsapp", "_blank");
    }
  }

  setFormGroup(formGroup) {
    this.formGroup = formGroup
  }

  async saveData() {
    if (this.formGroup != null) {
      console.log(this.formGroup.value)
      if (!this.formGroup.valid) {
        this.helper.validateAllFormFields(this.formGroup);
      } else if (this.formGroup.valid && this.currentUserData) {
        const userAddress = this.formGroup.value
        this.currentUserData.address = this.helper.userAddressToMap(userAddress, false);
        this.currentUserData.firstName = this.currentUserData.address.firstName
        this.currentUserData.lastName = this.currentUserData.address.lastName
        if (this.currentUserData.address.lastNamePrefix != undefined) {
          this.currentUserData.lastNamePrefix = this.currentUserData.address.lastNamePrefix
        }
        if (userAddress.mobileNo) {
          this.currentUserData.mobileNo = userAddress.mobileNo
        }
        if (userAddress.birthDate) {
          this.currentUserData.birthDate = userAddress.birthDate
        }
        var referralCode = this.currentUserData.firstName.toLowerCase() + "-" + this.currentUserData.uid.substring(this.currentUserData.uid.length - 5)
        this.currentUserData.referral = {
          referralCode: referralCode,
          usedBy: []
        }
        console.log(this.currentUserData);
        this.userService.updateUserMainData(this.currentUser, this.currentUserData);
        console.log("Done");
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
  }
}