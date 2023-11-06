export class CountryFormat {
    constructor(
        public postalCodeMaxLength: number,
        public postalCodePattern: RegExp
    ) { }
}

export class CountryFormats {
    nlFormat = new CountryFormat(7, /^(?:NL-)?(?:[1-9]\d{3} ?(?:[A-EGHJ-NPRTVWXZ][A-EGHJ-NPRSTVWXZ]|S[BCEGHJ-NPRTVWXZ]))$/i);
    beFormat = new CountryFormat(4, /^(?:(?:[1-9])(?:\d{3}))$/);
    deFormat = new CountryFormat(5, /^\d{5}$/);
    frFormat = new CountryFormat(5, /^(?:[0-8]\d|9[0-8])\d{3}$/);
    ukFormat = new CountryFormat(8, /^(?:GIR 0AA|(?:(?:(?:A[BL]|B[ABDHLNRSTX]?|C[ABFHMORTVW]|D[ADEGHLNTY]|E[HNX]?|F[KY]|G[LUY]?|H[ADGPRSUX]|I[GMPV]|JE|K[ATWY]|L[ADELNSU]?|M[EKL]?|N[EGNPRW]?|O[LX]|P[AEHLOR]|R[GHM]|S[AEGK-PRSTY]?|T[ADFNQRSW]|UB|W[ADFNRSV]|YO|ZE)[1-9]?\d|(?:(?:E|N|NW|SE|SW|W)1|EC[1-4]|WC[12])[A-HJKMNPR-Y]|(?:SW|W)(?:[2-9]|[1-9]\d)|EC[1-9]\d)\d[ABD-HJLNP-UW-Z]{2}))$/i);
    defaultFormat = new CountryFormat(10, null);

    getFormatById(id: string): CountryFormat {
        if (id == "nl") {
            return this.nlFormat;
        } else if (id == "be") {
            return this.beFormat;
        } else if (id == "de") {
            return this.deFormat;
        } else if (id == "fr") {
            return this.frFormat;
        } else if (id == "uk") {
            return this.ukFormat;
        } else {
            return this.defaultFormat;
        }
    }
}