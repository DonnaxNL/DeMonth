export class UserData {
    constructor(
        public uid: string,
        public firstName: string,
        public lastName: string,
        public address: any,
        public email: string,
        public createdAt: any,
        public mobileNo?: string,
        public birthDate?: any,
        public additionalAddresses?: any,
        public cycleDatails? : any,
        public language?: string,
        public referral?: any,
        public points?: any,
        public mandates?: any,
        public lastNamePrefix?: string,
    ) { }
}