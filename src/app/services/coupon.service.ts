import { Injectable, isDevMode } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { User } from 'firebase';
import { Boxes } from '../constants/boxes';
import { FirebaseCouponService } from './firebase/coupon-service';

@Injectable({
    providedIn: 'root'
})
export class CouponService {
    coupon

    constructor(
        private boxes: Boxes,
        private couponService: FirebaseCouponService,
        private translate: TranslateService
    ) { }

    checkCouponCode(couponCode: string): any {
        return this.couponService.checkCoupon(couponCode).then(async coupons => {
            if (coupons.empty) {
                if (isDevMode()) {
                    console.error('No documents', coupons);
                }
                return null
            } else {
                var list = [];
                const items = coupons.docs
                items.forEach(element => {
                    list.push(element.data())
                });
                return list[0];
            }
        }).catch(async (err: any) => {
            console.error('Error getting documents', err);
            return null;
        })
    }

    async checkCoupon(couponCode: string, currentUser: User, freezeCoupon, noCheck) {
        let triggerMap = {
            couponSuccess: null,
            couponError: null,
            coupon: null
        }
        this.coupon = await this.checkCouponCode(couponCode)
        if (!freezeCoupon) {
            if (this.coupon) {
                var expireDate = this.coupon.expireDate
                if (!expireDate || expireDate && expireDate.toDate() > new Date()) {
                    if (isDevMode()) {
                        console.log(this.coupon)
                    }
                    // Check if it's multiple or single use
                    if (!this.coupon.used) {
                        // Check on limit
                        if (!this.coupon.limit || this.coupon.limit > this.coupon.usedBy.length) {
                            if (this.coupon.usedBy) {
                                if (isDevMode()) {
                                    console.log('usedBy coupon')
                                }
                                for (let i = 0; i < this.coupon.usedBy.length; i++) {
                                    if (noCheck == undefined && currentUser != null && this.coupon.usedBy[i] == currentUser.uid) {
                                        console.log('Coupon already used by user')
                                        triggerMap.couponSuccess = null
                                        triggerMap.couponError = null
                                        triggerMap.couponError = await this.translate.get('checkout.summary_coupon_used_by_user', { discount: this.coupon.discount }).toPromise();
                                    }
                                }
                                triggerMap.couponError = null
                                triggerMap.couponSuccess = await this.translate.get('checkout.summary_coupon_applied', { discount: this.coupon.discount }).toPromise();
                                triggerMap.coupon = this.coupon
                                //this.calculateCouponDiscount()
                            } else {
                                if (isDevMode()) {
                                    console.log('regular used coupon')
                                }
                                triggerMap.couponError = null
                                triggerMap.couponSuccess = await this.translate.get('checkout.summary_coupon_applied', { discount: this.coupon.discount }).toPromise();
                                triggerMap.coupon = this.coupon
                                //this.calculateCouponDiscount()
                            }
                        } else {
                            console.log('coupon limit')
                            triggerMap.couponSuccess = null
                            triggerMap.couponError = null
                            triggerMap.couponError = await this.translate.get('checkout.summary_coupon_invalid').toPromise();
                            triggerMap.coupon = null
                        }
                    } else {
                        triggerMap.couponSuccess = null
                        triggerMap.couponError = null
                        triggerMap.couponError = await this.translate.get('checkout.summary_coupon_used').toPromise();
                        triggerMap.coupon = null
                    }
                } else {
                    triggerMap.couponSuccess = null
                    triggerMap.couponError = null
                    triggerMap.couponError = await this.translate.get('checkout.summary_coupon_expired').toPromise();
                    triggerMap.coupon = null
                }
            } else {
                triggerMap.couponSuccess = null
                triggerMap.couponError = null
                triggerMap.couponError = await this.translate.get('checkout.summary_coupon_invalid').toPromise();
                triggerMap.coupon = null
            }
        }
        return triggerMap;
    }



    calculateCouponDiscount(order, coupon) {
        var singleBoxPrice
        switch (order.boxId) {
            case 'box_01':
                singleBoxPrice = this.boxes.box1.price + order.checkoutSummary.shippingPrice
                break;
            case 'box_02':
                singleBoxPrice = this.boxes.box2.price + order.checkoutSummary.shippingPrice
                break;
            case 'box_03':
                singleBoxPrice = this.boxes.box3.price + order.checkoutSummary.shippingPrice
                break;
            default:
                break;
        }
        if (order.products.extraProducts) {
            singleBoxPrice = singleBoxPrice + order.products.extraProducts.extraPrice
        }
        if (order.paymentPlan == 1) {
            if (isDevMode()) {
                console.log(order.checkoutSummary.promo)
            }
            if (order.checkoutSummary.promo) {
                coupon.price = Math.round(singleBoxPrice * (coupon.discount / 100))
                coupon.checkoutPrice = Math.round(order.checkoutSummary.promo.checkoutPrice - coupon.price)
            } else {
                coupon.price = Math.round(order.checkoutSummary.checkoutPrice * (coupon.discount / 100))
                coupon.checkoutPrice = Math.round(order.checkoutSummary.checkoutPrice - coupon.price)
            }
            //order.checkoutSummary.taxPrice = Math.round(this.coupon.checkoutPrice - (this.coupon.checkoutPrice * (100 / 121)));
            if (isDevMode()) {
                console.log(order, coupon)
            }
        } else {
            if (isDevMode()) {
                console.log(singleBoxPrice)
            }
            if (order.checkoutSummary.promo) {
                //var singleBoxPriceWithPromo = singleBoxPrice - this.promotion.price
                coupon.price = Math.round(singleBoxPrice * (this.coupon.discount / 100))
                coupon.checkoutPrice = Math.round(order.checkoutSummary.promo.checkoutPrice - coupon.price)
            } else {
                if (order.products.extraProducts) {
                    singleBoxPrice = singleBoxPrice + order.products.extraProducts.extraPrice
                }
                coupon.price = Math.round(singleBoxPrice * (this.coupon.discount / 100))
                coupon.checkoutPrice = Math.round(order.checkoutSummary.checkoutPrice - coupon.price)
            }
            if (isDevMode()) {
                console.log(this.coupon)
            }
            //order.checkoutSummary.taxPrice = Math.round(this.coupon.checkoutPrice - (this.coupon.checkoutPrice * (100 / 121)));
        }

        return coupon;
    }
}