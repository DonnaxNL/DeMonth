import { Component, OnInit, HostListener } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { FirestoreService } from 'src/app/services/firebase-service';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  currentYear = 2020
  screenWidth
  isMobile = false
  currentRoute = '/'
  hideFooter = false

  constructor(
    public app: AppComponent,
    public fbService: FirestoreService,
    public dialog: MatDialog,
    public translate: TranslateService,
    private router: Router) {
    this.onResize()
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    this.screenWidth = window.innerWidth;
    this.isMobile = this.screenWidth <= 768
    this.checkHideFooter()
  }

  ngOnInit() {
    this.currentYear = new Date().getFullYear()
    this.router.events.subscribe((evt: any) => {
      if (evt.url != undefined) {
        this.currentRoute = evt.url
        this.checkHideFooter()
      }
    });
  }

  openContactForm() {
    this.app.showContactForm()
  }

  checkHideFooter() {
    if (this.currentRoute.includes('order-box') ||
      this.currentRoute == '/checkout' ||
      this.currentRoute == '/linktree') {
      if (this.screenWidth < 1000 || this.currentRoute == '/linktree') {
        this.hideFooter = true
      } else {
        this.hideFooter = false
      }
    } else {
      this.hideFooter = false
    }
  }
}