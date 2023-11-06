import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { Observable, Subscription } from 'rxjs';
import { User } from 'firebase/app';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { AppComponent } from 'src/app/app.component';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  subscriptions: Subscription[] = [];

  user$: Observable<User | null>;
  redirectUrl: string;
  isLogin = true

  constructor(
    private router: Router,
    private title: PageDetailService,
    private dataRoute: ActivatedRoute,
    private app: AppComponent,
    public auth: AngularFireAuth,
    private analytics: AnalyticsService,
    private snackBar: MatSnackBar) { }

  ngOnInit() {
    this.analytics.trackPage('Login')
    this.title.setDetails("login");
    this.redirectUrl = this.dataRoute.snapshot.queryParamMap.get('redirectUrl')
    this.user$ = this.auth.user;
    this.app.addToSubscriptions(this.user$.subscribe((user: User) => {
      if (user != null) {
        this.router.navigate([this.redirectUrl ? this.redirectUrl : '/account']);
      }
    }));
    if (this.redirectUrl) {
      this.snackBar.open('Please sign in to continue.', 'OK', {
        duration: 3000
      });
    }
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.dataRoute
        .data
        .subscribe((v) => {
          this.isLogin = v.type == 'register' ? false : true;
        });
    }, 100);
  }

  ngOnDestroy() {
    this.app.clearSubscriptions()
  }
}