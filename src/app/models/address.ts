export class UserAddress{
    constructor(
        public firstName: string,
        public lastName: string,
        public street: string,
        public houseNo: string,
        public postalCode: string,
        public city: string,
        public country: string,
        public lastNamePrefix?: string,
        public streetOther?: string
    ) { }
}