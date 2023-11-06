import { Injectable, isDevMode } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { User } from 'firebase';
import { CheckCustomer } from '../check-customer.test';
import { Boxes } from '../constants/boxes';
import { Order } from '../models/order';
import { FirebasePromotionService } from './firebase/promotion-service';

@Injectable({
    providedIn: 'root'
})
export class PromotionService {
    constructor(
        private checkCustomer: CheckCustomer,
        private boxes: Boxes,
        private promo: FirebasePromotionService,
        private translate: TranslateService
    ) { }

    checkPromotion(currentUser: User): any {
        return this.promo.getCurrentPromotion().get().then(async promotions => {
            if (promotions.empty) {
                //console.error('No documents', promotions);
                return null
            } else {
                var list = []
                const items = promotions.docs
                items.forEach(element => {
                    list.push(element.data())
                });
                list.sort((a, b) => (a.endDate > b.endDate) ? 1 : ((b.endDate > a.endDate) ? -1 : 0));
                for (let index = 0; index < list.length; index++) {
                    const promotion = list[index]
                    if (!promotion.isTest || promotion.isTest && !this.checkCustomer.isRealCustomer(currentUser)) {
                        if (promotion.startDate.toDate() < new Date()) {
                            return promotion
                        }
                    }
                }
                return null
            }
        }).catch(async (err: any) => {
            console.error('Error getting documents', err);
            return null
        })
    }

    async applyPromotionDetails(order: Order, currentUser: User) {
        const promotion = await this.checkPromotion(currentUser)
        if (order && promotion.discount != null && promotion.checkoutDescription != null) {
            if (order.paymentPlan == 1) {
                var boxPrice = order.checkoutSummary.subTotal + (order.checkoutSummary.shippingPrice * order.paymentPlan)
                if (order.products.extraProducts) {
                    boxPrice = boxPrice + order.products.extraProducts.extraPrice
                }
                promotion.price = Math.round(boxPrice * (promotion.discount / 100))
                order.checkoutSummary.promo = {
                    checkoutDescription: {
                        en: promotion.checkoutDescription.en,
                        nl: promotion.checkoutDescription.nl
                    },
                    checkoutPrice: Math.round(order.checkoutSummary.checkoutPrice - promotion.price),
                    discount: promotion.discount,
                    id: promotion.id,
                    price: promotion.price
                }
                if (isDevMode()) {
                    console.log('promo - monthly', order.checkoutSummary)
                }
                order.checkoutSummary.taxPrice = Math.round(order.checkoutSummary.promo.checkoutPrice - (order.checkoutSummary.promo.checkoutPrice * (100 / 121)));
            } else {
                var singleBoxPrice
                switch (order.boxId) {
                    case 'box_01':
                        singleBoxPrice = this.boxes.box1.price + order.checkoutSummary.shippingPrice
                        break;
                    case 'box_02':
                        singleBoxPrice = this.boxes.box2.price
                        break;
                    case 'box_03':
                        singleBoxPrice = this.boxes.box3.price
                        break;
                    default:
                        break;
                }
                if (order.products.extraProducts) {
                    singleBoxPrice = singleBoxPrice + order.products.extraProducts.extraPrice
                }
                promotion.price = singleBoxPrice * (promotion.discount / 100)
                order.checkoutSummary.promo = {
                    checkoutDescription: {
                        en: promotion.checkoutDescription.en,
                        nl: promotion.checkoutDescription.nl
                    },
                    checkoutPrice: Math.round(order.checkoutSummary.checkoutPrice - promotion.price),
                    discount: promotion.discount,
                    id: promotion.id,
                    price: promotion.price
                }
                if (isDevMode()) {
                    console.log('promo - multiple', order.checkoutSummary)
                }
                order.checkoutSummary.taxPrice = order.checkoutSummary.promo.checkoutPrice - (order.checkoutSummary.promo.checkoutPrice * (100 / 121));
            }
            if (isDevMode()) {
                console.log(order)
            }
        } else {
            return order
        }
    }

