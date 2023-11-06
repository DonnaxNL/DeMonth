import { Component, OnInit } from '@angular/core';
import { FirestoreService } from 'src/app/services/firebase-service';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

  constructor(
    private title: PageDetailService,
    public fbService: FirestoreService,
    private analytics: AnalyticsService) { }

  ngOnInit() {
    this.analytics.trackPage('About')
    this.title.setDetails("about");
  }
}
