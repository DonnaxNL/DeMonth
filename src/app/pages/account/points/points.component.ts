import { Component, OnInit, HostListener, Input } from '@angular/core';
import { MatSliderChange } from '@angular/material/slider';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialog } from './confirm/confirm.component';
import { Router } from '@angular/router';
import { AccountComponent } from '../account.component';
import { UserService } from 'src/app/services/firebase/user-service';
import { Boxes } from 'src/app/constants/boxes';
import { AnalyticsService } from 'src/app/services/analytics-service';
import { PageDetailService } from 'src/app/services/page-detail-service';

@Component({
  selector: 'app-points',
  templateUrl: './points.component.html',
  styleUrls: ['./points.component.scss']
})
export class PointsComponent implements OnInit {
  current: number;
  @Input() set currentPoints(points: number) {
    if (points != undefined) {
      this.current = points
      this.userPointsChanges()
    }
  }

  lifetime: number;
  @Input() set lifetimePoints(points: number) {
    if (points != undefined) {
      this.lifetime = points
    }
  }

  lastOrder: any;
  @Input() set currentOrder(order: any) {
    if (order != undefined) {
      this.lastOrder = order
    }
  }

  isMobile = false

  // Complete
  amountRedeemComplete = 120
  minimalToRedeemComplete = 0
  stepComplete = 1
  discountComplete = 0
  discountPriceComplete = 0
  selectedPointsComplete = 0
  //Plus
  amountRedeemPlus = 90
  minimalToRedeemPlus = 0
  stepPlus = 0.5
  discountPlus = 0
  discountPricePlus = 0
  selectedPointsPlus = 0
  // Basic
  amountRedeemBasic = 80
  minimalToRedeemBasic = 0
  stepBasic = 8
  discountBasic = 0
  selectedPointsBasic = 0

  constructor(
    private titleService: PageDetailService,
    private analytics: AnalyticsService,
    public boxes: Boxes,
    public account: AccountComponent,
    public userService: UserService,
    public dialog: MatDialog,
    ) { 
    this.onResize();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?) {
    var screenWidth = window.innerWidth;
    this.isMobile = screenWidth <= 1200
  }
  
  ngOnInit(): void {
    this.analytics.trackPage('Subscription - DeMonthly Points')
    this.titleService.setDetails("account_points")
    this.selectedPointsComplete = this.current > this.amountRedeemComplete ? this.amountRedeemComplete : this.current
    this.selectedPointsPlus = this.current > this.amountRedeemPlus ? this.amountRedeemPlus : this.current
    this.selectedPointsBasic = this.current > this.amountRedeemBasic ? this.amountRedeemBasic: this.current
    this.calculateDiscount('complete', this.selectedPointsComplete)
    this.calculateDiscount('plus', this.selectedPointsPlus)
    this.calculateDiscount('basic', this.selectedPointsBasic)
  }

  userPointsChanges() {
    this.selectedPointsComplete = this.current > this.amountRedeemComplete ? this.amountRedeemComplete : this.current
    this.selectedPointsPlus = this.current > this.amountRedeemPlus ? this.amountRedeemPlus : this.current
    this.selectedPointsBasic = this.current > this.amountRedeemBasic ? this.amountRedeemBasic : this.current
    this.calculateDiscount('complete', this.selectedPointsComplete)
    this.calculateDiscount('plus', this.selectedPointsPlus)
    this.calculateDiscount('basic', this.selectedPointsBasic)
  }

  onChange(type: string, event: MatSliderChange) {
    if (event.value > this.current) {
      event.source.value = this.current
      if (type == 'complete') {
        this.selectedPointsComplete = this.current
      } else if (type == 'plus') {
        this.selectedPointsPlus = this.current
      } else if (type == 'basic') {
        this.selectedPointsBasic = this.current
      }
      this.calculateDiscount(type, this.current)
    } else {
      if (type == 'complete') {
        this.selectedPointsComplete = event.value
      } else if (type == 'plus') {
        this.selectedPointsPlus = event.value
      } else if (type == 'basic') {
        this.selectedPointsBasic = event.value
      }
      this.calculateDiscount(type, event.value)
    }
  }

  calculateDiscount(type, points) {
    if (type == 'complete') {
      this.discountComplete = points / this.amountRedeemComplete
      this.discountPriceComplete = this.boxes.box3.price * this.discountComplete
    } else if (type == 'plus') {
      this.discountPlus = points / this.amountRedeemPlus
      this.discountPricePlus = this.boxes.box2.price * this.discountPlus
    } else if (type == 'basic') {
      this.discountBasic = points / this.amountRedeemBasic
    }
  }

  claimBox(type: string) {
    var claimed = 0
    var boxId = ''
    var discount = 0
    var discountPrice = 0
    if (type == 'complete') {
      //console.log(this.selectedPointsComplete)
      claimed = this.selectedPointsComplete
      boxId = 'box_03'
      discount = this.discountComplete
      discountPrice = this.discountPriceComplete
    } else if (type == 'plus') {
      //console.log(this.selectedPointsPlus)
      claimed = this.selectedPointsPlus
      boxId = 'box_02'
      discount = this.discountPlus
      discountPrice = this.discountPricePlus
    } else if (type == 'basic') {
      //console.log(this.selectedPointsBasic)
      claimed = this.selectedPointsBasic
      boxId = 'box_01'
      discount = this.discountBasic
      discountPrice = this.discountPricePlus
    }
    this.dialog.open(ConfirmDialog, {
      width: '400px',
      data: {
        currentOrder: this.lastOrder,
        userPoints: this.current,
        lifetimePoints: this.lifetime,
        pointsClaimed: claimed,
        pointsRemaining: this.current - claimed,
        boxId: boxId,
        discount: discount,
        discountPrice: discountPrice
      }
    });
  }
}
