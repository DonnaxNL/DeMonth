import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: 'app-how-it-works',
  templateUrl: './how-it-works.component.html',
  styleUrls: ['./how-it-works.component.scss']
})
export class HowItWorksComponent implements OnInit {

  constructor(
    private title: PageDetailService,
    private analytics: AnalyticsService
  ) { }

  ngOnInit(): void {
    this.analytics.trackPage('How it works')
    this.title.setDetails("how_it_works")
  }

}
