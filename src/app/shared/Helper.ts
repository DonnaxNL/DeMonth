import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Boxes } from '../constants/boxes';
import { Products } from '../constants/products';
import { UserAddress } from '../models/address';
import { BoxType } from '../models/box';
import { Order } from '../models/order';

export interface Product {
    id: string;
    brand: string;
    type: string;
    name: string;
    amount: number;
    price?: number;
}

@Injectable({
    providedIn: 'root'
})
export class Helper {
    boxType: BoxType

    constructor(
        private translate: TranslateService,
        public datepipe: DatePipe,
        public product: Products,
        public boxes: Boxes) { }

    validateAllFormFields(formGroup: FormGroup) {
        Object.keys(formGroup.controls).forEach(field => {
            const control = formGroup.get(field);
            if (control instanceof FormControl) {
                control.markAsTouched({ onlySelf: true });
            } else if (control instanceof FormGroup) {
                this.validateAllFormFields(control);
            }
        });
    }

    userAddressToMap(address: any, isExtra: boolean) {
        let array = [];
        const map: UserAddress = {
            firstName: address.firstName,
            lastName: address.lastName,
            street: address.street,
            houseNo: address.houseNo,
            postalCode: address.postalCode,
            city: address.city,
            country: address.country,
        };
        if (address.lastNamePrefix != undefined) {
            map.lastNamePrefix = address.lastNamePrefix
        }
        if (address.streetOther != undefined) {
            map.streetOther = address.streetOther
        }

        if (isExtra) {
            array.push(map)
            //TODO Looping
            return array;
        } else {
            return map;
        }
    }

    toDeliveryItem(deliveryDate: Date, paymentDetails?: any) {
        const deliveryDetails = {
            docId: this.datepipe.transform(deliveryDate, 'yyyy-MM-dd'),
            deliveryDate: deliveryDate,
            paymentDetails: null,
            packing: {
                isPacked: false,
                packedBy: ''
            },
            delivery: {
                isDelivered: false,
                deliveryInitiatedBy: ''
            }
        }
        if (paymentDetails) {
            deliveryDetails.paymentDetails = paymentDetails
        } else {
            deliveryDetails.paymentDetails = {
                isPaid: false
            }
        }
        return deliveryDetails
    }

    getProductsFromOrder(products: any) {
        let productArray = []
        if (products.pads) {
            for (let j = 0; j < products.pads.length; j++) {
                var productItem: Product = {
                    id: products.pads[j].id,
                    brand: products.pads[j].brand,
                    type: 'P',
                    name: products.pads[j].name,
                    amount: products.pads[j].amount,
                    price: products.pads[j].price != null ? products.pads[j].price : null
                }
                productArray.push(productItem);
            }
        }
        if (products.tampons) {
            for (let j = 0; j < products.tampons.length; j++) {
                var productItem: Product = {
                    id: products.tampons[j].id,
                    brand: products.tampons[j].brand,
                    type: 'T',
                    name: products.tampons[j].name,
                    amount: products.tampons[j].amount,
                    price: products.tampons[j].price != null ? products.tampons[j].price : null
                }
                productArray.push(productItem);
            }
        }
        if (products.liners) {
            for (let j = 0; j < products.liners.length; j++) {
                var productItem: Product = {
                    id: products.liners[j].id,
                    brand: products.liners[j].brand,
                    type: 'L',
                    name: products.liners[j].name,
                    amount: products.liners[j].amount,
                    price: products.liners[j].price != null ? products.liners[j].price : null
                }
                productArray.push(productItem);
            }
        }
        return productArray;
    }

    async getBox(boxId: string) {
        var boxType = this.boxes.getBoxById(boxId)
        if (boxType.id == 'box_13') {
            boxType.name = await this.translate.get('products.box_trial').toPromise();
        }
        return boxType;
    }

