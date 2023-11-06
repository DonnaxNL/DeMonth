import { Component, Inject, Input, isDevMode, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CookieService } from 'ngx-cookie-service';
import { Observable } from 'rxjs';
import { Boxes } from 'src/app/constants/boxes';
import { FirebaseCouponService } from 'src/app/services/firebase/coupon-service';
import { PromotionService } from 'src/app/services/promotion.service';

@Component({
  selector: 'order-pickbox',
  templateUrl: './pickbox.component.html',
  styleUrls: ['./pickbox.component.scss']
})
export class PickboxComponent implements OnInit {
  promotions$: Observable<any | null>;
  promotion
  promotionMultiplier = 0

  @Input() isMobile = false;
  @Input() isTrial = false;

  constructor(
    public boxes: Boxes,
    private dialog: MatDialog,
    public cookieService: CookieService,
    private couponService: FirebaseCouponService,
    private promotionService: PromotionService) { }

  ngOnInit() {
    this.checkPromotion()
  }

  async checkPromotion() {
    if (!this.cookieService.get('referral')) {
      this.promotion = await this.promotionService.checkPromotion(null)
      if (this.promotion) {
        if (!this.cookieService.get('coupon')) {
          this.promotionMultiplier = (100 - this.promotion.discount) / 100
        } else {
          this.couponService.checkCouponCode(this.cookieService.get('coupon')).valueChanges().subscribe((data: any) => {
            if (data.length != 0) {
              var expireDate = data[0].expireDate
              if (!expireDate || expireDate && expireDate.toDate() > new Date()) {
                // Fill coupon data
                var coupon = {
                  id: data[0].id,
                  name: data[0].name,
                  discount: data[0].discount,
                  limit: data[0].limit != null ? data[0].limit : null,
                  used: data[0].used != null ? data[0].used : null,
                  usedBy: data[0].usedBy != null ? data[0].usedBy : null,
                  usedByUid: data[0].usedByUid != null ? data[0].usedByUid : null,
                  eyeCatcher: data[0].eyeCatcher != null ? data[0].eyeCatcher : null
                }
                if (isDevMode()) {
                  console.log(coupon)
                }
                // Check if it's multiple or single use
                if (!coupon.used) {
                  // Check on limit
                  if (!coupon.limit || coupon.limit > coupon.usedBy.length) {
                    this.promotionMultiplier = (100 - this.promotion.discount - coupon.discount) / 100
                  } else {
                    console.log('coupon limit')
                    this.promotionMultiplier = (100 - this.promotion.discount) / 100
                  }
                }
              }
            }
          })
        }
        if (isDevMode()) {
          console.log(this.promotion, this.promotionMultiplier)
        }
      }
    }
  }

  hidePromotion() {
    this.promotion = null
  }

  openImage(box: string) {
    if (this.isMobile) {
      this.dialog.open(BoxImageDialog, {
        panelClass: 'image-dialog-class',
        data: {
          boxType: box
        }
      });
    }
  }
}

export interface DialogData {
  boxType: string;
}

@Component({
  selector: 'box-image-dialog',
  templateUrl: 'box-image-dialog.html',
})
export class BoxImageDialog {

  constructor(
    public dialogRef: MatDialogRef<BoxImageDialog>,
    @Inject(MAT_DIALOG_DATA) public dialogData: DialogData) { }

  onCloseClick(): void {
    this.dialogRef.close();
  }
}
