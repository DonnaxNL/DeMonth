export class BoxType {
    constructor(
        public id: string,
        public name: string,
        public url: string,
        public isOneOff: boolean,
        public price: number,
        public bundle3m: number,
        public bundle12m: number,
        public maxItems: number,
        public maxPads: number
    ) { }
}