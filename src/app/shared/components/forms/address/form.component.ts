import { Component, EventEmitter, Input, isDevMode, OnInit, Output } from "@angular/core";
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from "@angular/forms";
import { TranslateService, LangChangeEvent } from "@ngx-translate/core";
import { CountryFormat, CountryFormats } from "src/app/constants/country-formats";
import { UserAddress } from "src/app/models/address";
import { UserData } from "src/app/models/userdata";
import { CheckoutComponent } from "src/app/pages/checkout/checkout.component";
import { MyErrorStateMatcher } from "../../../errormatcher";
import { Helper } from "../../../helper";

@Component({
    selector: 'form-component',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss']
})
export class FormComponent implements OnInit {
    EMAIL_PATTERN = /^[-!#-'*+\/-9=?^-~]+(?:\.[-!#-'*+\/-9=?^-~]+)*@[-!#-'*+\/-9=?^-~]+(?:\.[-!#-'*+\/-9=?^-~]+)+$/i
    @Input() currentUserData: UserData;
    @Input() userAddress: UserAddress;
    @Input() appearance: string;
    @Input() formType: string;
    @Output() formGroupEvent = new EventEmitter<any>();

    rowView = false;
    editMode = false;
    editModeAddAddress = false;
    changeSubscriptionAddress = false;
    hidePassword = true;
    countries = [['nl', 'Nederland'], ['be', 'België'], ['de', 'Duitsland'], ['fr', 'Frankrijk'], ['uk', 'Verenigd Koninkrijk']];
    minDate = new Date(1950);
    maxDate = new Date();

    // Form Control - new user
    formGroup: FormGroup;
    postalFormControl: AbstractControl;
    mobileNoFormControl: AbstractControl;
    matcher = new MyErrorStateMatcher();
    currentCheck: CountryFormat;

    emailAddress = ''

    constructor(
        private _formBuilder: FormBuilder,
        private helper: Helper,
        private countryFormat: CountryFormats,
        public translate: TranslateService,
        public checkout: CheckoutComponent,
    ) { }

    ngOnInit(): void {
        this.formValidation()
        this.setSelectTranslations()
        if (this.currentUserData || this.formType == 'gift') {
            this.rowView = true
        }
        this.currentCheck = this.countryFormat.getFormatById(this.userAddress.country)
        //console.log(this.currentCheck, this.userAddress)
        this.rebuildFormGroup(this.userAddress.street != "")
    }

    formValidation() {
        this.postalFormControl = new FormControl('', [Validators.required])
        if (this.formType == 'standard') {
            this.mobileNoFormControl = new FormControl('', [Validators.pattern("^[0-9]*$")]);
            this.formGroup = this._formBuilder.group({
                firstName: new FormControl('', [Validators.required]),
                lastNamePrefix: null,
                lastName: new FormControl('', [Validators.required]),
                street: new FormControl('', [Validators.required]),
                houseNo: new FormControl('', [Validators.required]),
                streetOther: null,
                city: new FormControl('', [Validators.required]),
                postalCode: this.postalFormControl,
                country: new FormControl('', [Validators.required]),
                mobileNo: this.mobileNoFormControl,
                birthDate: null
            });
        } else if (this.formType == 'additional') {
            this.formGroup = this._formBuilder.group({
                firstName: new FormControl('', [Validators.required]),
                lastNamePrefix: null,
                lastName: new FormControl('', [Validators.required]),
                street: new FormControl('', [Validators.required]),
                houseNo: new FormControl('', [Validators.required]),
                streetOther: null,
                city: new FormControl('', [Validators.required]),
                postalCode: this.postalFormControl,
                country: new FormControl('', [Validators.required])
            });
        } else if (this.formType == 'gift') {
            this.formGroup = this._formBuilder.group({
                firstName: new FormControl('', [Validators.required]),
                lastNamePrefix: null,
                lastName: new FormControl('', [Validators.required]),
                street: new FormControl('', [Validators.required]),
                houseNo: new FormControl('', [Validators.required]),
                streetOther: null,
                city: new FormControl('', [Validators.required]),
                postalCode: this.postalFormControl,
                country: new FormControl('', [Validators.required]),
                email: new FormControl('', [Validators.pattern(this.EMAIL_PATTERN)])
            });
        }
    }

    async setSelectTranslations() {
        //Countries
        this.countries[0][1] = await this.translate.get('common.netherlands').toPromise();
        this.countries[1][1] = await this.translate.get('common.belgium').toPromise();
        this.countries[2][1] = await this.translate.get('common.germany').toPromise();
        this.countries[3][1] = await this.translate.get('common.france').toPromise();
        this.countries[4][1] = await this.translate.get('common.united_kingdom').toPromise();

        // Listen for real-time language change
        this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
            //Countries
            this.countries[0][1] = await this.translate.get('common.netherlands').toPromise();
            this.countries[1][1] = await this.translate.get('common.belgium').toPromise();
            this.countries[2][1] = await this.translate.get('common.germany').toPromise();
            this.countries[3][1] = await this.translate.get('common.france').toPromise();
            this.countries[4][1] = await this.translate.get('common.united_kingdom').toPromise();
        });
    }

    rebuildFormGroup(check) {
        //console.log(this.currentCheck, check)
        this.formGroup.controls["postalCode"].setValidators([Validators.required, Validators.maxLength(this.currentCheck.postalCodeMaxLength), Validators.pattern(this.currentCheck.postalCodePattern)]);
        if (check) {
            this.helper.validateAllFormFields(this.formGroup);
        }
        //console.log(this.postalCodePattern, this.formGroup)
    }

    passFormGroup(address) {
        this.formGroupEvent.emit(address);
    }

    onChangeInput(type?) {
        //console.log(this.formGroup, type, this.emailAddress)
        if (this.formGroup) {
            this.formGroup.value.email = this.emailAddress
            if (type != null && type == 'country') {
                //console.log(this.formGroup.value)
                if (this.formGroup.value.country != "") {
                    this.currentCheck = this.countryFormat.getFormatById(this.formGroup.value.country)
                } else {
                    this.currentCheck = this.countryFormat.getFormatById(this.userAddress.country)
                }
                this.rebuildFormGroup(this.userAddress.street != "")
            } 
            this.passFormGroup(this.formGroup)
        } else {
            console.log('formGroup null')
            this.passFormGroup(null)
        }
    }
}