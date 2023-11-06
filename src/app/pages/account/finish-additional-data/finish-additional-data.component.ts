import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { User } from 'firebase';
import { UserAddress } from 'src/app/models/address';
import { UserData } from 'src/app/models/userdata';
import { UserService } from 'src/app/services/firebase/user-service';
import { Helper } from 'src/app/shared/helper';

@Component({
  selector: 'account-additional-data',
  templateUrl: './finish-additional-data.component.html',
  styleUrls: ['./finish-additional-data.component.scss']
})
export class FinishAdditionalDataComponent implements OnInit {
  @Input() currentUser: User;
  @Input() currentUserData: UserData;

  minDate = new Date(1900);
  maxDate = new Date();

  formGroup: FormGroup;

  constructor(
    private userService: UserService,
    private helper: Helper
  ) { }

  ngOnInit(): void { }

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
        console.log(this.currentUserData);
        this.userService.updateUserMainData(this.currentUser, this.currentUserData);
        console.log("Done");
      }
    }
  }
}
