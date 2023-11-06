export class Order {
    constructor(
        public boxId: string,
        public boxName: string,
        public checkoutSummary: any,
        public products: any,
        public productQuantity: number,
        public startDeliveryDate: Date,
        public deliveryDaysApart: any,
        public paymentPlan: any,
        public orderId?: string,
        public orderRef?: string,
        public giftFriendEmail?: string
    ) { }
}