export class Promotion {
    constructor(
        public id: string,
        public name: string,
        public startDate: any,
        public endDate: any,
        public description: any,
        public discount: number,
        public eyeCatcher: any,
        public checkoutDescription: any,
        public price?: number
    ) { }
}