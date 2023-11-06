import { Component, OnInit } from '@angular/core';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.component.html',
  styleUrls: ['./faq.component.scss']
})
export class FaqComponent implements OnInit {

  constructor(
    private title: PageDetailService,
    private analytics: AnalyticsService
  ) { }

  ngOnInit(): void {
    this.title.setDetails("faq")
    this.analytics.trackPage('FAQ')
  }

}
