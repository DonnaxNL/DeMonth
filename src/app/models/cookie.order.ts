export class CookieOrder {
    constructor(
        public boxId: string,
        public deliveryDate: Date,
        public deliveryDaysApart: any,
        public paymentPlan: any,
        public productQuantity: number,
        public products: any,
        public orderId?: string,
        public orderRef?: string
    ) { }
}