    async getPromotionBarDetails(promoEyeCatcher, coupon, currentUser: User) {
        let detailsMap = {
            promoEyeCatcher: "This is a demo site; you cannot order any products.",
            promoDescription: null,
            promotion: null
        }
        // const promotion = await this.checkPromotion(currentUser)
        // if (promotion) {
        //     if (promoEyeCatcher && coupon) {
        //         detailsMap.promoEyeCatcher = promotion.eyeCatcher[this.translate.currentLang] + " | " + promoEyeCatcher
        //     } else {
        //         detailsMap.promoEyeCatcher = promotion.eyeCatcher[this.translate.currentLang]
        //     }
        //     detailsMap.promoDescription = promotion.description[this.translate.currentLang]
        //     detailsMap.promotion = promotion
        // }

        return detailsMap;
    }

    getPromotion(order: Order, promotion) {
        if (order.paymentPlan == 1) {
            var boxPrice = order.checkoutSummary.subTotal + (order.checkoutSummary.shippingPrice * order.paymentPlan)
            if (order.products.extraProducts) {
                boxPrice = boxPrice + order.products.extraProducts.extraPrice
            }
            promotion.price = Math.round(boxPrice * (promotion.discount / 100))
            order.checkoutSummary.promo = {
                checkoutDescription: {
                    en: promotion.checkoutDescription.en,
                    nl: promotion.checkoutDescription.nl
                },
                checkoutPrice: Math.round(order.checkoutSummary.checkoutPrice - promotion.price),
                discount: promotion.discount,
                id: promotion.id,
                price: promotion.price
            }
            // if (isDevMode()) {
            //     console.log('promo - monthly', order.checkoutSummary)
            // }
            order.checkoutSummary.taxPrice = Math.round(order.checkoutSummary.promo.checkoutPrice - (order.checkoutSummary.promo.checkoutPrice * (100 / 121)));
        } else {
            var singleBoxPrice
            switch (order.boxId) {
                case 'box_01':
                    singleBoxPrice = this.boxes.box1.price + order.checkoutSummary.shippingPrice
                    break;
                case 'box_02':
                    singleBoxPrice = this.boxes.box2.price
                    break;
                case 'box_03':
                    singleBoxPrice = this.boxes.box3.price
                    break;
                default:
                    break;
            }
            if (order.products.extraProducts) {
                singleBoxPrice = singleBoxPrice + order.products.extraProducts.extraPrice
            }
            promotion.price = singleBoxPrice * (promotion.discount / 100)
            order.checkoutSummary.promo = {
                checkoutDescription: {
                    en: promotion.checkoutDescription.en,
                    nl: promotion.checkoutDescription.nl
                },
                checkoutPrice: Math.round(order.checkoutSummary.checkoutPrice - promotion.price),
                discount: promotion.discount,
                id: promotion.id,
                price: promotion.price
            }
            // if (isDevMode()) {
            //     console.log('promo - multiple', order.checkoutSummary)
            // }
            order.checkoutSummary.taxPrice = order.checkoutSummary.promo.checkoutPrice - (order.checkoutSummary.promo.checkoutPrice * (100 / 121));
        }

        return order;
    }

    getReturnPromo(order: Order) {
        var boxPrice = order.checkoutSummary.subTotal + (order.checkoutSummary.shippingPrice * order.paymentPlan)
        if (order.products.extraProducts) {
            boxPrice = boxPrice + order.products.extraProducts.extraPrice
        }
        var boxBase = 0
        if (order.boxId == 'box_01') {
            boxBase = this.boxes.box1.price
        } else if (order.boxId == 'box_02') {
            boxBase = this.boxes.box2.price
        } else if (order.boxId == 'box_03') {
            boxBase = this.boxes.box3.price
        }

        return {
            id: 'RETURN33',
            discount: 33,
            price: Math.round(boxBase * (33 / 100)),
            checkoutPrice: Math.round(boxPrice - (boxBase * (33 / 100))),
            checkoutDescription: {
                en: '33% discount',
                nl: '33% korting',
            }
        }
    }
}