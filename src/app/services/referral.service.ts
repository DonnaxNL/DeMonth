import { Injectable } from "@angular/core";
import { Boxes } from "../constants/boxes";
import { Order } from "../models/order";

@Injectable({
    providedIn: 'root'
})
export class ReferralService {
    referralDiscount = 30;

    constructor(
        private boxes: Boxes
    ) { }

    getReferral(order: Order, referralItem) {
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
            code: referralItem.code,
            referrer: referralItem.code.split('-')[0],
            discount: this.referralDiscount,
            price: Math.round(boxBase * (this.referralDiscount / 100)),
            checkoutPrice: Math.round(boxPrice - (boxBase * (this.referralDiscount / 100)))
        }
    }
}