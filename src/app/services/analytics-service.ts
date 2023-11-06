import { Injectable } from '@angular/core';
import * as firebase from 'firebase/app';
import 'firebase/analytics';
import { Observable } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/auth';
import { CheckCustomer } from '../check-customer.test';
import { GoogleTagManagerService } from 'angular-google-tag-manager';
import { Router } from '@angular/router';
import { first } from 'rxjs/operators';
declare let fbq: Function;

@Injectable({
    providedIn: 'root'
})
export class AnalyticsService {
    user$: Observable<any | null>;

    constructor(
        private auth: AngularFireAuth,
        private checkCustomer: CheckCustomer,
        private router: Router,
        private gtmService: GoogleTagManagerService
    ) { }

    trackPage(name: string, user?: firebase.User) {
        const gtmTag = {
            event: name,
            pageName: this.router.url
        };

        if (user != null) {
            if (this.checkCustomer.isRealCustomer(user)) {
                this.pushTag(gtmTag)
            }
        } else {
            this.user$ = this.auth.user;
            this.user$.pipe(first()).subscribe((user: firebase.User) => {
                if (this.checkCustomer.isRealCustomer(user)) {
                    this.pushTag(gtmTag)
                }
            });
        }
    }

    pushTag(gtmTag) {
        //firebase.analytics().logEvent(gtmTag.event);
        //fbq('trackCustom', name);
        //this.gtmService.pushTag(gtmTag)
        //console.log(gtmTag, this.gtmService.getDataLayer())
    }
}