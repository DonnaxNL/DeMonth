import { Component, OnInit } from '@angular/core';
import { Products } from 'src/app/constants/products';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: 'app-in-the-box',
  templateUrl: './in-the-box.component.html',
  styleUrls: ['./in-the-box.component.scss']
})
export class InTheBoxComponent implements OnInit {
  slidesChocolate = [];
  slidesHealthbar = [];
  slidesGranola = [];
  slidesBox2 = [
    { img: "/assets/images/boxes/box02.jpg" },
    { img: "/assets/images/boxes/box02-overview.jpg" }
  ];
  slidesBox3 = [
    { img: "/assets/images/boxes/box03.jpg" },
    { img: "/assets/images/boxes/box03-overview.jpg" }
  ];
  slideConfig = {
    interval: 2000,
    showIndicators: false,
    isAnimated: true
  };
  slideChocolateConfig = {
    interval: 1666,
    showIndicators: false,
    isAnimated: true
  };
  slideHealthbarConfig = {
    interval: 2000,
    showIndicators: false,
    isAnimated: true
  };
  slideGranolaConfig = {
    interval: 2500,
    showIndicators: false,
    isAnimated: true
  };

  slides = [
    { image: '/assets/images/boxes/box02.jpg', text: 'First' },
    { image: '/assets/images/boxes/box02-overview.jpg', text: 'Second' }
  ];
  noWrapSlides = false;
  showIndicator = true;

  constructor(
    private title: PageDetailService,
    private analytics: AnalyticsService,
    private products: Products
  ) { }

  ngOnInit() {
    this.analytics.trackPage('Products')
    this.title.setDetails("products")
    this.slidesChocolate = this.products.chocolateOptions
    this.slidesHealthbar = this.products.healthbarOptions
    this.slidesGranola = this.products.granolaOptions
  }

}
