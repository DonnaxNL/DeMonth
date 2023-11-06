export class Product {
    constructor(
        public id: string,
        public name: string,
        public type: string,
        public brand: string,
        public image: string,
        public description: string,
        public price?: number
    ) { }
}