import { HostListener } from '@angular/core';
import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: 'app-terms-policy',
  templateUrl: './terms-policy.component.html',
  styleUrls: ['./terms-policy.component.scss']
})
export class TermsPolicyComponent implements OnInit {
  menuSelected = null
  isMobile = false;
  changeDate = '15 april 2021'

  constructor(
    private title: PageDetailService,
    private location: Location,
    private route: ActivatedRoute,
    private analytics: AnalyticsService,
  ) {
    this.onResize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    const screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 990
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.route
        .data
        .subscribe((v) => {
          this.menuSelected = v.menuItem;
          this.title.setDetails(v.menuItem)
          //this.analytics.trackPage(v.menuItem)
        });
    }, 100);
  }

  changePage(page: string) {
    this.menuSelected = page
    this.title.setDetails(page)
    var url = ''
    if (page == 'terms') {
      url = 'terms'
    } else {
      url = page + '-policy'
    }
    this.location.go(url)
  }

  jumpToHeader(index: number) {
    var element = document.getElementById('artikel-' + index);
    var headerOffset = 110;
    if (element) {
      var elementPosition = element.getBoundingClientRect().top;
      var offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  }
}