    async getSummary(order, referralItem?, freeBoxClaimed?) {
        var referral
        this.boxType = await this.getBox(order.boxId)
        //console.log(this.boxType)

        var checkoutSummary
        checkoutSummary = {
            subTotal: 0,
            shippingPrice: 0,
            taxPrice: 0,
            checkoutPrice: 0
        }
        if (this.boxType.id == 'box_01') {
            checkoutSummary.subTotal = this.boxType.price
            var baseShipping = this.product.tamponsShippingPrice // Base
            if (order.products.pads == null) {
                checkoutSummary.shippingPrice = baseShipping
            } else {
                var maxiRegSelected = false
                var maxiSuperSelected = false
                for (let i = 0; i < order.products.pads.length; i++) {
                    if (order.products.pads[i].id == 'PMR') {
                        maxiRegSelected = true
                    }
                    if (order.products.pads[i].id == 'PMS') {
                        maxiSuperSelected = true
                    }
                }
                if (maxiSuperSelected) {
                    checkoutSummary.shippingPrice = this.product.padsMaxiSuperShippingPrice
                } else if (maxiRegSelected) {
                    checkoutSummary.shippingPrice = this.product.padsMaxiRegularShippingPrice
                } else {
                    checkoutSummary.shippingPrice = this.product.combiShippingPrice
                }
            }
            if (order.paymentPlan == 1) {
                checkoutSummary.subTotal = this.boxType.price
                checkoutSummary.checkoutPrice = checkoutSummary.shippingPrice + this.boxType.price
            } else if (order.paymentPlan == 3) {
                checkoutSummary.subTotal = this.boxType.bundle3m
                checkoutSummary.checkoutPrice = (checkoutSummary.shippingPrice * 3) + this.boxType.bundle3m
            } else if (order.paymentPlan == 12) {
                checkoutSummary.subTotal = this.boxType.bundle12m
                checkoutSummary.checkoutPrice = (checkoutSummary.shippingPrice * 12) + this.boxType.bundle12m
            }
        } else {
            if (order.paymentPlan == 1) {
                checkoutSummary.subTotal = this.boxType.price
                checkoutSummary.checkoutPrice = this.boxType.price
            } else if (order.paymentPlan == 3) {
                checkoutSummary.subTotal = this.boxType.bundle3m
                checkoutSummary.checkoutPrice = this.boxType.bundle3m
            } else if (order.paymentPlan == 12) {
                checkoutSummary.subTotal = this.boxType.bundle12m
                checkoutSummary.checkoutPrice = this.boxType.bundle12m
            } else if (order.paymentPlan == 0) {
                checkoutSummary.subTotal = this.boxType.price
                if (order.boxId == 'box_13') {
                    checkoutSummary.checkoutPrice = this.boxType.price
                }
                // checkoutSummary.referral = {
                //     name: referralBox.name,
                //     uid: referralBox.uid
                // }
            }
        }
        if (order.products.extraProducts) {
            checkoutSummary.checkoutPrice = checkoutSummary.checkoutPrice + (order.products.extraProducts.extraPrice * order.paymentPlan)
        }
        checkoutSummary.taxPrice = Math.round(checkoutSummary.checkoutPrice - (checkoutSummary.checkoutPrice * (100 / 121)));
        order.boxId = this.boxType.id;
        order.boxName = this.boxType.name;
        order.checkoutSummary = checkoutSummary;
        //this.order.productQuantity = this.amountProductsSelected;
        var correctDate = new Date(order.deliveryDate)
        correctDate.setHours(correctDate.getHours() + 2)
        order.startDeliveryDate = correctDate

        if (referralItem) {
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
            referral = {
                code: referralItem.code,
                origin: referralItem.code.split('-')[0],
                discount: 30,
                price: boxBase * (30 / 100),
                checkoutPrice: boxPrice - (boxBase * (30 / 100))
            }
            order.referral = referral
        }

        //console.log(this.order)
        if (!freeBoxClaimed) {
            // var cookieOrder = new CookieOrder(
            //     this.order.boxId,
            //     this.order.startDeliveryDate,
            //     this.order.deliveryDaysApart,
            //     this.order.paymentPlan,
            //     this.order.productQuantity,
            //     this.order.products,
            //     this.order.orderId,
            //     this.order.orderRef
            // )
            // this.cookieService.set('temp-order', JSON.stringify(cookieOrder), 30);
            //console.log('cookie', cookieOrder)
        }
        return order
    }
}