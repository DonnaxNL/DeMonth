import { UserAddress } from "./address";

export class FirebaseOrder {
    constructor(
        public orderId: string,
        public orderReference: string,
        public boxId: string,
        public boxName: string,
        public products: any,
        public productQuantity: number,
        public startDeliveryDate: any,
        public deliveryDaysApart: any,
        public checkoutSummary: any,
        public shippingAddress: UserAddress,
        public paymentPlan: number,
        public paymentDetails: any,
        public subscriptionDetails: any,
        public userId: string,
        public orderCreated: any,
        public nextDeliveryDate?: any,
        public deliveryDates?: any,
        public giftDetails?: any,
        public deliveries?: any,
        public historyRef?: any,
        public history?: any
    ) { }
}