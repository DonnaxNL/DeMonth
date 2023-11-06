import { DatePipe } from "@angular/common";
import { Component, Input, OnInit, QueryList, ViewChild, ViewChildren } from "@angular/core";
import { AngularFireFunctions } from "@angular/fire/functions";
import { FormGroup } from "@angular/forms";
import { TranslateService } from "@ngx-translate/core";
import { User } from "firebase";
import { UserAddress } from "src/app/models/address";
import { UserData } from "src/app/models/userdata";
import { OrderService } from "src/app/services/firebase/order-service";
import { UserService } from "src/app/services/firebase/user-service";
import { PasswordFormComponent } from "src/app/shared/components/forms/password/password.form.component";
import { Helper } from "src/app/shared/helper";

@Component({
    selector: 'account-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss']
})
export class AccountSettingsComponent implements OnInit {
    @Input() latestOrder: any;
    @Input() currentUser: User;
    @Input() currentUserData: UserData;

    currentPage = 'overview'
    mandateDebit = []
    mandateCredit = []
    editModeAddAddress = false;
    changeSubscriptionAddress = true;

    formGroup: FormGroup;
    // Form Control - additional address
    additionalAddress = new UserAddress("", "", "", "", "", "", "nl");

    displayedColumnsDebit = ['name', 'account'];
    displayedColumnsCredit = ['type', 'name', 'account', 'expire'];

    @ViewChildren('formPassword') formPassword: QueryList<PasswordFormComponent>;

    constructor(
        private datepipe: DatePipe,
        private helper: Helper,
        public translate: TranslateService,
        public fun: AngularFireFunctions,
        public userService: UserService,
        public orderService: OrderService,
    ) { }

    ngOnInit(): void {
        if (this.currentUserData && this.currentUserData.additionalAddresses) {
            this.additionalAddress = this.currentUserData.additionalAddresses[0]
        }
        if (this.currentUserData && this.currentUserData.mandates != null) {
            this.mandateDebit = []
            this.mandateCredit = []
            this.currentUserData.mandates.forEach(mandate => {
                if (mandate.method == 'directdebit') {
                    this.mandateDebit.push(mandate)
                } else if (mandate.method == 'creditcard') {
                    this.mandateCredit.push(mandate)
                }
            });
        }
    }

    changePage(page: string, editMode?: boolean) {
        this.currentPage = page
        if (page == 'additionalAddress') {
            if (editMode) {
                this.additionalAddress.firstName = this.currentUserData.additionalAddresses[0].firstName
                this.additionalAddress.lastNamePrefix = this.currentUserData.additionalAddresses[0].lastNamePrefix
                this.additionalAddress.lastName = this.currentUserData.additionalAddresses[0].lastName
                this.additionalAddress.street = this.currentUserData.additionalAddresses[0].street
                this.additionalAddress.houseNo = this.currentUserData.additionalAddresses[0].houseNo
                this.additionalAddress.streetOther = this.currentUserData.additionalAddresses[0].streetOther
                this.additionalAddress.postalCode = this.currentUserData.additionalAddresses[0].postalCode
                this.additionalAddress.city = this.currentUserData.additionalAddresses[0].city
                this.additionalAddress.country = this.currentUserData.additionalAddresses[0].country
                this.editModeAddAddress = true
            } else {
                this.editModeAddAddress = false
            }
        } else if (page == 'overview') {
            this.editModeAddAddress = false
        }
    }

    setFormGroup(formGroup) {
        this.formGroup = formGroup
    }

    async saveData() {
        if (this.formGroup != null) {
            console.log(this.formGroup.value)
            if (!this.formGroup.valid) {
                this.helper.validateAllFormFields(this.formGroup);
            } else if (this.formGroup.valid && this.currentUserData) {
                const userAddress = this.formGroup.value
                this.currentUserData.address = this.helper.userAddressToMap(userAddress, false);
                this.currentUserData.firstName = this.currentUserData.address.firstName
                this.currentUserData.lastName = this.currentUserData.address.lastName
                if (this.currentUserData.address.lastNamePrefix != undefined) {
                    this.currentUserData.lastNamePrefix = this.currentUserData.address.lastNamePrefix
                }
                if (userAddress.mobileNo) {
                    this.currentUserData.mobileNo = userAddress.mobileNo
                }
                if (userAddress.birthDate) {
                    this.currentUserData.birthDate = userAddress.birthDate
                }
                //console.log(this.currentUserData);
                this.userService.updateUserMainData(this.currentUser, this.currentUserData);
                if (this.changeSubscriptionAddress && this.latestOrder) {
                    // Add history data
                    const orderHistoryItem = {
                        boxId: this.latestOrder.boxId,
                        boxName: this.latestOrder.boxName,
                        checkoutSummary: this.latestOrder.checkoutSummary,
                        deliveryDaysApart: this.latestOrder.deliveryDaysApart,
                        orderCreated: this.latestOrder.orderCreated,
                        orderId: this.latestOrder.orderId,
                        orderReference: this.latestOrder.orderReference,
                        paymentPlan: this.latestOrder.paymentPlan,
                        productQuantity: this.latestOrder.productQuantity,
                        products: this.latestOrder.products,
                        shippingAddress: this.latestOrder.shippingAddress,
                        subscriptionDetails: this.latestOrder.subscriptionDetails,
                        userId: this.latestOrder.userId
                    }
                    var historyItem = {
                        docId: this.datepipe.transform(new Date, 'yyyy-MM-dd_HH:mm') + '_address',
                        changeType: 'Shipping address changed.',
                        changes: {
                            before: {
                                shippingAddress: this.latestOrder.shippingAddress
                            },
                            after: {
                                shippingAddress: userAddress
                            }
                        },
                        dateChanged: new Date(),
                        order: orderHistoryItem
                    }

                    // Notify Slack
                    const slackData = {
                        uid: this.latestOrder.userId,
                        orderId: this.latestOrder.orderId,
                        shippingAddressBefore: this.latestOrder.shippingAddress,
                        shippingAddressAfter: userAddress
                    }
                    const addressChangedSlack = this.fun.httpsCallable('addressChangedSlack');
                    addressChangedSlack(slackData).subscribe();

                    await this.orderService.updateOrderAddress(this.latestOrder.userId, this.latestOrder.orderId, userAddress, historyItem)
                }
                //console.log("Done");
                this.currentPage = 'overview';
            }
        }
    }

    saveAdditionalAddress() {
        if (this.formGroup != null) {
            console.log(this.formGroup.value)
            if (!this.formGroup.valid) {
                this.helper.validateAllFormFields(this.formGroup);
            } else if (this.formGroup.valid && this.currentUserData) {
                const userAddress = this.helper.userAddressToMap(this.formGroup.value, true);
                this.currentUserData.additionalAddresses = userAddress;
                console.log(this.currentUserData, userAddress);
                this.userService.updateUserMainData(this.currentUser, this.currentUserData);
                //console.log("Done");
                this.currentPage = 'addresses';
            }
        }
    }

    changePassword() {
        if (this.formPassword.first) {
            this.formPassword.first.isFormGroupValid()
        }
    }
}